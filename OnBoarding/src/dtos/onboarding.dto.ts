import Joi from "joi";

/**
 * Super Admin DTOs
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one special character.",
    }),
});

export interface LoginDto {
  email: string;
  password: string;
}

export const verifySuperAdminOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

export interface VerifySuperAdminOTPDto {
  email: string;
  otp: string;
}

export const createOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  password: Joi.string().min(8).required(),
  address: Joi.string().optional(),
  displayName: Joi.string().max(32).optional(),
  organizationType: Joi.string().max(64).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  pincode: Joi.string().max(10).optional(),
  logo: Joi.string().optional(),
  description: Joi.string().optional(),
  website: Joi.string().uri().max(255).optional(),
  registrationNumber: Joi.string().max(100).optional(),
  establishedYear: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  sportsCategories: Joi.array().items(Joi.string()).optional(),
});

export const createSponsorshipTeamSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export interface CreateOrganizationDto {
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
  sportsCategories?: string[];
}

export interface CreateSponsorshipTeamDto {
  name: string;
  email: string;
  password: string;
}

export const updateOrganizationStatusSchema = Joi.object({
  status: Joi.string().valid("APPROVED", "REJECTED", "SUSPENDED").required(),
  comments: Joi.string().optional(),
});

export interface UpdateOrganizationStatusDto {
  status: "APPROVED" | "REJECTED" | "SUSPENDED";
  comments?: string;
}

export const reviewNonAffiliateRequestSchema = Joi.object({
  status: Joi.string().valid("APPROVED", "REJECTED").required(),
  comments: Joi.string().optional(),
});

export interface ReviewNonAffiliateRequestDto {
  status: "APPROVED" | "REJECTED";
  comments?: string;
}

/**
 * Organization DTOs
 */
export const organizationLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export interface OrganizationLoginDto {
  email: string;
  password: string;
}

export const addAffiliateSchema = Joi.object({
  organizationId: Joi.number().required(),
  name: Joi.string().min(2).max(255).required(),
  role: Joi.string()
    .valid(
      "ATHLETE",
      "COACH",
      "SPORTS STAFF",
      "NUTRITIONIST",
      "PHYSIOTHERAPIST",
      "PSYCHOLOGIST",
      "SPORTS JOURNALIST",
      "SPORTS MANAGEMENT PROFESSIONAL"
    )
    .required(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid("MALE", "FEMALE", "OTHER").optional(),
  sportsCategoryId: Joi.number().optional(),
  position: Joi.string().optional(),
  bio: Joi.string().optional(),
  achievements: Joi.string().optional(),
});

// Schema for organization endpoints (organizationId comes from authenticated user)
export const addAffiliateByOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  role: Joi.string()
    .valid(
      "ATHLETE",
      "COACH",
      "SPORTS STAFF",
      "NUTRITIONIST",
      "PHYSIOTHERAPIST",
      "PSYCHOLOGIST",
      "SPORTS JOURNALIST",
      "SPORTS MANAGEMENT PROFESSIONAL"
    )
    .required(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid("MALE", "FEMALE", "OTHER").optional(),
  sportsCategoryId: Joi.number().optional(),
  position: Joi.string().optional(),
  bio: Joi.string().optional(),
  achievements: Joi.string().optional(),
});

export interface CreateAffiliateDto {
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
  dateOfBirth?: Date;
  gender?: "MALE" | "FEMALE" | "OTHER";
  sportsCategoryId?: number;
  position?: string;
  bio?: string;
  achievements?: string;
}

export const bulkAddAffiliatesSchema = Joi.object({
  affiliates: Joi.array().items(addAffiliateByOrganizationSchema).min(1).max(150).required(),
});

export interface BulkAddAffiliatesDto {
  affiliates: CreateAffiliateDto[];
}

export const updateAffiliateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "VERIFIED", "BANNED", "FLAGGED")
    .required(),
  reason: Joi.string().optional(),
});

export interface UpdateAffiliateStatusDto {
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
  reason?: string;
}

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(8).required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).+$/)
    .required()
    .messages({
      "string.pattern.base":
        "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one special character.",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Confirm password must match the new password.",
    }),
});

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required(),
});

export interface ResetPasswordDto {
  password: string;
}

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export interface ForgotPasswordDto {
  email: string;
}

export const setNewPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmNewPassword: Joi.string().min(6).required(),
});

export interface SetNewPasswordDto {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export const getPresignedUrlSchema = Joi.object({
  fileName: Joi.string().required(),
  fileType: Joi.string().required(),
});

export interface GetPresignedUrlDto {
  fileName: string;
  fileType: string;
}

/**
 * Affiliate DTOs
 */
export const requestOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  invitationCode: Joi.string().required(),
});

export interface RequestOtpDto {
  phone: string;
  invitationCode: string;
}

export const verifyOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  otp: Joi.string().length(6).required(),
  invitationCode: Joi.string().required(),
});

export interface VerifyOtpDto {
  phone: string;
  otp: string;
  invitationCode: string;
}

export const nonAffiliateRequestSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  sportsCategoryId: Joi.number().optional(),
  experience: Joi.string().optional(),
  reason: Joi.string().max(500).optional(),
  role: Joi.string().required(),
  documents: Joi.array().items(Joi.string().uri()).optional(),
});

export interface RequestNonAffiliateInvitationDto {
  name: string;
  email?: string;
  phone: string;
  sportsCategoryId?: number;
  experience?: string;
  reason?: string;
  role: string;
  documents?: string[];
}

export const affiliateLoginSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
});

export interface AffiliateLoginDto {
  phone: string;
}

export const verifyAffiliateLoginOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  otp: Joi.string().length(6).required(),
});

export interface VerifyAffiliateLoginOtpDto {
  phone: string;
  otp: string;
}

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  dateOfBirth: Joi.date().iso().max("now"),
  gender: Joi.string().valid("MALE", "FEMALE", "OTHER"),
  sportsCategoryId: Joi.number(),
  position: Joi.string(),
  bio: Joi.string().max(1000),
  achievements: Joi.string().max(2000),
  profilePicture: Joi.string().uri(),
  coverPhoto: Joi.string().uri(),
  followersRange: Joi.number().integer().min(0),
  geography: Joi.string().max(100),
  height: Joi.string().max(10),
  city: Joi.string().max(50),
  weight: Joi.string().max(20),
  role: Joi.string(),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
}).min(1);

export interface UpdateProfileDto {
  name?: string;
  dateOfBirth?: Date;
  gender?: "MALE" | "FEMALE" | "OTHER";
  sportsCategoryId?: number;
  position?: string;
  bio?: string;
  achievements?: string;
  profilePicture?: string;
  coverPhoto?: string;
  followersRange?: number;
  geography?: string;
  height?: string;
  city?: string;
  weight?: string;
  role?: string;
  latitude?: number;
  longitude?: number;
}

export const experienceSchema = Joi.object({
  organizationName: Joi.string().max(255).required(),
  role: Joi.string()
    .valid(
      "ATHLETE",
      "COACH",
      "SPORTS STAFF",
      "NUTRITIONIST",
      "PHYSIOTHERAPIST",
      "PSYCHOLOGIST",
      "SPORTS JOURNALIST",
      "SPORTS MANAGEMENT PROFESSIONAL"
    )
    .required(),
  fromDate: Joi.date().required(),
  toDate: Joi.date().optional(),
  description: Joi.string().optional(),
});

export interface CreateExperienceDto {
  organizationName: string;
  role: string;
  fromDate: Date;
  toDate?: Date;
  description?: string;
}

export const updateExperienceSchema = Joi.object({
  organizationName: Joi.string().max(255).optional(),
  role: Joi.string()
    .valid(
      "ATHLETE",
      "COACH",
      "SPORTS STAFF",
      "NUTRITIONIST",
      "PHYSIOTHERAPIST",
      "PSYCHOLOGIST",
      "SPORTS JOURNALIST",
      "SPORTS MANAGEMENT PROFESSIONAL"
    )
    .optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  description: Joi.string().optional(),
}).min(1);

export interface UpdateExperienceDto {
  organizationName?: string;
  role?: string;
  fromDate?: Date;
  toDate?: Date;
  description?: string;
}

export const educationSchema = Joi.object({
  schoolName: Joi.string().max(255).required(),
  course: Joi.string().max(255).optional(),
  fromYear: Joi.string().max(10).optional(),
  toYear: Joi.string().max(10).optional(),
  description: Joi.string().optional(),
  certificate: Joi.string().uri().optional(),
});

export interface CreateEducationDto {
  schoolName: string;
  course?: string;
  fromYear?: string;
  toYear?: string;
  description?: string;
  certificate?: string;
}

export const updateEducationSchema = Joi.object({
  schoolName: Joi.string().max(255).optional(),
  course: Joi.string().max(255).optional(),
  fromYear: Joi.string().max(10).optional(),
  toYear: Joi.string().max(10).optional(),
  description: Joi.string().optional(),
  certificate: Joi.string().uri().optional(),
}).min(1);

export interface UpdateEducationDto {
  schoolName?: string;
  course?: string;
  fromYear?: string;
  toYear?: string;
  description?: string;
  certificate?: string;
}

export const createCampaignCollaboratorSchema = Joi.object({
  brand_name: Joi.string().required(),
  position_name: Joi.string().required(),
  details: Joi.string().allow(null, ""),
  year: Joi.number().min(1900).max(2100).required(),
});

export interface CreateCampaignCollaboratorDto {
  brand_name: string;
  position_name: string;
  details?: string | null;
  year: number;
}

export const updateCampaignCollaboratorSchema = Joi.object({
  brand_name: Joi.string().optional(),
  position_name: Joi.string().optional(),
  year: Joi.number().min(1900).max(2100).optional(),
  details: Joi.string().optional().allow(null, ""),
});

export interface UpdateCampaignCollaboratorDto {
  brand_name?: string;
  position_name?: string;
  year?: number;
  details?: string | null;
}

