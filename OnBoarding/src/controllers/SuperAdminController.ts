import { Request, Response, NextFunction } from "express";
import { SuperAdminService } from "../services/SuperAdminService.js";
import {
  loginSchema,
  verifySuperAdminOTPSchema,
  createOrganizationSchema,
  updateOrganizationStatusSchema,
  reviewNonAffiliateRequestSchema,
  addAffiliateSchema,
  createSponsorshipTeamSchema,
} from "../dtos/onboarding.dto.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../utils/errors/AppError.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "kysely";
import { db } from "../database/kysely/databases.js";


const s3 = new S3Client({ region: process.env.AWS_REGION || "" });

const S3_BUCKET = process.env.S3_BUCKET;
if (!S3_BUCKET) throw new Error('S3_BUCKET environment variable is required');

export class SuperAdminController {
  private service: SuperAdminService;

  constructor() {
    this.service = new SuperAdminService();
  }

  /**
   * Super Admin Login - Sends OTP to email
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const { email, password } = req.body;
      const result = await this.service.login(email, password);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Super admin login error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Verify OTP and Login - Generates JWT token
   */
  verifyOTPAndLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifySuperAdminOTPSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const { email, otp } = req.body;
      const result = await this.service.verifyOTPAndLogin(email, otp);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Super admin verify OTP error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Onboard Sports Organization
   */
  onboardOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = createOrganizationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const superAdminId = req.user!.id;
      const result = await this.service.onboardOrganization(req.body, superAdminId);
      
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Organization onboarding error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Onboard Sponsorship Team
   */
  onboardSponsorshipTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = createSponsorshipTeamSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const superAdminId = req.user!.id;
      const result = await this.service.onboardSponsorshipTeam(req.body, superAdminId);
      
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Sponsorship team onboarding error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

 getSponsorshipTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    const result = await this.service.getSponsorshipTeam(page, limit);

    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Sponsorship team list error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


  /**
   * Get All Organizations
   */
  getAllOrganizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, page, limit, search } = req.query;
      const params: {
        status?: string;
        page?: number;
        limit?: number;
        search?: string;
      } = {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      };
      if (status) params.status = status as string;
      if (search) params.search = search as string;
      const result = await this.service.getAllOrganizations(params);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get organizations error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Update Organization Status
   */
  updateOrganizationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { error } = updateOrganizationStatusSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const { status, comments } = req.body;
      const superAdminId = req.user!.id;

      const result = await this.service.updateOrganizationStatus(
        Number(id),
        status,
        comments,
        superAdminId
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update organization status error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Non-Affiliate Requests (requests table)
   */
  getNonAffiliateRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await this.service.getNonAffiliateRequests({
        page: Number(page),
        limit: Number(limit),
      });
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get non-affiliate requests error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Review Non-Affiliate Request
   */
  reviewNonAffiliateRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const { status, comments } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be APPROVED or REJECTED.",
        });
      }

      const superAdminId = req.user!.id;
      const result = await this.service.reviewNonAffiliateRequest(
        Number(id),
        status,
        comments,
        superAdminId
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Review non-affiliate request error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get All Affiliates
   */
  getAllAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        status,
        role,
        organizationId,
        invitationStatus,
        page = 1,
        limit = 10,
        search,
        phone,
      } = req.query;

      const params: {
        status?: string;
        role?: string;
        organizationId?: number;
        invitationStatus?: string;
        page?: number;
        limit?: number;
        search?: string;
        phone?: string;
      } = {
        page: Number(page),
        limit: Number(limit),
      };
      if (status) params.status = status as string;
      if (role) params.role = role as string;
      if (organizationId) params.organizationId = Number(organizationId);
      if (invitationStatus) params.invitationStatus = invitationStatus as string;
      if (search) params.search = search as string;
      if (phone) params.phone = phone as string;

      const result = await this.service.getAllAffiliates(params);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get all affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Non-Affiliates (affiliates with organizationId = 1)
   */
  getNonAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await this.service.getNonAffiliates({ page, limit });
      
      // Match old controller behavior: 404 if no affiliates found
      if (!result.success && result.data.length === 0) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
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
      // Create unique key for the file
      const key = `${Date.now()}-${fileName}`;
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: fileType,
        ACL: "private",
      });
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      console.log("Presigned URL generated:", uploadUrl);
      console.log(
        "File URL generated:",
        `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      );
      return res.status(200).json({
        success: true,
        uploadUrl,
        fileUrl: `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      });
    } catch (error: any) {
      console.error("Failed to generate presigned URL:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Onboard Affiliate by Admin
   */
  onboardAffiliateByAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = Number(req.body.organizationId);
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization Id is required.",
        });
      }

      const { error } = addAffiliateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const superAdminId = req.user!.id;
      const result = await this.service.onboardAffiliateByAdmin(
        req.body,
        organizationId,
        superAdminId
      );
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Onboard affiliate by admin error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Delete Affiliate by Admin
   */
  deleteAffiliateByAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!Number(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid affiliate ID",
        });
      }

      const result = await this.service.deleteAffiliateByAdmin(Number(id));
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Delete affiliate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Affiliate Data
   */
  getAffiliateData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.id);
      if (!affiliateId) {
        return res.status(400).json({
          success: false,
          message: "Affiliate ID is required.",
        });
      }

      const result = await this.service.getAffiliateData(affiliateId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get affiliate data error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get KYC Queue — list pending KYC documents
   */
  getKYCQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;

      const documents = await db
        .selectFrom("kyc_documents as kd" as any)
        .innerJoin("affiliates as a", "a.id", "kd.affiliate_id" as any)
        .select([
          "kd.id" as any,
          "kd.affiliate_id" as any,
          "kd.document_type" as any,
          "kd.document_url" as any,
          "kd.document_number" as any,
          "kd.status" as any,
          "kd.created_at" as any,
          "a.name as affiliate_name",
          "a.email as affiliate_email",
          "a.phone as affiliate_phone",
        ])
        .where("kd.status" as any, "=", "PENDING")
        .where("a.deleted", "=", false)
        .orderBy("kd.created_at" as any, "asc")
        .limit(limit)
        .offset(offset)
        .execute();

      return res.status(200).json({
        success: true,
        message: "KYC queue fetched successfully",
        count: documents.length,
        data: documents,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get KYC queue error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Update Organization by Super Admin
   */
  updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = Number(req.params.orgId);
      const superAdminId = req.user!.id;

      if (!orgId || isNaN(orgId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Organization ID is required",
        });
      }

      const { name, email, phone, address, city, state, description, pincode } = req.body;

      // Check organization exists
      const org = await db
        .selectFrom("sports_organizations")
        .selectAll()
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;
      if (description !== undefined) updateData.description = description;
      if (pincode !== undefined) updateData.pincode = pincode;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field is required to update",
        });
      }

      updateData.updatedAt = new Date();

      const updatedOrg = await db
        .updateTable("sports_organizations")
        .set(updateData)
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .returningAll()
        .executeTakeFirst();

      // Create audit log entry
      await db
        .insertInto("audit_logs")
        .values({
          userId: superAdminId,
          userType: "SUPER_ADMIN",
          action: "UPDATE_ORGANIZATION",
          entityType: "ORGANIZATION",
          entityId: orgId,
          oldValues: JSON.stringify(org),
          newValues: JSON.stringify(updateData),
          createdAt: new Date(),
        })
        .execute();

      return res.status(200).json({
        success: true,
        message: "Organization updated successfully",
        data: updatedOrg,
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update organization error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Audit Logs
   */
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;
      const { userType, action, entityType, startDate, endDate } = req.query;

      let query = db
        .selectFrom("audit_logs as al" as any)
        .selectAll("al" as any)
        .orderBy("al.createdAt" as any, "desc")
        .limit(limit)
        .offset(offset);

      if (userType) {
        query = query.where("al.userType" as any, "=", userType as string);
      }
      if (action) {
        query = query.where("al.action" as any, "ilike", `%${action}%`);
      }
      if (entityType) {
        query = query.where("al.entityType" as any, "=", entityType as string);
      }
      if (startDate) {
        query = query.where("al.createdAt" as any, ">=", new Date(startDate as string));
      }
      if (endDate) {
        query = query.where("al.createdAt" as any, "<=", new Date(endDate as string));
      }

      const logs = await query.execute();

      return res.status(200).json({
        success: true,
        message: "Audit logs fetched successfully",
        count: logs.length,
        data: logs,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Reported Content (pending reports)
   */
  getReportedContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;

      const reports = await db
        .selectFrom("post_reports as pr" as any)
        .leftJoin("posts as p", "p.id", "pr.post_id" as any)
        .leftJoin("post_comments as pc", "pc.id", "pr.comment_id" as any)
        .innerJoin("affiliates as reporter", "reporter.id", "pr.reported_by" as any)
        .select([
          "pr.id" as any,
          "pr.post_id" as any,
          "pr.comment_id" as any,
          "pr.reason" as any,
          "pr.description" as any,
          "pr.status" as any,
          "pr.created_at" as any,
          "reporter.name as reporter_name",
          "reporter.id as reporter_id",
          "p.content as post_content" as any,
          "p.affiliate_id as post_author_id" as any,
          "pc.content as comment_content" as any,
          "pc.affiliate_id as comment_author_id" as any,
        ])
        .where("pr.status" as any, "=", "PENDING")
        .orderBy("pr.created_at" as any, "asc")
        .limit(limit)
        .offset(offset)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Reported content fetched successfully",
        count: reports.length,
        data: reports,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get reported content error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Review a report — update status and optionally remove content
   */
  reviewReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = Number(req.params.reportId);
      const superAdminId = req.user!.id;
      const { status, action } = req.body;

      if (!reportId || isNaN(reportId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Report ID is required",
        });
      }

      if (!status || !["REVIEWED", "RESOLVED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be REVIEWED or RESOLVED",
        });
      }

      // Get the report
      const report = await db
        .selectFrom("post_reports" as any)
        .selectAll()
        .where("id", "=", reportId)
        .executeTakeFirst();

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Report not found",
        });
      }

      // Update report status
      await db
        .updateTable("post_reports" as any)
        .set({
          status,
          reviewed_by: superAdminId,
        })
        .where("id", "=", reportId)
        .execute();

      // If action is REMOVE, soft-delete the reported content
      if (action === "REMOVE") {
        if ((report as any).post_id) {
          await db
            .updateTable("posts" as any)
            .set({ is_deleted: true, updated_at: new Date() })
            .where("id", "=", (report as any).post_id)
            .execute();
        }
        if ((report as any).comment_id) {
          await db
            .updateTable("post_comments" as any)
            .set({ is_deleted: true })
            .where("id", "=", (report as any).comment_id)
            .execute();
        }
      }

      // Create audit log
      await db
        .insertInto("audit_logs")
        .values({
          userId: superAdminId,
          userType: "SUPER_ADMIN",
          action: action === "REMOVE" ? "REMOVE_REPORTED_CONTENT" : "REVIEW_REPORT",
          entityType: "POST_REPORT",
          entityId: reportId,
          oldValues: JSON.stringify(report),
          newValues: JSON.stringify({ status, action }),
          createdAt: new Date(),
        })
        .execute();

      return res.status(200).json({
        success: true,
        message: `Report ${status.toLowerCase()} successfully${action === "REMOVE" ? " and content removed" : ""}`,
        data: {
          reportId,
          status,
          action: action || null,
          reviewedBy: superAdminId,
        },
      });
    } catch (error: any) {
      console.error("Review report error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Review KYC — approve or reject
   */
  reviewKYC = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const affiliateId = Number(req.params.affiliateId);
      const adminId = Number(req.user?.id);
      const { action, comments } = req.body;

      if (!affiliateId || isNaN(affiliateId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Affiliate ID is required",
        });
      }

      if (!action || !["APPROVED", "REJECTED"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "action must be APPROVED or REJECTED",
        });
      }

      // Update all pending KYC documents for this affiliate
      await db
        .updateTable("kyc_documents" as any)
        .set({
          status: action,
          reviewed_by: adminId,
          reviewed_at: new Date(),
          review_comments: comments || null,
        })
        .where("affiliate_id", "=", affiliateId)
        .where("status", "=", "PENDING")
        .execute();

      // If approved, update affiliate kyc_status
      if (action === "APPROVED") {
        await db
          .updateTable("affiliates")
          .set({ kyc_status: "VERIFIED" } as any)
          .where("id", "=", affiliateId)
          .where("deleted", "=", false)
          .execute();
      } else {
        await db
          .updateTable("affiliates")
          .set({ kyc_status: "REJECTED" } as any)
          .where("id", "=", affiliateId)
          .where("deleted", "=", false)
          .execute();
      }

      return res.status(200).json({
        success: true,
        message: `KYC ${action.toLowerCase()} successfully`,
        data: {
          affiliateId,
          status: action,
          reviewedBy: adminId,
        },
      });
    } catch (error: any) {
      console.error("Review KYC error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Bulk Import Affiliates (Super Admin)
   */
  bulkImportAffiliates = async (req: Request, res: Response) => {
    try {
      const adminId = req.user!.id;
      const { affiliates, organizationId } = req.body;

      if (!Array.isArray(affiliates) || affiliates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "affiliates must be a non-empty array",
        });
      }

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "organizationId is required",
        });
      }

      // Verify organization exists
      const org = await db
        .selectFrom("sports_organizations")
        .select(["id", "name"])
        .where("id", "=", Number(organizationId))
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const successful: any[] = [];
      const failed: any[] = [];

      for (let i = 0; i < affiliates.length; i++) {
        const affiliate = affiliates[i];

        try {
          // Basic validation
          if (!affiliate.name || !affiliate.phone) {
            failed.push({
              index: i,
              name: affiliate.name || "N/A",
              phone: affiliate.phone || "N/A",
              error: "name and phone are required",
            });
            continue;
          }

          // Check for duplicate phone
          const existingByPhone = await db
            .selectFrom("affiliates")
            .select(["id"])
            .where("phone", "=", affiliate.phone)
            .where("organizationId" as any, "=", Number(organizationId))
            .where("deleted", "=", false)
            .executeTakeFirst();

          if (existingByPhone) {
            failed.push({
              index: i,
              name: affiliate.name,
              phone: affiliate.phone,
              error: "Affiliate with this phone number already exists in this organization",
            });
            continue;
          }

          // Check for duplicate email if provided
          if (affiliate.email) {
            const existingByEmail = await db
              .selectFrom("affiliates")
              .select(["id"])
              .where("email", "=", affiliate.email)
              .where("organizationId" as any, "=", Number(organizationId))
              .where("deleted", "=", false)
              .executeTakeFirst();

            if (existingByEmail) {
              failed.push({
                index: i,
                name: affiliate.name,
                email: affiliate.email,
                error: "Affiliate with this email already exists in this organization",
              });
              continue;
            }
          }

          // Generate invitation code
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let invitationCode = "";
          for (let j = 0; j < 8; j++) {
            invitationCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          // Insert affiliate
          const newAffiliate = await db
            .insertInto("affiliates")
            .values({
              name: affiliate.name,
              email: affiliate.email || null,
              phone: affiliate.phone,
              role: affiliate.role || "ATHLETE",
              organizationId: Number(organizationId),
              dateOfBirth: affiliate.dateOfBirth || null,
              gender: affiliate.gender || null,
              sportsCategoryId: affiliate.sportsCategoryId ? Number(affiliate.sportsCategoryId) : null,
              position: affiliate.position || null,
              bio: affiliate.bio || null,
              achievements: affiliate.achievements || null,
              invitationCode,
              invitationStatus: "PENDING",
              status: "PENDING",
              addedBy: adminId,
            } as any)
            .returning(["id", "name", "phone", "email", "invitationCode"] as any[])
            .executeTakeFirst();

          // Add to affiliate_organizations
          await db
            .insertInto("affiliate_organizations" as any)
            .values({
              affiliateId: (newAffiliate as any).id,
              organizationId: Number(organizationId),
            } as any)
            .execute();

          successful.push({
            id: (newAffiliate as any).id,
            name: (newAffiliate as any).name,
            phone: (newAffiliate as any).phone,
            invitationCode: (newAffiliate as any).invitationCode,
            status: "SUCCESS",
          });
        } catch (err: any) {
          failed.push({
            index: i,
            name: affiliate.name || "N/A",
            phone: affiliate.phone || "N/A",
            error: err.message || "Unknown error",
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: `Processed ${affiliates.length} affiliates. ${successful.length} successful, ${failed.length} failed.`,
        data: {
          successful,
          failed,
          summary: {
            total: affiliates.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
      });
    } catch (error: any) {
      console.error("Bulk import affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get organizations for verification queue
   * GET /api/super-admin/organizations/verification-queue
   */
  getOrganizationsForVerification = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let query = db
        .selectFrom("sports_organizations")
        .selectAll()
        .where("deleted", "=", false)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .offset(offset);

      if (status) {
        query = query.where("status", "=", status as any);
      } else {
        // Default: show PENDING orgs that need verification
        query = query.where("status", "in", ["PENDING", "APPROVED", "REJECTED"]);
      }

      const organizations = await query.execute();

      // For each org, get KYC documents count if any exist
      const orgIds = organizations.map((o) => o.id);
      let kycCounts: any[] = [];
      if (orgIds.length > 0) {
        // Check if organization has any linked affiliates with KYC docs
        kycCounts = await db
          .selectFrom("affiliates")
          .select(["organizationId" as any, db.fn.count("id").as("affiliate_count")])
          .where("organizationId" as any, "in", orgIds)
          .where("deleted", "=", false)
          .groupBy("organizationId" as any)
          .execute();
      }

      const kycMap = new Map(
        kycCounts.map((k: any) => [k.organizationId, Number(k.affiliate_count)])
      );

      const enriched = organizations.map((org) => ({
        ...org,
        affiliateCount: kycMap.get(org.id) || 0,
      }));

      return res.status(200).json({
        success: true,
        message: "Verification queue fetched successfully",
        count: enriched.length,
        data: enriched,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error("Get verification queue error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Verify organization (set isVerified=true, status=APPROVED)
   * PATCH /api/super-admin/organizations/:orgId/verify
   */
  verifyOrganization = async (req: Request, res: Response) => {
    try {
      const orgId = Number(req.params.orgId);
      const superAdminId = req.user!.id;

      if (!orgId || isNaN(orgId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Organization ID is required",
        });
      }

      const org = await db
        .selectFrom("sports_organizations")
        .selectAll()
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const updatedOrg = await db
        .updateTable("sports_organizations")
        .set({
          isVerified: true,
          status: "APPROVED",
          updatedAt: new Date(),
        })
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .returningAll()
        .executeTakeFirst();

      // Create audit log
      await db
        .insertInto("audit_logs")
        .values({
          userId: superAdminId,
          userType: "SUPER_ADMIN",
          action: "VERIFY_ORGANIZATION",
          entityType: "ORGANIZATION",
          entityId: orgId,
          oldValues: JSON.stringify({ isVerified: org.isVerified, status: org.status }),
          newValues: JSON.stringify({ isVerified: true, status: "APPROVED" }),
          createdAt: new Date(),
        })
        .execute();

      return res.status(200).json({
        success: true,
        message: "Organization verified successfully",
        data: updatedOrg,
      });
    } catch (error: any) {
      console.error("Verify organization error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Reject organization with reason
   * PATCH /api/super-admin/organizations/:orgId/reject
   */
  rejectOrganization = async (req: Request, res: Response) => {
    try {
      const orgId = Number(req.params.orgId);
      const superAdminId = req.user!.id;
      const { reason } = req.body;

      if (!orgId || isNaN(orgId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Organization ID is required",
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const org = await db
        .selectFrom("sports_organizations")
        .selectAll()
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const updatedOrg = await db
        .updateTable("sports_organizations")
        .set({
          isVerified: false,
          status: "REJECTED",
          updatedAt: new Date(),
        })
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .returningAll()
        .executeTakeFirst();

      // Create audit log with rejection reason
      await db
        .insertInto("audit_logs")
        .values({
          userId: superAdminId,
          userType: "SUPER_ADMIN",
          action: "REJECT_ORGANIZATION",
          entityType: "ORGANIZATION",
          entityId: orgId,
          oldValues: JSON.stringify({ isVerified: org.isVerified, status: org.status }),
          newValues: JSON.stringify({ isVerified: false, status: "REJECTED", reason }),
          createdAt: new Date(),
        })
        .execute();

      return res.status(200).json({
        success: true,
        message: "Organization rejected",
        data: {
          ...updatedOrg,
          rejectionReason: reason,
        },
      });
    } catch (error: any) {
      console.error("Reject organization error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get full verification details for an organization
   * GET /api/super-admin/organizations/:orgId/verification-details
   */
  getVerificationDetails = async (req: Request, res: Response) => {
    try {
      const orgId = Number(req.params.orgId);

      if (!orgId || isNaN(orgId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Organization ID is required",
        });
      }

      // Get organization details
      const org = await db
        .selectFrom("sports_organizations")
        .selectAll()
        .where("id", "=", orgId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Get affiliates belonging to this org
      const affiliates = await db
        .selectFrom("affiliates")
        .select(["id", "name", "email", "phone", "role", "status"])
        .where("organizationId" as any, "=", orgId)
        .where("deleted", "=", false)
        .execute();

      // Get KYC documents for affiliates in this org
      const affiliateIds = affiliates.map((a) => a.id);
      let kycDocuments: any[] = [];
      if (affiliateIds.length > 0) {
        kycDocuments = await db
          .selectFrom("kyc_documents as kd" as any)
          .innerJoin("affiliates as a", "a.id", "kd.affiliate_id" as any)
          .select([
            "kd.id" as any,
            "kd.affiliate_id" as any,
            "kd.document_type" as any,
            "kd.document_url" as any,
            "kd.document_number" as any,
            "kd.status" as any,
            "kd.created_at" as any,
            "a.name as affiliate_name",
          ])
          .where("kd.affiliate_id" as any, "in", affiliateIds)
          .orderBy("kd.created_at" as any, "desc")
          .execute();
      }

      // Get audit logs related to this org
      const auditLogs = await db
        .selectFrom("audit_logs" as any)
        .selectAll()
        .where("entityType" as any, "=", "ORGANIZATION")
        .where("entityId" as any, "=", orgId)
        .orderBy("createdAt" as any, "desc")
        .limit(20)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Verification details fetched successfully",
        data: {
          organization: org,
          affiliates,
          kycDocuments,
          auditLogs,
        },
      });
    } catch (error: any) {
      console.error("Get verification details error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== FEEDBACK SYSTEM (Admin) ====================

  /**
   * Get All Feedback
   */
  getAllFeedback = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let query = db
        .selectFrom("user_feedback" as any)
        .selectAll()
        .orderBy("created_at" as any, "desc")
        .limit(limit)
        .offset(offset);

      if (status) {
        query = query.where("status" as any, "=", status);
      }

      const feedback = await query.execute();

      return res.status(200).json({
        success: true,
        message: "Feedback retrieved successfully",
        data: feedback,
        pagination: { page, limit },
      });
    } catch (error: any) {
      console.error("Get all feedback error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Respond to Feedback
   */
  respondToFeedback = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;
      const { adminResponse, status } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Feedback ID is required",
        });
      }

      const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "DISMISSED"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const updateData: Record<string, any> = {
        responded_by: adminId,
        responded_at: new Date(),
      };
      if (adminResponse) updateData.admin_response = adminResponse;
      if (status) updateData.status = status;

      const updated = await db
        .updateTable("user_feedback" as any)
        .set(updateData as any)
        .where("id" as any, "=", id)
        .returning(["id", "user_id", "message", "status", "admin_response", "responded_at"] as any[])
        .executeTakeFirst();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Feedback not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Feedback response saved successfully",
        data: updated,
      });
    } catch (error: any) {
      console.error("Respond to feedback error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Feedback Stats
   */
  getFeedbackStats = async (req: Request, res: Response) => {
    try {
      const stats = await sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int as pending,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int as in_progress,
          COUNT(*) FILTER (WHERE status = 'RESOLVED')::int as resolved,
          COUNT(*) FILTER (WHERE status = 'DISMISSED')::int as dismissed,
          ROUND(AVG(rating)::numeric, 2) as average_rating
        FROM user_feedback
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Feedback stats retrieved successfully",
        data: stats.rows[0],
      });
    } catch (error: any) {
      console.error("Get feedback stats error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Bulk Import Template
   */
  getBulkImportTemplate = async (req: Request, res: Response) => {
    try {
      return res.status(200).json({
        success: true,
        message: "Bulk import template",
        data: {
          description: "Use this schema to format your bulk import JSON payload",
          endpoint: "POST /api/super-admin/affiliates/bulk-import",
          payload: {
            organizationId: "number (required) - ID of the organization to add affiliates to",
            affiliates: [
              {
                name: "string (required) - Full name of the affiliate",
                phone: "string (required) - Phone number",
                email: "string (optional) - Email address",
                role: "string (optional, default: ATHLETE) - One of: ATHLETE, COACH, SPORTS STAFF, NUTRITIONIST, PHYSIOTHERAPIST, PSYCHOLOGIST, SPORTS JOURNALIST, SPORTS MANAGEMENT PROFESSIONAL",
                dateOfBirth: "string (optional) - Date of birth in YYYY-MM-DD format",
                gender: "string (optional) - One of: MALE, FEMALE, OTHER",
                sportsCategoryId: "number (optional) - Sports category ID",
                position: "string (optional) - Position/role in sport",
                bio: "string (optional) - Short biography",
                achievements: "string (optional) - Achievements description",
              },
            ],
          },
          example: {
            organizationId: 1,
            affiliates: [
              {
                name: "Arjun Mehta",
                phone: "9001122334",
                email: "arjun@example.com",
                role: "ATHLETE",
                dateOfBirth: "1997-08-21",
                gender: "MALE",
                sportsCategoryId: 1,
                position: "Striker",
              },
              {
                name: "Priya Sharma",
                phone: "9012233445",
                email: "priya@example.com",
                role: "COACH",
                gender: "FEMALE",
              },
            ],
          },
        },
      });
    } catch (error: any) {
      console.error("Get bulk import template error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

