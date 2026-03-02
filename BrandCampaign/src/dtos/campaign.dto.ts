import { CampaignRegistrationStatus } from "../database/kysely/types";

/**
 * DTOs for Campaign feature
 */

// ==================== Campaign DTOs ====================

export interface CreateCampaignDto {
  brandId: number;
  name: string;
  description: string;
  product: string;
  sportsCategoryId: number[];
  ageRange: string;
  gender: "MALE" | "FEMALE" | "ANY";
  geography: string;
  followersRange: string;
  dealType:
    | "brandAmbassador"
    | "monetary"
    | "barter"
    | "monetaryAndBarter"
    | "affiliateCommissionBased"
    | "eventAppearance"
    | "socialMediaTakeover"
    | "productPlacement"
    | "csrPartnership";
  deliverables: string;
  budget: string;
  active?: boolean;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
}

export interface UpdateCampaignDto {
  brandId?: number;
  name?: string;
  description?: string;
  product?: string;
  sportsCategoryId?: number[];
  ageRange?: string;
  gender?: "MALE" | "FEMALE" | "ANY";
  geography?: string;
  followersRange?: string;
  dealType?:
    | "brandAmbassador"
    | "monetary"
    | "barter"
    | "monetaryAndBarter"
    | "affiliateCommissionBased"
    | "eventAppearance"
    | "socialMediaTakeover"
    | "productPlacement"
    | "csrPartnership";
  deliverables?: string;
  budget?: string;
  active?: boolean;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
}

export interface CampaignQueryDto {
  page?: number;
  limit?: number;
  sportsCategoryId?: number;
  gender?: "MALE" | "FEMALE" | "ANY";
  dealType?: string;
  active?: boolean;
  geography?: string;
  followersRange?: string;
  ageRange?: string;
}

export interface CampaignResponseDto {
  id: number;
  name: string;
  description: string;
  brandId: number;
  product: string;
  ageRange: string;
  gender: "MALE" | "FEMALE" | "ANY";
  geography: string;
  followersRange: string;
  deliverables: string;
  budget: string;
  active: boolean;
  dealType: string;
  createdAt: Date;
  updatedAt: Date;
  sportsCategories: Array<{
    id: number;
    title: string;
  }>;
  brandName?: string;
  logo?: string;
}

export interface CampaignListResponseDto {
  success: boolean;
  count: number;
  data: CampaignResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== Campaign Registration DTOs ====================

export interface RegisterAffiliateForCampaignDto {
  campaign_id: number;
  status?: CampaignRegistrationStatus;
  additionalData?: Record<string, any> | null;
}

export interface UpdateCampaignRegistrationDto {
  status: CampaignRegistrationStatus;
  additionalData?: Record<string, any> | null;
}

export interface CampaignRegistrationQueryDto {
  status?: CampaignRegistrationStatus;
  affiliate_id?: number;
  organizationId?: number;
  page?: number;
  limit?: number;
}

export interface CampaignRegistrationResponseDto {
  id: number;
  campaign_id: number;
  affiliate_id: number;
  status: CampaignRegistrationStatus;
  additionalData: Record<string, any> | null;
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
  affiliateName?: string;
  affiliateEmail?: string;
  affiliateRole?: string;
  affiliateSportsCategoryId?: number;
  organizationId?: number;
  brandName?: string;
  logo?: string;
}

export interface CampaignRegistrationsListResponseDto {
  success: boolean;
  message: string;
  data: {
    campaign: {
      id: number;
      brandId: number;
    };
    registrations: CampaignRegistrationResponseDto[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== Eligible Affiliates DTOs ====================

export interface EligibleAffiliateDto {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: Date | null;
  age: number | null;
  sportsCategoryId: number | null;
  organizationId?: number | null;
  position: string | null;
  profilePicture: string | null;
  bio: string | null;
  achievements: string | null;
  status: string;
  createdAt: Date;
  eligibilityDetails: {
    matchingCriteria: string[];
    notes: string[];
  };
}

export interface EligibleAffiliatesResponseDto {
  success: boolean;
  message: string;
  data: {
    campaign: {
      id: number;
      brandId: number;
      targetingCriteria: {
        ageRange: string | null;
        gender: "MALE" | "FEMALE" | "ANY" | null;
        geography: string | null;
        followersRange: string | null;
      };
    };
    affiliates: EligibleAffiliateDto[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

// ==================== Affiliate Campaign Status DTOs ====================

export interface AffiliateCampaignResponseDto {
  registrationId: number;
  status: CampaignRegistrationStatus;
  registrationDate: Date;
  additionalData: Record<string, any> | null;
  campaign_id: number;
  campaignId: number;
  description: string;
  brandId: number;
  product: string;
  ageRange: string;
  gender: "MALE" | "FEMALE" | "ANY";
  geography: string;
  followersRange: string;
  dealType: string;
  deliverables: string;
  budget: string;
  active: boolean;
  campaignCreatedAt: Date;
  organizationId?: number | null;
  sportsCategoryTitle?: string;
  brandName?: string;
  logo?: string;
}

export interface AffiliateCampaignsListResponseDto {
  success: boolean;
  message: string;
  data: AffiliateCampaignResponseDto[];
}

// ==================== Approve Affiliate DTOs ====================

export interface ApproveAffiliateForCampaignDto {
  status: "APPROVED" | "REJECTED";
}

export interface ApproveMultipleAffiliatesDto {
  affiliateIds: number[];
  status: "APPROVED" | "REJECTED";
}

export interface ApproveAffiliateResponseDto {
  success: boolean;
  message: string;
  data?: any[];
  updatedCount?: number;
  updatedAffiliates?: number[];
  notFoundAffiliates?: number[];
}

