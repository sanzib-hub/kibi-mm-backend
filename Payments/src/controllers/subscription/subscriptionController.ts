import { Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import { db } from "../../database/kysely/databases.js";
import { NewSubscriptionPlan } from "../../database/kysely/types.js";
import { sendPlanLinkSMS } from "../../utils/sms/smsService.js";

dotenv.config();

const RAZORPAY_ID_KEY = process.env.RAZORPAY_ID_KEY || "";
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY || "";

if (!RAZORPAY_ID_KEY || !RAZORPAY_SECRET_KEY) {
  throw new Error("Missing Razorpay API credentials in environment variables");
}

/**
 * Create a Razorpay Plan
 * 
 * Creates a reusable billing template (amount + frequency) for recurring payments.
 * This plan can then be used to create subscriptions.
 * The plan is organization-specific and will be associated with the authenticated organization.
 * 
 * @route POST /api/subscriptions/create-plan
 * @access Organization only (requires organization authentication)
 */
const createPlan = async (req: Request, res: Response) => {
  try {
    // Auth check: must be an authenticated organization
    if (!req.user || req.user.type !== "ORGANIZATION") {
      return res.status(403).json({
        success: false,
        message: "Organization authentication required",
      });
    }

    const { period, interval, item, notes } = req.body;

    // Validate required fields
    if (!period || !interval || !item) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: period, interval, and item are required",
      });
    }

    // Validate item object
    if (!item.name || !item.amount || !item.currency) {
      return res.status(400).json({
        success: false,
        message: "Item must contain: name, amount, and currency",
      });
    }

    // ✅ Updated valid periods (quarterly added)
    const validPeriods = ["daily", "weekly", "monthly", "yearly", "quarterly"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Period must be one of: ${validPeriods.join(", ")}`,
      });
    }

    // Validate interval
    if (!Number.isInteger(interval) || interval < 1) {
      return res.status(400).json({
        success: false,
        message: "Interval must be a positive integer",
      });
    }

    // Validate amount (accept in rupees - will convert to paise for Razorpay)
    const amountInRupees = Number(item.amount);
    if (isNaN(amountInRupees) || amountInRupees < 1) {
      return res.status(400).json({
        success: false,
        message: "Item amount must be a positive number (in rupees)",
      });
    }

    // Razorpay expects amount in paise (smallest unit): 1 INR = 100 paise
    const amountInPaise = Math.round(amountInRupees * 100);

  // ✅ Updated Interval Validation (Strict Check for Daily & Quarterly)
  let finalPeriod = period;
  let finalInterval = 1; 

  if (period === "daily") {
    // Daily ke liye sirf 7 allowed hai
    if (interval !== 7) {
      return res.status(400).json({
        success: false,
        message: "Daily plan should be of interval 7.",
      });
    }
    finalInterval = 7; 
  } else if (period === "quarterly") {
    // Quarterly ke liye sirf 3 allowed hai
    if (interval !== 3) {
      return res.status(400).json({
        success: false,
        message: "Quarterly plan should be of interval 3.",
      });
    }
    finalPeriod = "monthly"; 
    finalInterval = 3; 
  } else {
    // Baki (monthly, yearly, weekly) ke liye default 1
    if (interval !== 1) {
      return res.status(400).json({
        success: false,
        message: `${period} plan should be of interval 1.`,
      });
    }
    finalInterval = 1;
  }

    // Prepare Razorpay payload (amount must be in paise for Razorpay API)
    const planPayload: any = {
      period: finalPeriod,
      interval: finalInterval,
      item: {
        name: item.name,
        amount: amountInPaise,
        currency: item.currency,
        description: item.description || "",
      },
    };

    if (notes && typeof notes === "object") {
      planPayload.notes = notes;
    }

    console.log(
      "Creating Razorpay Plan with payload:",
      JSON.stringify(planPayload, null, 2)
    );

    const response = await axios.post(
      "https://api.razorpay.com/v1/plans",
      planPayload,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const planData = response.data;

    console.log("✅ Razorpay Plan created successfully:", {
      planId: planData.id,
      period: planData.period,
      interval: planData.interval,
      amount: planData.item?.amount,
    });

    try {
      const organizationId = req.user.id;

      const planToInsert: NewSubscriptionPlan = {
        razorpayPlanId: planData.id,
        organizationId: organizationId,
        // ✅ Save original requested period (including quarterly)
        period: period as
          | "daily"
          | "weekly"
          | "monthly"
          | "yearly"
          | "quarterly",
        interval: interval, // original interval
        itemName: planData.item?.name || item.name,
        itemAmount: planData.item?.amount ?? amountInPaise,
        itemCurrency: planData.item?.currency || item.currency,
        itemDescription:
          planData.item?.description || item.description || null,
        notes: planData.notes || notes || null,
        active: planData.item?.active !== false,
        deleted: false,
      };

      const savedPlan = await db
        .insertInto("subscription_plans")
        .values(planToInsert)
        .returningAll()
        .executeTakeFirstOrThrow();

      console.log("✅ Plan saved to database successfully:", {
        dbId: savedPlan.id,
        razorpayPlanId: savedPlan.razorpayPlanId,
      });

      return res.status(201).json({
        success: true,
        message: "Plan created successfully",
        data: {
          id: savedPlan.id,
          plan_id: planData.id,
          entity: planData.entity,
          interval: planData.interval,
          period: period, // return original period
          item: {
            id: planData.item?.id,
            active: planData.item?.active,
            name: planData.item?.name,
            description: planData.item?.description,
            amount: planData.item?.amount,
            unit_amount: planData.item?.unit_amount,
            currency: planData.item?.currency,
            type: planData.item?.type,
          },
          notes: planData.notes || {},
        },
      });
    } catch (dbError: any) {
      console.error("❌ Database save error:", dbError);

      return res.status(201).json({
        success: true,
        message:
          "Plan created in Razorpay but failed to save to database",
        warning: "Database save failed. Please check logs.",
        data: {
          plan_id: planData.id,
          entity: planData.entity,
          interval: planData.interval,
          period: period,
          item: {
            id: planData.item?.id,
            active: planData.item?.active,
            name: planData.item?.name,
            description: planData.item?.description,
            amount: planData.item?.amount,
            unit_amount: planData.item?.unit_amount,
            currency: planData.item?.currency,
            type: planData.item?.type,
          },
          notes: planData.notes || {},
        },
        error: dbError.message,
      });
    }
  } catch (error: any) {
    console.error("❌ Razorpay Plan creation error:", error);

    if (error.response) {
      const statusCode = error.response.status || 500;
      const errorMessage =
        error.response.data?.error?.description ||
        error.response.data?.error?.message ||
        "Plan creation failed";

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.response.data,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Plan creation failed",
      error: error.message,
    });
  }
};
/**
 * Get subscription plans for an affiliate
 * 
 * Fetches all active subscription plans for the organization that the affiliate belongs to.
 * This endpoint is used when an affiliate action is triggered on the frontend.
 * 
 * @route GET /api/subscriptions/plans/:affiliateId
 * @access Public (or authenticated based on your requirements)
 */
const getPlansByOrganization = async (req: Request, res: Response) => {
  try {
    const orgId = Number(req.params.orgId);
    console.log("Query", req.query)
    console.log("params", req.params)
    if (!orgId || isNaN(orgId)) {
      return res.status(400).json({
        success: false,
        message: "Valid orgId is required",
      });
    }

    const plans = await db
      .selectFrom("subscription_plans")
      .selectAll()
      .where("organizationId", "=", orgId)
      .where("active", "=", true)
      .where("deleted", "=", false)
      .orderBy("createdAt", "desc")
      .execute();

    return res.status(200).json({
      success: true,
      message: "Plans fetched successfully",
      data: plans,
    });

  } catch (error: any) {
    console.error("❌ Error fetching plans:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
      error: error.message,
    });
  }
};


/**
 * Get affiliates of the authenticated organization with subscription status
 *
 * Status rules:
 * - "active"   -> Plan link sent AND payment completed (latest subscription is in an active state)
 * - "pending"  -> Plan link sent BUT payment not completed yet (subscription exists but is not active)
 * - "not sent" -> No subscription exists for the affiliate in this organization
 *
 * @route GET /api/subscriptions/organization/affiliates
 * @access Organization only (uses organizationOnly middleware)
 */
const getOrganizationAffiliatesWithStatus = async (req: Request, res: Response) => {
  try {
    const orgId = Number(req.user?.id);

    if (!orgId || isNaN(orgId)) {
      return res.status(400).json({
        success: false,
        message: "Valid organization id is required",
      });
    }

    // Step 1: Fetch all affiliates mapped to this organization
    const affiliates = await db
      .selectFrom("affiliate_organizations as ao")
      .innerJoin("affiliates as a", "a.id", "ao.affiliateId")
      .select([
        "a.id as affiliateId",
        "a.name as affiliateName",
        "a.email as affiliateEmail",
        "a.phone as affiliatePhone",
        "ao.organizationId as organizationId",
      ])
      .where("ao.organizationId", "=", orgId)
      .where("ao.deleted", "=", false)
      .where("a.deleted", "=", false)
      .execute();

    if (!affiliates.length) {
      return res.status(200).json({
        success: true,
        message: "No affiliates found for this organization",
        data: [],
      });
    }

    const affiliateIds = affiliates.map((a) => a.affiliateId);

    // Step 2: Fetch all subscriptions for these affiliates under this organization
    const subscriptions = await db
      .selectFrom("subscriptions")
      .selectAll()
      .where("organization_id", "=", orgId)
      .where("affiliate_id", "in", affiliateIds)
      .orderBy("created_at", "desc")
      .execute();

    // Map latest subscription per affiliate (since we ordered by created_at desc)
    const latestSubscriptionByAffiliate = new Map<number, (typeof subscriptions)[number]>();
    for (const sub of subscriptions) {
      const affiliateId = sub.affiliate_id;
      if (!affiliateId) continue;
      if (!latestSubscriptionByAffiliate.has(affiliateId)) {
        latestSubscriptionByAffiliate.set(affiliateId, sub);
      }
    }

    const ACTIVE_STATUSES = ["active", "completed", "authenticated"];

    const result = affiliates.map((affiliate) => {
      const latestSub = latestSubscriptionByAffiliate.get(affiliate.affiliateId);

      let status: "active" | "pending" | "not sent" = "not sent";

      if (latestSub) {
        const subStatus = (latestSub.status || "").toLowerCase();
        if (ACTIVE_STATUSES.includes(subStatus)) {
          status = "active";
        } else {
          status = "pending";
        }
      }

      return {
        affiliateId: affiliate.affiliateId,
        name: affiliate.affiliateName,
        email: affiliate.affiliateEmail,
        phone: affiliate.affiliatePhone,
        organizationId: affiliate.organizationId,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Affiliates with subscription status fetched successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Error fetching affiliates with subscription status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch affiliates with subscription status",
      error: error.message,
    });
  }
};



/**
 * Send SMS with subscription plan link
 * 
 * When a plan is selected, this endpoint fetches the affiliate's phone number
 * and sends an SMS containing a link to view the plan details.
 * 
 * @route POST /api/subscriptions/send-plan-sms
 * @access Public (or authenticated based on your requirements)
 */
const sendPlanSMS = async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.body;
    const orgId = Number(req.user?.id);

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "affiliateId is required",
      });
    }

    const affiliateIdNum = Number(affiliateId);

    if (isNaN(affiliateIdNum)) {
      return res.status(400).json({
        success: false,
        message: "affiliateId must be a valid number",
      });
    }

    // Fetch affiliate
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["id", "phone", "name"])
      .where("id", "=", affiliateIdNum)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate not found",
      });
    }

    if (!affiliate.phone) {
      return res.status(400).json({
        success: false,
        message: "Affiliate phone number not found",
      });
    }

    // Generate organization plans page link (includes affiliateId for tracking)
    const BASE_URL = process.env.FRONTEND_URL || "https://admin.kibisports.com";
    const planLink = `${BASE_URL}/subscription/org/${orgId}?affiliateId=${affiliateIdNum}`;

    // Send SMS
    const smsSent = await sendPlanLinkSMS(affiliate.phone, planLink);

    if (!smsSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send SMS",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      data: {
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,
        phone: affiliate.phone,
        planLink,
      },
    });

  } catch (error: any) {
    console.error("❌ Error sending plan SMS:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send SMS",
      error: error.message,
    });
  }
};

const createSubscription = async (req: Request, res: Response) => {
  try {
    const {
      plan_id,
      total_count,
      quantity,
      start_at,
      expire_by,
      addons,
      notes,
      customer_notify,
      affiliate_id,
      organization_id: bodyOrganizationId,
    } = req.body;

    // Validation: require plan_id, total_count, and organization_id (from body when no auth middleware)
    if (!plan_id || !total_count) {
      return res.status(400).json({
        success: false,
        message: "plan_id and total_count are required",
      });
    }

    const organizationId = bodyOrganizationId != null ? Number(bodyOrganizationId) : Number(req.user?.id);
    if (!organizationId || isNaN(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required (provide in request body when not using auth)",
      });
    }

    const affiliateIdNum =
      affiliate_id != null && affiliate_id !== "" ? Number(affiliate_id) : null;
    if (affiliateIdNum !== null && isNaN(affiliateIdNum)) {
      return res.status(400).json({
        success: false,
        message: "affiliate_id must be a valid number when provided",
      });
    }

    const subscriptionPayload = {
      plan_id,
      total_count: Number(total_count),
      quantity: quantity || 1,
      customer_notify: customer_notify !== undefined ? customer_notify : true,
      start_at: start_at || undefined,
      expire_by: expire_by || undefined,
      addons: addons || [],
      notes: notes || {},
    };

    console.log("Creating Razorpay Subscription:", JSON.stringify(subscriptionPayload, null, 2));

    const response = await axios.post(
      "https://api.razorpay.com/v1/subscriptions",
      subscriptionPayload,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const subscriptionData = response.data;

    const notesForDb =
      subscriptionData.notes && typeof subscriptionData.notes === "object"
        ? subscriptionData.notes
        : {};

    await db
      .insertInto("subscriptions")
      .values({
        razorpay_subscription_id: subscriptionData.id,
        razorpay_plan_id: subscriptionData.plan_id,
        organization_id: organizationId,
        affiliate_id: affiliateIdNum ?? null,
        status: "created",
        total_count: subscriptionData.total_count ?? Number(total_count),
        remaining_count: subscriptionData.remaining_count ?? null,
        short_url: subscriptionData.short_url ?? null,
        expire_by: subscriptionData.expire_by ?? null,
        notes: notesForDb,
      })
      .execute();

    console.log("✅ Subscription details saved to database successfully:", subscriptionData.id);

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: {
        subscription_id: subscriptionData.id,
        short_url: subscriptionData.short_url,
        status: subscriptionData.status,
        plan_id: subscriptionData.plan_id,
        total_count: subscriptionData.total_count,
        expire_by: subscriptionData.expire_by,
      },
    });
  } catch (error: any) {
    console.error("❌ Razorpay Subscription error:", error.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data?.error?.description || "Subscription creation failed",
        error: error.response.data,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export {
  createPlan,
  getPlansByOrganization,
  getOrganizationAffiliatesWithStatus,
  sendPlanSMS,
  createSubscription,
};


