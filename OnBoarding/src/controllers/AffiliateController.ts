import { Request, Response, NextFunction } from "express";
import { AffiliateService } from "../services/AffiliateService.js";
import {
  requestOTPSchema,
  verifyOTPSchema,
  nonAffiliateRequestSchema,
  affiliateLoginSchema,
  verifyAffiliateLoginOTPSchema,
  updateProfileSchema,
  experienceSchema,
  updateExperienceSchema,
  educationSchema,
  updateEducationSchema,
  createCampaignCollaboratorSchema,
  updateCampaignCollaboratorSchema,
} from "../dtos/onboarding.dto.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
} from "../utils/errors/AppError.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "../database/kysely/databases.js";
import { sql } from "kysely";
import { sign } from "../utils/jwt/jwt.js";
import { UserTypes } from "../interfaces/jwtPayloads.js";
import { CacheService } from "../utils/cache/cacheService.js";

const s3 = new S3Client({ region: process.env.AWS_REGION || "" });

export class AffiliateController {
  private service: AffiliateService;

  constructor() {
    this.service = new AffiliateService();
  }

  /**
   * Request OTP for Affiliate Signup
   */
  requestOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = requestOTPSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const result = await this.service.requestOTP(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Request OTP error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Verify OTP & Complete Signup
   */
  verifyOTPAndSignup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifyOTPSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const result = await this.service.verifyOTPAndSignup(req.body);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res.status(201).json(result);
    } catch (error: any) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError ||
        error instanceof NotFoundError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Verify OTP and signup error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Request Non-Affiliate Invitation
   */
  requestNonAffiliateInvitation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = nonAffiliateRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const result = await this.service.requestNonAffiliateInvitation(req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Request non-affiliate invitation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Affiliate Login (Request OTP)
   */
  affiliateLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = affiliateLoginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const result = await this.service.affiliateLogin(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof UnauthorizedError || error instanceof InternalServerError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Affiliate login (request OTP) error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * Verify Affiliate Login OTP
   */
  verifyAffiliateLoginOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = verifyAffiliateLoginOTPSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }


      const result = await this.service.verifyAffiliateLoginOTP(req.body);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res.status(200).json(result);
    } catch (error: any) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Verify affiliate login OTP error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getProfile(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Update Profile
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updateProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const result = await this.service.updateProfile(affiliateId, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  resendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;

    const result = await this.service.resendOTP(phone);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

  /**
   * Get Presigned URL
   */
 getPresignedUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        message: "fileName and fileType are required",
      });
    }

    const result = await this.service.getPresignedUrl(fileName, fileType);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to generate presigned URL",
      error: error.message,
    });
  }
};


  /**
   * Get All Athletes Under Organization
   */
  getAllAthletesUnderOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getAllAthletesUnderOrganization(
        affiliateId,
        req.query
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get all athletes under organization error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Same Organization Affiliates Data
   */
  getSameOrganizationAffiliatesData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required in params.",
        });
      }

      const result = await this.service.getSameOrganizationAffiliatesData(
        affiliateId,
        Number(id)
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get same organization affiliates data error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Signin (Universal login)
   */
  signin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, latitude, longitude } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
      }

      const result = await this.service.signin({ phone, latitude, longitude });
      return res.status(200).json(result);
    } catch (error: any) {
      if (
        error instanceof BadRequestError ||
        error instanceof InternalServerError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Signin error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * Validate Non-Affiliate OTP
   */
  validateNonAffiliateOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.service.validateNonAffiliateOTP(req.body);
      const status = result.success ? 201 : 400;
      return res.status(status).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          data: {},
        });
      }
      console.error("Verify OTP error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        data: {},
      });
    }
  };

  /**
   * Validate Invite Code
   */
  validateInviteCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, inviteCode, latitude, longitude } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required.",
          data: {},
        });
      }

      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          message: "Invite code is required.",
          data: {},
        });
      }

      // Validate invitation code exists and check expiry
      const invitation = await db
        .selectFrom("invitation_codes")
        .selectAll()
        .where("code", "=", inviteCode)
        .where("recipientPhone", "=", phone)
        .where("status", "=", "ACTIVE")
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: "Either Invitation Code or Phone Number is wrong.",
          data: {},
        });
      }

      // Auto-expire if past expiry
      if (new Date() > invitation.expiresAt) {
        await db
          .updateTable("invitation_codes")
          .set({ status: "EXPIRED" })
          .where("id", "=", invitation.id)
          .execute();

        return res.status(400).json({
          success: false,
          message: "Invitation code has expired",
          data: {},
        });
      }

      // Find affiliate record
      const affiliateRecord = await db
        .selectFrom("affiliates")
        .leftJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
        .selectAll("affiliates")
        .select("affiliate_organizations.organizationId")
        .where("affiliates.invitationCode", "=", inviteCode)
        .where("affiliates.phone", "=", phone)
        .where("affiliates.invitationStatus", "=", "SENT")
        .where((eb) => 
          eb.or([
            eb("affiliate_organizations.deleted", "=", false),
            eb("affiliate_organizations.deleted", "is", null)
          ])
        )
        .executeTakeFirst();

      if (!affiliateRecord) {
        return res.status(400).json({
          success: false,
          message: "Either Invitation Code or Phone Number is wrong.",
          data: {},
        });
      }

      // Update affiliate status + location (if provided)
      await db
        .updateTable("affiliates")
        .set({
          invitationStatus: "ACCEPTED",
          status: "VERIFIED",
          latitude: latitude ?? affiliateRecord.latitude,
          longitude: longitude ?? affiliateRecord.longitude,
          updatedAt: new Date(),
        })
        .where("id", "=", affiliateRecord.id)
        .execute();

      // Consume invitation
      await db
        .updateTable("invitation_codes")
        .set({
          status: "USED",
          usedAt: new Date(),
          usedBy: affiliateRecord.id,
        })
        .where("recipientPhone", "=", phone)
        .where("code", "=", inviteCode)
        .execute();

      // Get organizationId from the query result
      const orgId = (affiliateRecord as any).organizationId || null;

      // Generate token
      const cachedToken = await CacheService.getCachedJWT(
        affiliateRecord.id,
        UserTypes.AFFILIATE
      );

      let token = cachedToken;
      if (!token) {
        token = sign({
          id: affiliateRecord.id,
          type: UserTypes.AFFILIATE,
          organizationId: orgId || 1,
        });
        await CacheService.cacheJWT(
          affiliateRecord.id,
          UserTypes.AFFILIATE,
          token
        );
      }

      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

      return res.status(201).json({
        success: true,
        message: "Affiliate signup completed successfully",
        data: {
          isInviteValid: true,
          token,
          tokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
          affiliate: {
            id: affiliateRecord.id,
            name: affiliateRecord.name,
            phone: affiliateRecord.phone,
            organizationId: orgId || 1,
            status: "VERIFIED",
            role: affiliateRecord.role,
            email: affiliateRecord.email || null,
            latitude: affiliateRecord.latitude,
            longitude: affiliateRecord.longitude,
          },
        },
      });
    } catch (error: any) {
      console.error("Validate invite code error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        data: {},
      });
    }
  };

  athleteUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const affiliateId = req.user!.id;

    const { role, sportsCategoryId, city, state, profilePicture } = req.body;

    if (
      role === undefined &&
      sportsCategoryId === undefined &&
      city === undefined &&
      state === undefined &&
      profilePicture === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "At least one field is required to update profile",
      });
      return;
    }

    const updatedAffiliate =
      await this.service.updateAthleteProfile(affiliateId, {
        role,
        sportsCategoryId,
        city,
        state,
        profilePicture: profilePicture,
      });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedAffiliate,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

  /**
   * Validate Affiliate OTP
   */
  validateAffiliateOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, otp, latitude, longitude } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          message: "Phone and OTP are required.",
          data: {},
        });
      }

      const result = await this.service.validateAffiliateOTP({
        phone,
        otp,
        latitude,
        longitude,
      });
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res.status(200).json(result);
    } catch (error: any) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          data: {},
        });
      }
      console.error("Validate affiliate OTP error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        data: {},
      });
    }
  };

  // Experience methods
  addExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = experienceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const result = await this.service.addExperience(affiliateId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Add experience error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getExperiences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getExperiences(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get experiences error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  updateExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updateExperienceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.updateExperience(
        Number(id),
        affiliateId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update experience error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.deleteExperience(Number(id));
      return res.status(200).json({
        success: true,
        message: "Experience deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete experience error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Education methods
  addEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = educationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const result = await this.service.addEducation(affiliateId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Add education error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getEducation(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get education error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  updateEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updateEducationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.updateEducation(
        Number(id),
        affiliateId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update education error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.deleteEducation(Number(id));
      return res.status(200).json({
        success: true,
        message: "Education deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete education error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Certificate methods
  createAffiliateCertificate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.createCertificate(affiliateId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Create certificate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getAllAffiliateCertificates = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getAllCertificates(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get all certificates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getAffiliateCertificateById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.getCertificateById(Number(id), affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get certificate by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  updateAffiliateCertificate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.updateCertificate(
        Number(id),
        affiliateId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update certificate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteAffiliateCertificate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      await this.service.deleteCertificate(Number(id), affiliateId);
      return res.status(200).json({
        success: true,
        message: "Certificate deleted successfully",
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Delete certificate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Award Recognition methods
  createAffiliateAwardRecognition = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.createAwardRecognition(affiliateId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Create award recognition error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getAllAffiliateAwardRecognitions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getAllAwardRecognitions(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get all award recognitions error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getAffiliateAwardRecognitionById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.getAwardRecognitionById(Number(id), affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get award recognition by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  updateAffiliateAwardRecognition = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.updateAwardRecognition(
        Number(id),
        affiliateId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update award recognition error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteAffiliateAwardRecognition = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      await this.service.deleteAwardRecognition(Number(id), affiliateId);
      return res.status(200).json({
        success: true,
        message: "Award recognition deleted successfully",
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Delete award recognition error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Publication methods
  createAffiliatePublication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.createPublication(affiliateId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Create publication error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getAllAffiliatePublications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getAllPublications(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get all publications error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getAffiliatePublicationById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.getPublicationById(Number(id), affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get publication by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  updateAffiliatePublication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.updatePublication(
        Number(id),
        affiliateId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update publication error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteAffiliatePublication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      await this.service.deletePublication(Number(id), affiliateId);
      return res.status(200).json({
        success: true,
        message: "Publication deleted successfully",
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Delete publication error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Campaign Collaborator methods
  createCollaborator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = createCampaignCollaboratorSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const result = await this.service.createCollaborator(affiliateId, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Create collaborator error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getCollaboratorByAffiliate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getCollaboratorByAffiliate(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get collaborator by affiliate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  updateCollaborator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updateCampaignCollaboratorSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const affiliateId = req.user!.id;
      const { id } = req.params;
      const result = await this.service.updateCollaborator(
        Number(id),
        affiliateId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update collaborator error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteCollaborator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const { id } = req.params;
      await this.service.deleteCollaborator(Number(id), affiliateId);
      return res.status(200).json({
        success: true,
        message: "Campaign collaborator deleted successfully",
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Delete collaborator error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Basic Info
   */
  getBasicInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.getBasicInfo(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Add Brand
   */
  addBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "NOT AUTHORIED.",
        });
      }

      const brandId = Number(req.params.id);
      const result = await this.service.addBrand(affiliateId, brandId);
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  /**
   * Delete Brand
   */
  deleteBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "NOT AUTHORIED.",
        });
      }

      const brandId = Number(req.params.id);
      const result = await this.service.deleteBrand(affiliateId, brandId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  /**
   * Get All Brands for Affiliate
   */
  getAllBrandsForAffiliate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const affiliateId = req.user!.id;
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "NOT AUTHORIED.",
        });
      }

      const result = await this.service.getAllBrandsForAffiliate(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  /**
   * Update Brand
   */
  updateBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "NOT AUTHORIED.",
        });
      }

      const brandId = Number(req?.params?.id);
      const result = await this.service.updateBrand(affiliateId, brandId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  /**
   * Delete Profile
   */
  deleteProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "NOT AUTHORIZED",
        });
      }

      const result = await this.service.deleteProfile(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  /**
   * Generate Profile Link
   */
  generateProfileLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const result = await this.service.generateProfileLink(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Generate slug error:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong, please try again later",
      });
    }
  };

  /**
   * Get Public Profile
   */
  getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug?.trim();
      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Profile slug is required",
        });
      }

      const result = await this.service.getPublicProfile(slug);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get public profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong, please try again later",
      });
    }
  };

  fetchDataFromRapidApi = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const affiliateId = Number(req.user?.id); // assuming auth middleware
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Instagram username is required",
      });
    }

    const data = await this.service.fetchAndSaveInstagramData(
      affiliateId,
      username
    );

    return res.status(200).json({
      success: true,
      message: "Instagram data fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Fetch Instagram data error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later",
    });
  }
};

getInstagramData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const loggedInAffiliateId = Number(req.user?.id);


    const data = await this.service.getInstagramData(loggedInAffiliateId);

    return res.status(200).json({
      success: true,
      message: "Instagram data fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Get Instagram data error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later",
    });
  }
};

deleteInstagramData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const loggedInAffiliateId = Number(req.user?.id);


    const data = await this.service.deleteInstagramData(loggedInAffiliateId);

    return res.status(200).json({
      success: true,
      message: "Instagram data deleted successfully",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Delete Instagram data error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later",
    });
  }
};

/**
 * Submit KYC document
 */
submitKYC = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req.user?.id);
    const { document_type, document_url, document_number } = req.body;

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
    }

    if (!document_type || !document_url) {
      return res.status(400).json({
        success: false,
        message: "document_type and document_url are required",
      });
    }

    const validTypes = ["AADHAAR_FRONT", "AADHAAR_BACK", "PAN"];
    if (!validTypes.includes(document_type)) {
      return res.status(400).json({
        success: false,
        message: `document_type must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Insert KYC document
    const kycDoc = await db
      .insertInto("kyc_documents" as any)
      .values({
        affiliate_id: affiliateId,
        document_type,
        document_url,
        document_number: document_number || null,
        status: "PENDING",
      })
      .returningAll()
      .executeTakeFirst();

    // Update affiliate kyc_status to PENDING
    await db
      .updateTable("affiliates")
      .set({ kyc_status: "PENDING" } as any)
      .where("id", "=", affiliateId)
      .where("deleted", "=", false)
      .execute();

    return res.status(201).json({
      success: true,
      message: "KYC document submitted successfully",
      data: kycDoc,
    });
  } catch (error) {
    console.error("Submit KYC error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Forgot password — send OTP to phone
 */
forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Verify affiliate exists
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["id", "phone", "status"])
      .where("phone", "=", phone)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number",
      });
    }

    // Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db
      .insertInto("otp_verification")
      .values({
        phone,
        otp,
        type: "PASSWORD_RESET",
        attempts: 0,
        verified: false,
        expiresAt,
      })
      .execute();

    // In production, send SMS here
    // await smsService.sendOTP(phone, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: {
        phone,
        expiresIn: 600,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reset password — verify OTP and update password
 */
resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "phone, otp, and newPassword are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Verify OTP
    const otpRecord = await db
      .selectFrom("otp_verification")
      .selectAll()
      .where("phone", "=", phone)
      .where("type", "=", "PASSWORD_RESET")
      .where("verified", "=", false)
      .orderBy("createdAt", "desc")
      .executeTakeFirst();

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found. Please request a new one.",
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (otpRecord.otp !== otp) {
      // Increment attempts
      await db
        .updateTable("otp_verification")
        .set({ attempts: otpRecord.attempts + 1 })
        .where("id", "=", otpRecord.id)
        .execute();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Mark OTP as verified
    await db
      .updateTable("otp_verification")
      .set({ verified: true })
      .where("id", "=", otpRecord.id)
      .execute();

    // Hash password and update affiliate
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db
      .updateTable("affiliates")
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where("phone", "=", phone)
      .where("deleted", "=", false)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Search affiliates — public endpoint
 */
searchAffiliates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;
    const { sport, location, name } = req.query;

    let query = db
      .selectFrom("affiliates")
      .select([
        "id",
        "name",
        "profilePicture",
        "sportsCategoryId",
        "city",
        "bio",
        "role",
        "gender",
      ])
      .where("deleted", "=", false)
      .where("status", "=", "VERIFIED");

    if (name) {
      query = query.where("name", "ilike", `%${name}%`);
    }

    if (location) {
      query = query.where("city", "ilike", `%${location}%`);
    }

    if (sport) {
      query = query.where("sportsCategoryId", "=", Number(sport));
    }

    const affiliates = await query
      .orderBy("name", "asc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: affiliates.length > 0
        ? "Affiliates found"
        : "No affiliates found matching your criteria",
      count: affiliates.length,
      data: affiliates,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Search affiliates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Follow an affiliate
 */
followAffiliate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = Number(req.user?.id);
    const { followingId } = req.body;

    if (!followerId) {
      return res.status(400).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!followingId) {
      return res.status(400).json({
        success: false,
        message: "followingId is required",
      });
    }

    if (followerId === Number(followingId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    // Check if target affiliate exists
    const targetAffiliate = await db
      .selectFrom("affiliates")
      .select(["id"])
      .where("id", "=", Number(followingId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!targetAffiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate not found",
      });
    }

    // Check if already following
    const existingFollow = await db
      .selectFrom("affiliate_follows" as any)
      .select(["follower_id"])
      .where("follower_id", "=", followerId)
      .where("following_id", "=", Number(followingId))
      .executeTakeFirst();

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "You are already following this affiliate",
      });
    }

    await db
      .insertInto("affiliate_follows" as any)
      .values({
        follower_id: followerId,
        following_id: Number(followingId),
      })
      .execute();

    return res.status(201).json({
      success: true,
      message: "Successfully followed affiliate",
    });
  } catch (error) {
    console.error("Follow affiliate error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Unfollow an affiliate
 */
unfollowAffiliate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = Number(req.user?.id);
    const affiliateId = Number(req.params.affiliateId);

    if (!followerId) {
      return res.status(400).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!affiliateId || isNaN(affiliateId)) {
      return res.status(400).json({
        success: false,
        message: "Valid affiliateId is required",
      });
    }

    const result = await db
      .deleteFrom("affiliate_follows" as any)
      .where("follower_id", "=", followerId)
      .where("following_id", "=", affiliateId)
      .executeTakeFirst();

    if (Number(result?.numDeletedRows ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: "Follow relationship not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Successfully unfollowed affiliate",
    });
  } catch (error) {
    console.error("Unfollow affiliate error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get followers of an affiliate
 */
getFollowers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req.params.affiliateId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    if (!affiliateId || isNaN(affiliateId)) {
      return res.status(400).json({
        success: false,
        message: "Valid affiliateId is required",
      });
    }

    const followers = await db
      .selectFrom("affiliate_follows as af" as any)
      .innerJoin("affiliates as a", "a.id", "af.follower_id" as any)
      .select([
        "a.id",
        "a.name",
        "a.profilePicture",
        "a.bio",
        "af.created_at" as any,
      ])
      .where("af.following_id" as any, "=", affiliateId)
      .where("a.deleted", "=", false)
      .orderBy("af.created_at" as any, "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Followers fetched successfully",
      count: followers.length,
      data: followers,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get followers error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get profile strength/completeness
 */
getProfileStrength = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;

    const affiliate = await db
      .selectFrom("affiliates")
      .selectAll()
      .where("id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate not found",
      });
    }

    const fields: { field: string; weight: number; check: boolean }[] = [
      { field: "name", weight: 10, check: !!affiliate.name },
      { field: "profilePicture", weight: 15, check: !!affiliate.profilePicture },
      { field: "bio", weight: 10, check: !!affiliate.bio },
      { field: "dateOfBirth", weight: 5, check: !!affiliate.dateOfBirth },
      { field: "gender", weight: 5, check: !!affiliate.gender },
      { field: "sportsCategoryId", weight: 10, check: !!affiliate.sportsCategoryId },
      { field: "experience", weight: 5, check: !!affiliate.experience },
      { field: "city", weight: 5, check: !!affiliate.city },
      { field: "email", weight: 5, check: !!affiliate.email },
      { field: "phone", weight: 5, check: !!affiliate.phone },
      { field: "achievements", weight: 10, check: !!affiliate.achievements },
      { field: "kyc_status", weight: 15, check: (affiliate as any).kyc_status === "VERIFIED" },
    ];

    let strength = 0;
    const missing: string[] = [];

    for (const f of fields) {
      if (f.check) {
        strength += f.weight;
      } else {
        missing.push(f.field);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile strength calculated",
      data: {
        strength,
        missing,
      },
    });
  } catch (error: any) {
    console.error("Get profile strength error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get notification preferences
 */
getNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;

    let prefs = await db
      .selectFrom("notification_preferences" as any)
      .selectAll()
      .where("affiliate_id", "=", affiliateId)
      .executeTakeFirst();

    // Create defaults if not exists
    if (!prefs) {
      prefs = await db
        .insertInto("notification_preferences" as any)
        .values({
          affiliate_id: affiliateId,
          push_follows: true,
          push_likes: true,
          push_comments: true,
          push_events: true,
          push_campaigns: true,
          push_payments: true,
          email_events: true,
          email_campaigns: true,
          email_payments: true,
          dnd_start: null,
          dnd_end: null,
          updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirst();
    }

    return res.status(200).json({
      success: true,
      message: "Notification preferences fetched successfully",
      data: prefs,
    });
  } catch (error: any) {
    console.error("Get notification preferences error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update notification preferences
 */
updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;

    const allowedFields = [
      "push_follows", "push_likes", "push_comments", "push_events",
      "push_campaigns", "push_payments", "email_events", "email_campaigns",
      "email_payments", "dnd_start", "dnd_end",
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one preference field is required to update",
      });
    }

    updateData.updated_at = new Date();

    // Upsert: check if row exists first
    const existing = await db
      .selectFrom("notification_preferences" as any)
      .select(["affiliate_id"])
      .where("affiliate_id", "=", affiliateId)
      .executeTakeFirst();

    let prefs;
    if (existing) {
      prefs = await db
        .updateTable("notification_preferences" as any)
        .set(updateData)
        .where("affiliate_id", "=", affiliateId)
        .returningAll()
        .executeTakeFirst();
    } else {
      prefs = await db
        .insertInto("notification_preferences" as any)
        .values({
          affiliate_id: affiliateId,
          ...updateData,
        })
        .returningAll()
        .executeTakeFirst();
    }

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: prefs,
    });
  } catch (error: any) {
    console.error("Update notification preferences error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// MEDIA GALLERY
// ============================================================

/**
 * Add a media item to affiliate's gallery
 */
addMediaItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;
    const { media_type, media_url, thumbnail_url, caption, display_order } = req.body;

    if (!media_type || !media_url) {
      return res.status(400).json({
        success: false,
        message: "media_type and media_url are required",
      });
    }

    const validTypes = ["photo", "video"];
    if (!validTypes.includes(media_type)) {
      return res.status(400).json({
        success: false,
        message: `media_type must be one of: ${validTypes.join(", ")}`,
      });
    }

    const mediaItem = await db
      .insertInto("affiliate_media" as any)
      .values({
        affiliate_id: affiliateId,
        media_type,
        media_url,
        thumbnail_url: thumbnail_url || null,
        caption: caption || null,
        display_order: display_order || 0,
      })
      .returningAll()
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Media item added successfully",
      data: mediaItem,
    });
  } catch (error) {
    console.error("Add media item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get media gallery for an affiliate (public)
 */
getMediaGallery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req.params.affiliateId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    if (!affiliateId || isNaN(affiliateId)) {
      return res.status(400).json({
        success: false,
        message: "Valid affiliateId is required",
      });
    }

    const media = await db
      .selectFrom("affiliate_media" as any)
      .selectAll()
      .where("affiliate_id", "=", affiliateId)
      .orderBy("display_order", "asc")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Media gallery fetched successfully",
      count: media.length,
      data: media,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get media gallery error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete a media item (only own items)
 */
deleteMediaItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;
    const mediaId = req.params.mediaId;

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        message: "Media ID is required",
      });
    }

    // Check ownership
    const mediaItem = await db
      .selectFrom("affiliate_media" as any)
      .select(["id", "affiliate_id"])
      .where("id", "=", mediaId)
      .where("affiliate_id", "=", affiliateId)
      .executeTakeFirst();

    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        message: "Media item not found or does not belong to you",
      });
    }

    await db
      .deleteFrom("affiliate_media" as any)
      .where("id", "=", mediaId)
      .where("affiliate_id", "=", affiliateId)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Media item deleted successfully",
    });
  } catch (error) {
    console.error("Delete media item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reorder media items
 */
reorderMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items array is required with [{id, display_order}] format",
      });
    }

    // Update each item's display_order
    for (const item of items) {
      if (!item.id || item.display_order === undefined) {
        continue;
      }

      await db
        .updateTable("affiliate_media" as any)
        .set({ display_order: item.display_order })
        .where("id", "=", item.id)
        .where("affiliate_id", "=", affiliateId)
        .execute();
    }

    return res.status(200).json({
      success: true,
      message: "Media items reordered successfully",
    });
  } catch (error) {
    console.error("Reorder media error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// INVITATION SYSTEM
// ============================================================

/**
 * Generate invitation code for an affiliate (Organization only)
 */
generateInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.id;
    const { affiliate_id, email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Either email or phone is required",
      });
    }

    // Generate unique invitation code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let invitationCode = "INV-";
    for (let i = 0; i < 8; i++) {
      invitationCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Set expiry to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await db
      .insertInto("affiliate_invitations" as any)
      .values({
        organization_id: organizationId,
        affiliate_id: affiliate_id || null,
        invitation_code: invitationCode,
        email: email || null,
        phone: phone || null,
        status: "PENDING",
        expires_at: expiresAt,
      })
      .returningAll()
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Invitation generated successfully",
      data: invitation,
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "An invitation with this code already exists. Please try again.",
      });
    }
    console.error("Generate invitation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all invitations sent by the organization
 */
getInvitations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = db
      .selectFrom("affiliate_invitations" as any)
      .selectAll()
      .where("organization_id", "=", organizationId)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where("status", "=", status);
    }

    const invitations = await query.execute();

    return res.status(200).json({
      success: true,
      message: "Invitations fetched successfully",
      count: invitations.length,
      data: invitations,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get invitations error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Accept an invitation code (Affiliate)
 */
acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = req.user!.id;
    const { invitation_code } = req.body;

    if (!invitation_code) {
      return res.status(400).json({
        success: false,
        message: "invitation_code is required",
      });
    }

    // Find the invitation
    const invitation = await db
      .selectFrom("affiliate_invitations" as any)
      .selectAll()
      .where("invitation_code", "=", invitation_code)
      .where("status", "=", "PENDING")
      .executeTakeFirst();

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or already used/expired",
      });
    }

    // Check if expired
    if (new Date() > new Date((invitation as any).expires_at)) {
      await db
        .updateTable("affiliate_invitations" as any)
        .set({ status: "EXPIRED" })
        .where("id", "=", (invitation as any).id)
        .execute();

      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Accept the invitation
    const updatedInvitation = await db
      .updateTable("affiliate_invitations" as any)
      .set({
        status: "ACCEPTED",
        affiliate_id: affiliateId,
        accepted_at: new Date(),
      })
      .where("id", "=", (invitation as any).id)
      .returningAll()
      .executeTakeFirst();

    // Link affiliate to organization if not already linked
    const orgId = (invitation as any).organization_id;
    try {
      const existingLink = await db
        .selectFrom("affiliate_organizations")
        .select(["id"])
        .where("affiliateId" as any, "=", affiliateId)
        .where("organizationId" as any, "=", orgId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!existingLink) {
        await db
          .insertInto("affiliate_organizations")
          .values({
            affiliateId: affiliateId,
            organizationId: orgId,
          } as any)
          .execute();
      }
    } catch (linkError) {
      console.error("Failed to link affiliate to organization:", linkError);
    }

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: updatedInvitation,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Revoke a pending invitation (Organization only)
 */
revokeInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invitation ID is required",
      });
    }

    // Find and verify ownership
    const invitation = await db
      .selectFrom("affiliate_invitations" as any)
      .select(["id", "organization_id", "status"])
      .where("id", "=", id)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or does not belong to your organization",
      });
    }

    if ((invitation as any).status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending invitations can be revoked",
      });
    }

    await db
      .updateTable("affiliate_invitations" as any)
      .set({ status: "REVOKED" })
      .where("id", "=", id)
      .where("organization_id", "=", organizationId)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully",
    });
  } catch (error) {
    console.error("Revoke invitation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get following list of an affiliate
 */
getFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req.params.affiliateId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    if (!affiliateId || isNaN(affiliateId)) {
      return res.status(400).json({
        success: false,
        message: "Valid affiliateId is required",
      });
    }

    const following = await db
      .selectFrom("affiliate_follows as af" as any)
      .innerJoin("affiliates as a", "a.id", "af.following_id" as any)
      .select([
        "a.id",
        "a.name",
        "a.profilePicture",
        "a.bio",
        "af.created_at" as any,
      ])
      .where("af.follower_id" as any, "=", affiliateId)
      .where("a.deleted", "=", false)
      .orderBy("af.created_at" as any, "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Following list fetched successfully",
      count: following.length,
      data: following,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get following error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

  /**
   * Endorse an Affiliate
   */
  endorseAffiliate = async (req: Request, res: Response) => {
    try {
      const endorserId = req.user!.id;
      const { endorsedId, skill, message } = req.body;

      if (!endorsedId || !skill) {
        return res.status(400).json({
          success: false,
          message: "endorsedId and skill are required",
        });
      }

      if (endorserId === Number(endorsedId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot endorse yourself",
        });
      }

      // Check endorsed affiliate exists
      const endorsed = await db
        .selectFrom("affiliates")
        .select(["id", "name"])
        .where("id", "=", Number(endorsedId))
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!endorsed) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found",
        });
      }

      // Check if already endorsed for this skill
      const existing = await db
        .selectFrom("affiliate_endorsements" as any)
        .select(["id" as any])
        .where("endorser_id" as any, "=", endorserId)
        .where("endorsed_id" as any, "=", Number(endorsedId))
        .where("skill" as any, "=", skill)
        .executeTakeFirst();

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "You have already endorsed this affiliate for this skill",
        });
      }

      const endorsement = await db
        .insertInto("affiliate_endorsements" as any)
        .values({
          endorser_id: endorserId,
          endorsed_id: Number(endorsedId),
          skill,
          message: message || null,
        } as any)
        .returning(["id", "endorser_id", "endorsed_id", "skill", "message", "created_at"] as any[])
        .executeTakeFirst();

      return res.status(201).json({
        success: true,
        message: "Endorsement added successfully",
        data: endorsement,
      });
    } catch (error: any) {
      console.error("Endorse affiliate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Remove an Endorsement
   */
  removeEndorsement = async (req: Request, res: Response) => {
    try {
      const endorserId = req.user!.id;
      const { endorsementId } = req.params;

      if (!endorsementId || isNaN(Number(endorsementId))) {
        return res.status(400).json({
          success: false,
          message: "Valid endorsementId is required",
        });
      }

      // Verify the endorsement belongs to the requester
      const endorsement = await db
        .selectFrom("affiliate_endorsements" as any)
        .select(["id", "endorser_id"] as any[])
        .where("id" as any, "=", Number(endorsementId))
        .executeTakeFirst();

      if (!endorsement) {
        return res.status(404).json({
          success: false,
          message: "Endorsement not found",
        });
      }

      if ((endorsement as any).endorser_id !== endorserId) {
        return res.status(403).json({
          success: false,
          message: "You can only remove your own endorsements",
        });
      }

      await db
        .deleteFrom("affiliate_endorsements" as any)
        .where("id" as any, "=", Number(endorsementId))
        .execute();

      return res.status(200).json({
        success: true,
        message: "Endorsement removed successfully",
      });
    } catch (error: any) {
      console.error("Remove endorsement error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Endorsements for an Affiliate
   */
  getEndorsements = async (req: Request, res: Response) => {
    try {
      const { affiliateId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      if (!affiliateId || isNaN(Number(affiliateId))) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliateId is required",
        });
      }

      const endorsements = await db
        .selectFrom("affiliate_endorsements as ae" as any)
        .innerJoin("affiliates as a", "a.id", "ae.endorser_id" as any)
        .select([
          "ae.id" as any,
          "ae.skill" as any,
          "ae.message" as any,
          "ae.created_at" as any,
          "a.id as endorser_id" as any,
          "a.name as endorser_name" as any,
          "a.profilePicture as endorser_picture" as any,
        ])
        .where("ae.endorsed_id" as any, "=", Number(affiliateId))
        .orderBy("ae.created_at" as any, "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      const countResult = await db
        .selectFrom("affiliate_endorsements" as any)
        .select(db.fn.countAll().as("total"))
        .where("endorsed_id" as any, "=", Number(affiliateId))
        .executeTakeFirst();

      const total = Number((countResult as any)?.total) || 0;

      return res.status(200).json({
        success: true,
        message: "Endorsements retrieved successfully",
        data: endorsements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get endorsements error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Endorsement Stats for an Affiliate
   */
  getEndorsementStats = async (req: Request, res: Response) => {
    try {
      const { affiliateId } = req.params;

      if (!affiliateId || isNaN(Number(affiliateId))) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliateId is required",
        });
      }

      // Total endorsements
      const totalResult = await db
        .selectFrom("affiliate_endorsements" as any)
        .select(db.fn.countAll().as("total"))
        .where("endorsed_id" as any, "=", Number(affiliateId))
        .executeTakeFirst();

      const totalEndorsements = Number((totalResult as any)?.total) || 0;

      // Unique endorsers
      const uniqueEndorsersResult = await (db
        .selectFrom("affiliate_endorsements" as any) as any)
        .select(sql`COUNT(DISTINCT endorser_id)::int`.as("count"))
        .where("endorsed_id", "=", Number(affiliateId))
        .executeTakeFirst();

      const uniqueEndorsers = (uniqueEndorsersResult as any)?.count || 0;

      // Top skills (grouped by skill with count)
      const topSkills = await (db
        .selectFrom("affiliate_endorsements" as any) as any)
        .select([
          "skill",
          sql`COUNT(*)::int`.as("count"),
        ])
        .where("endorsed_id", "=", Number(affiliateId))
        .groupBy("skill")
        .orderBy(sql`COUNT(*)`, "desc")
        .limit(10)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Endorsement stats retrieved successfully",
        data: {
          totalEndorsements,
          uniqueEndorsers,
          topSkills,
        },
      });
    } catch (error: any) {
      console.error("Get endorsement stats error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== PERFORMANCE STATS ====================

  /**
   * Get Performance Stats for an Affiliate
   */
  getPerformanceStats = async (req: Request, res: Response) => {
    try {
      const { affiliateId } = req.params;

      if (!affiliateId || isNaN(Number(affiliateId))) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliateId is required",
        });
      }

      const id = Number(affiliateId);

      // Events participated
      const eventsResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_event_responses
        WHERE affiliate_id = ${id} AND deleted = false
      `.execute(db);
      const eventsParticipated = (eventsResult.rows[0] as any)?.count || 0;

      // Campaigns completed
      const campaignsResult = await sql`
        SELECT COUNT(*)::int as count FROM campaign_affiliate_registrations
        WHERE affiliate_id = ${id} AND status = 'COMPLETED' AND deleted = false
      `.execute(db);
      const campaignsCompleted = (campaignsResult.rows[0] as any)?.count || 0;

      // Endorsements received
      const endorsementsResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_endorsements
        WHERE endorsed_id = ${id}
      `.execute(db);
      const endorsements = (endorsementsResult.rows[0] as any)?.count || 0;

      // Posts count
      const postsResult = await sql`
        SELECT COUNT(*)::int as count FROM posts
        WHERE affiliate_id = ${id} AND is_deleted = false
      `.execute(db);
      const posts = (postsResult.rows[0] as any)?.count || 0;

      // Followers count
      const followersResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_follows
        WHERE following_id = ${id}
      `.execute(db);
      const followers = (followersResult.rows[0] as any)?.count || 0;

      // Profile views
      const viewsResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_profile_views
        WHERE affiliate_id = ${id}
      `.execute(db);
      const profileViews = (viewsResult.rows[0] as any)?.count || 0;

      // Overall composite score
      const overallScore = (eventsParticipated * 10) + (campaignsCompleted * 15) + (endorsements * 5) + (posts * 2) + (followers * 1) + (profileViews * 0.5);

      return res.status(200).json({
        success: true,
        message: "Performance stats retrieved successfully",
        data: {
          eventsParticipated,
          campaignsCompleted,
          endorsements,
          posts,
          followers,
          profileViews,
          overallScore: Math.round(overallScore),
        },
      });
    } catch (error: any) {
      console.error("Get performance stats error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Track Profile View
   */
  trackProfileView = async (req: Request, res: Response) => {
    try {
      const { affiliateId } = req.params;
      const viewerId = req.body.viewerId || null;

      if (!affiliateId || isNaN(Number(affiliateId))) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliateId is required",
        });
      }

      await db
        .insertInto("affiliate_profile_views" as any)
        .values({
          affiliate_id: Number(affiliateId),
          viewer_id: viewerId ? Number(viewerId) : null,
        } as any)
        .execute();

      return res.status(201).json({
        success: true,
        message: "Profile view tracked",
      });
    } catch (error: any) {
      console.error("Track profile view error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Leaderboard — top affiliates by sport
   */
  getLeaderboard = async (req: Request, res: Response) => {
    try {
      const sportsCategoryId = req.query.sportsCategoryId ? Number(req.query.sportsCategoryId) : null;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      let baseQuery = sql`
        SELECT
          a.id,
          a.name,
          a."profilePicture",
          a."sportsCategoryId",
          sc.title as sports_category_name,
          COALESCE(ev.count, 0)::int as events_participated,
          COALESCE(ca.count, 0)::int as campaigns_completed,
          COALESCE(en.count, 0)::int as endorsements,
          COALESCE(fo.count, 0)::int as followers,
          (COALESCE(ev.count, 0) * 10 + COALESCE(ca.count, 0) * 15 + COALESCE(en.count, 0) * 5 + COALESCE(fo.count, 0))::int as score
        FROM affiliates a
        LEFT JOIN sports_category sc ON sc.id = a."sportsCategoryId"
        LEFT JOIN (SELECT affiliate_id, COUNT(*)::int as count FROM affiliate_event_responses WHERE deleted = false GROUP BY affiliate_id) ev ON ev.affiliate_id = a.id
        LEFT JOIN (SELECT affiliate_id, COUNT(*)::int as count FROM campaign_affiliate_registrations WHERE status = 'COMPLETED' AND deleted = false GROUP BY affiliate_id) ca ON ca.affiliate_id = a.id
        LEFT JOIN (SELECT endorsed_id, COUNT(*)::int as count FROM affiliate_endorsements GROUP BY endorsed_id) en ON en.endorsed_id = a.id
        LEFT JOIN (SELECT following_id, COUNT(*)::int as count FROM affiliate_follows GROUP BY following_id) fo ON fo.following_id = a.id
        WHERE a.deleted = false AND a.status = 'VERIFIED'
      `;

      if (sportsCategoryId) {
        baseQuery = sql`${baseQuery} AND a."sportsCategoryId" = ${sportsCategoryId}`;
      }

      baseQuery = sql`${baseQuery} ORDER BY score DESC LIMIT ${limit}`;

      const result = await baseQuery.execute(db);

      return res.status(200).json({
        success: true,
        message: "Leaderboard retrieved successfully",
        data: result.rows,
      });
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== FEEDBACK SYSTEM ====================

  /**
   * Submit Feedback
   */
  submitFeedback = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { rating, category, message, screenshotUrl } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Feedback message is required",
        });
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      const feedback = await db
        .insertInto("user_feedback" as any)
        .values({
          user_id: userId,
          user_type: "affiliate",
          rating: rating || null,
          category: category || null,
          message,
          screenshot_url: screenshotUrl || null,
          status: "PENDING",
        } as any)
        .returning(["id", "user_id", "rating", "category", "message", "status", "created_at"] as any[])
        .executeTakeFirst();

      return res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        data: feedback,
      });
    } catch (error: any) {
      console.error("Submit feedback error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get My Feedback
   */
  getMyFeedback = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const feedback = await db
        .selectFrom("user_feedback" as any)
        .selectAll()
        .where("user_id" as any, "=", userId)
        .orderBy("created_at" as any, "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Feedback retrieved successfully",
        data: feedback,
        pagination: { page, limit },
      });
    } catch (error: any) {
      console.error("Get my feedback error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== AFFILIATE PORTFOLIO / MEDIA KIT (Round 7) ====================

  /**
   * Get a compiled portfolio for an affiliate (public-facing "media kit").
   * Returns profile info, achievements, media gallery, stats, endorsements,
   * event history, and campaign history.
   */
  getPortfolio = async (req: Request, res: Response) => {
    try {
      const affiliateId = Number(req.params.affiliateId);
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      // Profile info
      const profile = await sql`
        SELECT
          a.id, a.name, a."role", a.email, a.phone, a."dateOfBirth", a.gender,
          a.experience, a.position, a."profilePicture", a."coverPhoto", a.bio,
          a.achievements, a.geography, a."followersRange", a.height, a.weight,
          a.city, a.profile_slug,
          sc.title as sport_category,
          so.name as organization_name
        FROM affiliates a
        LEFT JOIN sports_category sc ON sc.id = a."sportsCategoryId"
        LEFT JOIN sports_organizations so ON so.id = a."organizationId"
        WHERE a.id = ${affiliateId} AND a.deleted = false
      `.execute(db);

      if (!profile.rows.length) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found.",
        });
      }

      // Education
      const education = await sql`
        SELECT * FROM education
        WHERE "affiliateId" = ${affiliateId} AND deleted = false
        ORDER BY "fromYear" DESC
      `.execute(db);

      // Experience
      const experience = await sql`
        SELECT * FROM experience
        WHERE "affiliateId" = ${affiliateId} AND deleted = false
        ORDER BY "fromDate" DESC
      `.execute(db);

      // Awards / Recognitions
      const awards = await sql`
        SELECT * FROM affiliate_award_recognitions
        WHERE "affiliateId" = ${affiliateId}
        ORDER BY year DESC
      `.execute(db);

      // Certificates
      const certificates = await sql`
        SELECT * FROM affiliate_certificates
        WHERE "affiliateId" = ${affiliateId}
        ORDER BY year DESC
      `.execute(db);

      // Publications
      const publications = await sql`
        SELECT * FROM affiliate_publications
        WHERE "affiliateId" = ${affiliateId}
        ORDER BY year DESC
      `.execute(db);

      // Media gallery
      const media = await sql`
        SELECT * FROM affiliate_media
        WHERE affiliate_id = ${affiliateId} AND deleted = false
        ORDER BY sort_order ASC, created_at DESC
        LIMIT 20
      `.execute(db);

      // Endorsements
      const endorsements = await sql`
        SELECT ae.*, a.name as endorser_name, a."profilePicture" as endorser_photo
        FROM affiliate_endorsements ae
        INNER JOIN affiliates a ON a.id = ae.endorser_id
        WHERE ae.endorsed_id = ${affiliateId}
        ORDER BY ae.created_at DESC
        LIMIT 10
      `.execute(db);

      // Event history
      const eventHistory = await sql`
        SELECT
          e.id as event_id, e.name as event_name, e."startDate", e."endDate",
          e.venue, e."eventType", e."organizationName",
          aer.status as registration_status
        FROM affiliate_event_responses aer
        INNER JOIN events e ON e.id = aer.event_id
        WHERE aer.affiliate_id = ${affiliateId} AND aer.deleted = false AND e.deleted = false
        ORDER BY e."startDate" DESC
        LIMIT 20
      `.execute(db);

      // Campaign history
      const campaignHistory = await sql`
        SELECT
          c.id as campaign_id, c.description as campaign_description, c.product,
          c."dealType", c.budget,
          b.name as brand_name, b.logo_url as brand_logo,
          car.status, car."registrationDate"
        FROM campaign_affiliate_registrations car
        INNER JOIN campaigns c ON c.id = car.campaign_id
        INNER JOIN brands b ON b.id = c."brandId"
        WHERE car.affiliate_id = ${affiliateId} AND car.deleted = false AND c.deleted = false
        ORDER BY car."registrationDate" DESC
        LIMIT 20
      `.execute(db);

      // Stats
      const statsResult = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM affiliate_event_responses WHERE affiliate_id = ${affiliateId} AND deleted = false) as total_events,
          (SELECT COUNT(*)::int FROM campaign_affiliate_registrations WHERE affiliate_id = ${affiliateId} AND deleted = false) as total_campaigns,
          (SELECT COUNT(*)::int FROM affiliate_endorsements WHERE endorsed_id = ${affiliateId}) as total_endorsements,
          (SELECT COUNT(*)::int FROM affiliate_follows WHERE following_id = ${affiliateId}) as total_followers
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Portfolio fetched successfully.",
        data: {
          profile: profile.rows[0],
          education: education.rows,
          experience: experience.rows,
          awards: awards.rows,
          certificates: certificates.rows,
          publications: publications.rows,
          media: media.rows,
          endorsements: endorsements.rows,
          eventHistory: eventHistory.rows,
          campaignHistory: campaignHistory.rows,
          stats: statsResult.rows[0] || {},
        },
      });
    } catch (error: any) {
      console.error("Get portfolio error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Generate a simplified JSON structure for PDF export of an affiliate's portfolio.
   * Returns summary stats, key achievements, social links.
   */
  generatePortfolioPDF = async (req: Request, res: Response) => {
    try {
      const affiliateId = Number(req.params.affiliateId);
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      // Profile info
      const profileResult = await sql`
        SELECT
          a.id, a.name, a."role", a.email, a.phone, a."dateOfBirth", a.gender,
          a.position, a."profilePicture", a.bio, a.achievements,
          a.geography, a."followersRange", a.height, a.weight, a.city,
          a.profile_slug,
          sc.title as sport_category,
          so.name as organization_name
        FROM affiliates a
        LEFT JOIN sports_category sc ON sc.id = a."sportsCategoryId"
        LEFT JOIN sports_organizations so ON so.id = a."organizationId"
        WHERE a.id = ${affiliateId} AND a.deleted = false
      `.execute(db);

      if (!profileResult.rows.length) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found.",
        });
      }

      const profile = profileResult.rows[0] as any;

      // Summary stats
      const statsResult = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM affiliate_event_responses WHERE affiliate_id = ${affiliateId} AND deleted = false) as events_participated,
          (SELECT COUNT(*)::int FROM campaign_affiliate_registrations WHERE affiliate_id = ${affiliateId} AND deleted = false AND status = 'COMPLETED') as campaigns_completed,
          (SELECT COUNT(*)::int FROM affiliate_endorsements WHERE endorsed_id = ${affiliateId}) as endorsements_received,
          (SELECT COUNT(*)::int FROM affiliate_follows WHERE following_id = ${affiliateId}) as followers,
          (SELECT COUNT(*)::int FROM event_certificates WHERE affiliate_id = ${affiliateId}) as certificates_earned
      `.execute(db);

      // Key achievements (top awards)
      const keyAchievements = await sql`
        SELECT "awardName", organization, year
        FROM affiliate_award_recognitions
        WHERE "affiliateId" = ${affiliateId}
        ORDER BY year DESC
        LIMIT 5
      `.execute(db);

      // Social links (Instagram)
      const instagramData = await sql`
        SELECT "igId", followers, is_private_acc
        FROM rapid_ig
        WHERE affiliate_id = ${affiliateId} AND deleted = false
        LIMIT 1
      `.execute(db);

      // Recent campaign brands
      const recentBrands = await sql`
        SELECT DISTINCT b.name as brand_name, b.logo_url
        FROM campaign_affiliate_registrations car
        INNER JOIN campaigns c ON c.id = car.campaign_id
        INNER JOIN brands b ON b.id = c."brandId"
        WHERE car.affiliate_id = ${affiliateId}
          AND car.deleted = false
          AND car.status IN ('APPROVED', 'COMPLETED')
        ORDER BY b.name ASC
        LIMIT 10
      `.execute(db);

      const pdfData = {
        generatedAt: new Date().toISOString(),
        affiliate: {
          name: profile.name,
          role: profile.role,
          position: profile.position,
          sport: profile.sport_category,
          organization: profile.organization_name,
          city: profile.city,
          geography: profile.geography,
          bio: profile.bio,
          achievements: profile.achievements,
          profilePicture: profile.profilePicture,
          height: profile.height,
          weight: profile.weight,
          profileUrl: profile.profile_slug ? `/affiliate/public/${profile.profile_slug}` : null,
        },
        stats: statsResult.rows[0] || {},
        keyAchievements: keyAchievements.rows,
        socialLinks: {
          instagram: instagramData.rows.length
            ? {
                handle: (instagramData.rows[0] as any).igId,
                followers: (instagramData.rows[0] as any).followers,
              }
            : null,
        },
        brandCollaborations: recentBrands.rows,
      };

      return res.status(200).json({
        success: true,
        message: "Portfolio PDF data generated successfully.",
        data: pdfData,
      });
    } catch (error: any) {
      console.error("Generate portfolio PDF error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Round 8: Affiliate Availability Calendar ====================

  /**
   * Affiliate sets their availability slots.
   * Accepts an array of slots: { date, start_time, end_time, status, notes }
   * Bulk insert/update.
   */
  setAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const { slots } = req.body;

      if (!slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Slots must be a non-empty array.",
        });
      }

      // Validate each slot
      const validStatuses = ["available", "busy", "tentative"];
      for (const slot of slots) {
        if (!slot.date) {
          return res.status(400).json({
            success: false,
            message: "Each slot must have a date.",
          });
        }
        if (slot.status && !validStatuses.includes(slot.status)) {
          return res.status(400).json({
            success: false,
            message: `Status must be one of: ${validStatuses.join(", ")}`,
          });
        }
      }

      // Delete existing availability for the provided dates, then insert new
      const dates = slots.map((s: any) => s.date);
      const uniqueDates = [...new Set(dates)] as string[];

      // Delete old entries for these dates
      await sql`
        DELETE FROM affiliate_availability
        WHERE affiliate_id = ${affiliateId}
          AND available_date = ANY(${sql.raw(`ARRAY[${uniqueDates.map((d) => `'${d}'`).join(",")}]`)}::date[])
      `.execute(db);

      // Insert new slots
      const insertedSlots = [];
      for (const slot of slots) {
        const result = await sql`
          INSERT INTO affiliate_availability (affiliate_id, available_date, start_time, end_time, status, notes)
          VALUES (
            ${affiliateId},
            ${slot.date},
            ${slot.start_time || null},
            ${slot.end_time || null},
            ${slot.status || "available"},
            ${slot.notes || null}
          )
          RETURNING *
        `.execute(db);
        insertedSlots.push(result.rows[0]);
      }

      return res.status(200).json({
        success: true,
        message: `${insertedSlots.length} availability slot(s) set successfully.`,
        data: insertedSlots,
      });
    } catch (error: any) {
      console.error("Set availability error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get availability for an affiliate for a date range.
   * Query params: start_date, end_date
   */
  getAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.affiliateId);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (!affiliateId || isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliate ID is required.",
        });
      }

      let query;
      if (startDate && endDate) {
        query = sql`
          SELECT * FROM affiliate_availability
          WHERE affiliate_id = ${affiliateId}
            AND available_date >= ${startDate}::date
            AND available_date <= ${endDate}::date
          ORDER BY available_date ASC, start_time ASC
        `;
      } else if (startDate) {
        query = sql`
          SELECT * FROM affiliate_availability
          WHERE affiliate_id = ${affiliateId}
            AND available_date >= ${startDate}::date
          ORDER BY available_date ASC, start_time ASC
        `;
      } else {
        // Default: next 30 days
        query = sql`
          SELECT * FROM affiliate_availability
          WHERE affiliate_id = ${affiliateId}
            AND available_date >= CURRENT_DATE
            AND available_date <= CURRENT_DATE + INTERVAL '30 days'
          ORDER BY available_date ASC, start_time ASC
        `;
      }

      const result = await query.execute(db);

      return res.status(200).json({
        success: true,
        message: "Availability fetched successfully.",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error: any) {
      console.error("Get availability error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Check if affiliate is available during event time window.
   * Query params: start_date, end_date
   */
  checkAvailabilityForEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.affiliateId);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (!affiliateId || isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliate ID is required.",
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "start_date and end_date query parameters are required.",
        });
      }

      // Check for any "busy" slots in the date range
      const busySlots = await sql`
        SELECT * FROM affiliate_availability
        WHERE affiliate_id = ${affiliateId}
          AND available_date >= ${startDate}::date
          AND available_date <= ${endDate}::date
          AND status = 'busy'
        ORDER BY available_date ASC
      `.execute(db);

      // Check for "available" slots in the date range
      const availableSlots = await sql`
        SELECT * FROM affiliate_availability
        WHERE affiliate_id = ${affiliateId}
          AND available_date >= ${startDate}::date
          AND available_date <= ${endDate}::date
          AND status = 'available'
        ORDER BY available_date ASC
      `.execute(db);

      // Check for "tentative" slots
      const tentativeSlots = await sql`
        SELECT * FROM affiliate_availability
        WHERE affiliate_id = ${affiliateId}
          AND available_date >= ${startDate}::date
          AND available_date <= ${endDate}::date
          AND status = 'tentative'
        ORDER BY available_date ASC
      `.execute(db);

      const isAvailable = busySlots.rows.length === 0;
      const hasTentative = tentativeSlots.rows.length > 0;

      let availabilityStatus: string;
      if (busySlots.rows.length > 0) {
        availabilityStatus = "unavailable";
      } else if (hasTentative) {
        availabilityStatus = "tentative";
      } else if (availableSlots.rows.length > 0) {
        availabilityStatus = "available";
      } else {
        availabilityStatus = "no_data";
      }

      return res.status(200).json({
        success: true,
        message: "Availability check completed.",
        data: {
          affiliateId,
          startDate,
          endDate,
          isAvailable,
          availabilityStatus,
          busySlots: busySlots.rows,
          availableSlots: availableSlots.rows,
          tentativeSlots: tentativeSlots.rows,
        },
      });
    } catch (error: any) {
      console.error("Check availability error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Messaging / Inbox (Round 9) ====================

  /**
   * Send a direct message to another affiliate
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = Number(req?.user?.id);

      if (!senderId) {
        return res.status(400).json({
          success: false,
          message: "Sender ID is required.",
        });
      }

      const { recipient_id, message_text } = req.body;

      if (!recipient_id) {
        return res.status(400).json({
          success: false,
          message: "Recipient ID is required.",
        });
      }

      if (!message_text || typeof message_text !== "string" || message_text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message text is required.",
        });
      }

      const recipientIdNum = Number(recipient_id);

      if (recipientIdNum === senderId) {
        return res.status(400).json({
          success: false,
          message: "Cannot send a message to yourself.",
        });
      }

      // Validate sender exists
      const sender = await sql`
        SELECT id FROM affiliates WHERE id = ${senderId} AND deleted = false
      `.execute(db);

      if (sender.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Sender affiliate not found.",
        });
      }

      // Validate recipient exists
      const recipient = await sql`
        SELECT id FROM affiliates WHERE id = ${recipientIdNum} AND deleted = false
      `.execute(db);

      if (recipient.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Recipient affiliate not found.",
        });
      }

      // Insert message
      const result = await sql`
        INSERT INTO affiliate_messages (sender_id, recipient_id, message_text, is_read)
        VALUES (${senderId}, ${recipientIdNum}, ${message_text.trim()}, false)
        RETURNING *
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Message sent successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get list of conversations for the authenticated affiliate
   */
  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const conversations = await sql`
        WITH conversation_partners AS (
          SELECT DISTINCT
            CASE
              WHEN sender_id = ${affiliateId} THEN recipient_id
              ELSE sender_id
            END as other_id
          FROM affiliate_messages
          WHERE sender_id = ${affiliateId} OR recipient_id = ${affiliateId}
        ),
        last_messages AS (
          SELECT DISTINCT ON (
            CASE
              WHEN sender_id = ${affiliateId} THEN recipient_id
              ELSE sender_id
            END
          )
            CASE
              WHEN sender_id = ${affiliateId} THEN recipient_id
              ELSE sender_id
            END as other_id,
            message_text as last_message,
            created_at as last_message_at,
            sender_id
          FROM affiliate_messages
          WHERE sender_id = ${affiliateId} OR recipient_id = ${affiliateId}
          ORDER BY
            CASE
              WHEN sender_id = ${affiliateId} THEN recipient_id
              ELSE sender_id
            END,
            created_at DESC
        )
        SELECT
          lm.other_id,
          CONCAT(a."firstName", ' ', a."lastName") as other_name,
          a."profilePicture" as other_profile_picture,
          lm.last_message,
          lm.last_message_at,
          lm.sender_id as last_message_sender_id,
          (
            SELECT COUNT(*)::int FROM affiliate_messages
            WHERE sender_id = lm.other_id
              AND recipient_id = ${affiliateId}
              AND is_read = false
          ) as unread_count
        FROM last_messages lm
        INNER JOIN affiliates a ON a.id = lm.other_id
        ORDER BY lm.last_message_at DESC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Conversations fetched successfully.",
        data: conversations.rows,
      });
    } catch (error: any) {
      console.error("Get conversations error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get all messages between two affiliates, paginated
   */
  getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const otherAffiliateId = Number(req.params.otherAffiliateId);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!otherAffiliateId || isNaN(otherAffiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid other affiliate ID is required.",
        });
      }

      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = (page - 1) * limit;

      const messages = await sql`
        SELECT am.*,
          CONCAT(s."firstName", ' ', s."lastName") as sender_name,
          CONCAT(r."firstName", ' ', r."lastName") as recipient_name
        FROM affiliate_messages am
        INNER JOIN affiliates s ON s.id = am.sender_id
        INNER JOIN affiliates r ON r.id = am.recipient_id
        WHERE (
          (am.sender_id = ${affiliateId} AND am.recipient_id = ${otherAffiliateId})
          OR
          (am.sender_id = ${otherAffiliateId} AND am.recipient_id = ${affiliateId})
        )
        ORDER BY am.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      const countResult = await sql`
        SELECT COUNT(*)::int as total FROM affiliate_messages
        WHERE (
          (sender_id = ${affiliateId} AND recipient_id = ${otherAffiliateId})
          OR
          (sender_id = ${otherAffiliateId} AND recipient_id = ${affiliateId})
        )
      `.execute(db);

      const total = (countResult.rows[0] as any)?.total || 0;

      return res.status(200).json({
        success: true,
        message: "Messages fetched successfully.",
        data: {
          messages: messages.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      console.error("Get conversation messages error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Mark all messages from a specific sender as read
   */
  markMessagesRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const otherAffiliateId = Number(req.params.otherAffiliateId);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!otherAffiliateId || isNaN(otherAffiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid other affiliate ID is required.",
        });
      }

      const result = await sql`
        UPDATE affiliate_messages
        SET is_read = true
        WHERE sender_id = ${otherAffiliateId}
          AND recipient_id = ${affiliateId}
          AND is_read = false
      `.execute(db);

      const updatedCount = result.numAffectedRows ? Number(result.numAffectedRows) : 0;

      return res.status(200).json({
        success: true,
        message: "Messages marked as read.",
        data: { marked_read: updatedCount },
      });
    } catch (error: any) {
      console.error("Mark messages read error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ============================================================
  // AFFILIATE SKILLS & ENDORSEMENT BADGES (Round 10)
  // ============================================================

  /**
   * Add a skill to the affiliate's profile
   */
  addSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const { skill_name, proficiency_level } = req.body;

      if (!skill_name || typeof skill_name !== "string" || skill_name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "skill_name is required.",
        });
      }

      if (skill_name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "skill_name must be 100 characters or less.",
        });
      }

      const validLevels = ["beginner", "intermediate", "advanced", "expert"];
      const level = proficiency_level && validLevels.includes(proficiency_level)
        ? proficiency_level
        : "intermediate";

      // Check for duplicate skill
      const existing = await sql`
        SELECT id FROM affiliate_skills WHERE affiliate_id = ${affiliateId} AND LOWER(skill_name) = LOWER(${skill_name.trim()})
      `.execute(db);

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You already have this skill on your profile.",
        });
      }

      const result = await sql`
        INSERT INTO affiliate_skills (affiliate_id, skill_name, proficiency_level)
        VALUES (${affiliateId}, ${skill_name.trim()}, ${level})
        RETURNING *
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Skill added successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Add skill error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get all skills for an affiliate (public)
   */
  getSkills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.affiliateId);

      if (!affiliateId || isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliate ID is required.",
        });
      }

      const skills = await sql`
        SELECT
          as2.*,
          (SELECT COUNT(*)::int FROM skill_endorsements se WHERE se.skill_id = as2.id) as endorsement_count_live
        FROM affiliate_skills as2
        WHERE as2.affiliate_id = ${affiliateId}
        ORDER BY as2.endorsement_count DESC, as2.created_at DESC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Skills fetched successfully.",
        data: skills.rows,
      });
    } catch (error: any) {
      console.error("Get skills error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Endorse another affiliate's skill.
   * Prevents self-endorsement and duplicate endorsements.
   */
  endorseSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const endorserId = Number(req?.user?.id);
      const skillId = Number(req.params.skillId);

      if (!endorserId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!skillId || isNaN(skillId)) {
        return res.status(400).json({
          success: false,
          message: "Valid skill ID is required.",
        });
      }

      // Get the skill and check ownership
      const skillResult = await sql`
        SELECT * FROM affiliate_skills WHERE id = ${skillId}
      `.execute(db);

      if (skillResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Skill not found.",
        });
      }

      const skill = skillResult.rows[0] as any;

      // Prevent self-endorsement
      if (skill.affiliate_id === endorserId) {
        return res.status(400).json({
          success: false,
          message: "You cannot endorse your own skill.",
        });
      }

      // Prevent duplicate endorsements
      const existingEndorsement = await sql`
        SELECT id FROM skill_endorsements WHERE skill_id = ${skillId} AND endorser_id = ${endorserId}
      `.execute(db);

      if (existingEndorsement.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You have already endorsed this skill.",
        });
      }

      // Create endorsement
      const result = await sql`
        INSERT INTO skill_endorsements (skill_id, endorser_id)
        VALUES (${skillId}, ${endorserId})
        RETURNING *
      `.execute(db);

      // Update endorsement count on the skill
      await sql`
        UPDATE affiliate_skills
        SET endorsement_count = endorsement_count + 1
        WHERE id = ${skillId}
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Skill endorsed successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Endorse skill error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get most endorsed skills across the platform (leaderboard)
   */
  getTopSkills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const page = Number(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const topSkills = await sql`
        SELECT
          as2.id,
          as2.skill_name,
          as2.proficiency_level,
          as2.endorsement_count,
          as2.affiliate_id,
          a.name as affiliate_name,
          a."profilePicture" as affiliate_photo
        FROM affiliate_skills as2
        INNER JOIN affiliates a ON a.id = as2.affiliate_id
        WHERE as2.endorsement_count > 0
        ORDER BY as2.endorsement_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      const countResult = await sql`
        SELECT COUNT(*)::int as total FROM affiliate_skills WHERE endorsement_count > 0
      `.execute(db);

      const total = (countResult.rows[0] as any)?.total || 0;

      return res.status(200).json({
        success: true,
        message: "Top skills leaderboard fetched successfully.",
        data: topSkills.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get top skills error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ============================================================
  // AFFILIATE TRAINING / COURSE ENROLLMENT (Round 10)
  // ============================================================

  /**
   * Enroll in a training course
   */
  enrollInCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const courseId = Number(req.params.courseId);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!courseId || isNaN(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Valid course ID is required.",
        });
      }

      // Check for existing enrollment
      const existing = await sql`
        SELECT id, status FROM course_enrollments WHERE affiliate_id = ${affiliateId} AND course_id = ${courseId}
      `.execute(db);

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You are already enrolled in this course.",
          data: existing.rows[0],
        });
      }

      const result = await sql`
        INSERT INTO course_enrollments (affiliate_id, course_id, status, progress_percentage)
        VALUES (${affiliateId}, ${courseId}, 'ENROLLED', 0)
        RETURNING *
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Enrolled in course successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Enroll in course error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Update course progress percentage and status
   */
  updateCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const enrollmentId = Number(req.params.enrollmentId);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!enrollmentId || isNaN(enrollmentId)) {
        return res.status(400).json({
          success: false,
          message: "Valid enrollment ID is required.",
        });
      }

      // Verify enrollment belongs to this affiliate
      const enrollmentResult = await sql`
        SELECT * FROM course_enrollments WHERE id = ${enrollmentId} AND affiliate_id = ${affiliateId}
      `.execute(db);

      if (enrollmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      const enrollment = enrollmentResult.rows[0] as any;

      const { progress_percentage, status, score } = req.body;

      const validStatuses = ["ENROLLED", "IN_PROGRESS", "COMPLETED"];
      const newStatus = status && validStatuses.includes(status) ? status : undefined;

      let progressPct = enrollment.progress_percentage;
      if (progress_percentage !== undefined) {
        progressPct = Math.min(Math.max(Number(progress_percentage) || 0, 0), 100);
      }

      // Auto-determine status from progress
      let computedStatus = newStatus || enrollment.status;
      if (progressPct > 0 && progressPct < 100 && computedStatus === "ENROLLED") {
        computedStatus = "IN_PROGRESS";
      }
      if (progressPct >= 100) {
        computedStatus = "COMPLETED";
      }

      const isNewlyCompleted = computedStatus === "COMPLETED" && enrollment.status !== "COMPLETED";
      const scoreVal = score !== undefined ? Number(score) : enrollment.score;

      let result;
      if (isNewlyCompleted) {
        result = await sql`
          UPDATE course_enrollments
          SET
            progress_percentage = ${progressPct},
            status = ${computedStatus},
            score = ${scoreVal},
            completed_at = NOW()
          WHERE id = ${enrollmentId} AND affiliate_id = ${affiliateId}
          RETURNING *
        `.execute(db);
      } else {
        result = await sql`
          UPDATE course_enrollments
          SET
            progress_percentage = ${progressPct},
            status = ${computedStatus},
            score = ${scoreVal}
          WHERE id = ${enrollmentId} AND affiliate_id = ${affiliateId}
          RETURNING *
        `.execute(db);
      }

      return res.status(200).json({
        success: true,
        message: "Course progress updated successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Update course progress error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get all course enrollments for the authenticated affiliate
   */
  getMyEnrollments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let enrollments;
      if (status && ["ENROLLED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
        enrollments = await sql`
          SELECT * FROM course_enrollments
          WHERE affiliate_id = ${affiliateId} AND status = ${status}
          ORDER BY enrolled_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `.execute(db);
      } else {
        enrollments = await sql`
          SELECT * FROM course_enrollments
          WHERE affiliate_id = ${affiliateId}
          ORDER BY enrolled_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `.execute(db);
      }

      const countResult = await sql`
        SELECT COUNT(*)::int as total FROM course_enrollments WHERE affiliate_id = ${affiliateId}
      `.execute(db);

      const total = (countResult.rows[0] as any)?.total || 0;

      return res.status(200).json({
        success: true,
        message: "Enrollments fetched successfully.",
        data: enrollments.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get my enrollments error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get top performers for a course by completion speed and score
   */
  getCourseLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = Number(req.params.courseId);

      if (!courseId || isNaN(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Valid course ID is required.",
        });
      }

      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const page = Number(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const leaderboard = await sql`
        SELECT
          ce.id as enrollment_id,
          ce.affiliate_id,
          a.name as affiliate_name,
          a."profilePicture" as affiliate_photo,
          ce.status,
          ce.progress_percentage,
          ce.score,
          ce.enrolled_at,
          ce.completed_at,
          CASE WHEN ce.completed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ce.completed_at - ce.enrolled_at))
            ELSE NULL
          END as completion_seconds
        FROM course_enrollments ce
        INNER JOIN affiliates a ON a.id = ce.affiliate_id
        WHERE ce.course_id = ${courseId}
        ORDER BY
          ce.status = 'COMPLETED' DESC,
          ce.score DESC NULLS LAST,
          completion_seconds ASC NULLS LAST,
          ce.progress_percentage DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      const countResult = await sql`
        SELECT COUNT(*)::int as total FROM course_enrollments WHERE course_id = ${courseId}
      `.execute(db);

      const total = (countResult.rows[0] as any)?.total || 0;

      const completedCount = await sql`
        SELECT COUNT(*)::int as count FROM course_enrollments WHERE course_id = ${courseId} AND status = 'COMPLETED'
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Course leaderboard fetched successfully.",
        data: {
          courseId,
          totalEnrolled: total,
          totalCompleted: (completedCount.rows[0] as any)?.count || 0,
          leaderboard: leaderboard.rows,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get course leaderboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Affiliate Goal Setting (Round 11) ====================

  /**
   * Set a personal goal for the affiliate
   */
  setGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const { title, description, target_value, metric_type, deadline } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required.",
        });
      }

      const validMetricTypes = ['events_attended', 'campaigns_completed', 'endorsements_received', 'profile_views'];
      if (metric_type && !validMetricTypes.includes(metric_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid metric_type. Must be one of: ${validMetricTypes.join(', ')}`,
        });
      }

      const result = await sql`
        INSERT INTO affiliate_goals (affiliate_id, title, description, target_value, metric_type, deadline, status, created_at)
        VALUES (${affiliateId}, ${title}, ${description || null}, ${Number(target_value) || 0}, ${metric_type || null}, ${deadline || null}, 'ACTIVE', NOW())
        RETURNING *
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Goal created successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Set goal error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get all goals for the authenticated affiliate with current progress auto-calculated
   */
  getGoals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const goals = await sql`
        SELECT * FROM affiliate_goals
        WHERE affiliate_id = ${affiliateId}
        ORDER BY
          CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
          created_at DESC
      `.execute(db);

      // Auto-calculate progress for each goal based on metric_type
      const goalsWithProgress = await Promise.all(
        (goals.rows as any[]).map(async (goal: any) => {
          let autoCalculatedValue = goal.current_value;

          if (goal.metric_type && goal.status === 'ACTIVE') {
            try {
              switch (goal.metric_type) {
                case 'events_attended': {
                  const eventCount = await sql`
                    SELECT COUNT(*)::int as count FROM event_affiliate_registrations
                    WHERE "affiliateId" = ${affiliateId}
                  `.execute(db);
                  autoCalculatedValue = (eventCount.rows[0] as any)?.count || 0;
                  break;
                }
                case 'campaigns_completed': {
                  const campaignCount = await sql`
                    SELECT COUNT(*)::int as count FROM campaign_affiliate_registrations
                    WHERE affiliate_id = ${affiliateId} AND status = 'APPROVED'
                  `.execute(db);
                  autoCalculatedValue = (campaignCount.rows[0] as any)?.count || 0;
                  break;
                }
                case 'endorsements_received': {
                  const endorsementCount = await sql`
                    SELECT COUNT(*)::int as count FROM affiliate_endorsements
                    WHERE endorsed_id = ${affiliateId}
                  `.execute(db);
                  autoCalculatedValue = (endorsementCount.rows[0] as any)?.count || 0;
                  break;
                }
                case 'profile_views': {
                  const viewCount = await sql`
                    SELECT COUNT(*)::int as count FROM affiliate_profile_views
                    WHERE viewed_id = ${affiliateId}
                  `.execute(db);
                  autoCalculatedValue = (viewCount.rows[0] as any)?.count || 0;
                  break;
                }
              }
            } catch {
              // If the related table doesn't exist or query fails, use manual current_value
              autoCalculatedValue = goal.current_value;
            }
          }

          const progress = goal.target_value > 0
            ? Math.min(100, Math.round((autoCalculatedValue / goal.target_value) * 100))
            : 0;

          return {
            ...goal,
            current_value: autoCalculatedValue,
            progress_percentage: progress,
            is_completed: autoCalculatedValue >= goal.target_value && goal.target_value > 0,
          };
        })
      );

      return res.status(200).json({
        success: true,
        message: "Goals fetched successfully.",
        data: goalsWithProgress,
      });
    } catch (error: any) {
      console.error("Get goals error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Manually update progress on a goal
   */
  updateGoalProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const goalId = Number(req.params.goalId);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!goalId || isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          message: "Valid goal ID is required.",
        });
      }

      const { current_value, status } = req.body;

      // Build dynamic SET clause parts
      const setClauses: string[] = [];
      const values: any = {};

      if (current_value !== undefined) {
        values.current_value = Number(current_value);
      }
      if (status !== undefined) {
        const validStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          });
        }
        values.status = status;
      }

      if (Object.keys(values).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field (current_value or status) is required to update.",
        });
      }

      // Verify goal belongs to this affiliate
      const existing = await sql`
        SELECT * FROM affiliate_goals WHERE id = ${goalId} AND affiliate_id = ${affiliateId}
      `.execute(db);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Goal not found or does not belong to you.",
        });
      }

      const result = await sql`
        UPDATE affiliate_goals
        SET
          current_value = COALESCE(${values.current_value !== undefined ? values.current_value : null}, current_value),
          status = COALESCE(${values.status || null}, status)
        WHERE id = ${goalId} AND affiliate_id = ${affiliateId}
        RETURNING *
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Goal updated successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Update goal progress error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Delete a goal
   */
  deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const goalId = Number(req.params.goalId);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      if (!goalId || isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          message: "Valid goal ID is required.",
        });
      }

      const result = await sql`
        DELETE FROM affiliate_goals
        WHERE id = ${goalId} AND affiliate_id = ${affiliateId}
        RETURNING id
      `.execute(db);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Goal not found or does not belong to you.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Goal deleted successfully.",
        data: { id: goalId },
      });
    } catch (error: any) {
      console.error("Delete goal error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== PERSONAL ANALYTICS (Round 12) ====================

  /**
   * Get aggregated personal analytics for the logged-in affiliate
   * GET /api/affiliate/analytics/personal
   */
  getPersonalAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      // Total events attended
      const eventsResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_event_responses
        WHERE affiliate_id = ${affiliateId} AND deleted = false
      `.execute(db);
      const totalEventsAttended = (eventsResult.rows[0] as any)?.count || 0;

      // Total campaigns applied
      const campaignsResult = await sql`
        SELECT COUNT(*)::int as count FROM campaign_affiliate_registrations
        WHERE affiliate_id = ${affiliateId} AND deleted = false
      `.execute(db);
      const totalCampaignsApplied = (campaignsResult.rows[0] as any)?.count || 0;

      // Profile views count
      const viewsResult = await sql`
        SELECT COALESCE(profile_views, 0)::int as views FROM affiliate_profile_stats
        WHERE affiliate_id = ${affiliateId}
      `.execute(db);
      const profileViews = (viewsResult.rows[0] as any)?.views || 0;

      // Endorsements received
      const endorsementsResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_endorsements
        WHERE endorsed_id = ${affiliateId}
      `.execute(db);
      const endorsementsReceived = (endorsementsResult.rows[0] as any)?.count || 0;

      // Skills count
      const skillsResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_skills
        WHERE affiliate_id = ${affiliateId}
      `.execute(db);
      const skillsCount = (skillsResult.rows[0] as any)?.count || 0;

      // Followers count
      const followersResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_follows
        WHERE following_id = ${affiliateId}
      `.execute(db);
      const followersCount = (followersResult.rows[0] as any)?.count || 0;

      // Following count
      const followingResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_follows
        WHERE follower_id = ${affiliateId}
      `.execute(db);
      const followingCount = (followingResult.rows[0] as any)?.count || 0;

      return res.status(200).json({
        success: true,
        message: "Personal analytics retrieved successfully.",
        data: {
          totalEventsAttended,
          totalCampaignsApplied,
          profileViews,
          endorsementsReceived,
          skillsCount,
          followersCount,
          followingCount,
        },
      });
    } catch (error: any) {
      console.error("Get personal analytics error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get recent activity timeline for the logged-in affiliate
   * GET /api/affiliate/analytics/timeline
   */
  getActivityTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req?.user?.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      // Combine activities from multiple tables into a unified timeline
      const activities = await sql`
        (
          SELECT
            'event_registration' as activity_type,
            aer.event_id as reference_id,
            e.name as reference_name,
            aer.submitted_at as activity_date,
            'Registered for event' as description
          FROM affiliate_event_responses aer
          LEFT JOIN events e ON e.id = aer.event_id
          WHERE aer.affiliate_id = ${affiliateId} AND aer.deleted = false
        )
        UNION ALL
        (
          SELECT
            'campaign_application' as activity_type,
            cr.campaign_id as reference_id,
            c.product as reference_name,
            cr."createdAt" as activity_date,
            'Applied to campaign' as description
          FROM campaign_affiliate_registrations cr
          LEFT JOIN campaigns c ON c.id = cr.campaign_id
          WHERE cr.affiliate_id = ${affiliateId} AND cr.deleted = false
        )
        UNION ALL
        (
          SELECT
            'endorsement_received' as activity_type,
            ae.endorser_id as reference_id,
            a.name as reference_name,
            ae.created_at as activity_date,
            'Received endorsement' as description
          FROM affiliate_endorsements ae
          LEFT JOIN affiliates a ON a.id = ae.endorser_id
          WHERE ae.endorsed_id = ${affiliateId}
        )
        UNION ALL
        (
          SELECT
            'goal_completed' as activity_type,
            ag.id as reference_id,
            ag.title as reference_name,
            ag.created_at as activity_date,
            'Completed a goal' as description
          FROM affiliate_goals ag
          WHERE ag.affiliate_id = ${affiliateId}
            AND ag.current_value >= ag.target_value
        )
        ORDER BY activity_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      // Get total count for pagination
      const countResult = await sql`
        SELECT (
          (SELECT COUNT(*) FROM affiliate_event_responses WHERE affiliate_id = ${affiliateId} AND deleted = false) +
          (SELECT COUNT(*) FROM campaign_affiliate_registrations WHERE affiliate_id = ${affiliateId} AND deleted = false) +
          (SELECT COUNT(*) FROM affiliate_endorsements WHERE endorsed_id = ${affiliateId}) +
          (SELECT COUNT(*) FROM affiliate_goals WHERE affiliate_id = ${affiliateId} AND current_value >= target_value)
        )::int as total
      `.execute(db);
      const total = (countResult.rows[0] as any)?.total || 0;

      return res.status(200).json({
        success: true,
        message: "Activity timeline retrieved successfully.",
        data: activities.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get activity timeline error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Increment profile view counter when someone visits an affiliate's profile
   * POST /api/affiliate/profile-views/:affiliateId
   */
  updateProfileViews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.affiliateId);

      if (!affiliateId || isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliate ID is required.",
        });
      }

      // Verify affiliate exists
      const affiliate = await db
        .selectFrom("affiliates" as any)
        .select(["id" as any])
        .where("id", "=", affiliateId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found.",
        });
      }

      // Upsert into affiliate_profile_stats
      const result = await sql`
        INSERT INTO affiliate_profile_stats (affiliate_id, profile_views, last_viewed_at, updated_at)
        VALUES (${affiliateId}, 1, NOW(), NOW())
        ON CONFLICT (affiliate_id) DO UPDATE SET
          profile_views = affiliate_profile_stats.profile_views + 1,
          last_viewed_at = NOW(),
          updated_at = NOW()
        RETURNING affiliate_id, profile_views, last_viewed_at
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Profile view recorded.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Update profile views error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Badge / Achievement System (Round 13) ====================

  /**
   * Get all available badge definitions
   * GET /api/affiliate/badges
   */
  getBadges = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await sql`
        SELECT id, name, description, icon_url, criteria_type, criteria_value, category, created_at
        FROM badge_definitions
        ORDER BY category, criteria_value ASC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Badge definitions retrieved successfully.",
        data: result.rows,
      });
    } catch (error: any) {
      console.error("Get badges error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get badges earned by the logged-in affiliate
   * GET /api/affiliate/my-badges
   */
  getMyBadges = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const result = await sql`
        SELECT
          ab.id as award_id,
          ab.earned_at,
          bd.id as badge_id,
          bd.name,
          bd.description,
          bd.icon_url,
          bd.criteria_type,
          bd.criteria_value,
          bd.category
        FROM affiliate_badges ab
        INNER JOIN badge_definitions bd ON bd.id = ab.badge_id
        WHERE ab.affiliate_id = ${affiliateId}
        ORDER BY ab.earned_at DESC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Your badges retrieved successfully.",
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error("Get my badges error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Check affiliate stats against badge criteria and award new badges
   * POST /api/affiliate/badges/check
   */
  checkAndAwardBadges = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.user?.id);

      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      // Gather affiliate stats
      const statsResult = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM affiliate_event_responses WHERE affiliate_id = ${affiliateId} AND deleted = false) as events_attended,
          (SELECT COUNT(*)::int FROM affiliate_followers WHERE followed_id = ${affiliateId}) as followers,
          (SELECT COUNT(*)::int FROM affiliate_skills WHERE affiliate_id = ${affiliateId}) as skills,
          (SELECT COUNT(*)::int FROM campaign_affiliate_registrations WHERE affiliate_id = ${affiliateId} AND deleted = false) as campaigns_applied,
          (SELECT COUNT(*)::int FROM affiliate_endorsements WHERE endorsed_id = ${affiliateId}) as endorsements,
          (SELECT COUNT(*)::int FROM affiliate_goals WHERE affiliate_id = ${affiliateId}) as goals_set
      `.execute(db);

      const stats = statsResult.rows[0] as any;

      // Get all badge definitions
      const badgeDefs = await sql`
        SELECT id, criteria_type, criteria_value FROM badge_definitions
      `.execute(db);

      // Get already earned badges
      const earnedBadges = await sql`
        SELECT badge_id FROM affiliate_badges WHERE affiliate_id = ${affiliateId}
      `.execute(db);
      const earnedBadgeIds = new Set(earnedBadges.rows.map((b: any) => b.badge_id));

      // Check each badge against stats
      const newlyAwarded: any[] = [];

      for (const badge of badgeDefs.rows as any[]) {
        if (earnedBadgeIds.has(badge.id)) {
          continue; // Already earned
        }

        const statValue = stats[badge.criteria_type] || 0;

        if (statValue >= badge.criteria_value) {
          // Award the badge
          try {
            const awarded = await sql`
              INSERT INTO affiliate_badges (affiliate_id, badge_id, earned_at)
              VALUES (${affiliateId}, ${badge.id}::uuid, NOW())
              ON CONFLICT (affiliate_id, badge_id) DO NOTHING
              RETURNING *
            `.execute(db);

            if (awarded.rows.length > 0) {
              newlyAwarded.push(awarded.rows[0]);
            }
          } catch {
            // Skip on conflict
          }
        }
      }

      // Get full details of newly awarded badges
      let newBadgeDetails: any[] = [];
      if (newlyAwarded.length > 0) {
        const newBadgeIds = newlyAwarded.map((b: any) => b.badge_id);
        const details = await sql`
          SELECT id, name, description, icon_url, category
          FROM badge_definitions
          WHERE id = ANY(${newBadgeIds}::uuid[])
        `.execute(db);
        newBadgeDetails = details.rows;
      }

      return res.status(200).json({
        success: true,
        message: newlyAwarded.length > 0
          ? `Congratulations! You earned ${newlyAwarded.length} new badge(s)!`
          : "No new badges earned. Keep going!",
        data: {
          newly_awarded: newBadgeDetails,
          stats,
        },
      });
    } catch (error: any) {
      console.error("Check and award badges error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Leaderboard ranked by badge count, paginated
   * GET /api/affiliate/badges/leaderboard
   */
  getLeaderboardByBadges = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const leaderboard = await sql`
        SELECT
          a.id as affiliate_id,
          a.name,
          a."profilePicture" as profile_picture,
          a."sportsCategoryId" as sports_category,
          COUNT(ab.id)::int as badge_count
        FROM affiliates a
        LEFT JOIN affiliate_badges ab ON ab.affiliate_id = a.id
        WHERE a.deleted = false AND a.status = 'ACTIVE'
        GROUP BY a.id, a.name, a."profilePicture", a."sportsCategoryId"
        HAVING COUNT(ab.id) > 0
        ORDER BY badge_count DESC, a.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      const countResult = await sql`
        SELECT COUNT(DISTINCT a.id)::int as total
        FROM affiliates a
        INNER JOIN affiliate_badges ab ON ab.affiliate_id = a.id
        WHERE a.deleted = false AND a.status = 'ACTIVE'
      `.execute(db);
      const total = (countResult.rows[0] as any)?.total || 0;

      // Add rank
      const rankedData = leaderboard.rows.map((entry: any, index: number) => ({
        rank: offset + index + 1,
        ...entry,
      }));

      return res.status(200).json({
        success: true,
        message: "Badge leaderboard retrieved successfully.",
        data: rankedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get badge leaderboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ========================= AFFILIATE REFERRAL TRACKING (Round 14) =========================

  /**
   * Get referral stats for the logged-in affiliate
   * GET /api/affiliate/referrals/stats
   */
  getReferralStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;

      // Get or create referral code
      const existingCode = await sql`
        SELECT referral_code FROM affiliate_referrals
        WHERE referrer_id = ${affiliateId}
        LIMIT 1
      `.execute(db);

      let referralCode: string;
      if (existingCode.rows.length > 0) {
        referralCode = (existingCode.rows[0] as any).referral_code;
      } else {
        // Generate a code but don't insert a referral row yet
        const affiliate = await db
          .selectFrom("affiliates")
          .select(["name"])
          .where("id", "=", affiliateId)
          .executeTakeFirst();
        const nameSlug = (affiliate?.name || "user").replace(/\s+/g, "").substring(0, 6).toUpperCase();
        referralCode = `KIBI-${nameSlug}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      const stats = await sql`
        SELECT
          COUNT(*)::int as total_referrals,
          COUNT(CASE WHEN status = 'CONVERTED' THEN 1 END)::int as successful_referrals,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_referrals
        FROM affiliate_referrals
        WHERE referrer_id = ${affiliateId}
      `.execute(db);

      const row = stats.rows[0] as any;

      return res.status(200).json({
        success: true,
        message: "Referral stats retrieved successfully.",
        data: {
          referral_code: referralCode,
          total_referrals: row?.total_referrals || 0,
          successful_referrals: row?.successful_referrals || 0,
          pending_referrals: row?.pending_referrals || 0,
        },
      });
    } catch (error: any) {
      console.error("Get referral stats error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * List people referred by this affiliate
   * GET /api/affiliate/referrals/list
   */
  getMyReferrals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const referrals = await sql`
        SELECT
          ar.id,
          ar.referred_email,
          ar.referred_phone,
          ar.status,
          ar.created_at,
          ar.converted_at,
          a.name as referred_name,
          a."profilePicture" as referred_profile_picture,
          a.created_at as join_date
        FROM affiliate_referrals ar
        LEFT JOIN affiliates a ON a.id = ar.referred_affiliate_id
        WHERE ar.referrer_id = ${affiliateId}
        ORDER BY ar.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      const countResult = await sql`
        SELECT COUNT(*)::int as total
        FROM affiliate_referrals
        WHERE referrer_id = ${affiliateId}
      `.execute(db);
      const total = (countResult.rows[0] as any)?.total || 0;

      return res.status(200).json({
        success: true,
        message: "Referrals retrieved successfully.",
        data: referrals.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get my referrals error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Generate or return a unique referral link for the affiliate
   * POST /api/affiliate/referrals/generate-link
   */
  generateReferralLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;

      // Check if affiliate already has a referral code
      const existing = await sql`
        SELECT referral_code FROM affiliate_referrals
        WHERE referrer_id = ${affiliateId}
        LIMIT 1
      `.execute(db);

      if (existing.rows.length > 0) {
        const code = (existing.rows[0] as any).referral_code;
        return res.status(200).json({
          success: true,
          message: "Referral link retrieved.",
          data: {
            referral_code: code,
            referral_link: `${process.env.APP_BASE_URL || "https://app.kibisports.com"}/register?ref=${code}`,
          },
        });
      }

      // Generate a new unique code
      const affiliate = await db
        .selectFrom("affiliates")
        .select(["name"])
        .where("id", "=", affiliateId)
        .executeTakeFirst();

      const nameSlug = (affiliate?.name || "user").replace(/\s+/g, "").substring(0, 6).toUpperCase();
      const referralCode = `KIBI-${nameSlug}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Insert a placeholder row to store the code
      await sql`
        INSERT INTO affiliate_referrals (referrer_id, referral_code, status)
        VALUES (${affiliateId}, ${referralCode}, 'PENDING')
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Referral link generated successfully.",
        data: {
          referral_code: referralCode,
          referral_link: `${process.env.APP_BASE_URL || "https://app.kibisports.com"}/register?ref=${referralCode}`,
        },
      });
    } catch (error: any) {
      console.error("Generate referral link error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Track referral conversion when a referred user completes registration
   * POST /api/affiliate/referrals/convert
   */
  trackReferralConversion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { referral_code, referred_email, referred_phone, referred_affiliate_id } = req.body;

      if (!referral_code) {
        return res.status(400).json({
          success: false,
          message: "referral_code is required.",
        });
      }

      if (!referred_affiliate_id) {
        return res.status(400).json({
          success: false,
          message: "referred_affiliate_id is required.",
        });
      }

      // Find the referrer by code
      const referral = await sql`
        SELECT id, referrer_id FROM affiliate_referrals
        WHERE referral_code = ${referral_code}
        LIMIT 1
      `.execute(db);

      if (referral.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Referral code not found.",
        });
      }

      const referrerId = (referral.rows[0] as any).referrer_id;
      const referralId = (referral.rows[0] as any).id;

      // Check if this specific referred user already has a conversion
      const existingConversion = await sql`
        SELECT id FROM affiliate_referrals
        WHERE referrer_id = ${referrerId} AND referred_affiliate_id = ${referred_affiliate_id}
      `.execute(db);

      if (existingConversion.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This referral has already been converted.",
        });
      }

      // Insert a new converted referral record
      const result = await sql`
        INSERT INTO affiliate_referrals (referrer_id, referred_email, referred_phone, referred_affiliate_id, referral_code, status, converted_at)
        VALUES (
          ${referrerId},
          ${referred_email || null},
          ${referred_phone || null},
          ${referred_affiliate_id},
          ${referral_code + "-" + Date.now()},
          'CONVERTED',
          NOW()
        )
        RETURNING *
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Referral conversion tracked successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Track referral conversion error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ========================= AFFILIATE COMPARISON TOOL (Round 14) =========================

  /**
   * Compare 2-4 affiliates side by side
   * POST /api/affiliate/compare
   */
  compareAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { affiliate_ids } = req.body;

      if (!affiliate_ids || !Array.isArray(affiliate_ids) || affiliate_ids.length < 2 || affiliate_ids.length > 4) {
        return res.status(400).json({
          success: false,
          message: "affiliate_ids must be an array of 2-4 affiliate IDs.",
        });
      }

      const comparisons = [];

      for (const affId of affiliate_ids) {
        const id = Number(affId);
        if (isNaN(id)) continue;

        // Get basic profile info
        const affiliate = await sql`
          SELECT
            a.id, a.name, a."sportsCategoryId" as sport, a.city as location,
            a."profilePicture" as profile_picture, a.bio, a.followers,
            a.created_at
          FROM affiliates a
          WHERE a.id = ${id} AND a.deleted = false
        `.execute(db);

        if (affiliate.rows.length === 0) continue;
        const profile = affiliate.rows[0] as any;

        // Events attended count
        const eventsResult = await sql`
          SELECT COUNT(*)::int as events_attended
          FROM event_affiliate_registrations
          WHERE "affiliateId" = ${id}
        `.execute(db);

        // Campaigns applied count
        const campaignsResult = await sql`
          SELECT COUNT(*)::int as campaigns_applied
          FROM campaign_affiliate_registrations
          WHERE affiliate_id = ${id} AND deleted = false
        `.execute(db);

        // Skills count
        const skillsResult = await sql`
          SELECT COUNT(*)::int as skills_count
          FROM affiliate_skills
          WHERE affiliate_id = ${id}
        `.execute(db);

        // Endorsements count
        const endorsementsResult = await sql`
          SELECT COUNT(*)::int as endorsements
          FROM endorsements
          WHERE endorsed_id = ${id}
        `.execute(db);

        // Badges earned count
        const badgesResult = await sql`
          SELECT COUNT(*)::int as badges_earned
          FROM affiliate_badges
          WHERE affiliate_id = ${id}
        `.execute(db);

        // Profile completion %
        const fields = [
          profile.name, profile.sport, profile.location,
          profile.profile_picture, profile.bio, profile.followers,
        ];
        const filledFields = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
        const profileCompletion = Math.round((filledFields / fields.length) * 100);

        comparisons.push({
          id: profile.id,
          name: profile.name,
          sport: profile.sport,
          location: profile.location,
          profile_picture: profile.profile_picture,
          events_attended: (eventsResult.rows[0] as any)?.events_attended || 0,
          campaigns_applied: (campaignsResult.rows[0] as any)?.campaigns_applied || 0,
          skills_count: (skillsResult.rows[0] as any)?.skills_count || 0,
          endorsements: (endorsementsResult.rows[0] as any)?.endorsements || 0,
          followers: profile.followers || 0,
          badges_earned: (badgesResult.rows[0] as any)?.badges_earned || 0,
          profile_completion: profileCompletion,
        });
      }

      if (comparisons.length < 2) {
        return res.status(400).json({
          success: false,
          message: "At least 2 valid affiliates are required for comparison.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Affiliate comparison retrieved successfully.",
        data: comparisons,
      });
    } catch (error: any) {
      console.error("Compare affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Find similar affiliates based on sport and location
   * GET /api/affiliate/:affiliateId/similar
   */
  getSimilarAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.affiliateId);
      if (!affiliateId || isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid affiliate ID is required.",
        });
      }

      // Get the target affiliate's sport and location
      const target = await db
        .selectFrom("affiliates")
        .select(["id", "sportsCategoryId", "city"])
        .where("id", "=", affiliateId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!target) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found.",
        });
      }

      // Find similar affiliates: same sport gets score 2, same city gets score 1
      const similar = await sql`
        SELECT
          a.id,
          a.name,
          a."sportsCategoryId" as sport,
          a.city as location,
          a."profilePicture" as profile_picture,
          a.bio,
          a.followers,
          (
            CASE WHEN a."sportsCategoryId" = ${target.sportsCategoryId} THEN 2 ELSE 0 END +
            CASE WHEN a.city = ${target.city} AND a.city IS NOT NULL THEN 1 ELSE 0 END
          ) as similarity_score
        FROM affiliates a
        WHERE a.id != ${affiliateId}
          AND a.deleted = false
          AND a.status = 'ACTIVE'
          AND (
            a."sportsCategoryId" = ${target.sportsCategoryId}
            OR (a.city = ${target.city} AND a.city IS NOT NULL)
          )
        ORDER BY similarity_score DESC, a.followers DESC NULLS LAST
        LIMIT 5
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Similar affiliates retrieved successfully.",
        data: similar.rows,
      });
    } catch (error: any) {
      console.error("Get similar affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ========================= NOTIFICATION CENTER (Round 14) =========================

  /**
   * Get paginated notification history grouped by: today, yesterday, earlier
   * GET /api/affiliate/notifications
   */
  getNotificationHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const notifications = await sql`
        SELECT
          id, title, message, type, is_read, data, created_at,
          CASE
            WHEN created_at::date = CURRENT_DATE THEN 'today'
            WHEN created_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
            ELSE 'earlier'
          END as group_label
        FROM notification_history
        WHERE affiliate_id = ${affiliateId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      const countResult = await sql`
        SELECT COUNT(*)::int as total
        FROM notification_history
        WHERE affiliate_id = ${affiliateId}
      `.execute(db);
      const total = (countResult.rows[0] as any)?.total || 0;

      // Group by today/yesterday/earlier
      const grouped: { today: any[]; yesterday: any[]; earlier: any[] } = {
        today: [],
        yesterday: [],
        earlier: [],
      };

      for (const row of notifications.rows as any[]) {
        const label = row.group_label as keyof typeof grouped;
        if (grouped[label]) {
          grouped[label].push(row);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Notification history retrieved successfully.",
        data: grouped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get notification history error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Mark a single notification as read
   * PATCH /api/affiliate/notifications/:notificationId/read
   */
  markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;
      const notificationId = req.params.notificationId;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: "Notification ID is required.",
        });
      }

      const result = await sql`
        UPDATE notification_history
        SET is_read = true
        WHERE id = ${notificationId}::uuid AND affiliate_id = ${affiliateId}
        RETURNING id, is_read
      `.execute(db);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Mark all notifications as read
   * PATCH /api/affiliate/notifications/read-all
   */
  markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;

      const result = await sql`
        UPDATE notification_history
        SET is_read = true
        WHERE affiliate_id = ${affiliateId} AND is_read = false
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
        data: {
          updated_count: result.numAffectedRows ? Number(result.numAffectedRows) : 0,
        },
      });
    } catch (error: any) {
      console.error("Mark all notifications read error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get count of unread notifications
   * GET /api/affiliate/notifications/unread-count
   */
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = req.user!.id;

      const result = await sql`
        SELECT COUNT(*)::int as unread_count
        FROM notification_history
        WHERE affiliate_id = ${affiliateId} AND is_read = false
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Unread count retrieved successfully.",
        data: {
          unread_count: (result.rows[0] as any)?.unread_count || 0,
        },
      });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };
}

