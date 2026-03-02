import { Request, Response, NextFunction } from "express";
import { db } from "../database/kysely/databases";
import { sql } from "kysely";

/**
 * Create a payout record for an affiliate in a campaign
 * POST /api/campaigns/:campaignId/payouts
 */
export const createPayout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
      return;
    }

    const {
      affiliateId,
      registrationId,
      amount,
      currency,
      paymentMethod,
      paymentReference,
      notes,
    } = req.body;

    if (!affiliateId || !amount) {
      res.status(400).json({
        success: false,
        message: "affiliateId and amount are required",
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
      return;
    }

    // Verify campaign exists
    const campaign = await db
      .selectFrom("campaigns")
      .select(["id"])
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    // Verify affiliate exists
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["id"])
      .where("id", "=", Number(affiliateId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      res.status(404).json({
        success: false,
        message: "Affiliate not found",
      });
      return;
    }

    const processedBy = req.user?.id;

    const payout = await db
      .insertInto("campaign_payouts" as any)
      .values({
        campaign_id: campaignId,
        affiliate_id: Number(affiliateId),
        registration_id: registrationId ? Number(registrationId) : null,
        amount: Number(amount),
        currency: currency || "INR",
        payment_method: paymentMethod || null,
        payment_reference: paymentReference || null,
        status: "PENDING",
        notes: notes || null,
        processed_by: processedBy || null,
      } as any)
      .returning([
        "id" as any,
        "campaign_id" as any,
        "affiliate_id" as any,
        "amount" as any,
        "currency" as any,
        "status" as any,
        "created_at" as any,
      ])
      .executeTakeFirst();

    res.status(201).json({
      success: true,
      message: "Payout created successfully",
      data: payout,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payouts for a campaign (paginated)
 * GET /api/campaigns/:campaignId/payouts
 */
export const getPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const payouts = await db
      .selectFrom("campaign_payouts as cp" as any)
      .leftJoin("affiliates as a", "a.id", "cp.affiliate_id" as any)
      .select([
        "cp.id" as any,
        "cp.campaign_id" as any,
        "cp.affiliate_id" as any,
        "cp.amount" as any,
        "cp.currency" as any,
        "cp.payment_method" as any,
        "cp.payment_reference" as any,
        "cp.status" as any,
        "cp.notes" as any,
        "cp.processed_by" as any,
        "cp.processed_at" as any,
        "cp.created_at" as any,
        "a.name as affiliate_name",
        "a.email as affiliate_email",
      ])
      .where("cp.campaign_id" as any, "=", campaignId)
      .orderBy("cp.created_at" as any, "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    const countResult = await db
      .selectFrom("campaign_payouts" as any)
      .select(sql`COUNT(*)`.as("total"))
      .where("campaign_id", "=", campaignId)
      .executeTakeFirst();

    const total = Number((countResult as any)?.total || 0);

    res.status(200).json({
      success: true,
      message: "Payouts fetched successfully",
      count: payouts.length,
      data: payouts,
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
 * Get affiliate's payouts across all campaigns
 * GET /api/campaigns/my-payouts
 */
export const getAffiliatePayouts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const affiliateId = Number(req.user?.id);
    if (!affiliateId) {
      res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const payouts = await db
      .selectFrom("campaign_payouts as cp" as any)
      .leftJoin("campaigns as c", "c.id", "cp.campaign_id" as any)
      .select([
        "cp.id" as any,
        "cp.campaign_id" as any,
        "cp.amount" as any,
        "cp.currency" as any,
        "cp.payment_method" as any,
        "cp.payment_reference" as any,
        "cp.status" as any,
        "cp.notes" as any,
        "cp.created_at" as any,
        "c.product as campaign_product" as any,
        "c.description as campaign_description" as any,
      ])
      .where("cp.affiliate_id" as any, "=", affiliateId)
      .orderBy("cp.created_at" as any, "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    const countResult = await db
      .selectFrom("campaign_payouts" as any)
      .select(sql`COUNT(*)`.as("total"))
      .where("affiliate_id", "=", affiliateId)
      .executeTakeFirst();

    const total = Number((countResult as any)?.total || 0);

    res.status(200).json({
      success: true,
      message: "Affiliate payouts fetched successfully",
      count: payouts.length,
      data: payouts,
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
 * Update payout status
 * PATCH /api/campaigns/payouts/:payoutId/status
 */
export const updatePayoutStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payoutId = req.params.payoutId;
    if (!payoutId) {
      res.status(400).json({
        success: false,
        message: "Payout ID is required",
      });
      return;
    }

    const { status } = req.body;
    const validStatuses = ["PENDING", "PROCESSED", "FAILED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    const adminId = req.user?.id;

    const updateData: Record<string, any> = {
      status,
      processed_by: adminId,
    };

    if (status === "PROCESSED") {
      updateData.processed_at = new Date();
    }

    const updated = await db
      .updateTable("campaign_payouts" as any)
      .set(updateData)
      .where("id", "=", payoutId)
      .returning([
        "id" as any,
        "campaign_id" as any,
        "affiliate_id" as any,
        "amount" as any,
        "status" as any,
        "processed_at" as any,
      ])
      .executeTakeFirst();

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Payout not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Payout status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payout summary for a campaign
 * GET /api/campaigns/:campaignId/payout-summary
 */
export const getPayoutSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid campaign ID is required",
      });
      return;
    }

    // Verify campaign exists
    const campaign = await db
      .selectFrom("campaigns")
      .select(["id", "budget"])
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    // Get summary by status
    const summary = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'PROCESSED' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'FAILED' THEN amount ELSE 0 END), 0) as total_failed,
        COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN amount ELSE 0 END), 0) as total_cancelled,
        COALESCE(SUM(amount), 0) as grand_total,
        COUNT(*) as total_payouts,
        COUNT(DISTINCT affiliate_id) as unique_affiliates
      FROM campaign_payouts
      WHERE campaign_id = ${campaignId}
    `.execute(db);

    const stats = (summary as any).rows?.[0] || {};

    res.status(200).json({
      success: true,
      message: "Payout summary fetched successfully",
      data: {
        campaignId,
        budget: campaign.budget,
        totalPaid: Number(stats.total_paid || 0),
        totalPending: Number(stats.total_pending || 0),
        totalFailed: Number(stats.total_failed || 0),
        totalCancelled: Number(stats.total_cancelled || 0),
        grandTotal: Number(stats.grand_total || 0),
        totalPayouts: Number(stats.total_payouts || 0),
        uniqueAffiliates: Number(stats.unique_affiliates || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
