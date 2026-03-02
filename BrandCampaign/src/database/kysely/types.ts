import { Generated, Insertable, Selectable, Updateable } from "kysely";

// Re-export Selectable for use in repositories
export type { Selectable };

// Campaigns table - Brand campaign management
export interface CampaignsTable {
  id: Generated<number>;
  name: string;
  description: string;
  brandId: Number;
  product: string;
  sportsCategoryId: Number;
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
  active: Generated<boolean>;
  deleted: Generated<boolean>;
  start_date: Date | null;
  end_date: Date | null;
  application_deadline: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// Campaign Deliverables table - Tracks deliverable submissions for campaigns
export interface CampaignDeliverablesTable {
  id: Generated<string>; // UUID
  registration_id: number;
  campaign_id: number;
  affiliate_id: number;
  deliverable_type: string;
  submission_url: string;
  description: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  admin_feedback: string | null;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Campaign Affiliate Registrations table - Junction table for campaign-affiliate relationships
export interface CampaignAffiliateRegistrationsTable {
  id: Generated<number>;
  campaign_id: number;
  affiliate_id: number;
  status: "REGISTERED" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  additionalData: Record<string, any> | null;
  registrationDate: Generated<Date>;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// Sports Organizations table - unified with OnBoarding service
export interface SportsOrganizationsTable {
  id: Generated<number>;
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string | null;
  displayName: string | null;
  organizationType: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  district: string | null;
  pincode: string | null;
  logo: string | null;
  description: string | null;
  website: string | null;
  registrationNumber: string | null;
  establishedYear: number | null;
  sportsCategories: string | null; // JSON array
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isVerified: Generated<boolean>;
  onboardedBy: number;
  deleted: boolean;
  isFirstLogin: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface InstagramAccountsTable {
  id: Generated<number>;
  affiliateId: number;
  igId: string;
  username: string;
  followersCount: number;
  pageId: string;
  pageName: string;
  connectedAt: Date;
  deleted: Generated<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSportsCategoriesTable {
  id: Generated<number>;
  campaignId: number;
  sportsCategoryId: number;
  deleted: Generated<boolean>;
  active: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// Affiliates table - unified with OnBoarding service (includes all sports professionals)
// Note: organizationId is stored in affiliate_organizations join table, not in affiliates table
export interface AffiliatesTable {
  id: Generated<number>;
  name: string;
  role:
    | "ATHLETE"
    | "COACH"
    | "SPORTS STAFF"
    | "NUTRITIONIST"
    | "PHYSIOTHERAPIST"
    | "PSYCHOLOGIST"
    | "SPORTS JOURNALIST"
    | "SPORTS MANAGEMENT PROFESSIONAL";
  email: string | null;
  phone: string;
  password: string | null;
  dateOfBirth: Date | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  sportsCategoryId: Number | null;
  position: string | null;
  profilePicture: string | null;
  bio: string | null;
  achievements: string | null;
  invitationCode: string | null;
  invitationStatus: "PENDING" | "SENT" | "ACCEPTED" | "EXPIRED";
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
  addedBy: number;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  geography: string | null;
  followersRange: string | null;
  profile_slug: string | null;

}

// Affiliate Organizations mapping table
export interface AffiliateOrganizationsTable {
  id: Generated<number>;
  affiliateId: number;
  organizationId: number;
  createdAt: Generated<Date>;
  deleted: boolean;
}

// Super Admin table - for admin authentication
export interface SuperAdminTable {
  id: Generated<number>;
  name: string;
  email: string;
  password: string;
  role: string;
  active: Generated<boolean>;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface SportsCategoryTable {
  id: Generated<number>;
  title: string;
  status: string;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface ExperienceTable {
  id: Generated<number>;
  affiliateId: number;
  organizationName: string;
  role: string;
  fromDate: Date;
  toDate?: Date;
  description?: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  deleted: boolean;
  active: boolean;
}

export interface EducationTable {
  id: Generated<number>;
  affiliateId: number;
  schoolName: string;
  course?: string;
  fromYear?: string;
  toYear?: string;
  description?: string;
  certificate?: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  deleted: boolean;
  active: boolean;
}


export interface AffiliateCertificatesTable {
  id: Generated<number>;
  affiliateId: number;
  certificationName: string;
  issuer: string | null;
  year: string | null;
  url: string | null;
  attachment: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface AffiliateAwardRecognitionsTable {
  id: Generated<number>;
  affiliateId: number;
  awardName: string;
  organization: string | null;
  year: string | null;
  url: string | null;
  attachment: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface AffiliatePublicationsTable {
  id: Generated<number>;
  affiliateId: number;
  publicationName: string;
  publisher: string | null;
  year: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
export interface BrandsTable {
  id: Generated<number>;
  name: string;
  logo_url: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted:boolean;
}

export interface CampaignCollaboratorTable {
  id: Generated<number>;
  brand_name: string;
  position_name: string;
  details: string | null;
  affiliate_id: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  year: number | null;
}

export interface SponsorshipTeamTable {
  id: Generated<number>;
  name: string;
  email: string;
  password: string;
  active: Generated<boolean>;
  deleted: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Database interface
export interface Database {
  campaigns: CampaignsTable;
  campaign_affiliate_registrations: CampaignAffiliateRegistrationsTable;
  sports_organizations: SportsOrganizationsTable;
  affiliates: AffiliatesTable;
  affiliate_organizations: AffiliateOrganizationsTable;
  super_admin: SuperAdminTable;
  sports_category: SportsCategoryTable;
  campaign_sports_categories: CampaignSportsCategoriesTable;
  brands: BrandsTable;
  experience: ExperienceTable;
  education: EducationTable;
  affiliate_publications: AffiliatePublicationsTable;
  affiliate_award_recognitions: AffiliateAwardRecognitionsTable;
  affiliate_certificates: AffiliateCertificatesTable;
    campaign_collaborator: CampaignCollaboratorTable;

  campaign_deliverables: CampaignDeliverablesTable;

  // ✅ REQUIRED FOR INSTAGRAM FEATURES
  instagram_accounts: InstagramAccountsTable;
  sponsorship_team: SponsorshipTeamTable;
}


// Type helpers for Campaigns
export type Campaign = Selectable<CampaignsTable>;
export type NewCampaign = Insertable<CampaignsTable>;
export type CampaignUpdate = Updateable<CampaignsTable>;

//Type helpers for Sports_category
export type SportsCategory = Selectable<SportsCategoryTable>;
export type NewSportsCategory = Insertable<SportsCategoryTable>;
export type SportsCategoryUpdate = Updateable<SportsCategoryTable>;

export type experience = Selectable<ExperienceTable>;
export type addExperience = Insertable<ExperienceTable>;
export type updateExperience = Updateable<ExperienceTable>;

export type education = Selectable<EducationTable>;
export type addEducation = Insertable<EducationTable>;
export type updateEducatioon = Updateable<EducationTable>;

export type CampaignCollaborator = Selectable<CampaignCollaboratorTable>;
export type AddCampaignCollaborator = Insertable<CampaignCollaboratorTable>;
export type UpdateCampaignCollaborator = Updateable<CampaignCollaboratorTable>;


// Type helpers for Campaign Affiliate Registrations
export type CampaignAffiliateRegistration =
  Selectable<CampaignAffiliateRegistrationsTable>;
export type NewCampaignAffiliateRegistration =
  Insertable<CampaignAffiliateRegistrationsTable>;
export type CampaignAffiliateRegistrationUpdate =
  Updateable<CampaignAffiliateRegistrationsTable>;

// Type helpers for Sports Organizations
export type SportsOrganization = Selectable<SportsOrganizationsTable>;
export type NewSportsOrganization = Insertable<SportsOrganizationsTable>;
export type SportsOrganizationUpdate = Updateable<SportsOrganizationsTable>;

// Type helpers for Affiliates
export type Affiliate = Selectable<AffiliatesTable>;
export type NewAffiliate = Insertable<AffiliatesTable>;
export type AffiliateUpdate = Updateable<AffiliatesTable>;

// Type helpers for Super Admin
export type SuperAdmin = Selectable<SuperAdminTable>;
export type NewSuperAdmin = Insertable<SuperAdminTable>;
export type SuperAdminUpdate = Updateable<SuperAdminTable>;

export type CampaignSportsCategory = Selectable<CampaignSportsCategoriesTable>;
export type NewCampaignSportsCategory =
  Insertable<CampaignSportsCategoriesTable>;
export type UpdateCampaignSportsCategory =
  Updateable<CampaignSportsCategoriesTable>;

  // Type helpers for Instagram Accounts
export type InstagramAccount = Selectable<InstagramAccountsTable>;
export type NewInstagramAccount = Insertable<InstagramAccountsTable>;
export type InstagramAccountUpdate = Updateable<InstagramAccountsTable>;

// Type helpers for Sponsorship Team
export type SponsorshipTeam = Selectable<SponsorshipTeamTable>;
export type NewSponsorshipTeam = Insertable<SponsorshipTeamTable>;
export type SponsorshipTeamUpdate = Updateable<SponsorshipTeamTable>;

// Enums for campaign filters
export enum CampaignGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  ANY = "ANY",
}

export enum CampaignDealType {
  BRAND_AMBASSADOR = "brandAmbassador",
  MONETARY = "monetary",
  BARTER = "barter",
  MONETARY_AND_BARTER = "monetaryAndBarter",
  AFFILIATE_COMMISSION_BASED = "affiliateCommissionBased",
  EVENT_APPEARANCE = "eventAppearance",
  SOCIAL_MEDIA_TAKEOVER = "socialMediaTakeover",
  PRODUCT_PLACEMENT = "productPlacement",
  CSR_PARTNERSHIP = "csrPartnership",
}

export enum CampaignRegistrationStatus {
  REGISTERED = "REGISTERED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// Type helpers for Campaign Deliverables
export type CampaignDeliverable = Selectable<CampaignDeliverablesTable>;
export type NewCampaignDeliverable = Insertable<CampaignDeliverablesTable>;
export type CampaignDeliverableUpdate = Updateable<CampaignDeliverablesTable>;
