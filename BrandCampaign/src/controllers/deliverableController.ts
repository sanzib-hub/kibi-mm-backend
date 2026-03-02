import { Request, Response, NextFunction } from "express";
import { db } from "../database/kysely/databases";

/**
 * Submit a deliverable for a campaign
 */
export const submitDeliverable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    const affiliateId = Number(req.user?.id);
    const { deliverableType, submissionUrl, description } = req.body;

    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid Campaign ID is required",
      });
      return;
    }

    if (!affiliateId) {
      res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
      return;
    }

    if (!deliverableType || !submissionUrl) {
      res.status(400).json({
        success: false,
        message: "deliverableType and submissionUrl are required",
      });
      return;
    }

    // Validate registration exists and is APPROVED
    const registration = await db
      .selectFrom("campaign_affiliate_registrations")
      .select(["id", "status"])
      .where("campaign_id", "=", campaignId)
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!registration) {
      res.status(404).json({
        success: false,
        message: "Campaign registration not found",
      });
      return;
    }

    if (registration.status !== "APPROVED") {
      res.status(400).json({
        success: false,
        message: "Your campaign registration must be APPROVED before submitting deliverables",
      });
      return;
    }

    const deliverable = await db
      .insertInto("campaign_deliverables")
      .values({
        registration_id: registration.id,
        campaign_id: campaignId,
        affiliate_id: affiliateId,
        deliverable_type: deliverableType,
        submission_url: submissionUrl,
        description: description || null,
        status: "SUBMITTED",
      })
      .returningAll()
      .executeTakeFirst();

    res.status(201).json({
      success: true,
      message: "Deliverable submitted successfully",
      data: deliverable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get deliverables for a campaign
 * Admin sees all, affiliate sees only theirs
 */
export const getDeliverables = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaignId = Number(req.params.campaignId);
    const userId = Number(req.user?.id);
    const userType = req.user?.type;

    if (!campaignId || isNaN(campaignId)) {
      res.status(400).json({
        success: false,
        message: "Valid Campaign ID is required",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    let query = db
      .selectFrom("campaign_deliverables")
      .leftJoin("affiliates", "affiliates.id", "campaign_deliverables.affiliate_id")
      .select([
        "campaign_deliverables.id",
        "campaign_deliverables.registration_id",
        "campaign_deliverables.campaign_id",
        "campaign_deliverables.affiliate_id",
        "campaign_deliverables.deliverable_type",
        "campaign_deliverables.submission_url",
        "campaign_deliverables.description",
        "campaign_deliverables.status",
        "campaign_deliverables.admin_feedback",
        "campaign_deliverables.reviewed_by",
        "campaign_deliverables.reviewed_at",
        "campaign_deliverables.created_at",
        "affiliates.name as affiliate_name",
      ])
      .where("campaign_deliverables.campaign_id", "=", campaignId);

    // If not admin (SUPER_ADMIN), only show the affiliate's own deliverables
    if (userType !== "SUPER_ADMIN") {
      query = query.where("campaign_deliverables.affiliate_id", "=", userId);
    }

    const deliverables = await query
      .orderBy("campaign_deliverables.created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    res.status(200).json({
      success: true,
      message: "Deliverables fetched successfully",
      count: deliverables.length,
      data: deliverables,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review (approve/reject) a deliverable — admin only
 */
export const reviewDeliverable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deliverableId = req.params.deliverableId;
    const adminId = Number(req.user?.id);
    const { status, feedback } = req.body;

    if (!deliverableId) {
      res.status(400).json({
        success: false,
        message: "Valid Deliverable ID is required",
      });
      return;
    }

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED",
      });
      return;
    }

    const deliverable = await db
      .selectFrom("campaign_deliverables")
      .select(["id", "status"])
      .where("id", "=", deliverableId)
      .executeTakeFirst();

    if (!deliverable) {
      res.status(404).json({
        success: false,
        message: "Deliverable not found",
      });
      return;
    }

    const updated = await db
      .updateTable("campaign_deliverables")
      .set({
        status,
        admin_feedback: feedback || null,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      })
      .where("id", "=", deliverableId)
      .returningAll()
      .executeTakeFirst();

    res.status(200).json({
      success: true,
      message: `Deliverable ${status.toLowerCase()} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
