import { SuperAdminRepository } from "../repositories/SuperAdminRepository.js";
import { compare, hash } from "../utils/crypto/crypto.js";
import { sign } from "../utils/jwt/jwt.js";
import { UserTypes } from "../interfaces/jwtPayloads.js";
import { CacheService } from "../utils/cache/cacheService.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
} from "../utils/errors/AppError.js";
import { generateInvitationCode, generateOTP } from "../utils/crypto/crypto.js";
import { sendSMSNotification } from "../utils/sms/smsService.js";
import { createSMSService } from "../utils/sms/smsService.js";
import { sendSuperAdminOTPEmail } from "../utils/email/superAdminEmail.js";
import { sendOrganizationCredentialsEmail } from "../utils/email/organizationEmail.js";
import axios from "axios";

const smsService = createSMSService();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export class SuperAdminService {
  private repository: SuperAdminRepository;

  constructor() {
    this.repository = new SuperAdminRepository();
  }

  /**
   * Super Admin Login - Sends OTP to email
   */
  async login(email: string, password: string) {
    const superAdmin = await this.repository.findByEmail(email);

    if (!superAdmin) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isValidPassword = await compare(password, superAdmin.password);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!superAdmin.active) {
      throw new UnauthorizedError("Account is inactive");
    }

    // Check if there's a cached OTP
    const cachedOTP = await CacheService.getCachedOTP(email);
    let otp: string;
    let shouldCreateNewOTP = false;

    if (cachedOTP) {
      // Reuse cached OTP but still resend email to ensure user receives it
      otp = cachedOTP;
      const timeRemaining = await CacheService.getOTPTimeRemaining(email);
      
      // If OTP is about to expire (less than 2 minutes), generate a new one
      if (timeRemaining < 120) {
        shouldCreateNewOTP = true;
      }
    } else {
      shouldCreateNewOTP = true;
    }

    if (shouldCreateNewOTP) {
      // Generate new OTP
      otp = generateOTP();
      
      // Cache OTP (5 minutes)
      await CacheService.cacheOTP(email, otp);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clean existing OTP records
      await this.repository.deleteOTPVerificationByEmailAndType(email, "SUPER_ADMIN_LOGIN");

      // Insert new OTP record (using phone field to store email)
      await this.repository.createOTPVerification({
        phone: email,
        otp,
        type: "SUPER_ADMIN_LOGIN",
        attempts: 0,
        verified: false,
        expiresAt,
      });
    } else {
      // Ensure otp is set when using cached OTP
      otp = cachedOTP!;
    }

    // Always send OTP via email (even if cached) to ensure user receives it
    try {
      await sendSuperAdminOTPEmail(email, otp);
      console.log(`Super Admin OTP email sent successfully to ${email}`);
    } catch (error: any) {
      console.error("Failed to send OTP email:", {
        email,
        error: error.message,
        stack: error.stack,
      });
      
      // If email fails and we don't have a cached OTP, throw error
      if (!cachedOTP) {
        throw new InternalServerError(
          `Failed to send OTP email. Please check your email configuration or try again later. Error: ${error.message}`
        );
      }
      
      // If cached OTP exists but email fails, log warning but don't fail
      // User can still use the cached OTP if they received it previously
      console.warn(
        `Email sending failed for ${email}, but cached OTP exists. User may need to request a new OTP.`
      );
      
      // Re-throw to let controller handle it, but with a more user-friendly message
      throw new InternalServerError(
        "OTP email could not be sent. Please check your email configuration or try again. If you have a recent OTP, you can still use it."
      );
    }

    const timeRemaining = await CacheService.getOTPTimeRemaining(email);
    return {
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        email,
        expiresIn: timeRemaining > 0 ? timeRemaining : 600,
        ...(cachedOTP && !shouldCreateNewOTP ? { cached: true } : {}),
      },
    };
  }

  /**
   * Verify OTP and Login - Generates JWT token
   */
  async verifyOTPAndLogin(email: string, otp: string) {
    const superAdmin = await this.repository.findByEmail(email);

    if (!superAdmin) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!superAdmin.active) {
      throw new UnauthorizedError("Account is inactive");
    }

    // Check cached OTP first
    const cachedOTP = await CacheService.getCachedOTP(email);
    let isValidOTP = false;
    let otpRecord = await this.repository.getOTPVerificationByEmail(email, "SUPER_ADMIN_LOGIN");

    if (cachedOTP && cachedOTP === otp) {
      isValidOTP = true;
      await CacheService.invalidateOTP(email);
      await this.repository.updateOTPVerificationByEmailAndType(email, "SUPER_ADMIN_LOGIN", {
        verified: true,
      });
    } else {
      // Verify from database
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
      await CacheService.invalidateOTP(email);
    }

    if (!isValidOTP) {
      throw new BadRequestError("The verification code you entered is incorrect. Please check and try again.");
    }

    // Generate JWT token
    const cachedToken = await CacheService.getCachedJWT(
      superAdmin.id,
      UserTypes.SUPER_ADMIN
    );
    let token: string;

    if (cachedToken) {
      token = cachedToken;
    } else {
      token = sign({
        id: superAdmin.id,
        type: UserTypes.SUPER_ADMIN,
      });
      await CacheService.cacheJWT(superAdmin.id, UserTypes.SUPER_ADMIN, token);
    }

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: superAdmin.role,
        },
      },
    };
  }

  /**
   * Onboard Sports Organization
   */
  async onboardOrganization(data: {
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
  }, superAdminId: number) {
    // Check for duplicate email
    const existingOrg = await this.repository.findOrganizationByEmail(data.email);
    if (existingOrg) {
      throw new BadRequestError("Organization with this email already exists");
    }

    // Check for duplicate phone
    const existingPhone = await this.repository.findOrganizationByPhone(data.phone);
    if (existingPhone) {
      throw new BadRequestError("Organization with this phone number already exists");
    }

    // Hash password
    const hashedPassword = await hash(data.password);

    // Create organization
    const organizationData: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      status: "APPROVED",
      isVerified: true,
      isFirstLogin: true,
      onboardedBy: superAdminId,
      deleted: false,
    };

    if (data.address !== undefined) {
      organizationData.address = data.address;
    }
    if (data.organizationType !== undefined) {
      organizationData.organizationType = data.organizationType;
    }
    if (data.city !== undefined) {
      organizationData.city = data.city;
    }
    if (data.state !== undefined) {
      organizationData.state = data.state;
    }
    if (data.country !== undefined) {
      organizationData.country = data.country;
    }
    if (data.district !== undefined) {
      organizationData.district = data.district;
    }
    if (data.pincode !== undefined) {
      organizationData.pincode = data.pincode;
    }
    if (data.logo !== undefined) {
      organizationData.logo = data.logo;
    }
    if (data.description !== undefined) {
      organizationData.description = data.description;
    }
    if (data.website !== undefined) {
      organizationData.website = data.website;
    }
    if (data.registrationNumber !== undefined) {
      organizationData.registrationNumber = data.registrationNumber;
    }
    if (data.establishedYear !== undefined) {
      organizationData.establishedYear = data.establishedYear;
    }
    if (data.sportsCategories !== undefined) {
      organizationData.sportsCategories = JSON.stringify(data.sportsCategories);
    }

    const newOrganization = await this.repository.createOrganization(organizationData);

    // Create audit log
    await this.repository.createAuditLog({
      userId: superAdminId,
      userType: "SUPER_ADMIN",
      action: "CREATE_ORGANIZATION",
      entityType: "SPORTS_ORGANIZATION",
      entityId: newOrganization.id,
      newValues: JSON.stringify(newOrganization),
    });

    // Send email with login credentials to the organization's registered email address
    try {
      await sendOrganizationCredentialsEmail(
        data.email, // Send to organization's registered email
        data.name,   // Organization name
        data.email, // Email for display in the email
        data.password // Plain text password (before hashing)
      );
      console.log(`Organization credentials email sent successfully to ${data.email}`);
    } catch (error: any) {
      // Log email error but don't fail the onboarding process
      console.error("Failed to send organization credentials email:", {
        error: error.message,
        code: error.code,
        to: data.email,
        organizationId: newOrganization.id
      });
      // Note: We don't throw here because the organization is already created
      // The email failure should be logged but not block the onboarding
    }

    return {
      success: true,
      message: "Sports organization onboarded successfully",
      data: {
        id: newOrganization.id,
        name: newOrganization.name,
        email: newOrganization.email,
        status: newOrganization.status,
      },
    };
  }

  /**
   * Onboard Sponsorship Team
   */
  async onboardSponsorshipTeam(data: {
    name: string;
    email: string;
    password: string;
  }, superAdminId: number) {
    // Check for duplicate email
    const existingTeam = await this.repository.findSponsorshipTeamByEmail(data.email);
    if (existingTeam) {
      throw new BadRequestError("Sponsorship team member with this email already exists");
    }

    // Hash password
    const hashedPassword = await hash(data.password);

    // Create sponsorship team member
    const teamData: any = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      active: true,
      deleted: false,
    };

    const newTeamMember = await this.repository.createSponsorshipTeam(teamData);

    // Create audit log
    await this.repository.createAuditLog({
      userId: superAdminId,
      userType: "SUPER_ADMIN",
      action: "CREATE_SPONSORSHIP_TEAM",
      entityType: "SPONSORSHIP_TEAM",
      entityId: newTeamMember.id,
      newValues: JSON.stringify(newTeamMember),
    });

    return {
      success: true,
      message: "Sponsorship team member onboarded successfully",
      data: {
        id: newTeamMember.id,
        name: newTeamMember.name,
        email: newTeamMember.email,
        active: newTeamMember.active,
      },
    };
  }


   async getSponsorshipTeam(page: number, limit: number) {
  if (page < 1 || limit < 1) {
    throw new BadRequestError("Page and limit must be greater than 0");
  }

  const { data, total } = await this.repository.getAllSponsorshipTeam(
    page,
    limit
  );

  return {
    success: true,
    message: "Sponsorship team list fetched successfully",
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
}

  /**
   * Get All Organizations
   */
  async getAllOrganizations(params: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    const { organizations, total } = await this.repository.getAllOrganizations({
      status: params.status as string | undefined,
      page,
      limit,
      search: params.search,
    });

    return {
      success: true,
      message: "Organizations retrieved successfully",
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Update Organization Status
   */
  async updateOrganizationStatus(
    id: number,
    status: "APPROVED" | "REJECTED" | "SUSPENDED",
    comments: string | undefined,
    superAdminId: number
  ) {
    const organization = await this.repository.getOrganizationById(id);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const updatedOrg = await this.repository.updateOrganizationStatus(id, status);

    // Create audit log
    await this.repository.createAuditLog({
      userId: superAdminId,
      userType: "SUPER_ADMIN",
      action: "UPDATE_ORGANIZATION_STATUS",
      entityType: "SPORTS_ORGANIZATION",
      entityId: id,
      oldValues: JSON.stringify({ status: organization.status }),
      newValues: JSON.stringify({ status, comments }),
    });

    return {
      success: true,
      message: `Organization status updated to ${status}`,
      data: updatedOrg,
    };
  }

  /**
   * Get Non-Affiliate Requests
   */
  async getNonAffiliateRequests(params: {
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    const { requests, total } = await this.repository.getNonAffiliateRequests({
      page,
      limit,
    });

    return {
      success: true,
      message: "Non-affiliate requests retrieved successfully",
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Review Non-Affiliate Request
   */
  async reviewNonAffiliateRequest(
    id: number,
    status: "APPROVED" | "REJECTED",
    comments: string | undefined,
    superAdminId: number
  ) {
    const request = await this.repository.getNonAffiliateRequestById(id);
    if (!request) {
      throw new NotFoundError("Request not found.");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestError("Request has already been reviewed.");
    }

    let invitationCodeId = null;

    if (status === "APPROVED") {
      const invitationCodeData: any = {
        code: `NAF-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
        type: "NON_AFFILIATE",
        generatedBy: superAdminId,
        recipientPhone: request.phone,
        recipientName: request.name,
        role: request.role,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deleted: false,
      };

      if (request.email !== undefined) {
        invitationCodeData.recipientEmail = request.email;
      }

      const metadata: any = {
        originalRequestId: request.id,
      };
      if (request.sportsCategoryId !== undefined) {
        metadata.sportsCategoryId = request.sportsCategoryId;
      }
      invitationCodeData.metadata = JSON.stringify(metadata);

      const invitationCode = await this.repository.createInvitationCode(invitationCodeData);

      invitationCodeId = invitationCode.id;

      await sendSMSNotification({
        phone: request.phone,
        inviteCode: invitationCode.code,
      });
    }

    const updatedRequest = await this.repository.updateNonAffiliateRequest(id, {
      status,
      reviewedBy: superAdminId,
      reviewedAt: new Date(),
      reviewComments: comments,
      invitationCodeId: invitationCodeId ?? undefined,
    });

    // Create audit log
    await this.repository.createAuditLog({
      userId: superAdminId,
      userType: "SUPER_ADMIN",
      action: "REVIEW_NON_AFFILIATE_REQUEST",
      entityType: "NON_AFFILIATE_REQUEST",
      entityId: id,
      oldValues: JSON.stringify({ status: request.status }),
      newValues: JSON.stringify({ status, comments, invitationCodeId }),
    });

    return {
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      data: updatedRequest,
    };
  }

  /**
   * Get All Affiliates
   */
  async getAllAffiliates(params: {
    status?: string;
    role?: string;
    organizationId?: number;
    invitationStatus?: string;
    page?: number;
    limit?: number;
    search?: string;
    phone?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    const { affiliates, total } = await this.repository.getAllAffiliates({
      status: params.status,
      role: params.role,
      organizationId: params.organizationId,
      invitationStatus: params.invitationStatus,
      page,
      limit,
      search: params.search,
      phone: params.phone,
    });

    return {
      success: true,
      message: "Affiliates retrieved successfully",
      count: affiliates.length,
      data: {
        affiliates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get Non-Affiliates
   */
  async getNonAffiliates(params: { page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    const { affiliates, total } = await this.repository.getNonAffiliates({
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    if (affiliates.length === 0) {
      return {
        success: false,
        message: "No affiliates found.",
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

    return {
      success: true,
      message: "Affiliates retrieved successfully.",
      count: affiliates.length,
      data: affiliates,
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
   * Onboard Affiliate by Admin
   */
  async onboardAffiliateByAdmin(
    data: {
      name: string;
      role: string;
      email?: string;
      phone: string;
      dateOfBirth?: Date;
      gender?: "MALE" | "FEMALE" | "OTHER";
      sportsCategoryId?: number;
      position?: string;
      bio?: string;
      achievements?: string;
    },
    organizationId: number,
    superAdminId: number
  ) {
    // Check if organization exists
    const organization = await this.repository.getOrganizationForAffiliateOnboarding(
      organizationId
    );
    if (!organization) {
      throw new BadRequestError("Organization does not exist with this id.");
    }

    // Check if affiliate already exists
    const existingAffiliate =
      await this.repository.findAffiliateByPhoneInOrganization(data.phone, organizationId);
    if (existingAffiliate) {
      throw new BadRequestError("Athlete already exist in this organization.");
    }

    const invitationCode = generateInvitationCode();

    // Build affiliate data object, only including defined optional properties
    const affiliateData: any = {
      name: data.name,
      password: "",
      role: data.role as any,
      phone: data.phone,
      invitationCode,
      invitationStatus: "PENDING",
      status: "PENDING",
      addedBy: superAdminId,
      deleted: false,
    };
    if (data.email) affiliateData.email = data.email;
    if (data.dateOfBirth) affiliateData.dateOfBirth = data.dateOfBirth;
    if (data.gender) affiliateData.gender = data.gender;
    if (data.sportsCategoryId) affiliateData.sportsCategoryId = data.sportsCategoryId;
    if (data.position) affiliateData.position = data.position;
    if (data.bio) affiliateData.bio = data.bio;
    if (data.achievements) affiliateData.achievements = data.achievements;

    const newAffiliate = await this.repository.createAffiliate(affiliateData, organizationId);

    // Build invitation code data object, only including defined optional properties
    const invitationCodeData: any = {
      code: invitationCode,
      type: "AFFILIATE",
      role: data.role as any,
      organizationId,
      generatedBy: superAdminId,
      recipientPhone: data.phone,
      recipientName: data.name,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        affiliateId: newAffiliate.id,
      }),
      deleted: false,
    };
    if (data.email) invitationCodeData.recipientEmail = data.email;

    // Create invitation code
    await this.repository.createInvitationCode(invitationCodeData);

    // Send SMS
    await smsService.sendInvitation(data.phone, invitationCode, organization.name);

    // Update invitation status
    await this.repository.updateAffiliateInvitationStatus(newAffiliate.id, "SENT");

    // Create audit log
    await this.repository.createAuditLog({
      userId: superAdminId,
      userType: "SUPER_ADMIN",
      action: "ADD_AFFILIATE",
      entityType: "AFFILIATE",
      entityId: newAffiliate.id,
      newValues: JSON.stringify(newAffiliate),
    });

    return {
      success: true,
      message: "Affiliate added and invitation sent successfully",
      data: {
        id: newAffiliate.id,
        name: newAffiliate.name,
        phone: newAffiliate.phone,
        invitationCode,
        invitationStatus: "SENT",
      },
    };
  }

  /**
   * Delete Affiliate by Admin
   */
  async deleteAffiliateByAdmin(id: number) {
    const affiliate = await this.repository.getAffiliateById(id);
    if (!affiliate) {
      throw new NotFoundError("Affiliate not found or might have been already deleted.");
    }

    await this.repository.deleteAffiliate(id);

    return {
      success: true,
      message: "Affiliate deleted successfully.",
    };
  }

  /**
   * Get Affiliate Data
   */
  async getAffiliateData(id: number) {
    const affiliate = await this.repository.getAffiliateById(id);
    if (!affiliate) {
      throw new NotFoundError("Affiliate not found");
    }

    const relatedData = await this.repository.getAffiliateRelatedData(id);

    return {
      success: true,
      message: "Profile retrieved successfully",
      data: {
        ...affiliate,
        ...relatedData,
      },
    };
  }
}

