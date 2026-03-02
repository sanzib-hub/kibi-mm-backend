import { OrganizationRepository } from "../repositories/OrganizationRepository.js";
import { compare, hash, generateInvitationCode } from "../utils/crypto/crypto.js";
import { sign } from "../utils/jwt/jwt.js";
import { UserTypes } from "../interfaces/jwtPayloads.js";
import { createSMSService } from "../utils/sms/smsService.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
} from "../utils/errors/AppError.js";
import { CreateAffiliateDto, BulkAddAffiliatesDto, UpdateAffiliateStatusDto, ChangePasswordDto, ForgotPasswordDto, SetNewPasswordDto } from "../dtos/onboarding.dto.js";
import sendEmailWithNodeMailer from "../utils/email/emailService.js";
import { verify } from "../utils/jwt/jwt.js";
import { JwtPayload } from "jsonwebtoken";
import axios from "axios";
import { db } from "../database/kysely/databases.js";

const smsService = createSMSService();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export class OrganizationService {
  private repository: OrganizationRepository;

  constructor() {
    this.repository = new OrganizationRepository();
  }

  /**
   * Organization Login
   */
  async login(email: string, password: string) {
    const organization = await this.repository.findByEmail(email);

    if (!organization) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isValidPassword = await compare(password, organization.password);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (organization.status !== "APPROVED") {
      throw new UnauthorizedError(
        `Organization status: ${organization.status}. Please contact admin.`
      );
    }

    const token = sign({
      id: organization.id,
      type: UserTypes.ORGANIZATION,
      organizationId: organization.id,
    });

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        organization: {
          id: organization.id,
          name: organization.name,
          email: organization.email,
          status: organization.status,
          isFirstLogin: organization.isFirstLogin,
        },
      },
    };
  }

  /**
   * Change Organization Password
   */
  async changePassword(
    organizationId: number,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) {
    const organization = await this.repository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const isMatch = await compare(oldPassword, organization.password);
    if (!isMatch) {
      throw new BadRequestError("Old password is incorrect");
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestError("New password and confirm password do not match");
    }

    if (oldPassword === newPassword) {
      throw new BadRequestError("New password cannot be the same as the old password");
    }

    const hashedPassword = await hash(newPassword);
    await this.repository.update(organizationId, { password: hashedPassword });

    return {
      success: true,
      message: "Password updated successfully",
    };
  }

  /**
   * Add Single Affiliate
   */
async addAffiliate(
  data: CreateAffiliateDto,
  organizationId: number,
  userId: number
) {
  if (organizationId === 1) {
    throw new BadRequestError(
      "Default organization cannot invite affiliates."
    );
  }

  if (data.sportsCategoryId) {
    const isValid = await this.repository.isValidSportsCategory(
      data.sportsCategoryId
    );
    if (!isValid) {
      throw new BadRequestError(
        "Sports category does not exist with this id."
      );
    }
  }

  const existingAffiliate =
    await this.repository.findAffiliateByPhoneOrEmail(
      organizationId,
      data.phone,
      data.email
    );

  // 🔁 RESEND FLOW
  if (existingAffiliate) {
    const isPending =
      existingAffiliate.invitationStatus === "PENDING" &&
      existingAffiliate.status === "PENDING";

    if (!isPending) {
      let message = "";
      if (
        existingAffiliate.phone === data.phone &&
        existingAffiliate.email === data.email
      ) {
        message =
          "Affiliate with this phone number and email already exists";
      } else if (existingAffiliate.phone === data.phone) {
        message = "Affiliate with this phone number already exists";
      } else {
        message = "Affiliate with this email already exists";
      }

      throw new BadRequestError(message);
    }

    const invitationCode = await generateInvitationCode();

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("affiliates")
        .set({
          invitationCode,
          invitationStatus: "SENT",
        })
        .where("id", "=", existingAffiliate.id)
        .execute();

      await trx
        .updateTable("invitation_codes")
        .set({ status: "EXPIRED" })
        .where("metadata", "like", `%\"affiliateId\":${existingAffiliate.id}%`)
        .where("status", "=", "ACTIVE")
        .execute();

      await trx
        .insertInto("invitation_codes")
        .values({
          code: invitationCode,
          type: "AFFILIATE",
          role: data.role,
          organizationId,
          generatedBy: userId,
          recipientPhone: data.phone,
          recipientEmail: data.email,
          recipientName: data.name,
          status: "ACTIVE",
          expiresAt: new Date("9999-12-31T23:59:59.999Z"),
          deleted: false,
          metadata: JSON.stringify({
            affiliateId: existingAffiliate.id,
            sportsCategoryId: data.sportsCategoryId,
          }),
        })
        .execute();
    });

    const organization = await this.repository.getNameById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    await smsService.sendInvitation(
      data.phone,
      invitationCode,
      organization.name
    );

    return {
      success: true,
      message: "Invitation resent successfully",
      data: {
        id: existingAffiliate.id,
        phone: data.phone,
        invitationCode,
        invitationStatus: "SENT",
      },
    };
  }

  // 🆕 CREATE FLOW
  const invitationCode = await generateInvitationCode();

  const newAffiliate = await db.transaction().execute(async (trx) => {
    const affiliate = await trx
      .insertInto("affiliates")
      .values({
        name: data.name,
        password: "",
        role: data.role,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        sportsCategoryId: data.sportsCategoryId,
        position: data.position,
        bio: data.bio,
        achievements: data.achievements,
        invitationCode,
        invitationStatus: "PENDING",
        status: "PENDING",
        addedBy: userId,
        deleted: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create mapping entry
    await trx
      .insertInto("affiliate_organizations")
      .values({
        affiliateId: affiliate.id,
        organizationId: organizationId,
        deleted: false,
        createdAt: new Date(),
      })
      .execute();

    await trx
      .insertInto("invitation_codes")
      .values({
        code: invitationCode,
        type: "AFFILIATE",
        role: data.role,
        organizationId,
        generatedBy: userId,
        recipientPhone: data.phone,
        recipientEmail: data.email,
        recipientName: data.name,
        status: "ACTIVE",
        expiresAt: new Date("9999-12-31T23:59:59.999Z"),
        deleted: false,
        metadata: JSON.stringify({
          affiliateId: affiliate.id,
          sportsCategoryId: data.sportsCategoryId,
        }),
      })
      .execute();

    return affiliate;
  });

  const organization = await this.repository.getNameById(organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }

  await smsService.sendInvitation(
    data.phone,
    invitationCode,
    organization.name
  );

  await this.repository.updateAffiliateInvitationStatus(
    newAffiliate.id,
    "SENT"
  );

  await this.repository.createAuditLog({
    userId,
    userType: "ORGANIZATION",
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
   * Bulk Add Affiliates
   */
  async bulkAddAffiliates(
    data: BulkAddAffiliatesDto,
    organizationId: number,
    userId: number
  ) {
    const organization = await this.repository.getNameById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < data.affiliates.length; i++) {
      const affiliate = data.affiliates[i];

      if (!affiliate) {
        errors.push({
          index: i,
          phone: "",
          email: "",
          error: "Affiliate data is missing",
        });
        continue;
      }

      try {
        // Validate sports category
        if (affiliate.sportsCategoryId !== undefined) {
          const isValid = await this.repository.isValidSportsCategory(affiliate.sportsCategoryId);
          if (!isValid) {
            errors.push({
              index: i,
              phone: affiliate.phone,
              email: affiliate.email,
              error: `Sports category does not exist with this id (${affiliate.sportsCategoryId}).`,
            });
            continue;
          }
        }

        // Create affiliate - allowing duplicates (same phone/email for different people)
        const affiliateData: any = {
          name: affiliate.name,
          password: "",
          role: affiliate.role,
          phone: affiliate.phone,
          invitationCode: "",
          invitationStatus: "PENDING",
          status: "VERIFIED",
          addedBy: userId,
          deleted: false,
        };

        if (affiliate.email !== undefined) {
          affiliateData.email = affiliate.email;
        }
        if (affiliate.dateOfBirth !== undefined) {
          affiliateData.dateOfBirth = affiliate.dateOfBirth;
        }
        if (affiliate.gender !== undefined) {
          affiliateData.gender = affiliate.gender;
        }
        if (affiliate.sportsCategoryId !== undefined) {
          affiliateData.sportsCategoryId = affiliate.sportsCategoryId;
        }
        if (affiliate.position !== undefined) {
          affiliateData.position = affiliate.position;
        }
        if (affiliate.bio !== undefined) {
          affiliateData.bio = affiliate.bio;
        }
        if (affiliate.achievements !== undefined) {
          affiliateData.achievements = affiliate.achievements;
        }

        const newAffiliate = await this.repository.createAffiliate(affiliateData, organizationId);

        // Create audit log
        await this.repository.createAuditLog({
          userId,
          userType: "ORGANIZATION",
          action: "ADD_AFFILIATE",
          entityType: "AFFILIATE",
          entityId: newAffiliate.id,
          newValues: JSON.stringify(newAffiliate),
        });

        results.push({
          id: newAffiliate.id,
          name: newAffiliate.name,
          phone: newAffiliate.phone,
          status: "SUCCESS",
        });
      } catch (error: any) {
        errors.push({
          index: i,
          phone: affiliate.phone,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Processed ${data.affiliates.length} affiliates. ${results.length} successful, ${errors.length} failed.`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: data.affiliates.length,
          successful: results.length,
          failed: errors.length,
        },
      },
    };
  }

  /**
   * Get Affiliates
   */
  async getAffiliates(
    organizationId: number,
    params: {
      status?: string;
      role?: string;
      invitationStatus?: string;
      page?: number;
      limit?: number;
      search?: string;
    }
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    const getAffiliatesParams: {
      organizationId: number;
      status?: string;
      role?: string;
      invitationStatus?: string;
      page: number;
      limit: number;
      search?: string;
    } = {
      organizationId,
      page,
      limit,
    };

    if (params.status !== undefined) {
      getAffiliatesParams.status = params.status;
    }
    if (params.role !== undefined) {
      getAffiliatesParams.role = params.role;
    }
    if (params.invitationStatus !== undefined) {
      getAffiliatesParams.invitationStatus = params.invitationStatus;
    }
    if (params.search !== undefined) {
      getAffiliatesParams.search = params.search;
    }

    const { affiliates, total } = await this.repository.getAffiliates(getAffiliatesParams);

    return {
      success: true,
      message:
        affiliates.length > 0
          ? "Affiliates retrieved successfully."
          : "No affiliates found.",
      data:
        affiliates.length > 0
          ? {
              affiliates,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
              },
            }
          : [],
    };
  }

  /**
   * Resend Invitation
   */
  async resendInvitation(affiliateId: number, organizationId: number, userId: number) {
    const affiliate = await this.repository.getAffiliateByIdAndOrganization(
      affiliateId,
      organizationId
    );

    if (!affiliate) {
      throw new NotFoundError("Affiliate not found");
    }

    if (affiliate.invitationStatus === "ACCEPTED") {
      throw new BadRequestError("Invitation already accepted");
    }

    // Generate new invitation code
    const newInvitationCode = generateInvitationCode();

    // Update affiliate
    await this.repository.updateAffiliateInvitationCode(
      affiliateId,
      newInvitationCode,
      "PENDING"
    );

    // Expire old invitation code
    if (affiliate.invitationCode) {
      await this.repository.expireInvitationCode(affiliate.invitationCode);
    }

    // Create new invitation code
    const invitationCodeData: any = {
      code: newInvitationCode,
      type: "AFFILIATE",
      organizationId,
      role: affiliate.role,
      generatedBy: userId,
      recipientPhone: affiliate.phone,
      recipientName: affiliate.name,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deleted: false,
    };

    if (affiliate.email !== undefined) {
      invitationCodeData.recipientEmail = affiliate.email;
    }

    const metadata: any = {
      affiliateId: affiliate.id,
    };
    if (affiliate.sportsCategoryId !== undefined) {
      metadata.sportsCategoryId = affiliate.sportsCategoryId;
    }
    invitationCodeData.metadata = JSON.stringify(metadata);

    await this.repository.createInvitationCode(invitationCodeData);

    // Get organization name
    const organization = await this.repository.getNameById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    // Send SMS
    await smsService.sendInvitation(affiliate.phone, newInvitationCode, organization.name);

    // Update invitation status
    await this.repository.updateAffiliateInvitationStatus(affiliateId, "SENT");

    return {
      success: true,
      message: "Invitation resent successfully",
      data: {
        affiliateId: affiliate.id,
        newInvitationCode,
      },
    };
  }

  /**
   * Get Dashboard Stats
   */
  async getDashboardStats(organizationId: number) {
    const stats = await this.repository.getDashboardStats(organizationId);

    return {
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: {
        totalAffiliates: stats.totalAffiliates,
        activeAffiliates: stats.activeAffiliates,
        pendingInvitations: stats.pendingInvitations,
        recentAffiliates: stats.recentAffiliates,
      },
    };
  }

  /**
   * Update Organization Details
   */
  async updateOrganizationDetails(
    organizationId: number,
    data: Record<string, any>
  ) {
    const { name, ...updatableFields } = data;

    // Prevent name updates
    const existingOrg = await this.repository.findById(organizationId);
    if (!existingOrg) {
      throw new NotFoundError("Organization not found.");
    }

    if (name) {
  if (!existingOrg.isFirstLogin) {
    throw new BadRequestError(
      "Organization name can only be updated during first login."
    );
  }
}
    // Define allowed columns
    const allowedColumns = [
      "displayName",
      "email",
      "phone",
      "password",
      "organizationType",
      "address",
      "city",
      "state",
      "country",
      "district",
      "pincode",
      "logo",
      "description",
      "website",
      "registrationNumber",
      "establishedYear",
      "sportsCategories",
      "status",
      "isVerified",
      "onboardedBy",
      "isKycVerified",
    ];

    // Filter only allowed fields
    const payload: Record<string, any> = {};
    for (const key of Object.keys(updatableFields)) {
      if (allowedColumns.includes(key)) {
        payload[key] = (updatableFields as any)[key];
      }
    }

    // Check if there are valid fields to update
    if (Object.keys(payload).length === 0) {
      throw new BadRequestError("No valid fields provided to update.");
    }

    // Always set isFirstLogin to false on update

    // Validate phone
    if (payload.phone) {
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(String(payload.phone).trim())) {
        throw new BadRequestError(
          "Invalid phone number format. Use formats like 9876543210, 09876543210, +919876543210, or 919876543210"
        );
      }
    }

    // Validate email
    if (payload.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(payload.email).trim())) {
        throw new BadRequestError("Invalid email format.");
      }
    }

    // Check for duplicates
    if (payload.phone) {
      const existingPhone = await this.repository.findOrganizationByPhoneExcludingId(
        payload.phone,
        organizationId
      );
      if (existingPhone) {
        throw new BadRequestError("Phone number already exists.");
      }
    }

    if (payload.email) {
      const existingEmail = await this.repository.findOrganizationByEmailExcludingId(
        payload.email,
        organizationId
      );
      if (existingEmail) {
        throw new BadRequestError("Email already exists.");
      }
    }

    // Hash password if provided
    if (payload.password) {
      payload.password = await hash(payload.password);
    }

    // Normalize email
    if (payload.email) {
      payload.email = String(payload.email).trim().toLowerCase();
      const emailRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(payload.email) || payload.email.includes("..")) {
        throw new BadRequestError("Invalid email format.");
      }
    }

    // Normalize phone
    if (payload.phone) {
      const cleanPhone = String(payload.phone).trim().replace(/[\s\-\(\)]/g, "");
      const indianPhoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      const internationalPhoneRegex = /^\+[1-9]\d{9,14}$/;

      if (!indianPhoneRegex.test(cleanPhone) && !internationalPhoneRegex.test(cleanPhone)) {
        throw new BadRequestError(
          "Invalid phone number. Use format: +918795676667, 918795676667, or 8795676667"
        );
      }

      const indianMatch = cleanPhone.match(/^(\+91|91)?([6-9]\d{9})$/);
      if (indianMatch) {
        payload.phone = `+91${indianMatch[2]}`;
      } else {
        payload.phone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
      }
    }



    if (existingOrg.account_id) {
      delete payload.account_id;
    }

    // Helper function to parse Razorpay errors and provide user-friendly messages
    const parseRazorpayError = (error: any): string => {
      try {
        // Extract Razorpay error object
        const razorpayError = error?.error || error?.response?.data?.error || error?.response?.data || error;

        // If Razorpay provides a specific description, use it
        if (razorpayError?.description) {
          const description = razorpayError.description.toLowerCase();
          
          // Check for specific error patterns
          if (description.includes("address") && (description.includes("already") || description.includes("exists") || description.includes("duplicate"))) {
            return "This address is already registered with Razorpay. Please use a different address or contact support if you believe this is an error.";
          }
          
          if (description.includes("postal_code") || description.includes("pincode") || description.includes("postal code")) {
            if (description.includes("invalid") || description.includes("not valid")) {
              return "The pincode/postal code you entered is invalid. Please check and enter a valid 6-digit pincode for India or the correct postal code for your country.";
            }
            return razorpayError.description;
          }
          
          if (description.includes("city") || description.includes("state")) {
            return `Invalid ${description.includes("city") ? "city" : "state"} information. ${razorpayError.description}`;
          }
          
          if (description.includes("phone") || description.includes("mobile")) {
            return "Invalid phone number. Please ensure your phone number is correct and in the correct format (e.g., +918795676667).";
          }
          
          if (description.includes("email")) {
            return "Invalid email address. Please ensure your email is correct and properly formatted.";
          }
          
          // Check for "code already in use" error (reference_id conflict)
          if ((description.includes("code") && description.includes("already in use")) || 
              (description.includes("code") && description.includes("already exists"))) {
            return "A Razorpay account with this reference already exists. The system will attempt to use a unique identifier.";
          }
          
          // Return the original description if no specific pattern matches
          return razorpayError.description;
        }

        // Handle nested validation errors
        if (razorpayError?.data && Array.isArray(razorpayError.data)) {
          const firstError = razorpayError.data[0];
          if (firstError?.description) {
            return parseRazorpayError({ error: firstError });
          }
        }

        // Handle error codes
        if (razorpayError?.code) {
          switch (razorpayError.code) {
            case "BAD_REQUEST_ERROR":
              if (razorpayError.description) {
                return parseRazorpayError({ error: { description: razorpayError.description } });
              }
              return "Invalid request. Please check all the details you entered and try again.";
            
            case "VALIDATION_ERROR":
              if (razorpayError.field && razorpayError.description) {
                // Handle "code" field (reference_id) already in use
                if (razorpayError.field === "code" && 
                    (razorpayError.description.toLowerCase().includes("already in use") ||
                     razorpayError.description.toLowerCase().includes("already exists"))) {
                  return "A Razorpay account with this reference already exists. The system will attempt to use a unique identifier.";
                }
                const fieldName = razorpayError.field.replace(/_/g, " ").toLowerCase();
                return `Invalid ${fieldName}: ${razorpayError.description}`;
              }
              return razorpayError.description || "Validation failed. Please check your details.";
            
            case "SERVER_ERROR":
              return "Razorpay server error. Please try again later.";
            
            default:
              return razorpayError.description || "An unexpected error occurred while creating your Razorpay account.";
          }
        }

        // Fallback: check error message for common patterns
        const message = razorpayError?.message || error?.message || error.toString() || "";
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes("address") && (lowerMessage.includes("exists") || lowerMessage.includes("duplicate"))) {
          return "This address is already registered with Razorpay. Please use a different address.";
        }

        if (lowerMessage.includes("pincode") || lowerMessage.includes("postal") || lowerMessage.includes("zip")) {
          return "Invalid pincode/postal code. Please enter a valid 6-digit pincode for India or the correct postal code for your country.";
        }

        if (lowerMessage.includes("phone") || lowerMessage.includes("mobile")) {
          return "Invalid phone number format. Please check your phone number and try again.";
        }

        if (lowerMessage.includes("email")) {
          return "Invalid email address. Please check your email and try again.";
        }

        // Check for "code already in use" in fallback message
        if (lowerMessage.includes("code") && 
            (lowerMessage.includes("already in use") || lowerMessage.includes("already exists"))) {
          return "A Razorpay account with this reference already exists. The system will attempt to use a unique identifier.";
        }

        // Final fallback
        return message || "We couldn't create your Razorpay account. Please check all your details and try again.";
      } catch (err) {
        return "An error occurred while processing your Razorpay account creation. Please try again or contact support.";
      }
    };

    // Razorpay account creation logic
    const addressFields = ["address", "city", "state", "country", "pincode"];
    const payloadProvidesAddress = addressFields.some(
      (field) =>
        Object.prototype.hasOwnProperty.call(payload, field) &&
        payload[field] !== undefined &&
        payload[field] !== null &&
        String(payload[field]).trim() !== ""
    );

    let account_id = existingOrg.account_id;
    let razorpayErrorMessage: string | null = null;

    if (!account_id && payloadProvidesAddress) {
      try {
        const razorpayTypeMap: Record<
          string,
          { type: string; category: string; subcategory: string }
        > = {
          FEDERATION: {
            type: "partnership",
            category: "sports",
            subcategory: "association",
          },
          ASSOCIATIONS: {
            type: "partnership",
            category: "sports",
            subcategory: "association",
          },
          CLUB: {
            type: "partnership",
            category: "sports",
            subcategory: "club",
          },
          ACADEMY: {
            type: "partnership",
            category: "sports",
            subcategory: "academy",
          },
          LEAGUE: {
            type: "partnership",
            category: "sports",
            subcategory: "league",
          },
        };

        const orgTypeKey = (
          payload.organizationType ||
          existingOrg.organizationType ||
          "ACADEMY"
        )
          .toString()
          .toUpperCase();

        const razorpayType = razorpayTypeMap[orgTypeKey];
        if (!razorpayType) {
          throw new Error(`Invalid organizationType for Razorpay: ${orgTypeKey}`);
        }

        // Helper function to create Razorpay account with a given reference_id
        const createRazorpayAccount = async (referenceId: string) => {
          const razorpayBody = {
            type: "route",
            email: payload.email || existingOrg.email,
            phone: payload.phone || existingOrg.phone,
            legal_business_name: existingOrg.name,
            business_type: razorpayType.type,
            profile: {
              category: "healthcare",
              subcategory: "clinic",
              addresses: {
                registered: {
                  street1: payload.address ?? existingOrg.address ?? "",
                  street2: "N/A",
                  city: payload.city ?? existingOrg.city ?? "",
                  state: payload.state ?? existingOrg.state ?? "",
                  postal_code: payload.pincode ?? existingOrg.pincode ?? "",
                  country: payload.country ?? existingOrg.country ?? "IN",
                },
              },
            },
            reference_id: referenceId,
            contact_name: payload.displayName || existingOrg.displayName || existingOrg.name,
          };
          console.log("contact_name",razorpayBody.contact_name)

          const razorpayResponse = await axios.post(
            "https://api.razorpay.com/v2/accounts",
            razorpayBody,
            {
              auth: {
                username: RAZORPAY_KEY_ID!,
                password: RAZORPAY_KEY_SECRET!,
              },
            }
          );

          return razorpayResponse.data?.id || null;
        };

        // Try to create account with standard reference_id first
        let referenceId = `ORG_${organizationId}`;
        try {
          account_id = await createRazorpayAccount(referenceId);
          if (account_id) {
            payload.account_id = account_id;
          }
        } catch (firstError: any) {
          // Check if error is due to "code already in use"
          const errorData = firstError?.response?.data?.error || firstError?.error || {};
          const isCodeInUse = 
            (errorData.field === "code" && 
             (errorData.description?.toLowerCase().includes("already in use") ||
              errorData.description?.toLowerCase().includes("already exists"))) ||
            (errorData.description?.toLowerCase().includes("code") && 
             errorData.description?.toLowerCase().includes("already in use"));

          if (isCodeInUse) {
            // Retry with a unique reference_id
            referenceId = `ORG_${organizationId}_${Date.now()}`;
            try {
              account_id = await createRazorpayAccount(referenceId);
              if (account_id) {
                payload.account_id = account_id;
                console.log(`Razorpay account created with unique reference_id: ${referenceId}`);
              }
            } catch (retryError: any) {
              // If retry also fails, throw the original error
              throw firstError;
            }
          } else {
            // If it's a different error, throw it
            throw firstError;
          }
        }
      } catch (razorError: any) {
        console.error("Razorpay API Error:", razorError.response?.data || razorError.message);
        // Parse the error to get a user-friendly message
        razorpayErrorMessage = parseRazorpayError(razorError);
        // Don't fail the entire update if Razorpay fails, but store the error message
      }
    } else {
      if (payload.account_id) {
        delete payload.account_id;
      }
    }

    if (existingOrg.account_id) {
      // Skip validation
    } else {
      if (payloadProvidesAddress && !account_id) {
        // Use the specific error message from Razorpay if available, otherwise provide a helpful generic message
        const errorMessage = razorpayErrorMessage || 
          "We couldn't create your Razorpay account due to missing or invalid details. " +
          "Please make sure your email, phone number, and complete address (address, city, state, pincode, country) are correctly filled and try again.";
        throw new BadRequestError(errorMessage);
      }
    }

    // Update organization
    const updatedOrganization = await this.repository.update(organizationId, payload);

    // Don't send password in response
    const { password: _, ...organizationData } = updatedOrganization;

    return {
      success: true,
      message: "Organization details updated successfully.",
      data: organizationData,
    };
  }

  /**
   * Get Organization Details
   */
  async getOrganizationDetails(organizationId: number) {
    const organization = await this.repository.findById(organizationId);

    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    return {
      success: true,
      message: "Organization details retrieved successfully",
      data: organization,
    };
  }

  /**
   * Delete Affiliate
   */
  async deleteAffiliate(affiliateId: number, organizationId: number) {
    if (!Number(affiliateId)) {
      throw new BadRequestError("Invalid affiliate ID");
    }

    const affiliate = await this.repository.getAffiliateByIdAndOrganization(
      affiliateId,
      organizationId
    );

    if (!affiliate) {
      throw new NotFoundError("Affiliate not found or might have been already deleted.");
    }

    await this.repository.deleteAffiliate(affiliateId, organizationId);

    return {
      success: true,
      message: "Affiliate deleted successfully.",
    };
  }

  /**
   * Update Affiliate Status
   */
  async updateAffiliateStatus(
    affiliateId: number,
    organizationId: number,
    data: UpdateAffiliateStatusDto,
    userId: number
  ) {
    const affiliate = await this.repository.getAffiliateByIdAndOrganization(
      affiliateId,
      organizationId
    );

    if (!affiliate) {
      throw new NotFoundError("Affiliate not found or does not belong to your organization");
    }

    if (affiliate.status === data.status) {
      throw new BadRequestError(`Affiliate status is already ${data.status}`);
    }

    const updatedAffiliate = await this.repository.updateAffiliateStatus(affiliateId, data.status);

    // Create audit log
    await this.repository.createAuditLog({
      userId,
      userType: "ORGANIZATION",
      action: "UPDATE_AFFILIATE_STATUS",
      entityType: "AFFILIATE",
      entityId: affiliateId,
      oldValues: JSON.stringify({ status: affiliate.status }),
      newValues: JSON.stringify({ status: data.status, reason: data.reason }),
    });

    return {
      success: true,
      message: `Affiliate status updated to ${data.status}`,
      data: {
        id: updatedAffiliate.id,
        name: updatedAffiliate.name,
        status: updatedAffiliate.status,
        updatedAt: updatedAffiliate.updatedAt,
      },
    };
  }

  /**
   * Forgot Password
   */
  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestError("Email id is required.");
    }

    const organization = await this.repository.findByEmail(email);
    if (!organization) {
      throw new BadRequestError("Invalid email Id.");
    }

    const payload = {
      id: organization.id,
      type: UserTypes.ORGANIZATION,
    };

    const token = sign(payload, "15m");

    await sendEmailWithNodeMailer(
      "",
      `${email}`,
      "Reset Password",
      `${payload.type}: Please click on the link to reset your password: ${process.env.FRONTEND_URL}/reset-password?token=${token}`,
      `<strong>${payload.type}</strong>: Please click on the link to reset your password:
             <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">
             Reset Password</a>`
    );

    return {
      success: true,
      message: "Link to reset password is sent to your email.",
    };
  }

  /**
   * Set New Password
   */
  async setNewPassword(token: string, newPassword: string, confirmNewPassword: string) {
    if (!token) {
      throw new BadRequestError("Token is required.");
    }

    if (!newPassword || !confirmNewPassword) {
      throw new BadRequestError("Both password fields are required.");
    }

    const payload = verify(token) as JwtPayload;
    if (!payload || !payload.id) {
      throw new BadRequestError("Invalid token.");
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestError("Passwords does not match.");
    }

    const hashedPassword = await hash(newPassword);
    await this.repository.update(payload.id, { password: hashedPassword });

    return {
      success: true,
      message: "Password reset successfully.",
    };
  }

  /**
   * Get Affiliate Full Profile for Organization
   */
  async getAffiliateFullProfile(affiliateId: number, organizationId: number) {
    if (!affiliateId) {
      throw new BadRequestError("affiliateId is required");
    }

    const id = Number(affiliateId);
    const affiliate = await this.repository.getAffiliateFullProfile(id, organizationId);

    if (!affiliate) {
      throw new NotFoundError("Affiliate not found");
    }

    // Organization ownership is validated in repository query

    return {
      success: true,
      message: "Affiliate profile fetched successfully",
      data: affiliate,
    };
  }
}

