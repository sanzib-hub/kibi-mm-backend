import { Generated, Insertable, Selectable, Updateable } from "kysely";

// Super Admin table
export interface SuperAdminTable {
  id: Generated<number>;
  name: string;
  email: string;
  password: string;
  role: "SUPER_ADMIN";
  active: boolean;
  deleted: boolean;
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

export interface AffiliatesBrandsTable {
  id: Generated<number>;
  affiliateId: number;
  brandId: number;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface RapidIgTable {
  id: Generated<number>;              // ✅ auto-generated
  affiliate_id: number;
  followers: number;
  is_private_acc: boolean;
  deleted: boolean;
  created_at: Generated<Date>;        // ✅ default timestamp
  updated_at: Generated<Date>;        // ✅ default timestamp
}


// Sports Organizations table
export interface SportsOrganizationTable {
  id: Generated<number>;
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  displayName?: string;
  organizationType?: string;
  city?: string;
  state?: string;
  country?: string;
  district?: string;
  pincode?: string;
  logo?: string;
  description?: string;
  website?: string;
  registrationNumber?: string;
  establishedYear?: number;
  sportsCategories?: string; // JSON array of sports
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isVerified: boolean;
  onboardedBy: number; // Super Admin ID
  deleted: boolean;
  isFirstLogin: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  account_id?: string | null;
  account_type?: "SAVING" | "CURRENT" | null;
  setting?: boolean;
}

// Affiliate Organizations mapping table
export interface AffiliateOrganizationsTable {
  id: Generated<number>;
  affiliateId: number;
  organizationId: number;
  createdAt: Generated<Date>;
  deleted: boolean;
}

// Affiliates table (Athletes under organizations)
export interface AffiliateTable {
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

  email?: string;
  phone: string;
  password: string;

  dateOfBirth?: Date;
  gender?: "MALE" | "FEMALE" | "OTHER";
  sportsCategoryId?: number;

  position?: string;
  profilePicture?: string;
  coverPhoto?: string | null;
  bio?: string;
  achievements?: string;

  invitationCode?: string;
  invitationStatus: "PENDING" | "SENT" | "ACCEPTED" | "EXPIRED";
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";

  addedBy: number;
  deleted: boolean;

  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;

  experience?: string | null;
  followersRange?: string | null;
  geography?: string | null;
  height?: string | null;
  weight?: string | null;
  city?: string | null;
  state?: string | null;

  /** ⭐ NEW FIELDS **/
  latitude?: number | null;
  longitude?: number | null;
  profile_slug: string | null;
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
// Invitation Codes table
export interface InvitationCodeTable {
  id: Generated<number>;
  code: string;
  type: "AFFILIATE" | "NON_AFFILIATE";
  organizationId?: number; // For affiliate invitations
  generatedBy: number; // Admin/Org ID who generated
  recipientPhone: string;
  recipientEmail?: string;
  recipientName: string;
  role:
    | "ATHLETE"
    | "COACH"
    | "SPORTS STAFF"
    | "NUTRITIONIST"
    | "PHYSIOTHERAPIST"
    | "PSYCHOLOGIST"
    | "SPORTS JOURNALIST"
    | "SPORTS MANAGEMENT PROFESSIONAL";
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  usedAt?: Date;
  usedBy?: number; // User ID who used the code
  metadata?: string; // JSON for additional data
  deleted: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface AffiliateBasicInfoTable {
  id: Generated<number>;
  affiliate_id: number;
  sport?: string | null;
  dateOfBirth?: Date | null;
  age?: number | null;
  gender?: string | null;
  role?: string | null;
  height?: string | null;
  weight?: string | null;
  city?: string | null;
  state?: string | null;
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

// Non-Affiliate Invitation Requests table
export interface NonAffiliateRequestTable {
  id: Generated<number>;
  name: string;
  email?: string;
  phone: string;
  role:
    | "ATHLETE"
    | "COACH"
    | "SPORTS STAFF"
    | "NUTRITIONIST"
    | "PHYSIOTHERAPIST"
    | "PSYCHOLOGIST"
    | "SPORTS JOURNALIST"
    | "SPORTS MANAGEMENT PROFESSIONAL";
  sportsCategoryId?: number;
  experience?: string;
  reason?: string;
  documents?: string; // JSON array of document URLs
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: number; // Super Admin ID
  reviewedAt?: Date;
  reviewComments?: string;
  invitationCodeId?: number; // Generated invitation code after approval
  deleted: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface BrandsTable {
  id: Generated<number>;
  name: string;
  logo_url: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted: boolean;
}

// OTP Verification table
export interface OTPVerificationTable {
  id: Generated<number>;
  phone: string;
  otp: string;
  type:
    | "AFFILIATE_SIGNUP"
    | "ORG_SIGNUP"
    | "PASSWORD_RESET"
    | "AFFILIATE_LOGIN"
    | "SUPER_ADMIN_LOGIN";
  invitationCode?: string;
  attempts: number;
  verified: boolean;
  expiresAt: Date;
  createdAt: Generated<Date>;
  latitude: number | null;
  longitude: number | null;
}

// Audit Log table
export interface AuditLogTable {
  id: Generated<number>;
  userId: number;
  userType: "SUPER_ADMIN" | "ORGANIZATION" | "AFFILIATE";
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: string; 
  newValues?: string; 
  ipAddress?: string;
  userAgent?: string;
  createdAt: Generated<Date>;
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
export interface AffiliateOrganizationTable {
  id: Generated<number>;
  affiliateId: number;
  organizationId: number;
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
  addedBy: number | null;
  deleted: boolean | null;
  statusReason: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
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

// Posts table (community)
export interface PostsTable {
  id: Generated<number>;
  affiliate_id: number;
  content: string | null;
  media_urls: string | null;
  post_type: string;
  sport_category: string | null;
  visibility: string;
  likes_count: number;
  comments_count: number;
  is_deleted: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Post Likes table
export interface PostLikesTable {
  post_id: number;
  affiliate_id: number;
  created_at: Generated<Date>;
}

// Post Comments table
export interface PostCommentsTable {
  id: Generated<number>;
  post_id: number;
  affiliate_id: number;
  content: string;
  parent_comment_id: number | null;
  is_deleted: boolean;
  created_at: Generated<Date>;
}

// Post Reports table
export interface PostReportsTable {
  id: Generated<number>;
  post_id: number | null;
  comment_id: number | null;
  reported_by: number;
  reason: string;
  description: string | null;
  status: string;
  created_at: Generated<Date>;
}

// Notifications table
export interface NotificationsTable {
  id: Generated<number>;
  user_id: number;
  user_type: string;
  title: string;
  body: string;
  data: string | null;
  notification_type: string | null;
  is_read: boolean;
  created_at: Generated<Date>;
}

// Notification Preferences table
export interface NotificationPreferencesTable {
  id: Generated<number>;
  affiliate_id: number;
  push_follows: boolean;
  push_likes: boolean;
  push_comments: boolean;
  push_events: boolean;
  push_campaigns: boolean;
  push_payments: boolean;
  email_events: boolean;
  email_campaigns: boolean;
  email_payments: boolean;
  dnd_start: string | null;
  dnd_end: string | null;
  updated_at: Generated<Date>;
}

// Affiliate Media table
export interface AffiliateMediaTable {
  id: Generated<number>;
  affiliate_id: number;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
  created_at: Generated<Date>;
}

// Affiliate Invitations table
export interface AffiliateInvitationsTable {
  id: Generated<number>;
  organization_id: number;
  affiliate_id: number | null;
  invitation_code: string;
  email: string | null;
  phone: string | null;
  status: string;
  expires_at: Date;
  created_at: Generated<Date>;
}

// Affiliate Endorsements table
export interface AffiliateEndorsementsTable {
  id: Generated<number>;
  endorser_id: number;
  endorsed_id: number;
  skill: string;
  message: string | null;
  created_at: Generated<Date>;
}

// Affiliate Follows table
export interface AffiliateFollowsTable {
  follower_id: number;
  following_id: number;
  created_at: Generated<Date>;
}

// KYC Documents table
export interface KycDocumentsTable {
  id: Generated<number>;
  affiliate_id: number;
  document_type: string;
  document_url: string;
  document_number: string | null;
  status: string;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  review_comments: string | null;
  created_at: Generated<Date>;
}

// Affiliate Profile Views table
export interface AffiliateProfileViewsTable {
  id: Generated<number>;
  affiliate_id: number;
  viewer_id: number | null;
  created_at: Generated<Date>;
}

// Organization Staff table
export interface OrganizationStaffTable {
  id: Generated<number>;
  organization_id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: Generated<Date>;
}

// User Feedback table
export interface UserFeedbackTable {
  id: Generated<number>;
  user_id: number;
  user_type: string;
  rating: number | null;
  category: string | null;
  message: string;
  screenshot_url: string | null;
  status: string;
  admin_response: string | null;
  responded_by: number | null;
  responded_at: Date | null;
  created_at: Generated<Date>;
}

// Database interface
export interface Database {
  super_admin: SuperAdminTable;
  sports_organizations: SportsOrganizationTable;
  affiliates: AffiliateTable;
  affiliate_organizations: AffiliateOrganizationsTable;
  invitation_codes: InvitationCodeTable;
  non_affiliate_requests: NonAffiliateRequestTable;
  otp_verification: OTPVerificationTable;
  audit_logs: AuditLogTable;
  sports_category: SportsCategoryTable;
  experience: ExperienceTable;
  education: EducationTable;
  affiliate_publications: AffiliatePublicationsTable;
  affiliate_award_recognitions: AffiliateAwardRecognitionsTable;
  affiliate_certificates: AffiliateCertificatesTable;
  affiliate_organization: AffiliateOrganizationTable;
  campaign_collaborator: CampaignCollaboratorTable;

  affiliate_basic_info: AffiliateBasicInfoTable;
  affiliates_brands: AffiliatesBrandsTable;
  brands: BrandsTable;
  instagram_accounts: InstagramAccountsTable;
  rapid_ig: RapidIgTable;
  sponsorship_team: SponsorshipTeamTable;

  // Community tables
  posts: PostsTable;
  post_likes: PostLikesTable;
  post_comments: PostCommentsTable;
  post_reports: PostReportsTable;

  // Notification tables
  notifications: NotificationsTable;
  notification_preferences: NotificationPreferencesTable;

  // Affiliate feature tables
  affiliate_media: AffiliateMediaTable;
  affiliate_invitations: AffiliateInvitationsTable;
  affiliate_endorsements: AffiliateEndorsementsTable;
  affiliate_follows: AffiliateFollowsTable;
  affiliate_profile_views: AffiliateProfileViewsTable;

  // KYC & feedback
  kyc_documents: KycDocumentsTable;
  user_feedback: UserFeedbackTable;

  // Organization staff
  organization_staff: OrganizationStaffTable;
}

// Type helpers
export type SuperAdmin = Selectable<SuperAdminTable>;
export type NewSuperAdmin = Insertable<SuperAdminTable>;
export type SuperAdminUpdate = Updateable<SuperAdminTable>;

export type SportsOrganization = Selectable<SportsOrganizationTable>;
export type NewSportsOrganization = Insertable<SportsOrganizationTable>;
export type SportsOrganizationUpdate = Updateable<SportsOrganizationTable>;

export type Affiliate = Selectable<AffiliateTable>;
export type NewAffiliate = Insertable<AffiliateTable>;
export type AffiliateUpdate = Updateable<AffiliateTable>;

export type InvitationCode = Selectable<InvitationCodeTable>;
export type NewInvitationCode = Insertable<InvitationCodeTable>;
export type InvitationCodeUpdate = Updateable<InvitationCodeTable>;

export type NonAffiliateRequest = Selectable<NonAffiliateRequestTable>;
export type NewNonAffiliateRequest = Insertable<NonAffiliateRequestTable>;
export type NonAffiliateRequestUpdate = Updateable<NonAffiliateRequestTable>;

export type OTPVerification = Selectable<OTPVerificationTable>;
export type NewOTPVerification = Insertable<OTPVerificationTable>;
export type OTPVerificationUpdate = Updateable<OTPVerificationTable>;

export type AuditLog = Selectable<AuditLogTable>;
export type NewAuditLog = Insertable<AuditLogTable>;
export type AuditLogUpdate = Updateable<AuditLogTable>;

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

export type BasicInfo = Selectable<AffiliateBasicInfoTable>;
export type AddBasicInfo = Insertable<AffiliateBasicInfoTable>;
export type UpdateBasicInfo = Updateable<AffiliateBasicInfoTable>;

export type AffiliateBrand = Selectable<AffiliatesBrandsTable>;
export type AddAffiliateBrand = Insertable<AffiliatesBrandsTable>;
export type UpdateAffiliateBrand = Updateable<AffiliatesBrandsTable>;

export type SponsorshipTeam = Selectable<SponsorshipTeamTable>;
export type NewSponsorshipTeam = Insertable<SponsorshipTeamTable>;
export type SponsorshipTeamUpdate = Updateable<SponsorshipTeamTable>;
