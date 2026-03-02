import { Request, Response, NextFunction } from "express";
import { db } from "../database/kysely/databases";
import { sql } from "kysely";

/**
 * Get analytics for a specific campaign
 * Includes: total registrations, status breakdown, deliverables breakdown, timeline progress
 */
export const getCampaignAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = Number(req.params.campaignId);

    if (!campaignId || isNaN(campaignId)) {
      return res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
    }

    // Verify campaign exists
    const campaign = await db
      .selectFrom("campaigns")
      .selectAll()
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Get registration status counts
    const registrationStats = await db
      .selectFrom("campaign_affiliate_registrations")
      .select([
        sql`COUNT(*)`.as("total"),
        sql`COUNT(*) FILTER (WHERE status = 'REGISTERED')`.as("registered"),
        sql`COUNT(*) FILTER (WHERE status = 'APPROVED')`.as("approved"),
        sql`COUNT(*) FILTER (WHERE status = 'REJECTED')`.as("rejected"),
        sql`COUNT(*) FILTER (WHERE status = 'COMPLETED')`.as("completed"),
        sql`COUNT(*) FILTER (WHERE status = 'CANCELLED')`.as("cancelled"),
      ])
      .where("campaign_id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    // Get deliverables status counts
    const deliverableStats = await db
      .selectFrom("campaign_deliverables" as any)
      .select([
        sql`COUNT(*)`.as("total"),
        sql`COUNT(*) FILTER (WHERE status = 'SUBMITTED')`.as("submitted"),
        sql`COUNT(*) FILTER (WHERE status = 'APPROVED')`.as("approved"),
        sql`COUNT(*) FILTER (WHERE status = 'REJECTED')`.as("rejected"),
      ])
      .where("campaign_id", "=", campaignId)
      .executeTakeFirst();

    // Calculate timeline progress
    let timelineProgress = 0;
    const startDate = (campaign as any).start_date;
    const endDate = (campaign as any).end_date;

    if (startDate && endDate) {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();

      if (totalDuration > 0) {
        timelineProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      }
    }

    return res.status(200).json({
      success: true,
      message: "Campaign analytics fetched successfully",
      data: {
        campaignId,
        campaignName: (campaign as any).product || (campaign as any).description,
        registrations: {
          total: Number((registrationStats as any)?.total || 0),
          registered: Number((registrationStats as any)?.registered || 0),
          approved: Number((registrationStats as any)?.approved || 0),
          rejected: Number((registrationStats as any)?.rejected || 0),
          completed: Number((registrationStats as any)?.completed || 0),
          cancelled: Number((registrationStats as any)?.cancelled || 0),
        },
        deliverables: {
          total: Number((deliverableStats as any)?.total || 0),
          submitted: Number((deliverableStats as any)?.submitted || 0),
          approved: Number((deliverableStats as any)?.approved || 0),
          pending: Number((deliverableStats as any)?.total || 0) - Number((deliverableStats as any)?.approved || 0) - Number((deliverableStats as any)?.rejected || 0),
        },
        timeline: {
          startDate,
          endDate,
          progressPercent: timelineProgress,
        },
      },
    });
  } catch (error) {
    console.error("Get campaign analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get dashboard analytics for a specific brand
 * Includes: total campaigns, active campaigns, total reach, conversion rates
 */
export const getBrandDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brandId = Number(req.params.brandId);

    if (!brandId || isNaN(brandId)) {
      return res.status(400).json({
        success: false,
        message: "Valid brand ID is required",
      });
    }

    // Verify brand exists
    const brand = await db
      .selectFrom("brands")
      .selectAll()
      .where("id", "=", brandId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Get campaign counts
    const campaignStats = await db
      .selectFrom("campaigns")
      .select([
        sql`COUNT(*)`.as("total"),
        sql`COUNT(*) FILTER (WHERE active = true)`.as("active"),
        sql`COUNT(*) FILTER (WHERE active = false)`.as("inactive"),
      ])
      .where("brandId" as any, "=", brandId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    // Get total registrations across all brand campaigns
    const registrationStats = await db
      .selectFrom("campaign_affiliate_registrations as car" as any)
      .innerJoin("campaigns as c", "c.id", "car.campaign_id" as any)
      .select([
        sql`COUNT(*)`.as("total_registrations"),
        sql`COUNT(*) FILTER (WHERE car.status = 'APPROVED')`.as("total_approved"),
        sql`COUNT(*) FILTER (WHERE car.status = 'COMPLETED')`.as("total_completed"),
      ])
      .where("c.brandId" as any, "=", brandId)
      .where("c.deleted" as any, "=", false)
      .where("car.deleted" as any, "=", false)
      .executeTakeFirst();

    // Get total reach (sum of affiliate followers from rapid_ig)
    const reachResult = await (db
      .selectFrom("campaign_affiliate_registrations as car" as any)
      .innerJoin("campaigns as c", "c.id", "car.campaign_id" as any)
      .leftJoin("rapid_ig as ri" as any, "ri.affiliate_id" as any, "car.affiliate_id" as any) as any)
      .select((sql`COALESCE(SUM(ri.followers), 0)` as any).as("total_reach"))
      .where("c.brandId" as any, "=", brandId)
      .where("c.deleted" as any, "=", false)
      .where("car.deleted" as any, "=", false)
      .where("car.status" as any, "in", ["APPROVED", "COMPLETED"])
      .executeTakeFirst();

    const totalRegistrations = Number((registrationStats as any)?.total_registrations || 0);
    const totalApproved = Number((registrationStats as any)?.total_approved || 0);
    const totalCompleted = Number((registrationStats as any)?.total_completed || 0);

    const approvalRate = totalRegistrations > 0
      ? Math.round((totalApproved / totalRegistrations) * 100)
      : 0;

    const completionRate = totalApproved > 0
      ? Math.round((totalCompleted / totalApproved) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      message: "Brand dashboard fetched successfully",
      data: {
        brandId,
        brandName: (brand as any).name,
        campaigns: {
          total: Number((campaignStats as any)?.total || 0),
          active: Number((campaignStats as any)?.active || 0),
          inactive: Number((campaignStats as any)?.inactive || 0),
        },
        registrations: {
          total: totalRegistrations,
          approved: totalApproved,
          completed: totalCompleted,
        },
        totalReach: Number((reachResult as any)?.total_reach || 0),
        conversionRates: {
          approvalRate,
          completionRate,
        },
      },
    });
  } catch (error) {
    console.error("Get brand dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get registration trends for a campaign (for chart data)
 * Returns registrations aggregated per day or week
 */
export const getRegistrationTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = Number(req.params.campaignId);
    const groupBy = (req.query.groupBy as string) || "day"; // "day" or "week"

    if (!campaignId || isNaN(campaignId)) {
      return res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
    }

    // Verify campaign exists
    const campaign = await db
      .selectFrom("campaigns")
      .select(["id"])
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    let dateExpression;
    if (groupBy === "week") {
      dateExpression = sql`DATE_TRUNC('week', "registrationDate")`;
    } else {
      dateExpression = sql`DATE_TRUNC('day', "registrationDate")`;
    }

    const trends = await db
      .selectFrom("campaign_affiliate_registrations")
      .select([
        dateExpression.as("period"),
        sql`COUNT(*)`.as("count"),
      ])
      .where("campaign_id", "=", campaignId)
      .where("deleted", "=", false)
      .groupBy(dateExpression)
      .orderBy(dateExpression as any, "asc")
      .execute();

    return res.status(200).json({
      success: true,
      message: "Registration trends fetched successfully",
      data: {
        campaignId,
        groupBy,
        trends: trends.map((t: any) => ({
          period: t.period,
          count: Number(t.count),
        })),
      },
    });
  } catch (error) {
    console.error("Get registration trends error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
