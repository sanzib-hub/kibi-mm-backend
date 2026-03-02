import { AffiliateRepository } from "../repositories/AffiliateRepository.js";
import { generateOTP, generateInvitationCode } from "../utils/crypto/crypto.js";
import { sign } from "../utils/jwt/jwt.js";
import { UserTypes } from "../interfaces/jwtPayloads.js";
import { createSMSService } from "../utils/sms/smsService.js";
import { CacheService } from "../utils/cache/cacheService.js";
import { Storage } from "@google-cloud/storage";
import axios from "axios";


const storage = new Storage();
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
} from "../utils/errors/AppError.js";
import {
  RequestOtpDto,
  VerifyOtpDto,
  RequestNonAffiliateInvitationDto,
  AffiliateLoginDto,
  VerifyAffiliateLoginOtpDto,
  UpdateProfileDto,
  CreateExperienceDto,
  UpdateExperienceDto,
  CreateEducationDto,
  UpdateEducationDto,
  CreateCampaignCollaboratorDto,
  UpdateCampaignCollaboratorDto,
} from "../dtos/onboarding.dto.js";
import { db } from "../database/kysely/databases.js";
import { Selectable } from "kysely";
import { AffiliateTable } from "../database/kysely/types";

type Affiliate = Selectable<AffiliateTable>;
const smsService = createSMSService();

  type UpdateAthleteProfileInput = {
  role?: string;
  sportsCategoryId?: number;
  city?: string;
  state?: string;
  profilePicture?: string;
};

enum AffiliateSigninState {
  NEW_USER = "NEW_USER",
  BANNED = "BANNED",
  VERIFIED = "VERIFIED",
  PENDING_WITH_ORG = "PENDING_WITH_ORG",
  PENDING_NO_ORG = "PENDING_NO_ORG",
}

export class AffiliateService {
  private repository: AffiliateRepository;

  constructor() {
    this.repository = new AffiliateRepository();
  }




async updateAthleteProfile(
    affiliateId: number,
    data: UpdateAthleteProfileInput
  ) {
    const affiliate = await this.repository.findById(affiliateId);

    if (!affiliate) {
      throw new Error("Affiliate not found");
    }

    if (affiliate.deleted) {
      throw new Error("Affiliate account is deleted");
    }

    // Optional role validation only if role is present
    if (data.role) {
      const allowedRoles = [
        "ATHLETE",
        "COACH",
        "SPORTS STAFF",
        "NUTRITIONIST",
        "PHYSIOTHERAPIST",
        "PSYCHOLOGIST",
        "SPORTS JOURNALIST",
        "SPORTS MANAGEMENT PROFESSIONAL",
      ];

      if (!allowedRoles.includes(data.role)) {
        throw new Error("Invalid role provided");
      }
    }

    // ✅ Remove undefined fields before update
    const updatePayload = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    return await this.repository.updateAffiliate(affiliateId, updatePayload);
  }

  /**
   * Request OTP for Affiliate Signup
   */
  async requestOTP(data: RequestOtpDto) {
    const { phone, invitationCode } = data;

    // Validate invitation code
    const invitation = await this.repository.findInvitationCodeByCode(invitationCode);
    if (!invitation) {
      throw new BadRequestError("Invalid or expired invitation code");
    }

    // Auto-expire if past expiry
    if (new Date() > invitation.expiresAt) {
      await this.repository.updateInvitationCodeStatus(invitation.id, "EXPIRED");
      throw new BadRequestError("Invitation code has expired");
    }

    // Phone must match recipient for AFFILIATE invites
    if (invitation.type === "AFFILIATE" && invitation.recipientPhone !== phone) {
      throw new BadRequestError("Phone number does not match the invitation");
    }

    // Reuse cached OTP if valid
    const cachedOTP = await CacheService.getCachedOTP(phone);
    if (cachedOTP) {
      const timeRemaining = await CacheService.getOTPTimeRemaining(phone);
      return {
        success: true,
        message: "OTP already sent. Please check your messages.",
        data: {
          phone,
          expiresIn: timeRemaining > 0 ? timeRemaining : 300,
          cached: true,
        },
      };
    }

    // Generate & cache fresh OTP
    const otp = generateOTP();
    await CacheService.cacheOTP(phone, otp);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Clean existing OTP records
    await this.repository.deleteOTPVerificationByPhoneAndType(phone, "AFFILIATE_SIGNUP");

    // Insert new OTP record
    await this.repository.createOTPVerification({
      phone,
      otp,
      type: "AFFILIATE_SIGNUP",
      invitationCode,
      attempts: 0,
      verified: false,
      expiresAt,
    });

    // Send SMS
    const otpSent = await smsService.sendOTP(phone, otp);
    if (!otpSent) {
      throw new InternalServerError("We couldn't send your verification code. Please try again in a moment.");
    }

    return {
      success: true,
      message: "OTP sent successfully",
      data: {
        phone,
        expiresIn: 600,
      },
    };
  }

  /**
   * Verify OTP & Complete Signup
   */
  async verifyOTPAndSignup(data: VerifyOtpDto) {
    const { phone, otp, invitationCode } = data;

    // Cached OTP first
    const cachedOTP = await CacheService.getCachedOTP(phone);
    let isValidOTP = false;
    let otpRecord = await this.repository.getOTPVerification(
      phone,
      "AFFILIATE_SIGNUP",
      invitationCode
    );

    if (cachedOTP && cachedOTP === otp) {
      isValidOTP = true;
      await CacheService.invalidateOTP(phone);
      await this.repository.updateOTPVerificationByPhoneAndType(
        phone,
        "AFFILIATE_SIGNUP",
        invitationCode,
        { verified: true }
      );
    } else {
      if (!otpRecord) {
        throw new BadRequestError("We couldn't find your verification code. Please request a new one.");
      }

      if (new Date() > otpRecord.expiresAt) {
        throw new BadRequestError("Your verification code has expired. Please request a new one.");
      }

      if (otpRecord.verified) {
        throw new BadRequestError("This verification code has already been used. Please request a new one.");
      }

      if (otpRecord.attempts >= 3) {
        throw new BadRequestError("You've entered an incorrect code too many times. Please request a new verification code.");
      }

      if (otpRecord.otp !== otp) {
        await this.repository.updateOTPVerification(otpRecord.id, {
          attempts: otpRecord.attempts + 1,
        });
        throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
      }

      isValidOTP = true;
      await this.repository.updateOTPVerification(otpRecord.id, { verified: true });
    }

    if (!isValidOTP) {
      throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
    }

    // Get invitation details
    const invitation = await this.repository.findInvitationCodeByCode(invitationCode);
    if (!invitation || invitation.status !== "ACTIVE") {
      throw new BadRequestError("Invalid invitation code.");
    }

    if (invitation.type === "AFFILIATE") {
      const metadata = JSON.parse(invitation.metadata || "{}");
      const affiliateId = metadata.affiliateId;

      if (!affiliateId) {
        throw new BadRequestError("Invalid invitation data");
      }

      const updatedAffiliate = await this.repository.updateAffiliate(affiliateId, {
        invitationStatus: "ACCEPTED",
        status: "VERIFIED",
        updatedAt: new Date(),
      });

      if (!updatedAffiliate) {
        throw new BadRequestError("Affiliate record not found");
      }

      await this.repository.updateInvitationCodeStatus(
        invitation.id,
        "USED",
        new Date(),
        affiliateId
      );

      // Get or generate JWT
      const cachedToken = await CacheService.getCachedJWT(
        updatedAffiliate.id,
        UserTypes.AFFILIATE
      );

      // Get organizationId from mapping table
      const orgId = await this.repository.getAffiliateOrganizationId(updatedAffiliate.id);

      let token: string;
      if (cachedToken) {
        token = cachedToken;
      } else {
        token = sign({
          id: updatedAffiliate.id,
          type: UserTypes.AFFILIATE,
        });
        await CacheService.cacheJWT(updatedAffiliate.id, UserTypes.AFFILIATE, token);
      }

      return {
        success: true,
        message: "Affiliate signup completed successfully",
        data: {
          token,
          tokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
          affiliate: {
            id: updatedAffiliate.id,
            name: updatedAffiliate.name,
            phone: updatedAffiliate.phone,
            organizationId: orgId || 1,
            status: updatedAffiliate.status,
            role: updatedAffiliate.role,
            email: updatedAffiliate.email || null,
          },
        },
      };
    } else if (invitation.type === "NON_AFFILIATE") {
      // Handle non-affiliate signup flow
      const affiliateData: any = {
        name: invitation.recipientName,
        password: "",
        role: invitation.role as any,
        phone: invitation.recipientPhone,
        invitationCode: invitation.code,
        invitationStatus: "ACCEPTED",
        status: "VERIFIED",
        addedBy: 1,
        deleted: false,
      };

      if (invitation.recipientEmail !== undefined) {
        affiliateData.email = invitation.recipientEmail;
      }

      const newAffiliate = await this.repository.createAffiliate(affiliateData);

      // Create mapping for non-affiliate (organizationId = 1)
      await this.repository.createAffiliateOrganizationMapping(newAffiliate.id, 1);

      await this.repository.updateInvitationCodeStatus(
        invitation.id,
        "USED",
        new Date(),
        newAffiliate.id
      );

      const token = sign({
        id: newAffiliate.id,
        type: UserTypes.AFFILIATE,
      });

      return {
        success: true,
        message: "Affiliate signup completed successfully",
        data: {
          token,
          tokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
          affiliate: {
            id: newAffiliate.id,
            name: newAffiliate.name,
            phone: newAffiliate.phone,
            organizationId: 1,
            status: newAffiliate.status,
            role: newAffiliate.role,
            email: newAffiliate.email || null,
          },
        },
      };
    }

    throw new BadRequestError("Invalid invitation type");
  }

  /**
   * Request Non-Affiliate Invitation
   */
  async requestNonAffiliateInvitation(data: RequestNonAffiliateInvitationDto) {
    const { phone } = data;

    // Check for existing pending request
    const existingRequest = await this.repository.findPendingNonAffiliateRequestByPhone(phone);
    if (existingRequest) {
      throw new BadRequestError("A request is already pending for this phone number");
    }

    // Validate sports category if provided
    if (data.sportsCategoryId) {
      const isValid = await this.repository.isValidSportsCategory(data.sportsCategoryId);
      if (!isValid) {
        throw new BadRequestError("Sports category does not exist with this id.");
      }
    }

    // Create non-affiliate request
    const requestData: any = {
      name: data.name,
      phone: data.phone,
      role: data.role,
      status: "PENDING",
      deleted: false,
    };

    if (data.email !== undefined) {
      requestData.email = data.email;
    }
    if (data.sportsCategoryId !== undefined) {
      requestData.sportsCategoryId = data.sportsCategoryId;
    }
    if (data.experience !== undefined) {
      requestData.experience = data.experience;
    }
    if (data.reason !== undefined) {
      requestData.reason = data.reason;
    }
    if (data.documents !== undefined) {
      requestData.documents = JSON.stringify(data.documents);
    }

    const request = await this.repository.createNonAffiliateRequest(requestData);

    return {
      success: true,
      message: "Invitation request submitted successfully. You will be notified once reviewed.",
      data: {
        requestId: request.id,
        status: request.status,
        submittedAt: request.createdAt,
      },
    };
  }

  /**
   * Affiliate Login (Request OTP)
   */
  async affiliateLogin(data: AffiliateLoginDto) {
    const { phone } = data;

    // Find verified affiliate
    const affiliate = await this.repository.findVerifiedAffiliateByPhone(phone);
    if (!affiliate) {
      throw new UnauthorizedError(
        "No verified account found for this phone. Please check your number."
      );
    }

    // Reuse cached OTP if available
    const cachedOTP = await CacheService.getCachedOTP(phone);
    if (cachedOTP) {
      const timeRemaining = await CacheService.getOTPTimeRemaining(phone);
      return {
        success: true,
        message: "OTP already sent. Please check your messages.",
        data: {
          phone,
          expiresIn: timeRemaining > 0 ? timeRemaining : 300,
          cached: true,
        },
      };
    }

    // Generate & cache new OTP
    const otp = generateOTP();
    await CacheService.cacheOTP(phone, otp);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Clean prior login OTPs
    await this.repository.deleteAllOTPVerificationByPhone(phone);

    // Insert login OTP
    await this.repository.createOTPVerification({
      phone,
      otp,
      type: "AFFILIATE_LOGIN",
      attempts: 0,
      verified: false,
      expiresAt,
    });

    const otpSent = await smsService.sendOTP(phone, otp);
    if (!otpSent) {
      throw new InternalServerError("We couldn't send your verification code. Please try again in a moment.");
    }

    return {
      success: true,
      message: "OTP sent successfully",
      data: {
        phone,
        expiresIn: 600,
      },
    };
  }

  /**
   * Verify Affiliate Login OTP
   */
  async verifyAffiliateLoginOTP(data: VerifyAffiliateLoginOtpDto) {
    const { phone, otp } = data;

    // Ensure affiliate still valid
    const affiliate = await this.repository.findVerifiedAffiliateByPhone(phone);
    if (!affiliate) {
      throw new UnauthorizedError(
        "No verified account found for this phone. Please check your number."
      );
    }

    // Cache-first OTP validation
    const cachedOTP = await CacheService.getCachedOTP(phone);
    let valid = false;
    let otpRow = await this.repository.getOTPVerification(phone, "AFFILIATE_LOGIN");

    if (cachedOTP && cachedOTP === otp) {
      valid = true;
      await CacheService.invalidateOTP(phone);
      if (otpRow) {
        await this.repository.updateOTPVerification(otpRow.id, { verified: true });
      }
    } else {
      if (!otpRow) {
        throw new BadRequestError("We couldn't find your verification code. Please request a new one.");
      }

      if (new Date() > otpRow.expiresAt) {
        throw new BadRequestError("Your verification code has expired. Please request a new one.");
      }

      if (otpRow.verified) {
        throw new BadRequestError("This verification code has already been used. Please request a new one.");
      }

      if (otpRow.attempts >= 3) {
        throw new BadRequestError("You've entered an incorrect code too many times. Please request a new verification code.");
      }

      if (otpRow.otp !== otp) {
        await this.repository.updateOTPVerification(otpRow.id, {
          attempts: otpRow.attempts + 1,
        });
        throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
      }

      valid = true;
      await this.repository.updateOTPVerification(otpRow.id, { verified: true });
    }

    if (!valid) {
      throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
    }

    // Get organizationId from mapping table
    const orgId = await this.repository.getAffiliateOrganizationId(affiliate.id);

    // Get or generate JWT
    const cachedToken = await CacheService.getCachedJWT(affiliate.id, UserTypes.AFFILIATE);
    let token: string;

    if (cachedToken) {
      token = cachedToken;
    } else {
      token = sign({
        id: affiliate.id,
        type: UserTypes.AFFILIATE,
      });
      await CacheService.cacheJWT(affiliate.id, UserTypes.AFFILIATE, token);
    }

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          phone: affiliate.phone,
          status: affiliate.status,
          role: affiliate.role,
          email: affiliate.email || null,
        },
      },
    };
  }

  /**
   * Get Profile
   */
  async getProfile(affiliateId: number) {
    const profile = await this.repository.getAffiliateProfile(affiliateId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    return {
      success: true,
      message: "Profile retrieved successfully",
      data: profile,
    };
  }

  /**
   * Update Profile
   */
  async updateProfile(affiliateId: number, data: UpdateProfileDto) {
    // Validate sports category if provided
    if (data.sportsCategoryId) {
      const isValid = await this.repository.isValidSportsCategory(data.sportsCategoryId);
      if (!isValid) {
        throw new BadRequestError("Sports category does not exist with this id.");
      }
    }

    // Build update data with proper type handling
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.sportsCategoryId !== undefined) updateData.sportsCategoryId = data.sportsCategoryId;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.achievements !== undefined) updateData.achievements = data.achievements;
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
    if (data.coverPhoto !== undefined) updateData.coverPhoto = data.coverPhoto;
    if (data.followersRange !== undefined) updateData.followersRange = data.followersRange;
    if (data.geography !== undefined) updateData.geography = data.geography;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.role !== undefined) {
      updateData.role = data.role as "ATHLETE" | "COACH" | "SPORTS STAFF" | "NUTRITIONIST" | "PHYSIOTHERAPIST" | "PSYCHOLOGIST" | "SPORTS JOURNALIST" | "SPORTS MANAGEMENT PROFESSIONAL";
    }
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;

    const updatedAffiliate = await this.repository.updateProfile(affiliateId, updateData);

    return {
      success: true,
      message: "Profile updated successfully",
      data: updatedAffiliate,
    };
  }

  /**
   * Get Presigned URL
   */



  async getPresignedUrl(fileName: string, fileType: string) {
    if (!fileName || !fileType) {
      throw new BadRequestError("fileName and fileType are required");
    }

    const key = `${Date.now()}-${fileName}`;
    const bucketName = process.env.GCS_BUCKET!;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(key);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType: fileType,
    });

    return {
      success: true,
      uploadUrl,
      fileUrl: `https://storage.googleapis.com/${bucketName}/${key}`,
    };
  }



  /**
   * Get All Athletes Under Organization
   */
 async getAllAthletesUnderOrganization(
  affiliateId: number,
  params: { page?: number; limit?: number }
) {
  const orgId = await this.repository.getAffiliateOrganizationId(affiliateId);

// 1. Not linked at all
if (orgId === null || orgId === undefined) {
  throw new NotFoundError("Affiliate is not linked to any organization.");
}

// 2. Linked to default/root org (orgId = 1 is not allowed)
if (orgId === 1) {
  return {
    success: false,
    statusCode: 400,
    message: "You are not part of any organization.",
  };
}

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const offset = (page - 1) * limit;

  const athletes = await db
    .selectFrom("affiliates")
    .innerJoin(
      "affiliate_organizations",
      "affiliates.id",
      "affiliate_organizations.affiliateId"
    )
    .selectAll("affiliates")
    .where("affiliate_organizations.organizationId", "=", orgId)
    .where("affiliates.id", "<>", affiliateId) // ✅ exclude self
    .where("affiliate_organizations.deleted", "=", false)
    .where("affiliates.deleted", "=", false)
    .where("affiliates.status", "=", "VERIFIED")
    .orderBy("affiliates.createdAt", "desc")
    .limit(limit)
    .offset(offset)
    .execute();

  const totalResult = await db
    .selectFrom("affiliates")
    .innerJoin(
      "affiliate_organizations",
      "affiliates.id",
      "affiliate_organizations.affiliateId"
    )
    .select((eb) => eb.fn.count("affiliates.id").as("count"))
    .where("affiliate_organizations.organizationId", "=", orgId)
    .where("affiliates.id", "<>", affiliateId) // ✅ keep count consistent
    .where("affiliate_organizations.deleted", "=", false)
    .where("affiliates.deleted", "=", false)
    .where("affiliates.status", "=", "VERIFIED")
    .executeTakeFirst();

  const total = Number(totalResult?.count || 0);

  return {
    success: true,
    page,
    limit,
    total,
    count: athletes.length,
    data: athletes,
  };
}


  /**
   * Get Same Organization Affiliates Data
   */
  async getSameOrganizationAffiliatesData(affiliateId: number, targetAffiliateId: number) {
    const orgId = await this.repository.getAffiliateOrganizationId(affiliateId);
    if (!orgId) {
      throw new NotFoundError("Organization not found for the given affiliate.");
    }

    const targetOrgId = await this.repository.getAffiliateOrganizationId(targetAffiliateId);
    if (!targetOrgId) {
      throw new NotFoundError("Affiliate not found.");
    }

    if (targetOrgId !== orgId) {
      throw new BadRequestError("Access denied to affiliates of other organizations.");
    }

    const affiliate = await db
  .selectFrom("affiliates")
  .leftJoin(
    "affiliate_organizations",
    "affiliates.id",
    "affiliate_organizations.affiliateId"
  )
  .leftJoin(
    "sports_category",
    "affiliates.sportsCategoryId",
    "sports_category.id"
  )
  .leftJoin(
    "sports_organizations",
    "affiliate_organizations.organizationId",
    "sports_organizations.id"
  )
  .select((eb) => [
    "affiliates.id",
    "affiliates.name",
    "affiliates.email",
    "affiliates.phone",
    "affiliates.dateOfBirth",
    "affiliates.gender",
    "affiliates.position",
    "affiliates.profilePicture",
    "affiliates.coverPhoto",
    "affiliates.bio",
    "affiliates.achievements",
    "affiliates.status",
    "affiliates.role",
    "affiliates.createdAt",
    "affiliates.followersRange",
    "affiliates.geography",
    "affiliates.height",
    "affiliates.weight",
    "affiliates.city",
    "affiliate_organizations.organizationId",
    eb.ref("sports_category.title").as("sportsCategoryTitle"),
    eb.ref("sports_organizations.name").as("organizationName"),
  ])
  .where("affiliates.id", "=", targetAffiliateId)          // ✅ primary filter
  .where("affiliates.deleted", "=", false)           // ✅ still required
  .executeTakeFirst();

    if (!affiliate) {
      throw new NotFoundError("Profile not found");
    }

    // Get related data
    const [
  experience,
  awards,
  education,
  certificates,
  publications,
  campaignCollaborators,
] = await Promise.all([
  this.repository.getExperiences(targetAffiliateId),
  this.repository.getAwardRecognitions(targetAffiliateId),
  this.repository.getEducation(targetAffiliateId),
  this.repository.getCertificates(targetAffiliateId),
  this.repository.getPublications(targetAffiliateId),
  this.repository.getCampaignCollaborators(targetAffiliateId),
]);

    return {
      success: true,
      message: "Affiliate profile retrieved successfully",
      data: {
        ...affiliate,
        experience,
        awards,
        education,
        certificates,
        publications,
        campaignCollaborators,
      },
    };
  }

  // Experience methods
  async addExperience(affiliateId: number, data: CreateExperienceDto) {
    const experienceData: any = {
      affiliateId,
      organizationName: data.organizationName,
      role: data.role,
      fromDate: data.fromDate,
      deleted: false,
      active: true,
    };

    if (data.toDate !== undefined) {
      experienceData.toDate = data.toDate;
    }
    if (data.description !== undefined) {
      experienceData.description = data.description;
    }

    const experience = await this.repository.createExperience(experienceData);

    return {
      success: true,
      message: "Experience added successfully",
      data: experience,
    };
  }

  async getExperiences(affiliateId: number) {
    const experiences = await this.repository.getExperiences(affiliateId);
    return {
      success: true,
      message: "Experiences retrieved successfully",
      data: experiences,
    };
  }

  async updateExperience(experienceId: number, affiliateId: number, data: UpdateExperienceDto) {
    const experience = await this.repository.updateExperience(experienceId, data);
    return {
      success: true,
      message: "Experience updated successfully",
      data: experience,
    };
  }

  async deleteExperience(experienceId: number) {
    await this.repository.deleteExperience(experienceId);
    return {
      success: true,
      message: "Experience deleted successfully",
    };
  }

  // Education methods
  async addEducation(affiliateId: number, data: CreateEducationDto) {
    const educationData: any = {
      affiliateId,
      schoolName: data.schoolName,
      deleted: false,
      active: true,
    };

    if (data.course !== undefined) {
      educationData.course = data.course;
    }
    if (data.fromYear !== undefined) {
      educationData.fromYear = data.fromYear;
    }
    if (data.toYear !== undefined) {
      educationData.toYear = data.toYear;
    }
    if (data.description !== undefined) {
      educationData.description = data.description;
    }
    if (data.certificate !== undefined) {
      educationData.certificate = data.certificate;
    }

    const education = await this.repository.createEducation(educationData);

    return {
      success: true,
      message: "Education added successfully",
      data: education,
    };
  }

  async getEducation(affiliateId: number) {
    const education = await this.repository.getEducation(affiliateId);
    return {
      success: true,
      message: "Education retrieved successfully",
      data: education,
    };
  }

  async updateEducation(educationId: number, affiliateId: number, data: UpdateEducationDto) {
    const education = await this.repository.updateEducation(educationId, data);
    return {
      success: true,
      message: "Education updated successfully",
      data: education,
    };
  }

  async deleteEducation(educationId: number) {
    await this.repository.deleteEducation(educationId);
    return {
      success: true,
      message: "Education deleted successfully",
    };
  }

  // Certificate methods
  async createCertificate(affiliateId: number, data: {
    certificationName: string;
    issuer?: string;
    year?: string;
    url?: string;
    attachment?: string;
  }) {
    const certificate = await this.repository.createCertificate({
      affiliateId,
      ...data,
    });

    return {
      success: true,
      message: "Certificate created successfully",
      data: certificate,
    };
  }

  async getAllCertificates(affiliateId: number) {
    const certificates = await this.repository.getCertificates(affiliateId);
    return {
      success: true,
      message: "Certificates retrieved successfully",
      data: certificates,
    };
  }

  async getCertificateById(certificateId: number, affiliateId: number) {
    const certificate = await this.repository.getCertificateById(certificateId);
    if (!certificate || certificate.affiliateId !== affiliateId) {
      throw new NotFoundError("Certificate not found");
    }
    return {
      success: true,
      message: "Certificate retrieved successfully",
      data: certificate,
    };
  }

  async updateCertificate(certificateId: number, affiliateId: number, data: Partial<any>) {
    const certificate = await this.repository.getCertificateById(certificateId);
    if (!certificate || certificate.affiliateId !== affiliateId) {
      throw new NotFoundError("Certificate not found");
    }
    const updated = await this.repository.updateCertificate(certificateId, data);
    return {
      success: true,
      message: "Certificate updated successfully",
      data: updated,
    };
  }

  async deleteCertificate(certificateId: number, affiliateId: number) {
    const certificate = await this.repository.getCertificateById(certificateId);
    if (!certificate || certificate.affiliateId !== affiliateId) {
      throw new NotFoundError("Certificate not found");
    }
    await this.repository.deleteCertificate(certificateId);
    return {
      success: true,
      message: "Certificate deleted successfully",
    };
  }

  // Award Recognition methods
  async createAwardRecognition(affiliateId: number, data: {
    awardName: string;
    organization?: string;
    year?: string;
    url?: string;
    attachment?: string;
  }) {
    const award = await this.repository.createAwardRecognition({
      affiliateId,
      ...data,
    });

    return {
      success: true,
      message: "Award recognition created successfully",
      data: award,
    };
  }

  async getAllAwardRecognitions(affiliateId: number) {
    const awards = await this.repository.getAwardRecognitions(affiliateId);
    return {
      success: true,
      message: "Award recognitions retrieved successfully",
      data: awards,
    };
  }

  async getAwardRecognitionById(awardId: number, affiliateId: number) {
    const award = await this.repository.getAwardRecognitionById(awardId);
    if (!award || award.affiliateId !== affiliateId) {
      throw new NotFoundError("Award recognition not found");
    }
    return {
      success: true,
      message: "Award recognition retrieved successfully",
      data: award,
    };
  }

  async updateAwardRecognition(awardId: number, affiliateId: number, data: Partial<any>) {
    const award = await this.repository.getAwardRecognitionById(awardId);
    if (!award || award.affiliateId !== affiliateId) {
      throw new NotFoundError("Award recognition not found");
    }
    const updated = await this.repository.updateAwardRecognition(awardId, data);
    return {
      success: true,
      message: "Award recognition updated successfully",
      data: updated,
    };
  }

  async deleteAwardRecognition(awardId: number, affiliateId: number) {
    const award = await this.repository.getAwardRecognitionById(awardId);
    if (!award || award.affiliateId !== affiliateId) {
      throw new NotFoundError("Award recognition not found");
    }
    await this.repository.deleteAwardRecognition(awardId);
    return {
      success: true,
      message: "Award recognition deleted successfully",
    };
  }

  // Publication methods
  async createPublication(affiliateId: number, data: {
    publicationName: string;
    publisher?: string;
    year?: string;
  }) {
    const publication = await this.repository.createPublication({
      affiliateId,
      ...data,
    });

    return {
      success: true,
      message: "Publication created successfully",
      data: publication,
    };
  }

  async getAllPublications(affiliateId: number) {
    const publications = await this.repository.getPublications(affiliateId);
    return {
      success: true,
      message: "Publications retrieved successfully",
      data: publications,
    };
  }

  async getPublicationById(publicationId: number, affiliateId: number) {
    const publication = await this.repository.getPublicationById(publicationId);
    if (!publication || publication.affiliateId !== affiliateId) {
      throw new NotFoundError("Publication not found");
    }
    return {
      success: true,
      message: "Publication retrieved successfully",
      data: publication,
    };
  }

  async updatePublication(publicationId: number, affiliateId: number, data: Partial<any>) {
    const publication = await this.repository.getPublicationById(publicationId);
    if (!publication || publication.affiliateId !== affiliateId) {
      throw new NotFoundError("Publication not found");
    }
    const updated = await this.repository.updatePublication(publicationId, data);
    return {
      success: true,
      message: "Publication updated successfully",
      data: updated,
    };
  }

  async deletePublication(publicationId: number, affiliateId: number) {
    const publication = await this.repository.getPublicationById(publicationId);
    if (!publication || publication.affiliateId !== affiliateId) {
      throw new NotFoundError("Publication not found");
    }
    await this.repository.deletePublication(publicationId);
    return {
      success: true,
      message: "Publication deleted successfully",
    };
  }

  // Campaign Collaborator methods
  async createCollaborator(affiliateId: number, data: CreateCampaignCollaboratorDto) {
    const collaborator = await this.repository.createCampaignCollaborator({
      affiliate_id: affiliateId,
      ...data,
    });

    return {
      success: true,
      message: "Campaign collaborator created successfully",
      data: collaborator,
    };
  }

  async getCollaboratorByAffiliate(affiliateId: number) {
    const collaborators = await this.repository.getCampaignCollaborators(affiliateId);
    return {
      success: true,
      message: "Campaign collaborators retrieved successfully",
      data: collaborators,
    };
  }

  async updateCollaborator(collaboratorId: number, affiliateId: number, data: UpdateCampaignCollaboratorDto) {
    const collaborator = await this.repository.getCampaignCollaboratorById(collaboratorId);
    if (!collaborator || collaborator.affiliate_id !== affiliateId) {
      throw new NotFoundError("Campaign collaborator not found");
    }
    const updated = await this.repository.updateCampaignCollaborator(collaboratorId, data);
    return {
      success: true,
      message: "Campaign collaborator updated successfully",
      data: updated,
    };
  }

  async deleteCollaborator(collaboratorId: number, affiliateId: number) {
    const collaborator = await this.repository.getCampaignCollaboratorById(collaboratorId);
    if (!collaborator || collaborator.affiliate_id !== affiliateId) {
      throw new NotFoundError("Campaign collaborator not found");
    }
    await this.repository.deleteCampaignCollaborator(collaboratorId);
    return {
      success: true,
      message: "Campaign collaborator deleted successfully",
    };
  }

  /**
   * Signin (Universal login endpoint)
   */
 async signin(data: { phone: string; latitude?: number; longitude?: number }) {
  const { phone, latitude, longitude } = data;
  if (!phone) throw new BadRequestError("Phone number is required");

  const affiliate =
  (await this.repository.findAffiliateByPhone(phone)) ?? null;

  if (affiliate && latitude !== undefined && longitude !== undefined) {
    await this.repository.updateProfile(affiliate.id, {
      latitude,
      longitude,
    });
  }

  const state = await this.resolveAffiliateState(affiliate);

  switch (state) {
    case AffiliateSigninState.NEW_USER: {
      const otp = await this.sendOTPFlow(
        phone,
        "AFFILIATE_SIGNUP",
        latitude,
        longitude
      );

      return {
        success: true,
        message: otp.cached
          ? "OTP already sent."
          : "OTP sent successfully",
        otpSent: true,
        isExistingAffiliate: false,
        data: { phone, latitude, longitude, expiresIn: otp.expiresIn },
      };
    }

    case AffiliateSigninState.BANNED:
      throw new BadRequestError(
        "Your account has been temporarily restricted. Contact support."
      );

    case AffiliateSigninState.VERIFIED:
    case AffiliateSigninState.PENDING_NO_ORG: {
      const otp = await this.sendOTPFlow(
        phone,
        "AFFILIATE_LOGIN",
        latitude,
        longitude
      );

      return {
        success: true,
        message: otp.cached
          ? "OTP already sent."
          : "OTP sent successfully",
        otpSent: true,
        isExistingAffiliate: true,
        data: { phone, latitude, longitude, expiresIn: otp.expiresIn },
      };
    }

    case AffiliateSigninState.PENDING_WITH_ORG:
      return this.handleInviteFlow(affiliate!, phone);
  }
}


async resendOTP(phone: string) {
  // 1️⃣ Find affiliate (if exists)
  const affiliate = await this.repository.findAffiliateByPhone(phone);

  // 2️⃣ Block banned / flagged users
  if (
    affiliate &&
    (affiliate.status === "BANNED" || affiliate.status === "FLAGGED")
  ) {
    throw new BadRequestError(
      "Your account is restricted. Please contact support."
    );
  }

  // 3️⃣ Block org-invite pending users
  if (affiliate?.status === "PENDING") {
    const orgId = await this.repository.getAffiliateOrganizationId(
      affiliate.id
    );

    if (orgId && orgId !== 1) {
      throw new BadRequestError(
        "Invite flow is active. Please use invite code."
      );
    }
  }

  // 4️⃣ Decide OTP type
  const otpType = affiliate
    ? "AFFILIATE_LOGIN"
    : "AFFILIATE_SIGNUP";

  // 🔥 5️⃣ Force invalidate old OTPs (NO REUSE)
  await CacheService.invalidateOTP(phone);
  await this.repository.deleteAllOTPVerificationByPhone(phone);

  // 6️⃣ Generate fresh OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // 7️⃣ Save OTP to cache
  await CacheService.cacheOTP(phone, otp);

  // 8️⃣ Save OTP to DB
  await this.repository.createOTPVerification({
    phone,
    otp,
    type: otpType,
    attempts: 0,
    verified: false,
    expiresAt,
  });

  // 9️⃣ Send OTP
  const sent = await smsService.sendOTP(phone, otp);
  if (!sent) {
    throw new InternalServerError("We couldn't resend your verification code. Please try again.");
  }

  // 🔟 Response
  return {
    success: true,
    message: "OTP resent successfully",
    otpSent: true,
    data: {
      phone,
      expiresIn: 600,
    },
  };
}


  /**
   * Validate Non-Affiliate OTP
   */
 async validateNonAffiliateOTP(data: {
  phone: string;
  otp: string;
  name: string;
  role: string;
  sportsCategoryId: number;
  email: string;
  latitude?: number;
  longitude?: number;
  gender?: string;
  organizationId?: number | null;
}) {
  const {
    phone,
    otp,
    name,
    role,
    email,
    latitude,
    longitude,
    sportsCategoryId,
    organizationId,
    gender,
  } = data;

  console.log("🚀 validateNonAffiliateOTP called", {
    phone,
    email,
    role,
    sportsCategoryId,
  });

  /* --------------------------
     BASIC VALIDATION
  -------------------------- */
  if (!name || !otp || !phone || !role || !email || !sportsCategoryId) {
    console.warn("❌ Validation failed: missing fields", {
      name,
      otp,
      phone,
      role,
      email,
      sportsCategoryId,
    });
    throw new BadRequestError(
      "Name, OTP, phone, role, sports category and email are required."
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn("❌ Invalid email format", { email });
    throw new BadRequestError("Email is not valid.");
  }

  /* --------------------------
     EXISTING AFFILIATE CHECK
  -------------------------- */
  const existingAffiliate = await db
    .selectFrom("affiliates")
    .select(["id"])
    .where(({ eb }) =>
      eb.and([
        eb.or([eb("phone", "=", phone), eb("email", "=", email)]),
        eb("deleted", "=", false),
      ])
    )
    .executeTakeFirst();

  if (existingAffiliate) {
    console.warn("⚠️ Affiliate already exists", {
      phone,
      email,
      affiliateId: existingAffiliate.id,
    });
    return {
      success: false,
      message: "Affiliate already exists either with this phone or email.",
      data: { isExistingAffiliate: true },
    };
  }

  /* --------------------------
     OTP VERIFICATION
  -------------------------- */
  console.log("🔐 Starting OTP verification", { phone });

  const cachedOTP = await CacheService.getCachedOTP(phone);
  console.log("🔁 Cached OTP check", {
    cachedOTPExists: !!cachedOTP,
  });

  const otpRecord = await db
    .selectFrom("otp_verification")
    .selectAll()
    .where("phone", "=", phone)
    .executeTakeFirst();

  console.log("📄 OTP DB record", {
    exists: !!otpRecord,
    verified: otpRecord?.verified,
    attempts: otpRecord?.attempts,
    expiresAt: otpRecord?.expiresAt,
  });

  let isValidOTP = false;

  if (cachedOTP && cachedOTP === otp) {
    console.log("✅ OTP matched via cache");
    isValidOTP = true;
    await CacheService.invalidateOTP(phone);

    if (otpRecord) {
      await this.repository.updateOTPVerification(otpRecord.id, {
        verified: true,
      });
    }
  } else {
    if (!otpRecord) {
      console.warn("❌ OTP record not found in DB", { phone });
      throw new BadRequestError(
        "We couldn't find your verification code. Please request a new one."
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      console.warn("⏰ OTP expired", {
        phone,
        expiresAt: otpRecord.expiresAt,
      });
      throw new BadRequestError(
        "Your verification code has expired. Please request a new one."
      );
    }

    if (otpRecord.verified) {
      console.warn("⚠️ OTP already used", { phone });
      throw new BadRequestError(
        "This verification code has already been used. Please request a new one."
      );
    }

    if (otpRecord.attempts >= 3) {
      console.warn("🚫 OTP attempts exceeded", {
        phone,
        attempts: otpRecord.attempts,
      });
      throw new BadRequestError(
        "You've entered an incorrect code too many times. Please request a new verification code."
      );
    }

    if (otpRecord.otp !== otp) {
      console.warn("❌ OTP mismatch", {
        phone,
        inputOtp: otp,
        attempts: otpRecord.attempts + 1,
      });

      await this.repository.updateOTPVerification(otpRecord.id, {
        attempts: otpRecord.attempts + 1,
      });

      throw new BadRequestError(
        "The verification code you entered is incorrect. Please check and try again."
      );
    }

    console.log("✅ OTP matched via DB");
    isValidOTP = true;
    await this.repository.updateOTPVerification(otpRecord.id, {
      verified: true,
    });
  }

  if (!isValidOTP) {
    console.error("❌ OTP validation failed unexpectedly", { phone });
    throw new BadRequestError(
      "The verification code you entered is incorrect. Please check and try again."
    );
  }

  /* --------------------------
     AFFILIATE CREATION
  -------------------------- */
  const finalLatitude = latitude ?? otpRecord?.latitude ?? null;
  const finalLongitude = longitude ?? otpRecord?.longitude ?? null;

  const finalOrgId =
    typeof organizationId === "number" ? organizationId : 1;

  console.log("👤 Creating affiliate", {
    phone,
    email,
    finalOrgId,
    finalLatitude,
    finalLongitude,
  });

  const affiliateData: any = {
    phone,
    name,
    email,
    role,
    gender,
    sportsCategoryId,
    status: "VERIFIED",
    invitationStatus: "ACCEPTED",
    addedBy: 1,
    deleted: false,
    password: generateInvitationCode(12),
    latitude: finalLatitude,
    longitude: finalLongitude,
  };

  const affiliate = await this.repository.createAffiliate(affiliateData);

  if (!affiliate) {
    console.error("🔥 Affiliate creation failed", { phone, email });
    throw new InternalServerError(
      "Failed to create affiliate account. Please try again."
    );
  }

  await this.repository.createAffiliateOrganizationMapping(
    affiliate.id,
    finalOrgId
  );

  console.log("🔗 Affiliate-org mapping created", {
    affiliateId: affiliate.id,
    organizationId: finalOrgId,
  });

  /* --------------------------
     JWT GENERATION
  -------------------------- */
  let token = await CacheService.getCachedJWT(
    affiliate.id,
    UserTypes.AFFILIATE
  );

  if (!token) {
    token = sign({
      id: affiliate.id,
      type: UserTypes.AFFILIATE,
    });
    await CacheService.cacheJWT(
      affiliate.id,
      UserTypes.AFFILIATE,
      token
    );
    console.log("🔑 JWT generated and cached", {
      affiliateId: affiliate.id,
    });
  } else {
    console.log("♻️ JWT fetched from cache", {
      affiliateId: affiliate.id,
    });
  }

  console.log("🎉 Non-affiliate signup successful", {
    affiliateId: affiliate.id,
    phone: affiliate.phone,
  });

  return {
    success: true,
    message: "Affiliate signup completed successfully",
    data: {
      isValidOTP: true,
      token,
      tokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        phone: affiliate.phone,
        email: affiliate.email,
        organizationId: finalOrgId,
        status: affiliate.status,
        role: affiliate.role,
        latitude: affiliate.latitude,
        longitude: affiliate.longitude,
      },
    },
  };
}


  /**
   * Validate Invite Code
   */
  async validateInviteCode(data: {
    phone: string;
    inviteCode: string;
    latitude?: number;
    longitude?: number;
  }) {
    const { phone, inviteCode, latitude, longitude } = data;

    if (!phone) {
      throw new BadRequestError("Phone number is required.");
    }

    if (!inviteCode) {
      throw new BadRequestError("Invite code is required.");
    }

    // Validate invitation code
    const invitation = await db
      .selectFrom("invitation_codes")
      .selectAll()
      .where("code", "=", inviteCode)
      .where("recipientPhone", "=", phone)
      .where("status", "=", "ACTIVE")
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!invitation) {
      throw new BadRequestError("Invalid invitation code or phone number mismatch.");
    }

    if (new Date() > invitation.expiresAt) {
      await this.repository.updateInvitationCodeStatus(invitation.id, "EXPIRED");
      throw new BadRequestError("Invitation code has expired.");
    }

    // Check if affiliate already exists and is already verified/accepted
    // Only block if affiliate is fully onboarded (VERIFIED and ACCEPTED)
    // Allow pending affiliates to proceed with onboarding
    const existingAffiliate = await this.repository.findAffiliateByPhone(phone);
    if (existingAffiliate) {
      // If affiliate is already verified and accepted, they're already onboarded
      if (
        existingAffiliate.status === "VERIFIED" &&
        existingAffiliate.invitationStatus === "ACCEPTED"
      ) {
        return {
          success: true,
          message: "Affiliate already exists with this phone number.",
          data: {
            isExistingAffiliate: true,
            affiliateId: existingAffiliate.id,
          },
        };
      }
      // If affiliate exists but is still pending (not yet verified/accepted),
      // allow them to proceed with onboarding (this handles re-onboarding after deletion)
    }

    // Send OTP for signup
    const cachedOTP = await CacheService.getCachedOTP(phone);
    if (cachedOTP) {
      const timeRemaining = await CacheService.getOTPTimeRemaining(phone);
      return {
        success: true,
        message: "OTP already sent. Please check your messages.",
        data: {
          phone,
          inviteCode,
          latitude,
          longitude,
          expiresIn: timeRemaining > 0 ? timeRemaining : 300,
          cached: true,
        },
        otpSent: true,
      };
    }

    const otp = generateOTP();
    await CacheService.cacheOTP(phone, otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.repository.deleteAllOTPVerificationByPhone(phone);
    await this.repository.createOTPVerification({
      phone,
      otp,
      type: "AFFILIATE_SIGNUP",
      invitationCode: inviteCode,
      attempts: 0,
      verified: false,
      expiresAt,
    });

    const otpSent = await smsService.sendOTP(phone, otp);
    if (!otpSent) {
      throw new InternalServerError("We couldn't send your verification code. Please try again in a moment.");
    }

    return {
      success: true,
      message: "OTP sent successfully",
      data: {
        phone,
        inviteCode,
        latitude,
        longitude,
        expiresIn: 600,
      },
      otpSent: true,
    };
  }

  /**
   * Validate Affiliate OTP
   */
  async validateAffiliateOTP(data: {
    phone: string;
    otp: string;
    latitude?: number;
    longitude?: number;
  }) {
    const { phone, otp, latitude, longitude } = data;

    if (!phone || !otp) {
      throw new BadRequestError("Please provide both your phone number and verification code.");
    }

    // Find affiliate
    const affiliate = await this.repository.findAffiliateByPhone(phone);
    if (!affiliate) {
      throw new NotFoundError("Affiliate not found with this phone number.");
    }

    if (affiliate.status === "BANNED" || affiliate.status === "FLAGGED") {
      throw new BadRequestError(
        `Your account has been temporarily ${affiliate.status}. Please contact tech@kibisports.org.`
      );
    }

    // OTP Verification
    const cachedOTP = await CacheService.getCachedOTP(phone);
    let otpRecord = await db
      .selectFrom("otp_verification")
      .selectAll()
      .where("phone", "=", phone)
      .where("type", "=", "AFFILIATE_LOGIN")
      .executeTakeFirst();

    let valid = false;

    if (cachedOTP && cachedOTP === otp) {
      valid = true;
      await CacheService.invalidateOTP(phone);
      if (otpRecord) {
        await this.repository.updateOTPVerification(otpRecord.id, { verified: true });
      }
    } else {
      if (!otpRecord) {
        throw new BadRequestError("We couldn't find your verification code. Please request a new one.");
      }

      if (new Date() > otpRecord.expiresAt) {
        throw new BadRequestError("Your verification code has expired. Please request a new one.");
      }

      if (otpRecord.verified) {
        throw new BadRequestError("This verification code has already been used. Please request a new one.");
      }

      if (otpRecord.attempts >= 3) {
        throw new BadRequestError("You've entered an incorrect code too many times. Please request a new verification code.");
      }

      if (otpRecord.otp !== otp) {
        await this.repository.updateOTPVerification(otpRecord.id, {
          attempts: otpRecord.attempts + 1,
        });
        throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
      }

      valid = true;
      await this.repository.updateOTPVerification(otpRecord.id, { verified: true });
    }

    if (!valid) {
      throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
    }

    // Update location if provided
    if (latitude && longitude) {
      await this.repository.updateProfile(affiliate.id, { latitude, longitude });
    }

    // Get organizationId from mapping table
    const orgId = await this.repository.getAffiliateOrganizationId(affiliate.id);

    // Get or generate JWT
    const cachedToken = await CacheService.getCachedJWT(affiliate.id, UserTypes.AFFILIATE);
    let token: string;

    if (cachedToken) {
      token = cachedToken;
    } else {
      token = sign({
        id: affiliate.id,
        type: UserTypes.AFFILIATE,
      });
      await CacheService.cacheJWT(affiliate.id, UserTypes.AFFILIATE, token);
    }

    // Refresh affiliate data
    const updatedAffiliate = await this.repository.findById(affiliate.id);

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        tokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
        affiliate: {
          id: updatedAffiliate!.id,
          name: updatedAffiliate!.name,
          phone: updatedAffiliate!.phone,
          email: updatedAffiliate!.email,
          organizationId: orgId || 1,
          status: updatedAffiliate!.status,
          role: updatedAffiliate!.role,
          latitude: updatedAffiliate!.latitude,
          longitude: updatedAffiliate!.longitude,
        },
      },
    };
  }

  /**
   * Get Basic Info
   */
  async getBasicInfo(affiliateId: number) {
    const data = await db
      .selectFrom("affiliates")
      .leftJoin("sports_category", "sports_category.id", "affiliates.sportsCategoryId")
      .select([
        "affiliates.id",
        "affiliates.role",
        "affiliates.dateOfBirth",
        "affiliates.gender",
        "affiliates.geography",
        "affiliates.height",
        "affiliates.weight",
        "affiliates.city",
        "affiliates.sportsCategoryId",
        "sports_category.title as sportsCategoryTitle",
      ])
      .where("affiliates.id", "=", affiliateId)
      .where("affiliates.deleted", "=", false)
      .executeTakeFirst();

    if (!data) {
      throw new NotFoundError("Affiliate not found");
    }

    // Calculate age
    let age: number | null = null;
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      age =
        today.getUTCFullYear() -
        dob.getUTCFullYear() -
        (today.getUTCMonth() < dob.getUTCMonth() ||
        (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate())
          ? 1
          : 0);
    }

    return {
      success: true,
      data: {
        id: data.id,
        role: data.role,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        age,
        sportsCategoryId: data.sportsCategoryId,
        sportsCategoryTitle: data.sportsCategoryTitle,
        geography: data.geography,
        height: data.height,
        weight: data.weight,
        city: data.city,
      },
    };
  }

  /**
   * Add Brand
   */
  async addBrand(affiliateId: number, brandId: number) {
    if (!brandId) {
      throw new BadRequestError("Brand Id is needed.");
    }

    // Check if brand exists
    const existingBrand = await db
      .selectFrom("brands")
      .where("id", "=", brandId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!existingBrand) {
      throw new NotFoundError("Brand not found with the given id.");
    }

    // Check if mapping already exists
    const existingMapping = await db
      .selectFrom("affiliates_brands")
      .select("id")
      .where("brandId", "=", brandId)
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (existingMapping) {
      throw new BadRequestError("Affiliate already associated with this brand.");
    }

    const newMapping = await db
      .insertInto("affiliates_brands")
      .values({ affiliateId, brandId })
      .returningAll()
      .executeTakeFirst();

    if (!newMapping) {
      throw new InternalServerError("Unable to add brand right now. Please try again later.");
    }

    return {
      success: true,
      message: "Brand added successfully.",
      data: newMapping,
    };
  }

  /**
   * Delete Brand
   */
  async deleteBrand(affiliateId: number, brandId: number) {
    if (!brandId) {
      throw new BadRequestError("Brand Id is needed.");
    }

    const exists = await db
      .selectFrom("affiliates_brands")
      .select("id")
      .where("brandId", "=", brandId)
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!exists) {
      throw new NotFoundError("Mapping does not exist with this brand.");
    }

    await db
      .updateTable("affiliates_brands")
      .set({ deleted: true })
      .where("brandId", "=", brandId)
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .execute();

    return {
      success: true,
      message: "Brand removed successfully.",
    };
  }

  /**
   * Get All Brands for Affiliate
   */
  async getAllBrandsForAffiliate(affiliateId: number) {
    const rows = await db
      .selectFrom("affiliates_brands as ab")
      .innerJoin("affiliates as a", "a.id", "ab.affiliateId")
      .innerJoin("brands as b", "b.id", "ab.brandId")
      .select([
        "ab.id as mappingId",
        "ab.affiliateId",
        "a.name as affiliateName",
        "a.email as affiliateEmail",
        "a.phone as affiliatePhone",
        "a.role as affiliateRole",
        "ab.brandId",
        "b.name as brandName",
        "b.logo_url as brandLogo",
      ])
      .where("ab.affiliateId", "=", affiliateId)
      .where("ab.deleted", "=", false)
      .where("b.deleted", "=", false)
      .where("a.deleted", "=", false)
      .where("a.status", "=", "VERIFIED")
      .execute();

    return {
      success: true,
      message:
        rows.length > 0
          ? "Affilites with brand associated are fetched successfully."
          : " No brands found for this affiliate.",
      data: rows.length > 0 ? rows : [],
    };
  }

  /**
   * Update Brand
   */
  async updateBrand(affiliateId: number, brandId: number) {
    if (!brandId) {
      throw new BadRequestError("Brand Id is required.");
    }

    // Delete all old mappings
    await db
      .updateTable("affiliates_brands")
      .set({ deleted: true })
      .where("affiliateId", "=", affiliateId)
      .execute();

    // Create new mapping
    const data = await db
      .insertInto("affiliates_brands")
      .values({ brandId: brandId, affiliateId: affiliateId })
      .returningAll()
      .executeTakeFirst();

    return {
      success: true,
      message: "Brand updated successfully.",
      data: data,
    };
  }

  /**
   * Delete Profile
   */
  async deleteProfile(affiliateId: number) {
    const existingAffiliate = await db
      .selectFrom("affiliates")
      .select(["id", "deleted", "status"])
      .where("id", "=", affiliateId)
      .executeTakeFirst();

    if (!existingAffiliate) {
      throw new NotFoundError("Affiliate not found");
    }

    if (existingAffiliate.deleted === true) {
      throw new BadRequestError("Profile already deleted");
    }

    await db
      .updateTable("affiliates")
      .set({
        deleted: true,
        status: "PENDING",
        updatedAt: new Date(),
      })
      .where("id", "=", affiliateId)
      .execute();

    return {
      success: true,
      message: "Affiliate profile deleted successfully.",
    };
  }

  /**
   * Generate Profile Link
   */
  async generateProfileLink(affiliateId: number) {
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["id", "name", "profile_slug"])
      .where("id", "=", affiliateId)
      .executeTakeFirst();

    if (!affiliate) {
      throw new NotFoundError("Athlete not found");
    }

    if (affiliate.profile_slug) {
      return {
        success: true,
        message: "Profile link already exists",
        link: `https://admin.kibisports.com/profile/${affiliate.profile_slug}`,
      };
    }

    const cleanName = affiliate.name.toLowerCase().replace(/ /g, "-");
    const unique = Math.random().toString(36).substring(2, 8);
    const slug = `${cleanName}-${unique}`;

    await db
      .updateTable("affiliates")
      .set({ profile_slug: slug })
      .where("id", "=", affiliateId)
      .execute();

    return {
      success: true,
      message: "Profile link generated",
      link: `https://admin.kibisports.com/profile/${slug}`,
    };
  }

  /**
   * Get Public Profile
   */
  async getPublicProfile(slug: string) {
    const affiliate = await db
      .selectFrom("affiliates")
      .leftJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .leftJoin("sports_category", "affiliates.sportsCategoryId", "sports_category.id")
      .leftJoin("sports_organizations", "affiliate_organizations.organizationId", "sports_organizations.id")
      .select((eb) => [
        "affiliates.id",
        "affiliates.name",
        "affiliates.email",
        "affiliates.phone",
        "affiliates.dateOfBirth",
        "affiliates.gender",
        "affiliates.position",
        "affiliates.profilePicture",
        "affiliates.coverPhoto",
        "affiliates.bio",
        "affiliates.achievements",
        "affiliates.status",
        "affiliates.role",
        "affiliates.createdAt",
        "affiliates.followersRange",
        "affiliates.geography",
        "affiliates.height",
        "affiliates.weight",
        "affiliates.city",
        "affiliate_organizations.organizationId",
        eb.ref("sports_category.title").as("sportsCategoryTitle"),
        eb.ref("sports_organizations.name").as("organizationName"),
      ])
      .where("affiliates.profile_slug", "=", slug)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false)
      .where("affiliates.status", "=", "VERIFIED")
      .executeTakeFirst();

    if (!affiliate) {
      throw new NotFoundError("Profile not found");
    }

    // Get related data
    const [experience, awards, education, certificates, publications, campaignCollaborators] =
      await Promise.all([
        this.repository.getExperiences(affiliate.id),
        this.repository.getAwardRecognitions(affiliate.id),
        this.repository.getEducation(affiliate.id),
        this.repository.getCertificates(affiliate.id),
        this.repository.getPublications(affiliate.id),
        this.repository.getCampaignCollaborators(affiliate.id),
      ]);

    return {
      success: true,
      message: "Public profile retrieved successfully",
      data: {
        ...affiliate,
        experience,
        awards,
        education,
        certificates,
        publications,
        campaignCollaborators,
      },
    };
  }


   async fetchAndSaveInstagramData(
    affiliateId: number,
    username: string
  ) {
    // 1. Fetch from RapidAPI
    const igData = await this.fetchFromRapidApi(username);

    if (!igData) {
      throw new NotFoundError("Instagram profile not found");
    }

    const payload = {
      affiliateId,
      followers: igData.followers,
      isPrivateAcc: igData.isPrivate,
    };

    // 2. Upsert into DB
    await this.repository.upsertInstagramData(payload);

    return payload

  }


  async getInstagramData(affiliateId: number) {
    const igData = await this.repository.getByAffiliateId(affiliateId);

    if (!igData) {
      throw new NotFoundError("Instagram data not found for this affiliate");
    }

    return igData;
  }

  async deleteInstagramData(affiliateId: number) {
    const igData = await this.repository.softDeleteIgByAffiliateId(affiliateId);

    if (!igData) {
      throw new NotFoundError("Instagram data not found for this affiliate");
    }

    return igData;
  }

private async fetchFromRapidApi(username: string) {
  try {
    const response = await axios.post(
      "https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_followers_v2.php",
      new URLSearchParams({
        username_or_url: `https://www.instagram.com/${username}/`,
        data: "followers",
        amount: "10",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-RapidAPI-Key": process.env.RAPID_API_KEY!,
          "X-RapidAPI-Host": "instagram-scraper-stable-api.p.rapidapi.com",
        },
        timeout: 15000,
      }
    );

    console.log("✅ RapidAPI STATUS:", response.status);
    console.log("✅ RapidAPI DATA:", response.data);

    const result = response.data;

    if (!result || typeof result.count !== "number") {
      console.log("⚠️ Invalid result structure:", result);
      return null;
    }

    return {
      followers: result.count,
      isPrivate: Array.isArray(result.users)
        ? result.users.length === 0
        : true,
    };

  } catch (error: any) {
    console.log("❌ RapidAPI ERROR STATUS:", error?.response?.status);
    console.log("❌ RapidAPI ERROR DATA:", error?.response?.data);
    console.log("❌ RapidAPI ERROR MESSAGE:", error?.message);
    throw error;
  }
}


  private async resolveAffiliateState(
  affiliate: Affiliate | null
): Promise<AffiliateSigninState> {
  if (!affiliate) return AffiliateSigninState.NEW_USER;

  if (affiliate.status === "BANNED" || affiliate.status === "FLAGGED") {
    return AffiliateSigninState.BANNED;
  }

  if (affiliate.status === "VERIFIED") {
    return AffiliateSigninState.VERIFIED;
  }

  if (affiliate.status === "PENDING") {
    const orgId = await this.repository.getAffiliateOrganizationId(affiliate.id);

    if (orgId && orgId !== 1) {
      return AffiliateSigninState.PENDING_WITH_ORG;
    }

    return AffiliateSigninState.PENDING_NO_ORG;
  }

  throw new BadRequestError("Invalid affiliate state.");
}

private async sendOTPFlow(
  phone: string,
  type: "AFFILIATE_SIGNUP" | "AFFILIATE_LOGIN",
  latitude?: number,
  longitude?: number
) {
  const cachedOTP = await CacheService.getCachedOTP(phone);

  if (cachedOTP) {
    const timeRemaining = await CacheService.getOTPTimeRemaining(phone);
    return {
      cached: true,
      expiresIn: timeRemaining > 0 ? timeRemaining : 300,
    };
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await CacheService.cacheOTP(phone, otp);
  await this.repository.deleteAllOTPVerificationByPhone(phone);

  await this.repository.createOTPVerification({
    phone,
    otp,
    type,
    attempts: 0,
    verified: false,
    expiresAt,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  });

  const sent = await smsService.sendOTP(phone, otp);
  if (!sent) {
    throw new InternalServerError("We couldn't send your verification code. Please try again in a moment.");
  }

  return {
    cached: false,
    expiresIn: 600,
  };
}


private async handleInviteFlow(
affiliate: Affiliate,
phone: string
) {
// Defensive: ensure affiliate is not associated with org 1 only
const orgId = await this.repository.getAffiliateOrganizationId(affiliate.id);
if (!orgId || orgId === 1) {
throw new BadRequestError("Invitation flow is not applicable for this affiliate.");
}


if (affiliate.invitationCode) {
return {
success: true,
message: "Enter Invite code which was previously sent.",
inviteSent: true,
};
}


const invitationCode = generateInvitationCode();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);


await this.repository.updateInvitationCodeByPhone(phone, {
code: invitationCode,
expiresAt,
deleted: false,
});


await smsService.sendInvitation(phone, invitationCode, "demoName");


await this.repository.updateProfile(affiliate.id, {
invitationStatus: "SENT",
invitationCode,
});


return {
success: true,
message: "Invite code sent.",
inviteSent: true,
};
}


}
