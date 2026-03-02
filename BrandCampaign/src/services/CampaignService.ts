import { CampaignRepository } from "../repositories/CampaignRepository";
import { CampaignRegistrationRepository } from "../repositories/CampaignRegistrationRepository";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CampaignResponseDto,
  CampaignListResponseDto,
  RegisterAffiliateForCampaignDto,
  UpdateCampaignRegistrationDto,
  CampaignRegistrationQueryDto,
  CampaignRegistrationsListResponseDto,
  EligibleAffiliatesResponseDto,
  AffiliateCampaignsListResponseDto,
  ApproveAffiliateForCampaignDto,
  ApproveMultipleAffiliatesDto,
  ApproveAffiliateResponseDto,
} from "../dtos/campaign.dto";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../utils/errors/AppError";
import { CampaignRegistrationStatus } from "../database/kysely/types";

/**
 * Service class for Campaign business logic
 * Handles all business rules and orchestrates repository calls
 */
export class CampaignService {
  constructor(
    private campaignRepository: CampaignRepository,
    private registrationRepository: CampaignRegistrationRepository
  ) {}

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    // Validate brand exists
    const brandExists = await this.campaignRepository.findBrandById(dto.brandId);
    if (!brandExists) {
      throw new NotFoundError("Brand does not exist with this id.");
    }

    // Check if campaign already exists
    const existingCampaign = await this.campaignRepository.findExistingCampaign(
      dto.brandId,
      dto.product
    );
    if (existingCampaign) {
      throw new ConflictError("Campaign already exists.");
    }

    // Validate at least one targeting field
    const { ageRange, gender, geography, followersRange } = dto;
    if (!ageRange && !gender && !geography && !followersRange) {
      throw new ValidationError("At least one targeting field must be provided");
    }

    // Validate sports categories
    const sportsIds = Array.isArray(dto.sportsCategoryId)
      ? dto.sportsCategoryId.map(Number)
      : [];

    if (sportsIds.length > 0) {
      const isValid = await this.campaignRepository.validateSportsCategoryIds(
        sportsIds
      );
      if (!isValid) {
        throw new ValidationError(
          "One or more sports categories do not exist"
        );
      }
    }

    // Create campaign
    const { sportsCategoryId, ...campaignData } = dto;
    // Type assertion needed because sportsCategoryId is handled separately
    const newCampaign = await this.campaignRepository.createCampaign(
      campaignData as any,
      sportsIds
    );

    // Transform to response DTO
    return this.transformCampaignToResponseDto(newCampaign, []);
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(
    campaignId: number,
    dto: UpdateCampaignDto
  ): Promise<CampaignResponseDto> {
    // Check if campaign exists
    const existingCampaign = await this.campaignRepository.findCampaignById(
      campaignId
    );
    if (!existingCampaign) {
      throw new NotFoundError("Campaign not found");
    }

    // Validate brand if provided
    if (dto.brandId) {
      const brandExists = await this.campaignRepository.findBrandById(
        dto.brandId
      );
      if (!brandExists) {
        throw new NotFoundError("Brand does not exist with this id.");
      }
    }

    // Validate sports categories if provided
    if (dto.sportsCategoryId) {
      const sportsIds = Array.isArray(dto.sportsCategoryId)
        ? dto.sportsCategoryId.map(Number)
        : [];

      if (sportsIds.length > 0) {
        const isValid =
          await this.campaignRepository.validateSportsCategoryIds(sportsIds);
        if (!isValid) {
          throw new ValidationError(
            "One or more sports categories do not exist"
          );
        }
      }
    }

    // Update campaign
    const { sportsCategoryId, ...updateData } = dto;
    const campaignUpdateData = {
      ...updateData,
      ...(updateData.start_date !== undefined && { start_date: updateData.start_date ? new Date(updateData.start_date) : null }),
      ...(updateData.end_date !== undefined && { end_date: updateData.end_date ? new Date(updateData.end_date) : null }),
      ...(updateData.application_deadline !== undefined && { application_deadline: updateData.application_deadline ? new Date(updateData.application_deadline) : null }),
    };
    const updatedCampaign = await this.campaignRepository.updateCampaign(
      campaignId,
      campaignUpdateData as any,
      dto.sportsCategoryId
    );

    // Get campaign with details
    const campaignDetails = await this.campaignRepository.getCampaignByIdWithDetails(
      campaignId
    );

    return this.groupCampaignRows(campaignDetails);
  }

  /**
   * Delete a campaign (soft delete)
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    const existingCampaign = await this.campaignRepository.findCampaignById(
      campaignId
    );
    if (!existingCampaign) {
      throw new NotFoundError("Campaign not found");
    }

    await this.campaignRepository.deleteCampaign(campaignId);
  }

  /**
   * Get all campaigns with filtering and pagination
   */
  async getAllCampaigns(
    query: CampaignQueryDto
  ): Promise<CampaignListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Extract filters (exclude pagination params)
    const filters: CampaignQueryDto = {
      ...(query.sportsCategoryId && { sportsCategoryId: query.sportsCategoryId }),
      ...(query.gender && { gender: query.gender }),
      ...(query.dealType && { dealType: query.dealType }),
      ...(query.active !== undefined && { active: query.active }),
      ...(query.geography && { geography: query.geography }),
      ...(query.followersRange && { followersRange: query.followersRange }),
      ...(query.ageRange && { ageRange: query.ageRange }),
    };

    // Get total count with filters applied
    const total = await this.campaignRepository.getTotalCampaignsCount(filters);
    const totalPages = Math.ceil(total / limit);

    // Get paginated IDs with filters applied
    const ids = await this.campaignRepository.getPaginatedCampaignIds(
      limit,
      offset,
      filters
    );

    if (ids.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: false,
          hasPrev: page > 1,
        },
      };
    }

    // Get campaigns with details
    const rows = await this.campaignRepository.getCampaignsWithDetails(ids);

    // Group by campaign
    const campaigns = this.groupCampaigns(rows);

    return {
      success: true,
      count: campaigns.length,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: number): Promise<CampaignResponseDto> {
    const rows = await this.campaignRepository.getCampaignByIdWithDetails(
      campaignId
    );

    if (rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    return this.groupCampaignRows(rows);
  }

  /**
   * Get all active campaigns for affiliate
   */
  async getAllActiveCampaigns(
    affiliateId: number,
    query: { page?: number; limit?: number; dealType?: string }
  ): Promise<CampaignListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Get excluded campaign IDs
    const excludedIds =
      await this.campaignRepository.getRegisteredCampaignIds(affiliateId);

    // Parse dealType filter
    const dealTypes = query.dealType ? query.dealType.split(",") : [];

    // Get total count
    const total =
      await this.campaignRepository.getTotalActiveCampaignsCount(
        excludedIds,
        dealTypes
      );
    const totalPages = Math.ceil(total / limit);

    // Get campaigns
    const rows =
      await this.campaignRepository.getActiveCampaignsWithDetails(
        excludedIds,
        dealTypes,
        limit,
        offset
      );

    // Group by campaign
    const campaigns = this.groupCampaigns(rows);

    return {
      success: true,
      count: campaigns.length,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Register affiliate for campaign
   */
 async registerAffiliateForCampaign(
  affiliateId: number,
  dto: RegisterAffiliateForCampaignDto
): Promise<any> {
  // Verify campaign exists and is active
  const campaign = await this.registrationRepository.findCampaignWithBrand(
    dto.campaign_id
  );

  if (!campaign) {
    throw new NotFoundError("Campaign not found or inactive");
  }

  // Verify affiliate exists and is verified
  const affiliate = await this.registrationRepository.findAffiliateById(
    affiliateId
  );

  if (!affiliate) {
    throw new NotFoundError("Affiliate not found or not verified");
  }

  // Case 1: Check for missing mandatory profile fields FIRST
  const missingFields = this.checkMissingMandatoryFields(affiliate);
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      "Please fill in the following information to apply for this campaign:",
      missingFields
    );
  }

  // Case 2: Only if all mandatory fields are filled, check eligibility criteria
  const { matchingCriteria, failedCriteria, totalCriteriaCount } =
    this.checkEligibilityCriteria(campaign, affiliate);

  // Strict validation: ALL specified criteria must match
  // If any criteria failed, or if not all criteria matched, reject registration
  if (failedCriteria.length > 0 || matchingCriteria.length !== totalCriteriaCount) {
    throw new ValidationError(
      "You are not eligible for this campaign because of following reasons:",
      failedCriteria
    );
  }

  // Check existing registration
  const existingRegistration =
    await this.registrationRepository.findExistingRegistration(
      dto.campaign_id,
      affiliateId
    );

  if (existingRegistration) {
    throw new ConflictError(
      "Affiliate is already registered for this campaign"
    );
  }

  // Create registration
  const registration = await this.registrationRepository.createRegistration({
    campaign_id: dto.campaign_id,
    affiliate_id: affiliateId,
    status: dto.status || "REGISTERED",
    additionalData: dto.additionalData || null,
  });

  return {
    registration,
    campaign: { id: campaign.campaignId },
    affiliate: { id: affiliate.id, name: affiliate.name },
    matchingCriteria: matchingCriteria.filter(
      (criteria) => criteria === "gender" || criteria === "ageRange"
    ),
  };
}


  /**
   * Get campaign registrations
   */
  async getCampaignRegistrations(
    campaignId: number,
    query: CampaignRegistrationQueryDto
  ): Promise<CampaignRegistrationsListResponseDto> {
    // Verify campaign exists
    const campaign = await this.campaignRepository.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const offset = (page - 1) * limit;

    // Get registrations
    const registrations = await this.registrationRepository.getCampaignRegistrations(
      campaignId,
      {
        ...(query.status && { status: query.status }),
        ...(query.affiliate_id && { affiliate_id: query.affiliate_id }),
        ...(query.organizationId && { organizationId: query.organizationId }),
      },
      limit,
      offset
    );

    // Get total count
    const total = await this.registrationRepository.getTotalRegistrationsCount(
      campaignId,
      {
        ...(query.status && { status: query.status }),
        ...(query.affiliate_id && { affiliate_id: query.affiliate_id }),
        ...(query.organizationId && { organizationId: query.organizationId }),
      }
    );

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message:
        registrations.length > 0
          ? "Campaign registrations retrieved successfully"
          : "No registrations found",
      data: {
        campaign: { id: campaign.id, brandId: Number(campaign.brandId) },
        registrations,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update campaign registration
   */
  async updateCampaignRegistration(
    registrationId: number,
    dto: UpdateCampaignRegistrationDto
  ): Promise<any> {
    // Check if registration exists
    const existing = await this.registrationRepository.findRegistrationById(
      registrationId
    );

    if (!existing) {
      throw new NotFoundError("Registration not found");
    }

    // Update registration
    const updated = await this.registrationRepository.updateRegistration(
      registrationId,
      {
        status: dto.status,
        additionalData: dto.additionalData || null,
      }
    );

    return updated;
  }

  /**
   * Get eligible unregistered affiliates
   */
  async getEligibleUnregisteredAffiliates(
    campaignId: number,
    query: { page?: number; limit?: number }
  ): Promise<EligibleAffiliatesResponseDto> {
    // Get campaign
    const campaign = await this.campaignRepository.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const offset = (page - 1) * limit;

    // Get eligible affiliates
    const affiliates =
      await this.registrationRepository.getEligibleUnregisteredAffiliates(
        campaignId,
        limit,
        offset
      );

    // Get total count
    const totalCount =
      await this.registrationRepository.getTotalEligibleAffiliatesCount(
        campaignId
      );

    // Enrich with eligibility details
    const affiliatesWithDetails = affiliates.map((affiliate) => {
      const eligibilityDetails = this.calculateEligibilityDetails(
        campaign,
        affiliate
      );
      const age = affiliate.dateOfBirth
        ? Math.floor(
            (new Date().getTime() -
              new Date(affiliate.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : null;

      return {
        ...affiliate,
        age,
        eligibilityDetails,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      message: "Eligible unregistered affiliates retrieved successfully",
      data: {
        campaign: {
          id: campaign.id,
          brandId: Number(campaign.brandId),
          targetingCriteria: {
            ageRange: campaign.ageRange,
            gender: campaign.gender,
            geography: campaign.geography,
            followersRange: campaign.followersRange,
          },
        },
        affiliates: affiliatesWithDetails,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  }

  /**
   * Approve campaign (toggle active status)
   */
  async approveCampaign(campaignId: number): Promise<any> {
    const updated = await this.campaignRepository.toggleCampaignActive(
      campaignId
    );
    return updated;
  }

  /**
   * Get affiliate campaigns by status
   */
  async getAffiliateCampaignsByStatus(
    affiliateId: number,
    status: CampaignRegistrationStatus
  ): Promise<AffiliateCampaignsListResponseDto> {
    const campaigns =
      await this.registrationRepository.getAffiliateCampaignsByStatus(
        affiliateId,
        status
      );

    if (campaigns.length === 0) {
      const messages: Record<CampaignRegistrationStatus, string> = {
        REGISTERED: "No applied campaigns found for this affiliate.",
        APPROVED: "No approved campaigns found for this affiliate.",
        REJECTED: "No rejected campaigns found for this affiliate.",
        COMPLETED: "No completed campaigns found for this affiliate.",
        CANCELLED: "No cancelled campaigns found for this affiliate.",
      };

      throw new NotFoundError(messages[status]);
    }

    return {
      success: true,
      message: "Campaigns retrieved successfully",
      data: campaigns,
    };
  }

  /**
   * Approve affiliate for campaign
   */
  async approveAffiliateForCampaign(
    campaignId: number,
    affiliateId: number,
    dto: ApproveAffiliateForCampaignDto
  ): Promise<ApproveAffiliateResponseDto> {
    // Validate status
    if (!["REJECTED", "APPROVED"].includes(dto.status)) {
      throw new ValidationError("Status must be REJECTED or APPROVED");
    }

    // Check if campaign exists
    const campaign = await this.campaignRepository.findCampaignById(campaignId);
    if (!campaign || !campaign.active) {
      throw new NotFoundError("Campaign does not exist with this ID.");
    }

    // Check if affiliate exists
    const affiliate = await this.registrationRepository.findAffiliateById(
      affiliateId
    );
    if (!affiliate) {
      throw new NotFoundError("Affiliate does not exist with this ID.");
    }

    // Check if registration exists
    const existingRegistration =
      await this.registrationRepository.findRegistrationByCampaignAndAffiliate(
        campaignId,
        affiliateId
      );

    if (!existingRegistration) {
      throw new NotFoundError(
        "Affiliate has not yet been registered for this campaign."
      );
    }

    // Update registration
    const updated = await this.registrationRepository.updateAffiliateRegistrationStatus(
      campaignId,
      affiliateId,
      dto.status as CampaignRegistrationStatus
    );

    return {
      success: true,
      message: "Affiliate status updated successfully.",
      data: updated,
    };
  }

  /**
   * Approve multiple affiliates for campaign
   */
  async approveMultipleAffiliatesForCampaign(
    campaignId: number,
    dto: ApproveMultipleAffiliatesDto
  ): Promise<ApproveAffiliateResponseDto> {
    // Validate status
    if (!["REJECTED", "APPROVED"].includes(dto.status)) {
      throw new ValidationError("Status must be REJECTED or APPROVED.");
    }

    // Validate affiliate IDs
    if (!Array.isArray(dto.affiliateIds) || dto.affiliateIds.length === 0) {
      throw new ValidationError("Affiliate Ids must be a non-empty array.");
    }

    // Update registrations
    const { updatedCount, existingIds } =
      await this.registrationRepository.updateMultipleAffiliateRegistrations(
        campaignId,
        dto.affiliateIds,
        dto.status as CampaignRegistrationStatus
      );

    if (existingIds.length === 0) {
      throw new NotFoundError(
        "No matching registrations found for the given affiliates."
      );
    }

    const notFoundIds = dto.affiliateIds.filter(
      (id) => !existingIds.includes(id)
    );

    return {
      success: true,
      message: "Affiliate statuses updated successfully.",
      updatedCount,
      updatedAffiliates: existingIds,
      notFoundAffiliates: notFoundIds,
    };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Format follower count for display
   */
  private formatFollowersCount(count: number): string {
    if (count >= 1_000_000) {
      const millions = (count / 1_000_000).toFixed(1);
      return `${millions}M followers`;
    } else if (count >= 1_000) {
      const thousands = (count / 1_000).toFixed(1);
      return `${thousands}K followers`;
    } else {
      return `${count.toLocaleString()} followers`;
    }
  }

  /**
   * Format followers requirement for display
   */
  private formatFollowersRequirement(range: string): string {
    const rangeUpper = range.trim().toUpperCase();
    
    // Handle >1M format -> "1M"
    if (rangeUpper.startsWith(">")) {
      const match = rangeUpper.match(/>(\d+)([KM])?/);
      if (match) {
        return `${match[1]}${match[2] || ""}`;
      }
    }
    
    // Handle <500K format -> "500K"
    if (rangeUpper.startsWith("<")) {
      const match = rangeUpper.match(/<(\d+)([KM])?/);
      if (match) {
        return `${match[1]}${match[2] || ""}`;
      }
    }
    
    // Handle 1M-5M format -> "1M-5M" (keep as is)
    if (rangeUpper.includes("-")) {
      return rangeUpper;
    }
    
    // Handle 1M+ format -> "1M"
    if (rangeUpper.endsWith("+")) {
      return rangeUpper.slice(0, -1);
    }
    
    // Handle simple format like "1M", "500K" -> return as is
    return rangeUpper;
  }

  /**
   * Check for missing mandatory profile fields (Case 1)
   * Returns list of missing field messages
   */
  private checkMissingMandatoryFields(affiliate: any): string[] {
    const missingFields: string[] = [];

    // Check Age (dateOfBirth)
    if (!affiliate.dateOfBirth) {
      missingFields.push("Age is missing");
    }

    // Check Gender
    if (!affiliate.gender) {
      missingFields.push("Gender is missing");
    }

    // Check Location (geography)
    if (!affiliate.geography) {
      missingFields.push("State is missing");
    }

    // Check Instagram account connection
    if (!affiliate.instagramAccountId) {
      missingFields.push("Instagram account is not connected");
    }

    return missingFields;
  }

  /**
   * Check eligibility criteria against campaign requirements (Case 2)
   * This assumes all mandatory profile fields are already filled
   */
  private checkEligibilityCriteria(
    campaign: any,
    affiliate: any
  ): { matchingCriteria: string[]; failedCriteria: string[]; totalCriteriaCount: number } {
    const matchingCriteria: string[] = [];
    const failedCriteria: string[] = [];
    let totalCriteriaCount = 0;

    // Gender eligibility (assuming gender is present from Case 1 check)
    if (campaign.gender) {
      totalCriteriaCount++;
      if (affiliate.gender === campaign.gender || campaign.gender === "ANY") {
        matchingCriteria.push("gender");
      } else {
        failedCriteria.push(
          `${campaign.gender} required`
        );
      }
    }

    // Age Range eligibility (assuming dateOfBirth is present from Case 1 check)
    if (campaign.ageRange) {
      totalCriteriaCount++;
      if (affiliate.dateOfBirth) {
        const age = Math.floor(
          (Date.now() - new Date(affiliate.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        );

        const ageRangeMatch = campaign.ageRange.match(/(\d+)-(\d+)/);

        if (ageRangeMatch) {
          const minAge = parseInt(ageRangeMatch[1] ?? "0");
          const maxAge = parseInt(ageRangeMatch[2] ?? "999");

          if (age >= minAge && age <= maxAge) {
            matchingCriteria.push("ageRange");
          } else {
            failedCriteria.push(
              `Age is outside the allowed range`
            );
          }
        }
      }
    }

    // Geography eligibility (assuming geography is present from Case 1 check)
    if (campaign.geography) {
      totalCriteriaCount++;
      // Defensive check - Case 1 should have caught missing geography, but verify anyway
      if (!affiliate.geography || affiliate.geography.trim() === "") {
        failedCriteria.push("Location is not specified");
      } else {
        const campaignLocations = campaign.geography
          .split(",")
          .map((loc: string) => loc.trim().toLowerCase());
        const affiliateLocation = affiliate.geography.trim().toLowerCase();

        if (campaignLocations.includes(affiliateLocation)) {
          matchingCriteria.push("geography");
        } else {
          failedCriteria.push(
            `Location not available`
          );
        }
      }
    }

    // Followers Range eligibility
    // Use Instagram followers count if available, otherwise fall back to followersRange field
    let followersCount: number | null = null;
    
    if (affiliate.instagramFollowersCount != null) {
      followersCount = Number(affiliate.instagramFollowersCount);
    } else if (affiliate.followersRange != null) {
      followersCount = Number(affiliate.followersRange);
    }

    if (campaign.followersRange) {
      totalCriteriaCount++;
      if (followersCount != null) {
        const range = campaign.followersRange.trim().toUpperCase();

        let minFollowers = 0;
        let maxFollowers = Infinity;

        // Handle different formats: <500K, >1M, 1M-5M, 1M, 1M+, 500K, etc.
        if (range.startsWith("<")) {
          // Less than format: <500K, <1M (strictly less than)
          const match = range.match(/<(\d+)([KM])?/);
          if (match) {
            const num = parseInt(match[1] ?? "0");
            const unit = match[2];
            maxFollowers = num * (unit === "M" ? 1_000_000 : 1_000) - 1; // -1 to make it strictly less than
          }
        } else if (range.startsWith(">")) {
          // Greater than or equal format: >1M, >500K (means at least that amount)
          const match = range.match(/>(\d+)([KM])?/);
          if (match) {
            const num = parseInt(match[1] ?? "0");
            const unit = match[2];
            minFollowers = num * (unit === "M" ? 1_000_000 : 1_000); // >= (at least)
          }
        } else if (range.includes("-")) {
          // Range format: 1M-5M, 500K-1M
          const parts = range.split("-");
          const min = (parts[0] ?? "0").trim();
          const max = (parts[1] ?? "0").trim();

          const minMatch = min.match(/(\d+)([KM])?/);
          const maxMatch = max.match(/(\d+)([KM])?/);

          if (minMatch) {
            const num = parseInt(minMatch[1] ?? "0");
            const unit = minMatch[2];
            minFollowers = num * (unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1);
          }
          if (maxMatch) {
            const num = parseInt(maxMatch[1] ?? "0");
            const unit = maxMatch[2];
            maxFollowers = num * (unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1);
          }
        } else {
          // Simple format: 1M, 1M+, 500K, etc.
          const match = range.match(/(\d+)([KM])?(\+)?/);
          if (match) {
            const num = parseInt(match[1] ?? "0");
            const unit = match[2];
            const plus = match[3]; // + means "or more"
            
            minFollowers = num * (unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1);
          }
        }

        if (followersCount >= minFollowers && followersCount <= maxFollowers) {
          matchingCriteria.push("followersRange");
        } else {
          // Format followers requirement for display
          let requirementText = this.formatFollowersRequirement(campaign.followersRange);
          failedCriteria.push(
            `Minimum ${requirementText} followers required`
          );
        }
      } else {
        // Format followers requirement for display
        let requirementText = this.formatFollowersRequirement(campaign.followersRange);
        failedCriteria.push(
          `Minimum ${requirementText} followers required`
        );
      }
    }

    return { matchingCriteria, failedCriteria, totalCriteriaCount };
  }

  /**
   * @deprecated Use checkEligibilityCriteria instead
   * Kept for backward compatibility but should not be used for new registrations
   */
  private checkTargetingCriteria(
    campaign: any,
    affiliate: any
  ): { matchingCriteria: string[]; failedCriteria: string[]; totalCriteriaCount: number } {
    // Redirect to new method
    return this.checkEligibilityCriteria(campaign, affiliate);
  }

  /**
   * Calculate eligibility details for an affiliate
   */
  private calculateEligibilityDetails(
    campaign: any,
    affiliate: any
  ): { matchingCriteria: string[]; notes: string[] } {
    const matchingCriteria: string[] = [];
    const notes: string[] = [];

    // Gender
    if (campaign.gender) {
      if (affiliate.gender === campaign.gender || campaign.gender === "ANY") {
        matchingCriteria.push("gender");
      }
    }

    // Age Range
    if (affiliate.dateOfBirth && campaign.ageRange) {
      const age = Math.floor(
        (new Date().getTime() - new Date(affiliate.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      );

      const ageRangeMatch = campaign.ageRange.match(/(\d+)-(\d+)/);
      if (ageRangeMatch && ageRangeMatch[1] && ageRangeMatch[2]) {
        const minAge = parseInt(ageRangeMatch[1]);
        const maxAge = parseInt(ageRangeMatch[2]);

        if (age >= minAge && age <= maxAge) {
          matchingCriteria.push("ageRange");
        }
      }
    }

    // Geography
    if (campaign.geography) {
      notes.push(
        "Geography matching not yet implemented - requires affiliate location data"
      );
    }

    // Followers Range
    if (campaign.followersRange) {
      notes.push(
        "Followers range matching not yet implemented - requires affiliate social media data"
      );
    }

    return { matchingCriteria, notes };
  }

  /**
   * Group campaign rows by campaign ID
   */
  private groupCampaigns(rows: any[]): CampaignResponseDto[] {
    const campaignsMap: Record<number, CampaignResponseDto> = {};

    for (const row of rows) {
      if (!campaignsMap[row.id]) {
        campaignsMap[row.id] = {
          id: row.id,
          name:row.name,
          description: row.description,
          brandId: row.brandId,
          product: row.product,
          ageRange: row.ageRange,
          gender: row.gender,
          geography: row.geography,
          followersRange: row.followersRange,
          deliverables: row.deliverables,
          budget: row.budget,
          active: row.active,
          dealType: row.dealType,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          sportsCategories: [],
          brandName: row.brandName,
          logo: row.logo,
        };
      }

      if (row.categoryId) {
        const campaign = campaignsMap[row.id];
        if (campaign) {
          campaign.sportsCategories.push({
            id: row.categoryId,
            title: row.categoryTitle,
          });
        }
      }
    }

    return Object.values(campaignsMap);
  }

  /**
   * Group single campaign rows
   */
  private groupCampaignRows(rows: any[]): CampaignResponseDto {
    if (rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const base = rows[0];

    return {
      id: base.id,
      name:base.name,
      description: base.description,
      brandId: base.brandId,
      product: base.product,
      ageRange: base.ageRange,
      gender: base.gender,
      geography: base.geography,
      followersRange: base.followersRange,
      deliverables: base.deliverables,
      budget: base.budget,
      active: base.active,
      dealType: base.dealType,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      brandName: base.brandName,
      logo: base.logo,
      sportsCategories: rows
        .filter((r) => r.categoryId)
        .map((r) => ({
          id: r.categoryId,
          title: r.categoryTitle,
        })),
    };
  }

  /**
   * Transform campaign to response DTO
   */
  private transformCampaignToResponseDto(
    campaign: any,
    sportsCategories: any[]
  ): CampaignResponseDto {
    return {
      id: campaign.id,
      name:campaign.name,
      description: campaign.description,
      brandId: campaign.brandId,
      product: campaign.product,
      ageRange: campaign.ageRange,
      gender: campaign.gender,
      geography: campaign.geography,
      followersRange: campaign.followersRange,
      deliverables: campaign.deliverables,
      budget: campaign.budget,
      active: campaign.active,
      dealType: campaign.dealType,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      sportsCategories: sportsCategories.map((sc) => ({
        id: sc.id,
        title: sc.title,
      })),
    };
  }
}


