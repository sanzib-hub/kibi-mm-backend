import { Request, Response, NextFunction } from "express";
import { db } from "../database/kysely/databases";
import { sql } from "kysely";

/**
 * Calculate match score between a campaign and an affiliate (0-100)
 */
function calculateMatchScore(
  campaign: any,
  affiliate: any
): number {
  let score = 0;
  let totalWeight = 0;

  // 1. Sports category match (weight: 30)
  const categoryWeight = 30;
  totalWeight += categoryWeight;
  if (
    campaign.sportsCategoryId &&
    affiliate.sportsCategoryId &&
    Number(campaign.sportsCategoryId) === Number(affiliate.sportsCategoryId)
  ) {
    score += categoryWeight;
  }

  // 2. Gender match (weight: 20)
  const genderWeight = 20;
  totalWeight += genderWeight;
  if (campaign.gender === "ANY") {
    score += genderWeight;
  } else if (
    campaign.gender &&
    affiliate.gender &&
    campaign.gender === affiliate.gender
  ) {
    score += genderWeight;
  }

  // 3. Geography overlap (weight: 20)
  const geoWeight = 20;
  totalWeight += geoWeight;
  if (campaign.geography && affiliate.geography) {
    const campaignGeos = campaign.geography
      .toLowerCase()
      .split(",")
      .map((g: string) => g.trim());
    const affiliateGeo = affiliate.geography?.toLowerCase().trim();
    if (
      campaignGeos.includes("pan india") ||
      campaignGeos.includes("all") ||
      campaignGeos.includes(affiliateGeo)
    ) {
      score += geoWeight;
    } else if (affiliateGeo && campaignGeos.some((g: string) => affiliateGeo.includes(g) || g.includes(affiliateGeo))) {
      score += geoWeight * 0.5;
    }
  }

  // 4. Followers range compatibility (weight: 15)
  const followersWeight = 15;
  totalWeight += followersWeight;
  if (campaign.followersRange && affiliate.followersRange) {
    const campaignRange = parseRange(campaign.followersRange);
    const affiliateRange = parseRange(affiliate.followersRange);
    if (campaignRange && affiliateRange) {
      if (
        affiliateRange.min >= campaignRange.min &&
        affiliateRange.max <= campaignRange.max
      ) {
        score += followersWeight;
      } else if (
        affiliateRange.min <= campaignRange.max &&
        affiliateRange.max >= campaignRange.min
      ) {
        score += followersWeight * 0.5;
      }
    }
  }

  // 5. Age range match (weight: 15)
  const ageWeight = 15;
  totalWeight += ageWeight;
  if (campaign.ageRange && affiliate.dateOfBirth) {
    const campaignAgeRange = parseRange(campaign.ageRange);
    const affiliateAge = calculateAge(affiliate.dateOfBirth);
    if (campaignAgeRange && affiliateAge !== null) {
      if (
        affiliateAge >= campaignAgeRange.min &&
        affiliateAge <= campaignAgeRange.max
      ) {
        score += ageWeight;
      } else {
        const distance = Math.min(
          Math.abs(affiliateAge - campaignAgeRange.min),
          Math.abs(affiliateAge - campaignAgeRange.max)
        );
        if (distance <= 5) {
          score += ageWeight * 0.5;
        }
      }
    }
  }

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

function parseRange(rangeStr: string): { min: number; max: number } | null {
  if (!rangeStr) return null;
  // Handle formats like "1000-5000", "18-25", "1K-5K", "10K+"
  const cleaned = rangeStr.replace(/[kK]/g, "000").replace(/\+/g, "-999999");
  const parts = cleaned.split("-").map((p) => parseInt(p.trim()));
  const p0 = parts[0] || 0;
  const p1 = parts[1] || 0;
  if (parts.length >= 2 && !isNaN(p0) && !isNaN(p1)) {
    return { min: p0, max: p1 };
  }
  if (parts.length === 1 && !isNaN(p0)) {
    return { min: p0, max: p0 };
  }
  return null;
}

function calculateAge(dateOfBirth: string | Date): number | null {
  try {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

/**
 * Get recommended affiliates for a campaign
 * GET /api/campaigns/:campaignId/recommended-affiliates
 */
export const getRecommendedAffiliates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Fetch campaign details
    const campaign = await db
      .selectFrom("campaigns")
      .selectAll()
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    // Get verified affiliates not already registered for this campaign (capped to prevent memory issues)
    const affiliates = await db
      .selectFrom("affiliates")
      .selectAll()
      .where("deleted", "=", false)
      .where("status", "=", "VERIFIED")
      .limit(500)
      .execute();

    // Get already registered affiliates for this campaign
    const registeredAffiliates = await db
      .selectFrom("campaign_affiliate_registrations" as any)
      .select(["affiliate_id" as any])
      .where("campaign_id" as any, "=", campaignId)
      .execute();

    const registeredIds = new Set(
      registeredAffiliates.map((r: any) => Number(r.affiliate_id))
    );

    // Score and filter affiliates
    const scoredAffiliates = affiliates
      .filter((a) => !registeredIds.has(Number(a.id)))
      .map((affiliate) => ({
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        gender: affiliate.gender,
        sportsCategoryId: (affiliate as any).sportsCategoryId,
        geography: (affiliate as any).geography,
        followersRange: (affiliate as any).followersRange,
        profilePicture: (affiliate as any).profilePicture,
        role: affiliate.role,
        matchScore: calculateMatchScore(campaign, affiliate),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const total = scoredAffiliates.length;
    const paginatedResults = scoredAffiliates.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      message: "Recommended affiliates fetched successfully",
      count: paginatedResults.length,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recommended campaigns for an affiliate
 * GET /api/campaigns/recommended-for-affiliate
 */
export const getRecommendedCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const affiliateId = Number(req.user?.id);
    if (!affiliateId) {
      res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Fetch affiliate details
    const affiliate = await db
      .selectFrom("affiliates")
      .selectAll()
      .where("id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      res.status(404).json({
        success: false,
        message: "Affiliate not found",
      });
      return;
    }

    // Get active campaigns (capped to prevent memory issues)
    const campaigns = await db
      .selectFrom("campaigns")
      .selectAll()
      .where("deleted", "=", false)
      .where("active", "=", true)
      .limit(500)
      .execute();

    // Get campaigns already applied to
    const appliedCampaigns = await db
      .selectFrom("campaign_affiliate_registrations" as any)
      .select(["campaign_id" as any])
      .where("affiliate_id" as any, "=", affiliateId)
      .execute();

    const appliedIds = new Set(
      appliedCampaigns.map((r: any) => Number(r.campaign_id))
    );

    // Score and filter campaigns
    const scoredCampaigns = campaigns
      .filter((c) => !appliedIds.has(Number(c.id)))
      .map((campaign) => ({
        id: campaign.id,
        description: campaign.description,
        product: campaign.product,
        brandId: (campaign as any).brandId,
        sportsCategoryId: (campaign as any).sportsCategoryId,
        gender: campaign.gender,
        geography: campaign.geography,
        followersRange: (campaign as any).followersRange,
        ageRange: (campaign as any).ageRange,
        dealType: (campaign as any).dealType,
        budget: campaign.budget,
        matchScore: calculateMatchScore(campaign, affiliate),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const total = scoredCampaigns.length;
    const paginatedResults = scoredCampaigns.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      message: "Recommended campaigns fetched successfully",
      count: paginatedResults.length,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get campaign match stats
 * GET /api/campaigns/:campaignId/match-stats
 */
export const getCampaignMatchStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
      return;
    }

    // Fetch campaign
    const campaign = await db
      .selectFrom("campaigns")
      .selectAll()
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    // Get verified affiliates (capped to prevent memory issues)
    const affiliates = await db
      .selectFrom("affiliates")
      .selectAll()
      .where("deleted", "=", false)
      .where("status", "=", "VERIFIED")
      .limit(500)
      .execute();

    // Score all affiliates
    const scores = affiliates.map((affiliate) => ({
      id: affiliate.id,
      name: affiliate.name,
      profilePicture: (affiliate as any).profilePicture,
      matchScore: calculateMatchScore(campaign, affiliate),
    }));

    // Calculate distribution
    const distribution = {
      excellent: scores.filter((s) => s.matchScore >= 80).length,
      good: scores.filter((s) => s.matchScore >= 60 && s.matchScore < 80).length,
      fair: scores.filter((s) => s.matchScore >= 40 && s.matchScore < 60).length,
      low: scores.filter((s) => s.matchScore < 40).length,
    };

    // Top 5 matching affiliates
    const topMatches = scores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      message: "Campaign match stats fetched successfully",
      data: {
        campaignId,
        totalEligibleAffiliates: scores.length,
        averageMatchScore:
          scores.length > 0
            ? Math.round(
                scores.reduce((sum, s) => sum + s.matchScore, 0) / scores.length
              )
            : 0,
        matchScoreDistribution: distribution,
        topMatchingAffiliates: topMatches,
      },
    });
  } catch (error) {
    next(error);
  }
};
