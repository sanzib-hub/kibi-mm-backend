import { Request, Response, NextFunction } from "express";
import { CampaignService } from "../services/CampaignService";
import {
  createCampaignSchema,
  updateCampaignSchema,
  registerAffiliateForCampaignSchema,
  updateCampaignRegistrationSchema,
  campaignQuerySchema,
} from "../utils/campaignSchema";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  RegisterAffiliateForCampaignDto,
  UpdateCampaignRegistrationDto,
  CampaignRegistrationQueryDto,
} from "../dtos/campaign.dto";
import { CampaignRegistrationStatus } from "../database/kysely/types";
import { AppError } from "../utils/errors/AppError";
import { db } from "../database/kysely/databases";
import { sql } from "kysely";

/**
 * Controller class for Campaign endpoints
 * Handles HTTP requests and responses, delegates business logic to Service layer
 */
export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  /**
   * Create a new campaign
   */
  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createCampaignSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
        return;
      }

      const dto: CreateCampaignDto = value;
      const result = await this.campaignService.createCampaign(dto);

      res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing campaign
   */
  updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const campaignId = Number(id);

      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      // Validate request body
      const { error, value } = updateCampaignSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
        return;
      }

      const dto: UpdateCampaignDto = value;
      const result = await this.campaignService.updateCampaign(campaignId, dto);

      res.status(200).json({
        success: true,
        message: "Campaign updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a campaign (soft delete)
   */
  deleteCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: "Campaign ID is required",
        });
        return;
      }

      const campaignId = parseInt(id);
      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      await this.campaignService.deleteCampaign(campaignId);

      res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all campaigns with filtering and pagination
   */
  getAllCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: CampaignQueryDto = {
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        ...(req.query.sportsCategoryId && {
          sportsCategoryId: Number(req.query.sportsCategoryId),
        }),
        ...(req.query.gender && { gender: req.query.gender as "MALE" | "FEMALE" | "ANY" }),
        ...(req.query.dealType && { dealType: req.query.dealType as string }),
        ...(req.query.active !== undefined && {
          active: req.query.active === "true",
        }),
        ...(req.query.geography && { geography: req.query.geography as string }),
        ...(req.query.followersRange && {
          followersRange: req.query.followersRange as string,
        }),
        ...(req.query.ageRange && { ageRange: req.query.ageRange as string }),
      };

      const result = await this.campaignService.getAllCampaigns(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get campaign by ID
   */
  getCampaignById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.id);

      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      const result = await this.campaignService.getCampaignById(campaignId);

      res.status(200).json({
        success: true,
        message: "Campaign fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all active campaigns for affiliate
   */
  getAllActiveCampaigns = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const affiliateId = Number(req.user?.id);
      const query = {
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        ...(req.query.dealType && { dealType: req.query.dealType as string }),
      };

      const result = await this.campaignService.getAllActiveCampaigns(
        affiliateId,
        query
      );

      res.status(200).json({
        success: true,
        count: result.count,
        message:
          result.data.length > 0
            ? "Active campaigns retrieved successfully"
            : "No active campaigns found",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Register affiliate for a campaign
   */
  registerAffiliateForCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = registerAffiliateForCampaignSchema.validate(
        req.body
      );
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
        return;
      }

      const dto: RegisterAffiliateForCampaignDto = value;
      const affiliateId = Number(req?.user?.id);

      const result = await this.campaignService.registerAffiliateForCampaign(
        affiliateId,
        dto
      );

      res.status(201).json({
        success: true,
        message: "You’ve successfully applied for this campaign.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get campaign registrations with filtering
   */
  getCampaignRegistrations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const parsedCampaignId = Number(campaignId);

      if (!campaignId || isNaN(parsedCampaignId)) {
        res.status(400).json({
          success: false,
          message: "Campaign ID is required",
        });
        return;
      }

      const query: CampaignRegistrationQueryDto = {
        ...(req.query.status && {
          status: req.query.status as CampaignRegistrationStatus,
        }),
        ...(req.query.affiliate_id && {
          affiliate_id: Number(req.query.affiliate_id),
        }),
        ...(req.query.organizationId && {
          organizationId: Number(req.query.organizationId),
        }),
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
      };

      // Validate status if provided
      if (query.status) {
        const validStatuses = Object.values(CampaignRegistrationStatus);
        if (!validStatuses.includes(query.status)) {
          res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          });
          return;
        }
      }

      const result = await this.campaignService.getCampaignRegistrations(
        parsedCampaignId,
        query
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update campaign registration status
   */
  updateCampaignRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { registrationId } = req.params;
      const parsedRegistrationId = Number(registrationId);

      if (!parsedRegistrationId || isNaN(parsedRegistrationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid registration ID",
        });
        return;
      }

      // Validate request body
      const { error, value } = updateCampaignRegistrationSchema.validate(
        req.body
      );
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
        return;
      }

      const dto: UpdateCampaignRegistrationDto = value;
      const result = await this.campaignService.updateCampaignRegistration(
        parsedRegistrationId,
        dto
      );

      res.status(200).json({
        success: true,
        message: "Registration updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get eligible unregistered affiliates for a campaign
   */
  getEligibleUnregisteredAffiliates = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { campaignId } = req.params;
      
      if (!campaignId) {
        res.status(400).json({
          success: false,
          message: "Campaign ID is required",
        });
        return;
      }

      const parsedCampaignId = parseInt(campaignId);
      if (isNaN(parsedCampaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      const query = {
        page: parseInt((req.query.page as string) || "1"),
        limit: Math.min(parseInt((req.query.limit as string) || "10"), 100),
        ...(req.query.organizationId && {
          organizationId: Number(req.query.organizationId),
        }),
      };

      const result =
        await this.campaignService.getEligibleUnregisteredAffiliates(
          parsedCampaignId,
          query
        );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve campaign (toggle active status)
   */
  approveCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);
      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "campaign Id is required.",
        });
        return;
      }

      const result = await this.campaignService.approveCampaign(campaignId);

      res.status(200).json({
        success: true,
        message: `Event ${result.active ? "approved" : "disapproved"} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all applied campaigns for affiliate
   */
  getAllAppliedCampaigns = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const affiliateId = Number(req?.user?.id);
      if (!affiliateId) {
        res.status(400).json({
          success: false,
          message: "Affiliate Id is required.",
        });
        return;
      }

      const result = await this.campaignService.getAffiliateCampaignsByStatus(
        affiliateId,
        CampaignRegistrationStatus.REGISTERED
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all rejected campaigns for affiliate
   */
  getAllRejectedCampaigns = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const affiliateId = Number(req?.user?.id);
      if (!affiliateId) {
        res.status(400).json({
          success: false,
          message: "Affiliate Id is required.",
        });
        return;
      }

      const result = await this.campaignService.getAffiliateCampaignsByStatus(
        affiliateId,
        CampaignRegistrationStatus.REJECTED
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all approved campaigns for affiliate
   */
  getApprovedCampaigns = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const affiliateId = Number(req?.user?.id);
      if (!affiliateId) {
        res.status(400).json({
          success: false,
          message: "Affiliate Id is required.",
        });
        return;
      }

      const result = await this.campaignService.getAffiliateCampaignsByStatus(
        affiliateId,
        CampaignRegistrationStatus.APPROVED
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve affiliate for campaign
   */
  approveAffiliateForCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const campaignId = Number(req?.params?.campaignId);
      const affiliateId = Number(req?.params?.affiliateId);
      const { status } = req.body;

      if (!campaignId || !affiliateId) {
        res.status(400).json({
          success: false,
          message: "Campaign Id and Affiliate Id is required.",
        });
        return;
      }

      const result = await this.campaignService.approveAffiliateForCampaign(
        campaignId,
        affiliateId,
        { status }
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve multiple affiliates for campaign
   */
  approveMultipleAffiliatesForCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const campaignId = Number(req?.params?.campaignId);
      const { affiliateIds, status } = req.body;

      if (!campaignId) {
        res.status(400).json({
          success: false,
          message: "Campaign Id is required.",
        });
        return;
      }

      const result =
        await this.campaignService.approveMultipleAffiliatesForCampaign(
          campaignId,
          { affiliateIds, status }
        );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ==================== CAMPAIGN ROI TRACKING (Round 7) ====================

  /**
   * Record a metric for a campaign (impressions, clicks, conversions, revenue).
   * POST /api/campaigns/:campaignId/metrics
   */
  trackCampaignMetric = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);
      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const { metricType, metricValue, recordedDate, metadata } = req.body;

      if (!metricType) {
        res.status(400).json({
          success: false,
          message: "metricType is required.",
        });
        return;
      }

      const validMetricTypes = ["impressions", "clicks", "conversions", "revenue", "engagement", "reach"];
      if (!validMetricTypes.includes(metricType)) {
        res.status(400).json({
          success: false,
          message: `metricType must be one of: ${validMetricTypes.join(", ")}`,
        });
        return;
      }

      if (metricValue === undefined || metricValue === null || Number(metricValue) < 0) {
        res.status(400).json({
          success: false,
          message: "metricValue must be a non-negative number.",
        });
        return;
      }

      // Verify campaign exists
      const campaign = await db
        .selectFrom("campaigns")
        .select("id")
        .where("id", "=", campaignId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      const metric = await sql`
        INSERT INTO campaign_metrics (campaign_id, metric_type, metric_value, recorded_date, metadata)
        VALUES (
          ${campaignId},
          ${metricType},
          ${Number(metricValue)},
          ${recordedDate || new Date().toISOString().split("T")[0]},
          ${metadata ? JSON.stringify(metadata) : null}::jsonb
        )
        RETURNING *
      `.execute(db);

      res.status(201).json({
        success: true,
        message: "Campaign metric recorded successfully.",
        data: metric.rows[0],
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ROI metrics for a campaign: total spend, impressions, clicks,
   * conversions, CTR, conversion rate, cost per conversion.
   * GET /api/campaigns/:campaignId/roi
   */
  getCampaignROI = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);
      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      // Verify campaign exists and get budget info
      const campaign = await db
        .selectFrom("campaigns")
        .selectAll()
        .where("id", "=", campaignId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      // Aggregate metrics by type
      const metricsResult = await sql`
        SELECT
          metric_type,
          COALESCE(SUM(metric_value), 0)::numeric as total_value,
          COUNT(*)::int as data_points,
          MIN(recorded_date) as first_recorded,
          MAX(recorded_date) as last_recorded
        FROM campaign_metrics
        WHERE campaign_id = ${campaignId}
        GROUP BY metric_type
      `.execute(db);

      // Build metrics map
      const metricsMap: Record<string, number> = {};
      for (const row of metricsResult.rows as any[]) {
        metricsMap[row.metric_type] = parseFloat(row.total_value) || 0;
      }

      const totalImpressions = metricsMap["impressions"] || 0;
      const totalClicks = metricsMap["clicks"] || 0;
      const totalConversions = metricsMap["conversions"] || 0;
      const totalRevenue = metricsMap["revenue"] || 0;

      // Parse budget from campaign (budget is stored as a string like "50000" or "10000-50000")
      let totalSpend = 0;
      if (campaign.budget) {
        const budgetStr = String(campaign.budget);
        if (budgetStr.includes("-")) {
          const parts = budgetStr.split("-");
          totalSpend = parseFloat(parts[1] || '') || parseFloat(parts[0] || '') || 0;
        } else {
          totalSpend = parseFloat(budgetStr) || 0;
        }
      }

      // Calculate ROI metrics
      const ctr = totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 100 * 100) / 100
        : 0;

      const conversionRate = totalClicks > 0
        ? Math.round((totalConversions / totalClicks) * 100 * 100) / 100
        : 0;

      const costPerConversion = totalConversions > 0
        ? Math.round((totalSpend / totalConversions) * 100) / 100
        : 0;

      const roi = totalSpend > 0
        ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 100 * 100) / 100
        : 0;

      // Daily trend
      const dailyTrend = await sql`
        SELECT
          recorded_date,
          metric_type,
          COALESCE(SUM(metric_value), 0)::numeric as value
        FROM campaign_metrics
        WHERE campaign_id = ${campaignId}
        GROUP BY recorded_date, metric_type
        ORDER BY recorded_date ASC
      `.execute(db);

      // Total affiliates in campaign
      const affiliateCountResult = await sql`
        SELECT COUNT(*)::int as count
        FROM campaign_affiliate_registrations
        WHERE campaign_id = ${campaignId} AND deleted = false
      `.execute(db);
      const totalAffiliates = (affiliateCountResult.rows[0] as any)?.count || 0;

      res.status(200).json({
        success: true,
        message: "Campaign ROI metrics fetched successfully.",
        data: {
          campaignId,
          campaignDescription: campaign.description,
          summary: {
            totalSpend,
            totalImpressions,
            totalClicks,
            totalConversions,
            totalRevenue,
            ctr,
            conversionRate,
            costPerConversion,
            roi,
            totalAffiliates,
          },
          metricBreakdown: metricsResult.rows,
          dailyTrend: dailyTrend.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Round 8: Campaign Milestones ====================

  /**
   * Create a milestone for a campaign
   */
  createMilestone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);
      const { title, description, target_value, metric_type, deadline } = req.body;

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Milestone title is required.",
        });
        return;
      }

      if (title.trim().length > 200) {
        res.status(400).json({
          success: false,
          message: "Title must be 200 characters or less.",
        });
        return;
      }

      // Verify campaign exists
      const campaign = await db
        .selectFrom("campaigns")
        .select("id")
        .where("id", "=", campaignId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      const result = await sql`
        INSERT INTO campaign_milestones (campaign_id, title, description, target_value, metric_type, deadline, status)
        VALUES (
          ${campaignId},
          ${title.trim()},
          ${description || null},
          ${target_value ? Number(target_value) : 0},
          ${metric_type || null},
          ${deadline ? deadline : null},
          'PENDING'
        )
        RETURNING *
      `.execute(db);

      res.status(201).json({
        success: true,
        message: "Milestone created successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get milestones for a campaign with progress data
   */
  getMilestones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      // Verify campaign exists
      const campaign = await db
        .selectFrom("campaigns")
        .select(["id", "description"])
        .where("id", "=", campaignId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      const milestones = await sql`
        SELECT
          id,
          campaign_id,
          title,
          description,
          target_value,
          current_value,
          metric_type,
          deadline,
          status,
          created_at,
          CASE
            WHEN target_value > 0 THEN ROUND((current_value / target_value * 100)::numeric, 2)
            ELSE 0
          END as progress_percentage,
          CASE
            WHEN deadline IS NOT NULL AND deadline < NOW() AND status != 'COMPLETED' THEN true
            ELSE false
          END as is_overdue
        FROM campaign_milestones
        WHERE campaign_id = ${campaignId}
        ORDER BY created_at ASC
      `.execute(db);

      // Summary stats
      const totalMilestones = milestones.rows.length;
      const completedCount = (milestones.rows as any[]).filter((m) => m.status === "COMPLETED").length;
      const pendingCount = (milestones.rows as any[]).filter((m) => m.status === "PENDING").length;
      const inProgressCount = (milestones.rows as any[]).filter((m) => m.status === "IN_PROGRESS").length;

      res.status(200).json({
        success: true,
        message: "Campaign milestones fetched successfully.",
        count: totalMilestones,
        data: {
          summary: {
            total: totalMilestones,
            completed: completedCount,
            pending: pendingCount,
            inProgress: inProgressCount,
            completionRate: totalMilestones > 0
              ? Math.round((completedCount / totalMilestones) * 100 * 100) / 100
              : 0,
          },
          milestones: milestones.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update progress toward a milestone
   */
  updateMilestoneProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const milestoneId = Number(req.params.milestoneId);
      const { current_value, status } = req.body;

      if (!milestoneId || isNaN(milestoneId)) {
        res.status(400).json({
          success: false,
          message: "Valid milestone ID is required.",
        });
        return;
      }

      // Verify milestone exists
      const milestone = await sql`
        SELECT * FROM campaign_milestones WHERE id = ${milestoneId}
      `.execute(db);

      if (milestone.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Milestone not found.",
        });
        return;
      }

      const existingMilestone = milestone.rows[0] as any;

      // Update values
      const newValue = current_value !== undefined ? Number(current_value) : existingMilestone.current_value;

      // Auto-determine status based on progress
      let newStatus = status || existingMilestone.status;
      if (!status) {
        const target = Number(existingMilestone.target_value);
        if (target > 0 && newValue >= target) {
          newStatus = "COMPLETED";
        } else if (newValue > 0 && newValue < target) {
          newStatus = "IN_PROGRESS";
        }
      }

      // Validate status if explicitly provided
      const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const result = await sql`
        UPDATE campaign_milestones
        SET current_value = ${newValue}, status = ${newStatus}
        WHERE id = ${milestoneId}
        RETURNING *,
          CASE
            WHEN target_value > 0 THEN ROUND((${newValue} / target_value * 100)::numeric, 2)
            ELSE 0
          END as progress_percentage
      `.execute(db);

      res.status(200).json({
        success: true,
        message: "Milestone progress updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Campaign Content Library (Round 9) ====================

  /**
   * Upload campaign content/asset reference
   */
  uploadContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);
      const uploadedBy = Number(req?.user?.id);

      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const { title, content_type, url, description } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Content title is required.",
        });
        return;
      }

      const validTypes = ["image", "video", "document"];
      if (!content_type || !validTypes.includes(content_type)) {
        res.status(400).json({
          success: false,
          message: "content_type must be 'image', 'video', or 'document'.",
        });
        return;
      }

      if (!url || typeof url !== "string" || url.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Content URL is required.",
        });
        return;
      }

      // Verify campaign exists
      const campaign = await sql`
        SELECT id FROM campaigns WHERE id = ${campaignId} AND deleted = false
      `.execute(db);

      if (campaign.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      const result = await sql`
        INSERT INTO campaign_content (campaign_id, title, content_type, url, description, uploaded_by)
        VALUES (
          ${campaignId},
          ${title.trim()},
          ${content_type},
          ${url.trim()},
          ${description || null},
          ${uploadedBy || null}
        )
        RETURNING *
      `.execute(db);

      res.status(201).json({
        success: true,
        message: "Content uploaded successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all content for a campaign, filterable by type
   */
  getCampaignContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const { type } = req.query;
      const validTypes = ["image", "video", "document"];

      let content;
      if (type && typeof type === "string" && validTypes.includes(type)) {
        content = await sql`
          SELECT * FROM campaign_content
          WHERE campaign_id = ${campaignId} AND content_type = ${type}
          ORDER BY created_at DESC
        `.execute(db);
      } else {
        content = await sql`
          SELECT * FROM campaign_content
          WHERE campaign_id = ${campaignId}
          ORDER BY created_at DESC
        `.execute(db);
      }

      res.status(200).json({
        success: true,
        message: "Campaign content fetched successfully.",
        data: content.rows,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a content entry
   */
  deleteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contentId = Number(req.params.contentId);

      if (isNaN(contentId)) {
        res.status(400).json({
          success: false,
          message: "Valid content ID is required.",
        });
        return;
      }

      const result = await sql`
        DELETE FROM campaign_content WHERE id = ${contentId}
        RETURNING id
      `.execute(db);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Content not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Content deleted successfully.",
        data: { id: contentId },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Round 10: Campaign Influencer Tiers ====================

  /**
   * Define influencer tiers for a campaign.
   * Accepts tier_name, min_followers, max_followers, payout_amount, perks as JSONB.
   */
  setInfluencerTiers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      // Verify campaign exists
      const campaign = await sql`
        SELECT id FROM campaigns WHERE id = ${campaignId} AND deleted = false
      `.execute(db);

      if (campaign.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      const { tiers } = req.body;

      if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
        res.status(400).json({
          success: false,
          message: "tiers array is required with at least one tier.",
        });
        return;
      }

      // Validate each tier
      for (const tier of tiers) {
        if (!tier.tier_name || typeof tier.tier_name !== "string" || tier.tier_name.trim().length === 0) {
          res.status(400).json({
            success: false,
            message: "Each tier must have a tier_name.",
          });
          return;
        }
        if (tier.min_followers !== undefined && isNaN(Number(tier.min_followers))) {
          res.status(400).json({
            success: false,
            message: `Invalid min_followers for tier "${tier.tier_name}".`,
          });
          return;
        }
        if (tier.max_followers !== undefined && tier.max_followers !== null && isNaN(Number(tier.max_followers))) {
          res.status(400).json({
            success: false,
            message: `Invalid max_followers for tier "${tier.tier_name}".`,
          });
          return;
        }
      }

      const insertedTiers: any[] = [];

      for (const tier of tiers) {
        const result = await sql`
          INSERT INTO campaign_influencer_tiers (campaign_id, tier_name, min_followers, max_followers, payout_amount, perks)
          VALUES (
            ${campaignId},
            ${tier.tier_name.trim()},
            ${tier.min_followers ? Number(tier.min_followers) : 0},
            ${tier.max_followers !== undefined && tier.max_followers !== null ? Number(tier.max_followers) : null},
            ${tier.payout_amount ? Number(tier.payout_amount) : 0},
            ${tier.perks ? JSON.stringify(tier.perks) : null}::jsonb
          )
          RETURNING *
        `.execute(db);
        insertedTiers.push(result.rows[0]);
      }

      res.status(201).json({
        success: true,
        message: "Influencer tiers created successfully.",
        data: insertedTiers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all influencer tiers for a campaign.
   */
  getInfluencerTiers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const tiers = await sql`
        SELECT
          cit.*,
          (
            SELECT COUNT(*)::int
            FROM campaign_affiliate_registrations car
            WHERE car.influencer_tier_id = cit.id AND car.deleted = false
          ) as assigned_affiliates
        FROM campaign_influencer_tiers cit
        WHERE cit.campaign_id = ${campaignId}
        ORDER BY cit.min_followers ASC
      `.execute(db);

      res.status(200).json({
        success: true,
        message: "Influencer tiers fetched successfully.",
        data: tiers.rows,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Assign a registered affiliate to a specific influencer tier based on their metrics.
   */
  assignAffiliateToTier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const { affiliate_id, tier_id } = req.body;

      if (!affiliate_id) {
        res.status(400).json({
          success: false,
          message: "affiliate_id is required.",
        });
        return;
      }

      if (!tier_id) {
        res.status(400).json({
          success: false,
          message: "tier_id is required.",
        });
        return;
      }

      // Verify tier belongs to this campaign
      const tierResult = await sql`
        SELECT * FROM campaign_influencer_tiers WHERE id = ${Number(tier_id)} AND campaign_id = ${campaignId}
      `.execute(db);

      if (tierResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Influencer tier not found for this campaign.",
        });
        return;
      }

      // Verify affiliate is registered for this campaign
      const registrationResult = await sql`
        SELECT id, affiliate_id, influencer_tier_id FROM campaign_affiliate_registrations
        WHERE campaign_id = ${campaignId} AND affiliate_id = ${Number(affiliate_id)} AND deleted = false
      `.execute(db);

      if (registrationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Affiliate is not registered for this campaign.",
        });
        return;
      }

      const registration = registrationResult.rows[0] as any;

      // Update the registration with the tier assignment
      const result = await sql`
        UPDATE campaign_affiliate_registrations
        SET influencer_tier_id = ${Number(tier_id)}
        WHERE id = ${registration.id}
        RETURNING id, affiliate_id, campaign_id, influencer_tier_id
      `.execute(db);

      // Optionally fetch affiliate details
      const affiliateResult = await sql`
        SELECT id, name, "profilePicture", followers FROM affiliates WHERE id = ${Number(affiliate_id)}
      `.execute(db);

      const tier = tierResult.rows[0] as any;
      const affiliate = affiliateResult.rows.length > 0 ? affiliateResult.rows[0] : null;

      res.status(200).json({
        success: true,
        message: "Affiliate assigned to influencer tier successfully.",
        data: {
          registration: result.rows[0],
          tier: {
            id: tier.id,
            tier_name: tier.tier_name,
            payout_amount: tier.payout_amount,
          },
          affiliate,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Campaign Reporting (Round 11) ====================

  /**
   * Generate a comprehensive report for a campaign
   */
  generateCampaignReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);
      const generatedBy = Number(req?.user?.id) || 0;

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      // Get campaign details
      const campaignResult = await sql`
        SELECT * FROM campaigns WHERE id = ${campaignId} AND deleted = false
      `.execute(db);

      if (campaignResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
        return;
      }

      const campaign = campaignResult.rows[0] as any;

      // Get affiliate participation stats
      const participationResult = await sql`
        SELECT
          COUNT(*)::int as total_registrations,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int as rejected
        FROM campaign_affiliate_registrations
        WHERE campaign_id = ${campaignId} AND deleted = false
      `.execute(db);

      const participation = participationResult.rows[0] as any;

      // Get deliverables status
      let deliverables = { total: 0, submitted: 0, approved: 0, rejected: 0, pending: 0 };
      try {
        const deliverableResult = await sql`
          SELECT
            COUNT(*)::int as total,
            COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END)::int as submitted,
            COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved,
            COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int as rejected,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending
          FROM campaign_deliverables
          WHERE campaign_id = ${campaignId}
        `.execute(db);
        deliverables = deliverableResult.rows[0] as any;
      } catch {
        // Table might not exist
      }

      // Get ROI metrics
      let roiMetrics = { impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
      try {
        const roiResult = await sql`
          SELECT
            COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0)::numeric as impressions,
            COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0)::numeric as clicks,
            COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0)::numeric as conversions,
            COALESCE(SUM(CASE WHEN metric_type = 'revenue' THEN metric_value ELSE 0 END), 0)::numeric as revenue
          FROM campaign_metrics
          WHERE campaign_id = ${campaignId}
        `.execute(db);
        roiMetrics = roiResult.rows[0] as any;
      } catch {
        // Table might not exist
      }

      // Get milestone progress
      let milestones: any[] = [];
      try {
        const milestoneResult = await sql`
          SELECT * FROM campaign_milestones
          WHERE campaign_id = ${campaignId}
          ORDER BY created_at ASC
        `.execute(db);
        milestones = milestoneResult.rows as any[];
      } catch {
        // Table might not exist
      }

      // Get payout summary
      let payoutSummary = { total_payouts: 0, total_amount: 0, paid: 0, pending_amount: 0 };
      try {
        const payoutResult = await sql`
          SELECT
            COUNT(*)::int as total_payouts,
            COALESCE(SUM(amount), 0)::numeric as total_amount,
            COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0)::numeric as paid,
            COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0)::numeric as pending_amount
          FROM campaign_payouts
          WHERE campaign_id = ${campaignId}
        `.execute(db);
        payoutSummary = payoutResult.rows[0] as any;
      } catch {
        // Table might not exist
      }

      // Build the report data
      const reportData = {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          budget: campaign.budget,
        },
        overview: {
          total_registrations: participation.total_registrations,
          approved_affiliates: participation.approved,
          pending_affiliates: participation.pending,
          rejected_affiliates: participation.rejected,
        },
        deliverables,
        roi_metrics: {
          ...roiMetrics,
          ctr: Number(roiMetrics.impressions) > 0
            ? ((Number(roiMetrics.clicks) / Number(roiMetrics.impressions)) * 100).toFixed(2) + '%'
            : '0%',
          conversion_rate: Number(roiMetrics.clicks) > 0
            ? ((Number(roiMetrics.conversions) / Number(roiMetrics.clicks)) * 100).toFixed(2) + '%'
            : '0%',
        },
        milestones: milestones.map((m: any) => ({
          id: m.id,
          title: m.title,
          target_value: m.target_value,
          current_value: m.current_value,
          progress: m.target_value > 0
            ? Math.round((m.current_value / m.target_value) * 100)
            : 0,
          status: m.status,
        })),
        payouts: payoutSummary,
        generated_at: new Date().toISOString(),
      };

      // Save the report
      const savedReport = await sql`
        INSERT INTO campaign_reports (campaign_id, report_data, generated_by, created_at)
        VALUES (${campaignId}, ${JSON.stringify(reportData)}::jsonb, ${generatedBy}, NOW())
        RETURNING *
      `.execute(db);

      res.status(201).json({
        success: true,
        message: "Campaign report generated successfully.",
        data: {
          report_id: (savedReport.rows[0] as any).id,
          ...reportData,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List saved reports for a campaign
   */
  getCampaignReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const reports = await sql`
        SELECT * FROM campaign_reports
        WHERE campaign_id = ${campaignId}
        ORDER BY created_at DESC
      `.execute(db);

      res.status(200).json({
        success: true,
        message: "Campaign reports fetched successfully.",
        data: reports.rows,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Compare metrics between 2+ campaigns side by side
   */
  compareCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { campaign_ids } = req.body;

      if (!campaign_ids || !Array.isArray(campaign_ids) || campaign_ids.length < 2) {
        res.status(400).json({
          success: false,
          message: "At least 2 campaign_ids are required for comparison.",
        });
        return;
      }

      const comparisons = await Promise.all(
        campaign_ids.map(async (id: number) => {
          const campaignId = Number(id);

          // Get campaign details
          const campaignResult = await sql`
            SELECT id, name, status, budget, start_date, end_date FROM campaigns
            WHERE id = ${campaignId} AND deleted = false
          `.execute(db);

          if (campaignResult.rows.length === 0) {
            return { campaign_id: campaignId, error: "Campaign not found" };
          }

          const campaign = campaignResult.rows[0] as any;

          // Get registration stats
          const regResult = await sql`
            SELECT
              COUNT(*)::int as total_registrations,
              COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved
            FROM campaign_affiliate_registrations
            WHERE campaign_id = ${campaignId} AND deleted = false
          `.execute(db);

          const regStats = regResult.rows[0] as any;

          // Get deliverables count
          let deliverableStats = { total: 0, approved: 0 };
          try {
            const delResult = await sql`
              SELECT
                COUNT(*)::int as total,
                COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved
              FROM campaign_deliverables
              WHERE campaign_id = ${campaignId}
            `.execute(db);
            deliverableStats = delResult.rows[0] as any;
          } catch {
            // Table might not exist
          }

          // Get ROI metrics
          let metrics = { impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
          try {
            const metricResult = await sql`
              SELECT
                COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0)::numeric as impressions,
                COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0)::numeric as clicks,
                COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0)::numeric as conversions,
                COALESCE(SUM(CASE WHEN metric_type = 'revenue' THEN metric_value ELSE 0 END), 0)::numeric as revenue
              FROM campaign_metrics
              WHERE campaign_id = ${campaignId}
            `.execute(db);
            metrics = metricResult.rows[0] as any;
          } catch {
            // Table might not exist
          }

          // Get payout total
          let totalPayout = 0;
          try {
            const payoutResult = await sql`
              SELECT COALESCE(SUM(amount), 0)::numeric as total
              FROM campaign_payouts
              WHERE campaign_id = ${campaignId}
            `.execute(db);
            totalPayout = Number((payoutResult.rows[0] as any)?.total) || 0;
          } catch {
            // Table might not exist
          }

          return {
            campaign: {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              budget: campaign.budget,
              start_date: campaign.start_date,
              end_date: campaign.end_date,
            },
            registrations: {
              total: regStats.total_registrations,
              approved: regStats.approved,
            },
            deliverables: deliverableStats,
            metrics: {
              ...metrics,
              ctr: Number(metrics.impressions) > 0
                ? ((Number(metrics.clicks) / Number(metrics.impressions)) * 100).toFixed(2) + '%'
                : '0%',
              conversion_rate: Number(metrics.clicks) > 0
                ? ((Number(metrics.conversions) / Number(metrics.clicks)) * 100).toFixed(2) + '%'
                : '0%',
            },
            total_payout: totalPayout,
            roi: campaign.budget > 0
              ? ((Number(metrics.revenue) - campaign.budget) / campaign.budget * 100).toFixed(2) + '%'
              : 'N/A',
          };
        })
      );

      res.status(200).json({
        success: true,
        message: "Campaign comparison generated successfully.",
        data: comparisons,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Campaign Application Review Workflow (Round 13) ====================

  /**
   * Get all pending campaign applications with affiliate details
   * GET /api/campaigns/:campaignId/applications/review
   */
  getApplicationsForReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const statusFilter = req.query.status as string;

      const validStatuses = ["PENDING", "SHORTLISTED", "APPROVED", "REJECTED"];
      if (statusFilter && !validStatuses.includes(statusFilter.toUpperCase())) {
        res.status(400).json({
          success: false,
          message: `Invalid status filter. Valid values: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const applications = await sql`
        SELECT
          car.id as application_id,
          car.campaign_id,
          car.affiliate_id,
          car.status,
          car."createdAt" as applied_at,
          a.name as affiliate_name,
          a.email as affiliate_email,
          a.phone as affiliate_phone,
          a."profilePicture" as affiliate_picture,
          a."sportsCategoryId" as sport,
          a.followers,
          a.city
        FROM campaign_affiliate_registrations car
        INNER JOIN affiliates a ON a.id = car.affiliate_id
        WHERE car.campaign_id = ${campaignId}
          AND car.deleted = false
        ORDER BY car."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);

      // Apply status filter in application if dynamic SQL is not feasible
      let filteredRows = applications.rows;
      if (statusFilter) {
        filteredRows = applications.rows.filter(
          (r: any) => r.status === statusFilter.toUpperCase()
        );
      }

      const countResult = await sql`
        SELECT COUNT(*)::int as total
        FROM campaign_affiliate_registrations car
        WHERE car.campaign_id = ${campaignId} AND car.deleted = false
      `.execute(db);
      const total = (countResult.rows[0] as any)?.total || 0;

      res.status(200).json({
        success: true,
        message: "Applications retrieved successfully.",
        data: statusFilter ? filteredRows : applications.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update application status with reviewer notes
   * PATCH /api/campaigns/applications/:applicationId/status
   */
  updateApplicationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const applicationId = Number(req.params.applicationId);

      if (!applicationId || isNaN(applicationId)) {
        res.status(400).json({
          success: false,
          message: "Valid application ID is required.",
        });
        return;
      }

      const { status, reviewer_notes } = req.body;
      const validStatuses = ["PENDING", "SHORTLISTED", "APPROVED", "REJECTED"];

      if (!status || !validStatuses.includes(status.toUpperCase())) {
        res.status(400).json({
          success: false,
          message: `Valid status is required. Options: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const reviewerId = Number(req.user?.id);

      // Get current application
      const currentApp = await sql`
        SELECT id, status, campaign_id, affiliate_id FROM campaign_affiliate_registrations
        WHERE id = ${applicationId} AND deleted = false
      `.execute(db);

      if (currentApp.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Application not found.",
        });
        return;
      }

      const current = currentApp.rows[0] as any;
      const previousStatus = current.status;

      // Update the application status
      const updated = await sql`
        UPDATE campaign_affiliate_registrations
        SET status = ${status.toUpperCase()}, "updatedAt" = NOW()
        WHERE id = ${applicationId} AND deleted = false
        RETURNING id, campaign_id, affiliate_id, status, "updatedAt"
      `.execute(db);

      // Record the review in audit table
      await sql`
        INSERT INTO campaign_application_reviews (application_id, previous_status, new_status, reviewer_notes, reviewed_by, reviewed_at)
        VALUES (${applicationId}, ${previousStatus}, ${status.toUpperCase()}, ${reviewer_notes || null}, ${reviewerId}, NOW())
      `.execute(db);

      res.status(200).json({
        success: true,
        message: `Application status updated to ${status.toUpperCase()}.`,
        data: updated.rows[0],
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get review history for a specific application
   * GET /api/campaigns/applications/:applicationId/history
   */
  getApplicationHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const applicationId = Number(req.params.applicationId);

      if (!applicationId || isNaN(applicationId)) {
        res.status(400).json({
          success: false,
          message: "Valid application ID is required.",
        });
        return;
      }

      // Verify application exists
      const app = await sql`
        SELECT id, campaign_id, affiliate_id, status
        FROM campaign_affiliate_registrations
        WHERE id = ${applicationId} AND deleted = false
      `.execute(db);

      if (app.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Application not found.",
        });
        return;
      }

      const history = await sql`
        SELECT
          car.id as review_id,
          car.previous_status,
          car.new_status,
          car.reviewer_notes,
          car.reviewed_by,
          car.reviewed_at
        FROM campaign_application_reviews car
        WHERE car.application_id = ${applicationId}
        ORDER BY car.reviewed_at DESC
      `.execute(db);

      res.status(200).json({
        success: true,
        message: "Application review history retrieved successfully.",
        data: {
          application: app.rows[0],
          history: history.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk update multiple applications to same status
   * POST /api/campaigns/:campaignId/applications/bulk-update
   */
  bulkUpdateApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      const { application_ids, status, reviewer_notes } = req.body;
      const validStatuses = ["PENDING", "SHORTLISTED", "APPROVED", "REJECTED"];

      if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: "application_ids array is required and must not be empty.",
        });
        return;
      }

      if (!status || !validStatuses.includes(status.toUpperCase())) {
        res.status(400).json({
          success: false,
          message: `Valid status is required. Options: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const reviewerId = Number(req.user?.id);
      const newStatus = status.toUpperCase();
      const successIds: number[] = [];
      const failedIds: number[] = [];

      for (const appId of application_ids) {
        const id = Number(appId);
        if (isNaN(id)) {
          failedIds.push(appId);
          continue;
        }

        try {
          // Get current status
          const current = await sql`
            SELECT id, status FROM campaign_affiliate_registrations
            WHERE id = ${id} AND campaign_id = ${campaignId} AND deleted = false
          `.execute(db);

          if (current.rows.length === 0) {
            failedIds.push(id);
            continue;
          }

          const previousStatus = (current.rows[0] as any).status;

          // Update status
          await sql`
            UPDATE campaign_affiliate_registrations
            SET status = ${newStatus}, "updatedAt" = NOW()
            WHERE id = ${id} AND campaign_id = ${campaignId} AND deleted = false
          `.execute(db);

          // Record audit
          await sql`
            INSERT INTO campaign_application_reviews (application_id, previous_status, new_status, reviewer_notes, reviewed_by, reviewed_at)
            VALUES (${id}, ${previousStatus}, ${newStatus}, ${reviewer_notes || null}, ${reviewerId}, NOW())
          `.execute(db);

          successIds.push(id);
        } catch {
          failedIds.push(id);
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk update complete. ${successIds.length} updated, ${failedIds.length} failed.`,
        data: {
          updated: successIds,
          failed: failedIds,
          new_status: newStatus,
          total_processed: application_ids.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ========================= CAMPAIGN ANALYTICS DASHBOARD (Round 14) =========================

  /**
   * Detailed analytics for a campaign
   * GET /api/campaigns/:campaignId/dashboard-analytics
   */
  getCampaignDashboardAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.campaignId);

      if (!campaignId || isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Valid campaign ID is required.",
        });
        return;
      }

      // Application funnel
      const funnel = await sql`
        SELECT
          COUNT(*)::int as total_applied,
          COUNT(CASE WHEN status = 'SHORTLISTED' THEN 1 END)::int as shortlisted,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int as rejected
        FROM campaign_affiliate_registrations
        WHERE campaign_id = ${campaignId} AND deleted = false
      `.execute(db);

      // Deliverable completion rate
      const deliverableStats = await sql`
        SELECT
          COUNT(*)::int as total_deliverables,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved_deliverables,
          COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END)::int as submitted_deliverables,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int as rejected_deliverables
        FROM campaign_deliverables
        WHERE campaign_id = ${campaignId}
      `.execute(db);

      const deliverableRow = deliverableStats.rows[0] as any;
      const completionRate = deliverableRow.total_deliverables > 0
        ? Math.round((deliverableRow.approved_deliverables / deliverableRow.total_deliverables) * 100)
        : 0;

      // Payout stats
      const payoutStats = await sql`
        SELECT
          COUNT(*)::int as total_payouts,
          COALESCE(SUM(amount), 0)::numeric as total_amount,
          COALESCE(AVG(amount), 0)::numeric as avg_amount,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed_payouts
        FROM campaign_payouts
        WHERE campaign_id = ${campaignId}
      `.execute(db);

      // Timeline of applications over days (last 30 days)
      const timeline = await sql`
        SELECT
          DATE("createdAt") as date,
          COUNT(*)::int as applications
        FROM campaign_affiliate_registrations
        WHERE campaign_id = ${campaignId}
          AND deleted = false
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `.execute(db);

      // Top performing affiliates for this campaign
      const topPerformers = await sql`
        SELECT
          a.id as affiliate_id,
          a.name,
          a."profilePicture" as profile_picture,
          car.status as registration_status,
          COUNT(cd.id)::int as deliverables_submitted,
          COUNT(CASE WHEN cd.status = 'APPROVED' THEN 1 END)::int as deliverables_approved
        FROM campaign_affiliate_registrations car
        INNER JOIN affiliates a ON a.id = car.affiliate_id
        LEFT JOIN campaign_deliverables cd ON cd.campaign_id = car.campaign_id AND cd.affiliate_id = car.affiliate_id
        WHERE car.campaign_id = ${campaignId} AND car.deleted = false
        GROUP BY a.id, a.name, a."profilePicture", car.status
        ORDER BY deliverables_approved DESC, deliverables_submitted DESC
        LIMIT 10
      `.execute(db);

      res.status(200).json({
        success: true,
        message: "Campaign analytics retrieved successfully.",
        data: {
          funnel: funnel.rows[0],
          deliverables: {
            ...deliverableRow,
            completion_rate: completionRate,
          },
          payouts: payoutStats.rows[0],
          application_timeline: timeline.rows,
          top_performers: topPerformers.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Monthly trends across all campaigns
   * GET /api/campaigns/trends
   */
  getCampaignTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const months = Math.min(parseInt(req.query.months as string) || 6, 24);

      // Applications per month
      const applicationTrends = await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as total_applications,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int as rejected,
          CASE
            WHEN COUNT(*) > 0
            THEN ROUND((COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 1)
            ELSE 0
          END as approval_rate
        FROM campaign_affiliate_registrations
        WHERE deleted = false
          AND "createdAt" >= NOW() - MAKE_INTERVAL(months => ${months})
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `.execute(db);

      // Average payout amounts per month
      const payoutTrends = await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0)::numeric as total_payouts,
          COALESCE(AVG(amount), 0)::numeric as avg_payout,
          COUNT(*)::int as payout_count
        FROM campaign_payouts
        WHERE created_at >= NOW() - MAKE_INTERVAL(months => ${months})
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `.execute(db);

      // Campaigns created per month
      const campaignTrends = await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as campaigns_created
        FROM campaigns
        WHERE deleted = false
          AND "createdAt" >= NOW() - MAKE_INTERVAL(months => ${months})
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `.execute(db);

      res.status(200).json({
        success: true,
        message: "Campaign trends retrieved successfully.",
        data: {
          application_trends: applicationTrends.rows,
          payout_trends: payoutTrends.rows,
          campaign_trends: campaignTrends.rows,
        },
        meta: { months_range: months },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Top performing affiliates across all campaigns
   * GET /api/campaigns/top-performers
   */
  getTopPerformers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const performers = await sql`
        SELECT
          a.id as affiliate_id,
          a.name,
          a."profilePicture" as profile_picture,
          a."sportsCategoryId" as sport,
          a.city as location,
          COUNT(DISTINCT car.campaign_id)::int as campaigns_participated,
          COUNT(DISTINCT cd.id)::int as total_deliverables,
          COUNT(DISTINCT CASE WHEN cd.status = 'APPROVED' THEN cd.id END)::int as approved_deliverables,
          CASE
            WHEN COUNT(DISTINCT cd.id) > 0
            THEN ROUND((COUNT(DISTINCT CASE WHEN cd.status = 'APPROVED' THEN cd.id END)::numeric / COUNT(DISTINCT cd.id)::numeric) * 100, 1)
            ELSE 0
          END as completion_rate,
          COALESCE(SUM(cp.amount), 0)::numeric as total_earnings
        FROM affiliates a
        INNER JOIN campaign_affiliate_registrations car
          ON car.affiliate_id = a.id AND car.deleted = false
        LEFT JOIN campaign_deliverables cd
          ON cd.affiliate_id = a.id AND cd.campaign_id = car.campaign_id
        LEFT JOIN campaign_payouts cp
          ON cp.affiliate_id = a.id AND cp.campaign_id = car.campaign_id
        WHERE a.deleted = false AND a.status = 'ACTIVE'
        GROUP BY a.id, a.name, a."profilePicture", a."sportsCategoryId", a.city
        HAVING COUNT(DISTINCT car.campaign_id) > 0
        ORDER BY completion_rate DESC, campaigns_participated DESC, total_deliverables DESC
        LIMIT ${limit}
      `.execute(db);

      // Add rank
      const rankedData = performers.rows.map((entry: any, index: number) => ({
        rank: index + 1,
        ...entry,
      }));

      res.status(200).json({
        success: true,
        message: "Top performers retrieved successfully.",
        data: rankedData,
      });
    } catch (error) {
      next(error);
    }
  };
}

