import { Request, Response, NextFunction } from "express";
import { OrganizationService } from "../services/OrganizationService.js";
import {
  organizationLoginSchema,
  addAffiliateByOrganizationSchema,
  bulkAddAffiliatesSchema,
  updateAffiliateStatusSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  setNewPasswordSchema,
} from "../dtos/onboarding.dto.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../utils/errors/AppError.js";
import { Storage } from "@google-cloud/storage";
import { db } from "../database/kysely/databases.js";
import { sql } from "kysely";

const storage = new Storage();

const GCS_BUCKET = process.env.GCS_BUCKET || '';
if (!GCS_BUCKET) console.warn('GCS_BUCKET environment variable is not set');
if (!GCS_BUCKET) throw new Error('GCS_BUCKET environment variable is required');

export class OrganizationController {
  private service: OrganizationService;

  constructor() {
    this.service = new OrganizationService();
  }

  /**
   * Organization Login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = organizationLoginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details?.[0]?.message || "An error occurred",
        });
      }

      const { email, password } = req.body;
      const result = await this.service.login(email, password);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Organization login error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Change Organization Password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message || "Validation error",
        });
      }

      const { oldPassword, newPassword, confirmPassword } = req.body;
      const orgId = req.user?.id;

      if (!orgId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await this.service.changePassword(
        orgId,
        oldPassword,
        newPassword,
        confirmPassword
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Change password error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Add Single Affiliate
   */
  addAffiliate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = addAffiliateByOrganizationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Invalid user or organization ID",
        });
      }

      const result = await this.service.addAffiliate(
        req.body,
        organizationId,
        req.user!.id
      );
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Add affiliate error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Bulk Add Affiliates
   */
  bulkAddAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = bulkAddAffiliatesSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const organizationId = req.user!.organizationId!;
      const result = await this.service.bulkAddAffiliates(
        req.body,
        organizationId,
        req.user!.id
      );
      return res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Bulk add affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Affiliates
   */
  getAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId!;
      const result = await this.service.getAffiliates(organizationId, req.query);
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
   * Resend Invitation
   */
  resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId!;

      const result = await this.service.resendInvitation(
        Number(id),
        organizationId,
        req.user!.id
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Resend invitation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Dashboard Stats
   */
  getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId!;
      const result = await this.service.getDashboardStats(organizationId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Get dashboard stats error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Update Organization Details
   */
  updateOrganizationDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const organizationId = req.user!.organizationId!;
      const result = await this.service.updateOrganizationDetails(
        organizationId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update organization details error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Organization Details
   */
  getOrganizationDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId!;
      const result = await this.service.getOrganizationDetails(organizationId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get organization details error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Delete Affiliate
   */
  deleteAffiliate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId!;

      const result = await this.service.deleteAffiliate(Number(id), organizationId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
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
   * Update Affiliate Status
   */
  updateAffiliateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId!;
      const { error } = updateAffiliateStatusSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error?.details[0]?.message,
        });
      }

      const result = await this.service.updateAffiliateStatus(
        Number(id),
        organizationId,
        req.body,
        req.user!.id
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Update affiliate status error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Forgot Password
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email id is required.",
        });
      }

      const result = await this.service.forgotPassword(email);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Forgot password error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Set New Password
   */
  setNewPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword, confirmNewPassword } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required.",
        });
      }

      if (!newPassword || !confirmNewPassword) {
        return res.status(400).json({
          success: false,
          message: "Both password fields are required.",
        });
      }

      const result = await this.service.setNewPassword(token, newPassword, confirmNewPassword);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Err setting the password ", error);
      return res.status(500).json({
        success: false,
        message: "Link expired, kindly go to forgot password page.",
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

    const key = `${Date.now()}-${fileName}`;
    const bucketName = GCS_BUCKET;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(key);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType: fileType,
    });

    return res.status(200).json({
      success: true,
      uploadUrl,
      fileUrl: `https://storage.googleapis.com/${bucketName}/${key}`,
    });
  } catch (error: any) {
    console.error("Failed to generate signed URL:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


  /**
   * Get Affiliate Full Profile for Organization
   */
  getAffiliateFullProfileForOrg = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const orgId = req.user!.organizationId!;
      const { affiliateId } = req.body;

      const result = await this.service.getAffiliateFullProfile(
        Number(affiliateId),
        orgId
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error("Get Affiliate Profile Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  };

  /**
   * Get Organization Dashboard (comprehensive stats)
   */
  getOrganizationDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId!;

      // Total affiliates
      const affiliateCountResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliates
        WHERE "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);
      const totalAffiliates = (affiliateCountResult.rows[0] as any)?.count || 0;

      // Total events
      const eventCountResult = await sql`
        SELECT COUNT(*)::int as count FROM events
        WHERE "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);
      const totalEvents = (eventCountResult.rows[0] as any)?.count || 0;

      // Total registrations across all org events
      const registrationCountResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliate_event_responses aer
        INNER JOIN events e ON e.id = aer.event_id
        WHERE e."organizationId" = ${organizationId}
          AND e.deleted = false
          AND aer.deleted = false
      `.execute(db);
      const totalRegistrations = (registrationCountResult.rows[0] as any)?.count || 0;

      // Total revenue from paid registrations
      const revenueResult = await sql`
        SELECT COALESCE(SUM(aer.amount_paid), 0)::numeric as total FROM affiliate_event_responses aer
        INNER JOIN events e ON e.id = aer.event_id
        WHERE e."organizationId" = ${organizationId}
          AND e.deleted = false
          AND aer.deleted = false
          AND aer.payment_status = 'captured'
      `.execute(db);
      const totalRevenue = parseFloat((revenueResult.rows[0] as any)?.total) || 0;

      // Pending KYC count
      const pendingKycResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliates
        WHERE "organizationId" = ${organizationId}
          AND deleted = false
          AND COALESCE(kyc_status, 'PENDING') = 'PENDING'
      `.execute(db);
      const pendingKyc = (pendingKycResult.rows[0] as any)?.count || 0;

      return res.status(200).json({
        success: true,
        message: "Organization dashboard retrieved successfully",
        data: {
          totalAffiliates,
          totalEvents,
          totalRegistrations,
          totalRevenue,
          pendingKyc,
        },
      });
    } catch (error: any) {
      console.error("Get organization dashboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Organization Activity Feed (last 30 days, paginated)
   */
  getOrganizationActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Combine recent events, registrations, and affiliate additions into an activity feed
      const activities = await sql`
        (
          SELECT
            'event_created' as activity_type,
            e.name as title,
            e.id as reference_id,
            e.created_at as activity_date
          FROM events e
          WHERE e."organizationId" = ${organizationId}
            AND e.deleted = false
            AND e.created_at >= ${thirtyDaysAgo.toISOString()}
        )
        UNION ALL
        (
          SELECT
            'affiliate_registered' as activity_type,
            CONCAT(a.name, ' registered for ', ev.name) as title,
            ev.id as reference_id,
            aer.submitted_at as activity_date
          FROM affiliate_event_responses aer
          INNER JOIN events ev ON ev.id = aer.event_id
          INNER JOIN affiliates a ON a.id = aer.affiliate_id
          WHERE ev."organizationId" = ${organizationId}
            AND ev.deleted = false
            AND aer.deleted = false
            AND aer.submitted_at >= ${thirtyDaysAgo.toISOString()}
        )
        UNION ALL
        (
          SELECT
            'affiliate_added' as activity_type,
            CONCAT(a.name, ' was added to the organization') as title,
            a.id as reference_id,
            a."createdAt" as activity_date
          FROM affiliates a
          WHERE a."organizationId" = ${organizationId}
            AND a.deleted = false
            AND a."createdAt" >= ${thirtyDaysAgo.toISOString()}
        )
        ORDER BY activity_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      // Count total activities
      const countResult = await sql`
        SELECT (
          (SELECT COUNT(*) FROM events e
           WHERE e."organizationId" = ${organizationId}
             AND e.deleted = false
             AND e.created_at >= ${thirtyDaysAgo.toISOString()})
          +
          (SELECT COUNT(*) FROM affiliate_event_responses aer
           INNER JOIN events ev ON ev.id = aer.event_id
           WHERE ev."organizationId" = ${organizationId}
             AND ev.deleted = false
             AND aer.deleted = false
             AND aer.submitted_at >= ${thirtyDaysAgo.toISOString()})
          +
          (SELECT COUNT(*) FROM affiliates a
           WHERE a."organizationId" = ${organizationId}
             AND a.deleted = false
             AND a."createdAt" >= ${thirtyDaysAgo.toISOString()})
        )::int as total
      `.execute(db);
      const total = (countResult.rows[0] as any)?.total || 0;

      return res.status(200).json({
        success: true,
        message: "Organization activity retrieved successfully",
        data: activities.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get organization activity error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== ORGANIZATION STAFF ====================

  /**
   * Add Staff Member
   */
  addStaffMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const { name, email, phone, role } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Name and email are required",
        });
      }

      const validRoles = ["ADMIN", "MANAGER", "EDITOR", "VIEWER"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${validRoles.join(", ")}`,
        });
      }

      const staff = await db
        .insertInto("organization_staff" as any)
        .values({
          organization_id: organizationId,
          name,
          email,
          phone: phone || null,
          role: role || "VIEWER",
          status: "ACTIVE",
        } as any)
        .returning(["id", "organization_id", "name", "email", "phone", "role", "status", "created_at"] as any[])
        .executeTakeFirst();

      return res.status(201).json({
        success: true,
        message: "Staff member added successfully",
        data: staff,
      });
    } catch (error: any) {
      console.error("Add staff member error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get Staff Members
   */
  getStaffMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      const staff = await db
        .selectFrom("organization_staff" as any)
        .selectAll()
        .where("organization_id" as any, "=", organizationId)
        .where("status" as any, "!=", "REMOVED")
        .orderBy("created_at" as any, "desc")
        .execute();

      return res.status(200).json({
        success: true,
        message: "Staff members retrieved successfully",
        data: staff,
      });
    } catch (error: any) {
      console.error("Get staff members error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Update Staff Role
   */
  updateStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ["ADMIN", "MANAGER", "EDITOR", "VIEWER"];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${validRoles.join(", ")}`,
        });
      }

      const updated = await db
        .updateTable("organization_staff" as any)
        .set({ role } as any)
        .where("id" as any, "=", id)
        .where("organization_id" as any, "=", organizationId)
        .where("status" as any, "=", "ACTIVE")
        .returning(["id", "name", "email", "role", "status"] as any[])
        .executeTakeFirst();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Staff role updated successfully",
        data: updated,
      });
    } catch (error: any) {
      console.error("Update staff role error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Remove Staff Member
   */
  removeStaffMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const { id } = req.params;

      const updated = await db
        .updateTable("organization_staff" as any)
        .set({ status: "REMOVED" } as any)
        .where("id" as any, "=", id)
        .where("organization_id" as any, "=", organizationId)
        .where("status" as any, "=", "ACTIVE")
        .returning(["id", "name"] as any[])
        .executeTakeFirst();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Staff member removed successfully",
        data: updated,
      });
    } catch (error: any) {
      console.error("Remove staff member error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== DETAILED ANALYTICS (Round 7) ====================

  /**
   * Get comprehensive org analytics: affiliate growth over time (monthly),
   * event performance trends, revenue trends, top affiliates by engagement,
   * affiliate retention rate, sport distribution.
   */
  getDetailedAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      // Affiliate growth over time (monthly, last 12 months)
      const affiliateGrowth = await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', a."createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as new_affiliates,
          SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', a."createdAt"))::int as cumulative_total
        FROM affiliates a
        WHERE a."organizationId" = ${organizationId}
          AND a.deleted = false
          AND a."createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', a."createdAt")
        ORDER BY month ASC
      `.execute(db);

      // Event performance trends (monthly, last 12 months)
      const eventTrends = await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', e.created_at), 'YYYY-MM') as month,
          COUNT(DISTINCT e.id)::int as events_created,
          COUNT(DISTINCT aer.affiliate_id)::int as total_registrations,
          COALESCE(SUM(aer.amount_paid), 0)::numeric as revenue
        FROM events e
        LEFT JOIN affiliate_event_responses aer ON aer.event_id = e.id AND aer.deleted = false
        WHERE e."organizationId" = ${organizationId}
          AND e.deleted = false
          AND e.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', e.created_at)
        ORDER BY month ASC
      `.execute(db);

      // Revenue trends (monthly, last 12 months)
      const revenueTrends = await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', aer.submitted_at), 'YYYY-MM') as month,
          COALESCE(SUM(aer.amount_paid), 0)::numeric as revenue,
          COUNT(*)::int as paid_registrations
        FROM affiliate_event_responses aer
        INNER JOIN events e ON e.id = aer.event_id
        WHERE e."organizationId" = ${organizationId}
          AND e.deleted = false
          AND aer.deleted = false
          AND aer.payment_status = 'captured'
          AND aer.submitted_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', aer.submitted_at)
        ORDER BY month ASC
      `.execute(db);

      // Top affiliates by engagement (events attended + campaigns)
      const topAffiliates = await sql`
        SELECT
          a.id, a.name, a."profilePicture", a."role",
          sc.title as sport,
          COUNT(DISTINCT aer.event_id)::int as events_registered,
          COUNT(DISTINCT car.campaign_id)::int as campaigns_joined
        FROM affiliates a
        LEFT JOIN affiliate_event_responses aer ON aer.affiliate_id = a.id AND aer.deleted = false
        LEFT JOIN campaign_affiliate_registrations car ON car.affiliate_id = a.id AND car.deleted = false
        LEFT JOIN sports_category sc ON sc.id = a."sportsCategoryId"
        WHERE a."organizationId" = ${organizationId} AND a.deleted = false
        GROUP BY a.id, a.name, a."profilePicture", a."role", sc.title
        ORDER BY (COUNT(DISTINCT aer.event_id) + COUNT(DISTINCT car.campaign_id)) DESC
        LIMIT 10
      `.execute(db);

      // Affiliate retention rate (affiliates active in last 90 days vs total)
      const retentionResult = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM affiliates WHERE "organizationId" = ${organizationId} AND deleted = false) as total_affiliates,
          (
            SELECT COUNT(DISTINCT a.id)::int
            FROM affiliates a
            WHERE a."organizationId" = ${organizationId}
              AND a.deleted = false
              AND (
                a.id IN (
                  SELECT DISTINCT aer.affiliate_id
                  FROM affiliate_event_responses aer
                  INNER JOIN events e ON e.id = aer.event_id
                  WHERE e."organizationId" = ${organizationId}
                    AND aer.submitted_at >= NOW() - INTERVAL '90 days'
                    AND aer.deleted = false
                )
                OR a."updatedAt" >= NOW() - INTERVAL '90 days'
              )
          ) as active_last_90_days
      `.execute(db);

      const total = (retentionResult.rows[0] as any)?.total_affiliates || 0;
      const active90 = (retentionResult.rows[0] as any)?.active_last_90_days || 0;
      const retentionRate = total > 0
        ? Math.round((active90 / total) * 100 * 100) / 100
        : 0;

      // Sport distribution
      const sportDistribution = await sql`
        SELECT
          COALESCE(sc.title, 'Uncategorized') as sport,
          COUNT(*)::int as count
        FROM affiliates a
        LEFT JOIN sports_category sc ON sc.id = a."sportsCategoryId"
        WHERE a."organizationId" = ${organizationId} AND a.deleted = false
        GROUP BY sc.title
        ORDER BY count DESC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Detailed analytics fetched successfully.",
        data: {
          affiliateGrowth: affiliateGrowth.rows,
          eventPerformanceTrends: eventTrends.rows,
          revenueTrends: revenueTrends.rows,
          topAffiliatesByEngagement: topAffiliates.rows,
          retention: {
            totalAffiliates: total,
            activeLast90Days: active90,
            retentionRate,
          },
          sportDistribution: sportDistribution.rows,
        },
      });
    } catch (error: any) {
      console.error("Get detailed analytics error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Organization Announcements (Round 9) ====================

  /**
   * Create an announcement for the organization
   */
  createAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = Number(req?.user?.id);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required.",
        });
      }

      const { title, body, priority, target_audience, expiry_date } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Announcement title is required.",
        });
      }

      const validPriorities = ["normal", "important", "urgent"];
      const announcementPriority = priority && validPriorities.includes(priority) ? priority : "normal";

      const validAudiences = ["all", "affiliates", "staff"];
      const announcementAudience = target_audience && validAudiences.includes(target_audience) ? target_audience : "all";

      const result = await sql`
        INSERT INTO organization_announcements (organization_id, title, body, priority, target_audience, expiry_date)
        VALUES (
          ${organizationId},
          ${title.trim()},
          ${body || null},
          ${announcementPriority},
          ${announcementAudience},
          ${expiry_date ? expiry_date : null}
        )
        RETURNING *
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Announcement created successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Create announcement error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get active announcements for an org, filtered by audience and non-expired
   */
  getAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req?.user?.id);
      const userType = (req?.user as any)?.userType;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      // Determine which org's announcements to show
      let organizationId: number | null = null;

      if (userType === "ORGANIZATION") {
        organizationId = userId;
      } else {
        // For affiliates/staff, get their organization
        const affiliate = await sql`
          SELECT "organizationId" FROM affiliates WHERE id = ${userId} AND deleted = false
        `.execute(db);

        if (affiliate.rows.length > 0) {
          organizationId = (affiliate.rows[0] as any).organizationId;
        }
      }

      if (!organizationId) {
        return res.status(404).json({
          success: false,
          message: "Organization not found for user.",
        });
      }

      const { audience } = req.query;

      let audienceFilter = "";
      if (audience && typeof audience === "string" && ["all", "affiliates", "staff"].includes(audience)) {
        audienceFilter = audience;
      }

      const announcements = await sql`
        SELECT * FROM organization_announcements
        WHERE organization_id = ${organizationId}
          AND is_deleted = false
          AND (expiry_date IS NULL OR expiry_date > NOW())
          ${audienceFilter
            ? sql`AND (target_audience = ${audienceFilter} OR target_audience = 'all')`
            : sql``
          }
        ORDER BY
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'important' THEN 2
            ELSE 3
          END,
          created_at DESC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Announcements fetched successfully.",
        data: announcements.rows,
      });
    } catch (error: any) {
      console.error("Get announcements error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Soft-delete an announcement
   */
  deleteAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = Number(req?.user?.id);
      const announcementId = Number(req.params.announcementId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required.",
        });
      }

      if (!announcementId || isNaN(announcementId)) {
        return res.status(400).json({
          success: false,
          message: "Valid announcement ID is required.",
        });
      }

      const result = await sql`
        UPDATE organization_announcements
        SET is_deleted = true
        WHERE id = ${announcementId} AND organization_id = ${organizationId}
        RETURNING id
      `.execute(db);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found or does not belong to your organization.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Announcement deleted successfully.",
        data: { id: announcementId },
      });
    } catch (error: any) {
      console.error("Delete announcement error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Organization Branding (Round 11) ====================

  /**
   * Update organization branding settings
   */
  updateBranding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = Number(req?.user?.id);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required.",
        });
      }

      const { logo_url, banner_url, primary_color, secondary_color, tagline, social_links } = req.body;

      // Validate at least one field is provided
      if (!logo_url && !banner_url && !primary_color && !secondary_color && !tagline && !social_links) {
        return res.status(400).json({
          success: false,
          message: "At least one branding field is required.",
        });
      }

      // Validate color formats if provided
      if (primary_color && !/^#[0-9A-Fa-f]{3,8}$/.test(primary_color)) {
        return res.status(400).json({
          success: false,
          message: "Invalid primary_color format. Use hex color (e.g., #FF5733).",
        });
      }

      if (secondary_color && !/^#[0-9A-Fa-f]{3,8}$/.test(secondary_color)) {
        return res.status(400).json({
          success: false,
          message: "Invalid secondary_color format. Use hex color (e.g., #FF5733).",
        });
      }

      const socialLinksJson = social_links ? JSON.stringify(social_links) : null;

      const result = await sql`
        INSERT INTO organization_branding (organization_id, logo_url, banner_url, primary_color, secondary_color, tagline, social_links, updated_at)
        VALUES (${organizationId}, ${logo_url || null}, ${banner_url || null}, ${primary_color || null}, ${secondary_color || null}, ${tagline || null}, ${socialLinksJson ? sql`${socialLinksJson}::jsonb` : sql`NULL`}, NOW())
        ON CONFLICT (organization_id) DO UPDATE SET
          logo_url = COALESCE(EXCLUDED.logo_url, organization_branding.logo_url),
          banner_url = COALESCE(EXCLUDED.banner_url, organization_branding.banner_url),
          primary_color = COALESCE(EXCLUDED.primary_color, organization_branding.primary_color),
          secondary_color = COALESCE(EXCLUDED.secondary_color, organization_branding.secondary_color),
          tagline = COALESCE(EXCLUDED.tagline, organization_branding.tagline),
          social_links = COALESCE(EXCLUDED.social_links, organization_branding.social_links),
          updated_at = NOW()
        RETURNING *
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Branding updated successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Update branding error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get branding for an organization (public, no auth)
   */
  getBranding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = Number(req.params.organizationId);

      if (!organizationId || isNaN(organizationId)) {
        return res.status(400).json({
          success: false,
          message: "Valid organization ID is required.",
        });
      }

      const result = await sql`
        SELECT ob.*, o.name as organization_name
        FROM organization_branding ob
        LEFT JOIN organizations o ON o.id = ob.organization_id
        WHERE ob.organization_id = ${organizationId}
      `.execute(db);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Branding not found for this organization.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Branding fetched successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Get branding error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== STAFF ROLES MANAGEMENT (Round 12) ====================

  /**
   * Create a custom staff role with permissions
   * POST /api/organization/staff-roles
   */
  createStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const { role_name, permissions } = req.body;

      if (!role_name || !role_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Role name is required.",
        });
      }

      const validPermissions = [
        "manage_events",
        "manage_payments",
        "manage_affiliates",
        "view_analytics",
        "manage_staff",
        "manage_settings",
      ];

      if (permissions && Array.isArray(permissions)) {
        const invalid = permissions.filter((p: string) => !validPermissions.includes(p));
        if (invalid.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid permissions: ${invalid.join(", ")}. Valid options: ${validPermissions.join(", ")}`,
          });
        }
      }

      // Check for duplicate role name in the same org
      const existing = await sql`
        SELECT id FROM organization_staff_roles
        WHERE organization_id = ${organizationId}
          AND LOWER(role_name) = LOWER(${role_name.trim()})
      `.execute(db);

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "A role with this name already exists in your organization.",
        });
      }

      const result = await sql`
        INSERT INTO organization_staff_roles (organization_id, role_name, permissions)
        VALUES (${organizationId}, ${role_name.trim()}, ${JSON.stringify(permissions || [])}::jsonb)
        RETURNING id, organization_id, role_name, permissions, created_at
      `.execute(db);

      return res.status(201).json({
        success: true,
        message: "Staff role created successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Create staff role error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Get all roles for the organization
   * GET /api/organization/staff-roles
   */
  getStaffRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      const roles = await sql`
        SELECT
          osr.id,
          osr.role_name,
          osr.permissions,
          osr.created_at,
          osr.updated_at,
          COUNT(os.id)::int as staff_count
        FROM organization_staff_roles osr
        LEFT JOIN organization_staff os ON os.role_id = osr.id AND os.status = 'ACTIVE'
        WHERE osr.organization_id = ${organizationId}
        GROUP BY osr.id
        ORDER BY osr.created_at DESC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Staff roles retrieved successfully.",
        count: roles.rows.length,
        data: roles.rows,
      });
    } catch (error: any) {
      console.error("Get staff roles error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Update a role's permissions
   * PUT /api/organization/staff-roles/:roleId
   */
  updateStaffRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const roleId = Number(req.params.roleId);
      const { role_name, permissions } = req.body;

      if (!roleId || isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: "Valid role ID is required.",
        });
      }

      const validPermissions = [
        "manage_events",
        "manage_payments",
        "manage_affiliates",
        "view_analytics",
        "manage_staff",
        "manage_settings",
      ];

      if (permissions && Array.isArray(permissions)) {
        const invalid = permissions.filter((p: string) => !validPermissions.includes(p));
        if (invalid.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid permissions: ${invalid.join(", ")}. Valid options: ${validPermissions.join(", ")}`,
          });
        }
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (role_name && role_name.trim()) {
        updateFields.push("role_name");
        updateValues.push(role_name.trim());
      }

      if (permissions && Array.isArray(permissions)) {
        updateFields.push("permissions");
        updateValues.push(JSON.stringify(permissions));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least role_name or permissions must be provided.",
        });
      }

      const result = await sql`
        UPDATE organization_staff_roles
        SET
          role_name = COALESCE(${role_name ? role_name.trim() : null}, role_name),
          permissions = COALESCE(${permissions ? JSON.stringify(permissions) : null}::jsonb, permissions),
          updated_at = NOW()
        WHERE id = ${roleId}
          AND organization_id = ${organizationId}
        RETURNING id, role_name, permissions, updated_at
      `.execute(db);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found or does not belong to your organization.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Staff role updated successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Update staff role error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Delete a role (only if no staff assigned)
   * DELETE /api/organization/staff-roles/:roleId
   */
  deleteStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const roleId = Number(req.params.roleId);

      if (!roleId || isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: "Valid role ID is required.",
        });
      }

      // Check if any active staff are assigned to this role
      const assignedStaff = await sql`
        SELECT COUNT(*)::int as count FROM organization_staff
        WHERE role_id = ${roleId} AND status = 'ACTIVE'
      `.execute(db);

      const staffCount = (assignedStaff.rows[0] as any)?.count || 0;

      if (staffCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role: ${staffCount} staff member(s) are still assigned to this role.`,
        });
      }

      const result = await sql`
        DELETE FROM organization_staff_roles
        WHERE id = ${roleId} AND organization_id = ${organizationId}
        RETURNING id, role_name
      `.execute(db);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found or does not belong to your organization.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Staff role deleted successfully.",
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error("Delete staff role error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Assign a role to a staff member
   * POST /api/organization/staff/:staffId/assign-role
   */
  assignStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const staffId = Number(req.params.staffId);
      const { roleId } = req.body;

      if (!staffId || isNaN(staffId)) {
        return res.status(400).json({
          success: false,
          message: "Valid staff ID is required.",
        });
      }

      if (!roleId) {
        return res.status(400).json({
          success: false,
          message: "Role ID is required.",
        });
      }

      // Verify the role belongs to this organization
      const role = await sql`
        SELECT id, role_name FROM organization_staff_roles
        WHERE id = ${Number(roleId)} AND organization_id = ${organizationId}
      `.execute(db);

      if (role.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found or does not belong to your organization.",
        });
      }

      // Verify the staff member belongs to this organization
      const staff = await sql`
        UPDATE organization_staff
        SET role_id = ${Number(roleId)}
        WHERE id = ${staffId}
          AND organization_id = ${organizationId}
          AND status = 'ACTIVE'
        RETURNING id, name, email, role_id
      `.execute(db);

      if (staff.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found or not active in your organization.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Role "${(role.rows[0] as any).role_name}" assigned successfully.`,
        data: staff.rows[0],
      });
    } catch (error: any) {
      console.error("Assign staff role error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Organization Onboarding Progress (Round 13) ====================

  /**
   * Calculate onboarding completion percentage
   * GET /api/organization/onboarding-progress
   */
  getOnboardingProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      // Check each onboarding step
      const orgResult = await sql`
        SELECT
          name, email, phone, address, city, state, country,
          logo, description, website,
          "isKycVerified",
          "organizationType"
        FROM sports_organizations
        WHERE id = ${organizationId} AND deleted = false
      `.execute(db);

      if (orgResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found.",
        });
      }

      const org = orgResult.rows[0] as any;

      // Check profile completeness
      const profileComplete = !!(
        org.name && org.email && org.phone && org.address &&
        org.city && org.state && org.country && org.description
      );

      // Check KYC verified
      const kycVerified = !!org.isKycVerified;

      // Check bank account (check if bank_accounts table has an entry)
      let bankAccountAdded = false;
      try {
        const bankResult = await sql`
          SELECT COUNT(*)::int as count FROM organization_bank_accounts
          WHERE organization_id = ${organizationId}
        `.execute(db);
        bankAccountAdded = ((bankResult.rows[0] as any)?.count || 0) > 0;
      } catch {
        // Table may not exist — skip
      }

      // Check first event created
      const eventResult = await sql`
        SELECT COUNT(*)::int as count FROM events
        WHERE "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);
      const firstEventCreated = ((eventResult.rows[0] as any)?.count || 0) > 0;

      // Check first affiliate registered
      const affiliateResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliates
        WHERE "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);
      const firstAffiliateRegistered = ((affiliateResult.rows[0] as any)?.count || 0) > 0;

      // Check branding configured
      let brandingConfigured = false;
      try {
        const brandingResult = await sql`
          SELECT COUNT(*)::int as count FROM organization_branding
          WHERE organization_id = ${organizationId}
        `.execute(db);
        brandingConfigured = ((brandingResult.rows[0] as any)?.count || 0) > 0;
      } catch {
        // Table may not exist — use logo as fallback
        brandingConfigured = !!org.logo;
      }

      const checklist = [
        { step: "profile_complete", label: "Complete organization profile", completed: profileComplete },
        { step: "kyc_verified", label: "KYC verification", completed: kycVerified },
        { step: "bank_account_added", label: "Add bank account", completed: bankAccountAdded },
        { step: "first_event_created", label: "Create your first event", completed: firstEventCreated },
        { step: "first_affiliate_registered", label: "Register your first affiliate", completed: firstAffiliateRegistered },
        { step: "branding_configured", label: "Configure branding", completed: brandingConfigured },
      ];

      const completedSteps = checklist.filter((item) => item.completed).length;
      const completionPercentage = Math.round((completedSteps / checklist.length) * 100);

      return res.status(200).json({
        success: true,
        message: "Onboarding progress retrieved successfully.",
        data: {
          completion_percentage: completionPercentage,
          completed_steps: completedSteps,
          total_steps: checklist.length,
          checklist,
        },
      });
    } catch (error: any) {
      console.error("Get onboarding progress error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Return contextual tips based on incomplete onboarding steps
   * GET /api/organization/onboarding-tips
   */
  getOnboardingTips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      const orgResult = await sql`
        SELECT
          name, email, phone, address, city, state, country,
          logo, description, website,
          "isKycVerified"
        FROM sports_organizations
        WHERE id = ${organizationId} AND deleted = false
      `.execute(db);

      if (orgResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found.",
        });
      }

      const org = orgResult.rows[0] as any;

      const tips: { step: string; tip: string; priority: string }[] = [];

      // Profile completeness
      const profileComplete = !!(
        org.name && org.email && org.phone && org.address &&
        org.city && org.state && org.country && org.description
      );
      if (!profileComplete) {
        tips.push({
          step: "profile_complete",
          tip: "Complete your organization profile with address, description, and contact details. A complete profile builds trust with affiliates.",
          priority: "high",
        });
      }

      // KYC
      if (!org.isKycVerified) {
        tips.push({
          step: "kyc_verified",
          tip: "Submit your KYC documents for verification. This is required to receive payments and access all platform features.",
          priority: "high",
        });
      }

      // Bank account
      let bankAccountAdded = false;
      try {
        const bankResult = await sql`
          SELECT COUNT(*)::int as count FROM organization_bank_accounts
          WHERE organization_id = ${organizationId}
        `.execute(db);
        bankAccountAdded = ((bankResult.rows[0] as any)?.count || 0) > 0;
      } catch {
        // skip
      }
      if (!bankAccountAdded) {
        tips.push({
          step: "bank_account_added",
          tip: "Add your bank account details to receive event payments and campaign earnings.",
          priority: "medium",
        });
      }

      // First event
      const eventResult = await sql`
        SELECT COUNT(*)::int as count FROM events
        WHERE "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);
      if (((eventResult.rows[0] as any)?.count || 0) === 0) {
        tips.push({
          step: "first_event_created",
          tip: "Create your first event to start engaging with affiliates. Events are a great way to build community and attract talent.",
          priority: "medium",
        });
      }

      // First affiliate
      const affiliateResult = await sql`
        SELECT COUNT(*)::int as count FROM affiliates
        WHERE "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);
      if (((affiliateResult.rows[0] as any)?.count || 0) === 0) {
        tips.push({
          step: "first_affiliate_registered",
          tip: "Register your first affiliate or send invitations. Affiliates are the core of your sports network.",
          priority: "medium",
        });
      }

      // Branding
      if (!org.logo) {
        tips.push({
          step: "branding_configured",
          tip: "Upload your logo and configure branding to make your organization page stand out.",
          priority: "low",
        });
      }

      return res.status(200).json({
        success: true,
        message: tips.length > 0
          ? "Here are some tips to complete your onboarding."
          : "Congratulations! Your onboarding is complete.",
        data: tips,
      });
    } catch (error: any) {
      console.error("Get onboarding tips error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  // ==================== Bulk Data Export (Round 13) ====================

  /**
   * Export all affiliates as CSV
   * GET /api/organization/export/affiliates
   */
  exportAffiliates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      const affiliates = await sql`
        SELECT
          a.id, a.name, a.email, a.phone,
          a."sportsCategoryId" as sport,
          a.city as location,
          a.status as kyc_status,
          a."createdAt" as created_at
        FROM affiliates a
        WHERE a."organizationId" = ${organizationId} AND a.deleted = false
        ORDER BY a."createdAt" DESC
      `.execute(db);

      // Build CSV
      const headers = ["ID", "Name", "Email", "Phone", "Sport", "Location", "KYC Status", "Created At"];
      const csvRows = [headers.join(",")];

      for (const row of affiliates.rows as any[]) {
        csvRows.push([
          row.id,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.email || "").replace(/"/g, '""')}"`,
          `"${(row.phone || "").replace(/"/g, '""')}"`,
          `"${(row.sport || "").replace(/"/g, '""')}"`,
          `"${(row.location || "").replace(/"/g, '""')}"`,
          `"${(row.kyc_status || "").replace(/"/g, '""')}"`,
          row.created_at || "",
        ].join(","));
      }

      const csvContent = csvRows.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=affiliates_export.csv");
      return res.status(200).send(csvContent);
    } catch (error: any) {
      console.error("Export affiliates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Export event registrations as CSV for a specific event
   * GET /api/organization/export/event-registrations/:eventId
   */
  exportEventRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;
      const eventId = Number(req.params.eventId);

      if (!eventId || isNaN(eventId)) {
        return res.status(400).json({
          success: false,
          message: "Valid event ID is required.",
        });
      }

      // Verify event belongs to organization
      const event = await sql`
        SELECT id, name FROM events
        WHERE id = ${eventId} AND "organizationId" = ${organizationId} AND deleted = false
      `.execute(db);

      if (event.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Event not found or does not belong to your organization.",
        });
      }

      const registrations = await sql`
        SELECT
          aer.id as registration_id,
          a.name as affiliate_name,
          a.email as affiliate_email,
          a.phone as affiliate_phone,
          a."sportsCategoryId" as sport,
          aer.status,
          aer.submitted_at as registered_at
        FROM affiliate_event_responses aer
        INNER JOIN affiliates a ON a.id = aer.affiliate_id
        WHERE aer.event_id = ${eventId} AND aer.deleted = false
        ORDER BY aer.submitted_at DESC
      `.execute(db);

      // Build CSV
      const headers = ["Registration ID", "Name", "Email", "Phone", "Sport", "Status", "Registered At"];
      const csvRows = [headers.join(",")];

      for (const row of registrations.rows as any[]) {
        csvRows.push([
          row.registration_id,
          `"${(row.affiliate_name || "").replace(/"/g, '""')}"`,
          `"${(row.affiliate_email || "").replace(/"/g, '""')}"`,
          `"${(row.affiliate_phone || "").replace(/"/g, '""')}"`,
          `"${(row.sport || "").replace(/"/g, '""')}"`,
          `"${(row.status || "").replace(/"/g, '""')}"`,
          row.registered_at || "",
        ].join(","));
      }

      const csvContent = csvRows.join("\n");
      const eventName = (event.rows[0] as any).name || "event";
      const safeEventName = eventName.replace(/[^a-zA-Z0-9]/g, "_");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=event_${safeEventName}_registrations.csv`);
      return res.status(200).send(csvContent);
    } catch (error: any) {
      console.error("Export event registrations error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };

  /**
   * Export campaign applications as CSV
   * GET /api/organization/export/campaign-data/:campaignId
   */
  exportCampaignData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        return res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
      }

      const applications = await sql`
        SELECT
          car.id as application_id,
          a.name as affiliate_name,
          a.email as affiliate_email,
          a.phone as affiliate_phone,
          a."sportsCategoryId" as sport,
          a.followers,
          car.status,
          car."createdAt" as applied_at
        FROM campaign_affiliate_registrations car
        INNER JOIN affiliates a ON a.id = car.affiliate_id
        WHERE car.campaign_id = ${campaignId} AND car.deleted = false
        ORDER BY car."createdAt" DESC
      `.execute(db);

      // Build CSV
      const headers = ["Application ID", "Name", "Email", "Phone", "Sport", "Followers", "Status", "Applied At"];
      const csvRows = [headers.join(",")];

      for (const row of applications.rows as any[]) {
        csvRows.push([
          row.application_id,
          `"${(row.affiliate_name || "").replace(/"/g, '""')}"`,
          `"${(row.affiliate_email || "").replace(/"/g, '""')}"`,
          `"${(row.affiliate_phone || "").replace(/"/g, '""')}"`,
          `"${(row.sport || "").replace(/"/g, '""')}"`,
          row.followers || 0,
          `"${(row.status || "").replace(/"/g, '""')}"`,
          row.applied_at || "",
        ].join(","));
      }

      const csvContent = csvRows.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=campaign_${campaignId}_applications.csv`);
      return res.status(200).send(csvContent);
    } catch (error: any) {
      console.error("Export campaign data error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  };
}

