import { Request, Response } from "express";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "../../database/kysely/databases";
import { sql } from "kysely";
import axios from "axios";
import { recordEventPayment } from "../../utils/paymentRecord/paymentRecord";
//import { triggerAutomaticPayout } from "../payout/payoutController.js";

dotenv.config();

const RAZORPAY_ID_KEY = process.env.RAZORPAY_ID_KEY || "";
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const KIBI_ACCOUNT_ID = process.env.KIBI_ACCOUNT_ID;

if (!RAZORPAY_ID_KEY || !RAZORPAY_SECRET_KEY) {
  throw new Error("Missing Razorpay API credentials in environment variables");
}

if (!KIBI_ACCOUNT_ID) {
  throw new Error("Missing KIBI_ACCOUNT_ID in environment variables");
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const placeOrder = async (req: Request, res: Response) => {
  try {
    const { eventId, affiliate_id, team_id } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required to place an order.",
      });
    }
    if (!affiliate_id) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required to place an order.",
      });
    }

    const event = await db
      .selectFrom("events")
      .select(["id", "name", "organizationId", "type"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Check if event type is team, then team_id is required
    if (event.type === "team" && !team_id) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required for team events.",
      });
    }

    // If team_id is provided, validate it exists and belongs to the event
    if (team_id) {
      const team = await db
        .selectFrom("event_teams")
        .select(["id", "eventId", "captainId"])
        .where("id", "=", Number(team_id))
        .where("eventId", "=", Number(eventId))
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found or does not belong to this event.",
        });
      }
    }

    const existingRegistration = await db
      .selectFrom("affiliate_event_responses")
      .select(["affiliate_id"])
      .where("affiliate_id", "=", affiliate_id)
      .where("event_id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (existingRegistration) {
      return res.status(400).json({
        message: "Affiliate is already registered for this event.",
      });
    }

    const transaction_id = uuidv4();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction_id,
      event_details: {
        id: eventId,
        name: event.name,
      },
      team_id: team_id || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Transaction creation failed",
    });
  }
};

// Create order in Razorpay using Transaction ID
// ---------------------------
const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      transaction_id,
      amount,
      currency,
      organizationId,
      eventId,
      team_id,
      affiliate_id,
    } = req.body;

    if (
      !transaction_id ||
      !amount ||
      !currency ||
      !organizationId ||
      !eventId ||
      !affiliate_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters (transaction_id, amount, currency, organizationId, eventId, affiliate_id)",
      });
    }

    const event = await db
      .selectFrom("events")
      .select(["id", "type"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.type === "team" && (team_id === undefined || team_id === null || team_id === "")) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required for team events.",
      });
    }

    if (team_id) {
      const team = await db
        .selectFrom("event_teams")
        .select(["id", "eventId"])
        .where("id", "=", Number(team_id))
        .where("eventId", "=", Number(eventId))
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found or does not belong to this event.",
        });
      }
    }

    const organization = await db
      .selectFrom("sports_organizations")
      .select(["id", "account_id"])
      .where("id", "=", Number(organizationId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    if (!organization.account_id) {
      return res.status(400).json({
        success: false,
        message: "Organization is not linked to any Razorpay account.",
      });
    }

    const notes: Record<string, any> = {
      organization_id: String(organizationId),
      event_id: String(eventId),
      affiliate_id: String(affiliate_id),
      account_id: String(organization.account_id),
    };

    if (team_id !== undefined && team_id !== null && team_id !== "") {
      notes.team_id = String(team_id);
    }

    const options = {
      amount: Number(amount) * 100,
      currency,
      receipt: transaction_id,
      notes,
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      order_id: order.id,
      transaction_id,
      amount: Number(order.amount) / 100,
      currency: order.currency,
      notes: order.notes,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
};

const generatePaymentSignature = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,   // must come from frontend
      payment_status,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay verification parameters",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      console.error("Razorpay signature mismatch");
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Signature verification error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: "Signature verification error",
    });
  }
};


const orderStatus = async (req: Request, res: Response) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await razorpay.orders.fetch(order_id);

    const fetchedAt = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).replace(/\//g, '-');

    return res.json({
      success: true,
      order_id: order.id,
      payment_status: order.status,
      fetched_at: fetchedAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order status",
    });
  }
};

const webhookHandler = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature using raw body bytes
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    const receivedSignature = req.headers['x-razorpay-signature'] as string;
    if (expectedSignature !== receivedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse body if it arrived as raw buffer
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    const eventType = body.event;
    const payload = body.payload;

    switch (eventType) {
      case "payment.captured": {
        const payment = payload.payment.entity;
        const notes = payment.notes || {};

        // Extract IDs from notes (checking both snake_case and camelCase)
        const affiliateId = notes.affiliate_id ?? notes.affiliateId;
        const eventId = notes.event_id ?? notes.eventId;
        const organizationId = notes.organization_id ?? notes.organizationId;
        const accountId = notes.account_id ?? notes.accountId;
        const teamId = notes.team_id ?? notes.teamId;

        if (!affiliateId || !eventId || !organizationId) {
          return res.status(200).json({
            success: true,
            message: "Webhook received but missing required IDs in notes",
          });
        }

        // Idempotency check: see if payment already recorded
        const existingPayment = await db
          .selectFrom("affiliate_event_responses")
          .select(["affiliate_id", "payment_id", "payment_status"])
          .where("affiliate_id", "=", Number(affiliateId))
          .where("event_id", "=", Number(eventId))
          .executeTakeFirst();

        if (existingPayment && existingPayment.payment_id === payment.id) {
          return res.status(200).json({
            success: true,
            message: "Payment already processed",
          });
        }

        // Record payment in database
        try {
          await recordEventPayment({
            affiliateId: Number(affiliateId),
            eventId: Number(eventId),
            organizationId: Number(organizationId),
            paymentId: payment.id,
            amount: payment.amount,
          });
        } catch (recordError) {
          console.error("Error recording payment:", (recordError as Error).message);
          throw recordError;
        }

        // Update team status if teamId present
        let teamUpdated = false;
        if (teamId) {
          try {
            const updateRes = await db
              .updateTable("event_teams")
              .set({ status: "COMPLETED" })
              .where("id", "=", Number(teamId))
              .where("eventId", "=", Number(eventId))
              .where("deleted", "=", false)
              .executeTakeFirst();

            teamUpdated = Number(updateRes?.numUpdatedRows ?? 0) > 0;
          } catch (teamUpdateError) {
            console.error("Error updating team status:", (teamUpdateError as Error).message);
          }
        }

        // Fallback: activate the affiliate's pending team membership
        if (!teamUpdated && teamId && affiliateId) {
          try {
            await db
              .updateTable("event_team_members")
              .set({ status: "ACTIVE" })
              .where("teamId", "=", Number(teamId))
              .where("affiliateId", "=", Number(affiliateId))
              .where("status", "=", "PENDING")
              .where("deleted", "=", false)
              .executeTakeFirst();
          } catch (memberUpdateError) {
            console.error("Error activating team member:", (memberUpdateError as Error).message);
          }
        }

        // Validate account_id for transfer split
        if (!accountId) {
          // Payment recorded successfully; return 200 even though transfer cannot proceed
          return res.status(200).json({
            success: true,
            message: "Payment recorded but missing account_id for transfer",
          });
        }

        // Calculate transfer split (90% org, 10% KIBI)
        const paymentAmount = payment.amount; // in paise
        const organizationAccountId = accountId;

        const orgShare = Math.floor(paymentAmount * 0.9);
        const kibiShare = paymentAmount - orgShare;

        const transferPayload = {
          transfers: [
            {
              account: organizationAccountId,
              amount: orgShare,
              currency: "INR",
              notes: {
                purpose: "Event registration share",
                payment_id: payment.id,
              },
            },
            {
              account: KIBI_ACCOUNT_ID,
              amount: kibiShare,
              currency: "INR",
              notes: {
                purpose: "KIBI platform fee",
                payment_id: payment.id,
              },
            },
          ],
        };

        const auth = Buffer.from(
          `${RAZORPAY_ID_KEY}:${RAZORPAY_SECRET_KEY}`
        ).toString("base64");

        const url = `https://api.razorpay.com/v1/payments/${payment.id}/transfers`;

        try {
          await axios.post(url, transferPayload, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${auth}`,
            },
          });
        } catch (transferError: any) {
          // Payment was already recorded; return 200 so Razorpay does not retry
          console.error("Error initiating transfers:", transferError.response?.data || transferError.message);
          return res.status(200).json({
            success: true,
            message: "Payment recorded but transfer initiation failed",
          });
        }

        break;
      }

      case "transfer.processed": {
        const transfer = payload.transfer.entity;
        console.log(`Transfer processed: ${transfer.id} to ${transfer.account}`);
        break;
      }

      case "transfer.failed": {
        const transfer = payload.transfer.entity;
        console.error(`Transfer failed: ${transfer.id}, reason: ${transfer.failure_reason}`);
        break;
      }

      case "subscription.charged":
      case "subscription.activated": {
        const subscriptionEntity = payload?.subscription?.entity;
        if (!subscriptionEntity?.id) {
          return res.status(200).json({
            success: true,
            message: "Webhook received but subscription entity missing",
          });
        }
        const razorpaySubscriptionId = subscriptionEntity.id;
        try {
          await db
            .updateTable("subscriptions")
            .set({ status: "active", updated_at: new Date() })
            .where("razorpay_subscription_id", "=", razorpaySubscriptionId)
            .executeTakeFirst();
        } catch (subErr) {
          console.error("Error updating subscription status:", (subErr as Error).message);
          throw subErr;
        }
        break;
      }

      default:
        // Unhandled event type - acknowledge receipt
        break;
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Webhook handler error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while handling webhook",
    });
  }
};

const requestRefund = async (req: Request, res: Response) => {
  try {
    const { payment_id, amount } = req.body;

    if (!payment_id) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid refund amount is required",
      });
    }

    // Validate payment exists in affiliate_event_responses
    const payment = await db
      .selectFrom("affiliate_event_responses")
      .select(["affiliate_id", "event_id", "payment_id", "payment_status", "amount_paid"])
      .where("payment_id", "=", payment_id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.payment_status === "REFUNDED") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been refunded",
      });
    }

    // Call Razorpay refund API
    const refund = await razorpay.payments.refund(payment_id, {
      amount: Number(amount) * 100, // Convert to paise
    });

    // Update payment status in DB
    await db
      .updateTable("affiliate_event_responses")
      .set({ payment_status: "REFUNDED" })
      .where("payment_id", "=", payment_id)
      .where("deleted", "=", false)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Refund initiated successfully",
      data: {
        refund_id: refund.id,
        payment_id,
        amount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Refund error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: "Refund processing failed",
    });
  }
};

const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { affiliateId, eventId, payment_status } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    let query = db
      .selectFrom("affiliate_event_responses as aer")
      .innerJoin("events as e", "e.id", "aer.event_id")
      .select([
        "aer.affiliate_id",
        "aer.event_id",
        "aer.payment_id",
        "aer.order_id",
        "aer.amount_paid",
        "aer.payment_status",
        "aer.payment_time",
        "aer.submitted_at",
        "e.name as event_name",
        "e.organizationId",
        "e.organizationName",
      ])
      .where("aer.deleted", "=", false);

    if (affiliateId) {
      query = query.where("aer.affiliate_id", "=", Number(affiliateId));
    }

    if (eventId) {
      query = query.where("aer.event_id", "=", Number(eventId));
    }

    if (payment_status) {
      query = query.where("aer.payment_status", "=", payment_status as string);
    }

    const transactions = await query
      .orderBy("aer.payment_time", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully",
      count: transactions.length,
      data: transactions,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
    });
  }
};

const getOrganizationTransactions = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    const transactions = await db
      .selectFrom("affiliate_event_responses as aer")
      .innerJoin("events as e", "e.id", "aer.event_id")
      .select([
        "aer.affiliate_id",
        "aer.event_id",
        "aer.payment_id",
        "aer.order_id",
        "aer.amount_paid",
        "aer.payment_status",
        "aer.payment_time",
        "aer.submitted_at",
        "e.name as event_name",
        "e.organizationId",
      ])
      .where("e.organizationId", "=", organizationId)
      .where("aer.deleted", "=", false)
      .where("e.deleted", "=", false)
      .orderBy("aer.payment_time", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Organization transactions fetched successfully",
      count: transactions.length,
      data: transactions,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization transactions",
    });
  }
};

const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const stats = await db
      .selectFrom("affiliate_event_responses as aer")
      .innerJoin("events as e", "e.id", "aer.event_id")
      .select(({ fn }) => [
        fn.count<number>("aer.affiliate_id").as("total_transactions"),
        fn.sum<number>("aer.amount_paid").as("total_amount"),
        fn.count<number>("aer.affiliate_id").filterWhere("aer.payment_status", "=", "COMPLETED").as("success_count"),
        fn.count<number>("aer.affiliate_id").filterWhere("aer.payment_status", "=", "PENDING").as("pending_count"),
        fn.count<number>("aer.affiliate_id").filterWhere("aer.payment_status", "=", "REFUNDED").as("refunded_count"),
      ])
      .where("e.organizationId", "=", organizationId)
      .where("aer.deleted", "=", false)
      .where("e.deleted", "=", false)
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Payment stats fetched successfully",
      data: {
        total_transactions: Number(stats?.total_transactions || 0),
        total_amount: Number(stats?.total_amount || 0),
        success_count: Number(stats?.success_count || 0),
        pending_count: Number(stats?.pending_count || 0),
        refunded_count: Number(stats?.refunded_count || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment stats",
    });
  }
};

/**
 * Reconcile Payments - compare local records with Razorpay, flag mismatches
 */
const reconcilePayments = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.id;
    const { eventId, dateFrom, dateTo } = req.body;

    // Get all local payment records for this organization
    let localPaymentsQuery = (db
      .selectFrom("affiliate_event_responses as aer" as any)
      .innerJoin("events as e" as any, "e.id" as any, "aer.event_id" as any) as any)
      .select([
        "aer.order_id",
        "aer.payment_id",
        "aer.amount_paid",
        "aer.payment_status",
        "aer.payment_time",
        "aer.event_id",
        "aer.affiliate_id",
        "e.name as event_name",
      ])
      .where("e.organizationId" as any, "=", organizationId)
      .where("e.deleted" as any, "=", false)
      .where("aer.deleted" as any, "=", false)
      .where("aer.order_id" as any, "is not", null) as any;

    if (eventId) {
      localPaymentsQuery = localPaymentsQuery.where("aer.event_id" as any, "=", Number(eventId));
    }
    if (dateFrom) {
      localPaymentsQuery = localPaymentsQuery.where("aer.payment_time" as any, ">=", new Date(dateFrom));
    }
    if (dateTo) {
      localPaymentsQuery = localPaymentsQuery.where("aer.payment_time" as any, "<=", new Date(dateTo));
    }

    const localPayments = await localPaymentsQuery.execute();

    const mismatches: any[] = [];
    const matched: any[] = [];
    const errors: any[] = [];

    // For each local payment, verify with Razorpay
    for (const payment of localPayments) {
      try {
        if (!(payment as any).order_id) continue;

        const razorpayOrder = await razorpay.orders.fetch((payment as any).order_id);
        const razorpayAmount = Number(razorpayOrder.amount) / 100;
        const localAmount = Number((payment as any).amount_paid) || 0;
        const razorpayStatus = razorpayOrder.status;

        // Check for mismatches
        const amountMismatch = Math.abs(razorpayAmount - localAmount) > 0.01;
        const statusMismatch =
          (razorpayStatus === "paid" && (payment as any).payment_status !== "captured") ||
          (razorpayStatus !== "paid" && (payment as any).payment_status === "captured");

        if (amountMismatch || statusMismatch) {
          mismatches.push({
            order_id: (payment as any).order_id,
            event_id: (payment as any).event_id,
            event_name: (payment as any).event_name,
            affiliate_id: (payment as any).affiliate_id,
            local_amount: localAmount,
            razorpay_amount: razorpayAmount,
            local_status: (payment as any).payment_status,
            razorpay_status: razorpayStatus,
            amount_mismatch: amountMismatch,
            status_mismatch: statusMismatch,
          });
        } else {
          matched.push({
            order_id: (payment as any).order_id,
            amount: localAmount,
            status: (payment as any).payment_status,
          });
        }
      } catch (err: any) {
        errors.push({
          order_id: (payment as any).order_id,
          error: err.message || "Failed to fetch from Razorpay",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment reconciliation completed",
      data: {
        totalProcessed: localPayments.length,
        matched: matched.length,
        mismatches: mismatches.length,
        errors: errors.length,
        mismatchDetails: mismatches,
        errorDetails: errors,
      },
    });
  } catch (error) {
    console.error("Reconcile payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get Payments By Event - detailed payment breakdown per event
 */
const getPaymentsByEvent = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.id;
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    if (!eventId || isNaN(Number(eventId))) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId is required",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id", "name", "organizationId", "participationFee"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this event's payments",
      });
    }

    // Get payments for this event
    const payments = await (db
      .selectFrom("affiliate_event_responses as aer" as any)
      .innerJoin("affiliates as a" as any, "a.id" as any, "aer.affiliate_id" as any) as any)
      .select([
        "aer.affiliate_id",
        "a.name as affiliate_name",
        "a.email as affiliate_email",
        "a.phone as affiliate_phone",
        "aer.payment_id",
        "aer.order_id",
        "aer.amount_paid",
        "aer.payment_status",
        "aer.payment_time",
        "aer.submitted_at",
      ])
      .where("aer.event_id", "=", Number(eventId))
      .where("aer.deleted", "=", false)
      .orderBy("aer.payment_time", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    // Count total and sum
    const statsResult = await (db
      .selectFrom("affiliate_event_responses as aer" as any) as any)
      .select([
        db.fn.countAll().as("total"),
        db.fn.sum("aer.amount_paid" as any).as("total_amount"),
      ])
      .where("aer.event_id" as any, "=", Number(eventId))
      .where("aer.deleted" as any, "=", false)
      .where("aer.payment_status" as any, "=", "captured")
      .executeTakeFirst();

    const total = Number((statsResult as any)?.total) || 0;
    const totalAmount = parseFloat((statsResult as any)?.total_amount) || 0;

    // Count all registrations for pagination
    const countResult = await db
      .selectFrom("affiliate_event_responses as aer" as any)
      .select(db.fn.countAll().as("count"))
      .where("aer.event_id" as any, "=", Number(eventId))
      .where("aer.deleted" as any, "=", false)
      .executeTakeFirst();

    const totalRecords = Number((countResult as any)?.count) || 0;

    return res.status(200).json({
      success: true,
      message: "Event payments retrieved successfully",
      data: {
        event: {
          id: event.id,
          name: event.name,
          participationFee: event.participationFee,
        },
        payments,
        summary: {
          totalPaidRegistrations: total,
          totalAmount,
        },
      },
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Get payments by event error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Export Payments for an Event (CSV-format data)
 */
const exportPayments = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.id;
    const { eventId } = req.params;

    if (!eventId || isNaN(Number(eventId))) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId is required",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id", "name", "organizationId"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this event's payments",
      });
    }

    // Get all payments for this event
    const payments = await (db
      .selectFrom("affiliate_event_responses as aer" as any)
      .innerJoin("affiliates as a" as any, "a.id" as any, "aer.affiliate_id" as any) as any)
      .select([
        "aer.affiliate_id",
        "a.name as affiliate_name",
        "a.email as affiliate_email",
        "a.phone as affiliate_phone",
        "aer.payment_id",
        "aer.order_id",
        "aer.amount_paid",
        "aer.payment_status",
        "aer.payment_time",
        "aer.submitted_at",
        "aer.status as registration_status",
      ])
      .where("aer.event_id", "=", Number(eventId))
      .where("aer.deleted", "=", false)
      .orderBy("aer.payment_time", "desc")
      .execute();

    // Build CSV
    const csvHeaders = [
      "Affiliate ID",
      "Name",
      "Email",
      "Phone",
      "Payment ID",
      "Order ID",
      "Amount Paid",
      "Payment Status",
      "Payment Time",
      "Registration Date",
      "Registration Status",
    ].join(",");

    const csvRows = payments.map((p: any) =>
      [
        p.affiliate_id,
        `"${(p.affiliate_name || "").replace(/"/g, '""')}"`,
        `"${(p.affiliate_email || "").replace(/"/g, '""')}"`,
        `"${(p.affiliate_phone || "").replace(/"/g, '""')}"`,
        `"${p.payment_id || ""}"`,
        `"${p.order_id || ""}"`,
        p.amount_paid || 0,
        `"${p.payment_status || ""}"`,
        p.payment_time ? new Date(p.payment_time).toISOString() : "",
        p.submitted_at ? new Date(p.submitted_at).toISOString() : "",
        `"${p.registration_status || ""}"`,
      ].join(",")
    );

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payments-event-${eventId}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Handle Razorpay webhook events with logging
 * POST /api/payments/webhook/razorpay
 */
const handleRazorpayWebhook = async (req: Request, res: Response) => {
  let logId: string | null = null;

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));
    const receivedSignature = req.headers["x-razorpay-signature"] as string;
    const body = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString())
      : req.body;
    const eventType = body.event || "unknown";

    // Log the webhook event
    try {
      const logEntry = await db
        .insertInto("webhook_logs" as any)
        .values({
          source: "razorpay",
          event_type: eventType,
          payload: JSON.stringify(body),
          signature: receivedSignature || null,
          verified: false,
          processed: false,
        } as any)
        .returning(["id" as any])
        .executeTakeFirst();
      logId = (logEntry as any)?.id || null;
    } catch (logError) {
      console.error("Failed to log webhook:", logError);
    }

    // Verify signature
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      if (logId) {
        await db
          .updateTable("webhook_logs" as any)
          .set({ error: "Webhook secret not configured" })
          .where("id", "=", logId)
          .execute()
          .catch(() => {});
      }
      return res
        .status(500)
        .json({ success: false, message: "Webhook secret not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const signatureValid = expectedSignature === receivedSignature;

    if (logId) {
      await db
        .updateTable("webhook_logs" as any)
        .set({ verified: signatureValid })
        .where("id", "=", logId)
        .execute()
        .catch(() => {});
    }

    if (!signatureValid) {
      console.error("Invalid webhook signature");
      if (logId) {
        await db
          .updateTable("webhook_logs" as any)
          .set({ error: "Invalid signature" })
          .where("id", "=", logId)
          .execute()
          .catch(() => {});
      }
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    // Process the event
    const payload = body.payload;

    switch (eventType) {
      case "payment.captured": {
        const payment = payload?.payment?.entity;
        if (payment) {
          const notes = payment.notes || {};
          const affiliateId = notes.affiliate_id ?? notes.affiliateId;
          const eventId = notes.event_id ?? notes.eventId;
          const organizationId = notes.organization_id ?? notes.organizationId;

          if (affiliateId && eventId && organizationId) {
            try {
              await recordEventPayment({
                affiliateId: Number(affiliateId),
                eventId: Number(eventId),
                organizationId: Number(organizationId),
                paymentId: payment.id,
                amount: payment.amount,
              });
            } catch (recordError) {
              console.error(
                "Error recording payment:",
                (recordError as Error).message
              );
            }
          }
        }
        break;
      }
      case "payment.failed": {
        const failedPayment = payload?.payment?.entity;
        if (failedPayment) {
          console.log(
            `Payment failed: ${failedPayment.id}, reason: ${failedPayment.error_description || "unknown"}`
          );
        }
        break;
      }
      case "refund.processed": {
        const refund = payload?.refund?.entity;
        if (refund) {
          console.log(
            `Refund processed: ${refund.id}, amount: ${refund.amount}, payment_id: ${refund.payment_id}`
          );
        }
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    // Mark as processed
    if (logId) {
      await db
        .updateTable("webhook_logs" as any)
        .set({ processed: true })
        .where("id", "=", logId)
        .execute()
        .catch(() => {});
    }

    return res
      .status(200)
      .json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    if (logId) {
      await db
        .updateTable("webhook_logs" as any)
        .set({ error: (error as Error).message, processed: false })
        .where("id", "=", logId)
        .execute()
        .catch(() => {});
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error while handling webhook",
    });
  }
};

/**
 * Get recent webhook logs (admin/org only)
 * GET /api/payments/webhook-logs
 */
const getWebhookLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const source = req.query.source as string;
    const eventType = req.query.eventType as string;

    let query = db
      .selectFrom("webhook_logs" as any)
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    if (source) {
      query = query.where("source", "=", source);
    }
    if (eventType) {
      query = query.where("event_type", "=", eventType);
    }

    const logs = await query.execute();

    const countResult = await db
      .selectFrom("webhook_logs" as any)
      .select(sql`COUNT(*)`.as("total"))
      .executeTakeFirst();

    const total = Number((countResult as any)?.total || 0);

    return res.status(200).json({
      success: true,
      message: "Webhook logs fetched successfully",
      count: logs.length,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get webhook logs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== Round 8: Payment Split & Settlement ====================

/**
 * Configure payment split rules for an event (platform_percentage, organization_percentage).
 */
const configureSplit = async (req: Request, res: Response) => {
  try {
    const { event_id, platform_percentage, organization_percentage } = req.body;

    if (!event_id) {
      return res.status(400).json({
        success: false,
        message: "event_id is required.",
      });
    }

    const platformPct = Number(platform_percentage);
    const orgPct = Number(organization_percentage);

    if (isNaN(platformPct) || isNaN(orgPct)) {
      return res.status(400).json({
        success: false,
        message: "platform_percentage and organization_percentage must be valid numbers.",
      });
    }

    if (platformPct < 0 || orgPct < 0) {
      return res.status(400).json({
        success: false,
        message: "Percentages cannot be negative.",
      });
    }

    const totalPct = Math.round((platformPct + orgPct) * 100) / 100;
    if (totalPct !== 100) {
      return res.status(400).json({
        success: false,
        message: `Percentages must add up to 100. Current total: ${totalPct}`,
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select("id")
      .where("id", "=", Number(event_id))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Upsert: insert or update on conflict
    const result = await sql`
      INSERT INTO payment_splits (event_id, platform_percentage, organization_percentage)
      VALUES (${Number(event_id)}, ${platformPct}, ${orgPct})
      ON CONFLICT (event_id)
      DO UPDATE SET
        platform_percentage = EXCLUDED.platform_percentage,
        organization_percentage = EXCLUDED.organization_percentage
      RETURNING *
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Payment split configured successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Configure split error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get split configuration for an event.
 */
const getSplitConfig = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const result = await sql`
      SELECT * FROM payment_splits WHERE event_id = ${eventId}
    `.execute(db);

    if (result.rows.length === 0) {
      // Return default split
      return res.status(200).json({
        success: true,
        message: "No custom split configured. Returning defaults.",
        data: {
          event_id: eventId,
          platform_percentage: 5.0,
          organization_percentage: 95.0,
          is_default: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Split configuration fetched successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Get split config error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Return settlement report: total collected, platform share, org share,
 * pending settlements, completed settlements for an event.
 */
const getSettlementReport = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id", "name"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Get split config (or defaults)
    const splitResult = await sql`
      SELECT * FROM payment_splits WHERE event_id = ${eventId}
    `.execute(db);

    const platformPct = splitResult.rows.length > 0
      ? Number((splitResult.rows[0] as any).platform_percentage)
      : 5.0;
    const orgPct = splitResult.rows.length > 0
      ? Number((splitResult.rows[0] as any).organization_percentage)
      : 95.0;

    // Get total collected from affiliate_event_responses (payments)
    const paymentsResult = await sql`
      SELECT
        COALESCE(SUM(aer.amount_paid), 0)::numeric as total_collected,
        COUNT(*)::int as total_transactions,
        COUNT(CASE WHEN aer.payment_status = 'COMPLETED' THEN 1 END)::int as completed_payments,
        COUNT(CASE WHEN aer.payment_status = 'PENDING' THEN 1 END)::int as pending_payments,
        COALESCE(SUM(CASE WHEN aer.payment_status = 'COMPLETED' THEN aer.amount_paid ELSE 0 END), 0)::numeric as completed_amount,
        COALESCE(SUM(CASE WHEN aer.payment_status = 'PENDING' THEN aer.amount_paid ELSE 0 END), 0)::numeric as pending_amount
      FROM affiliate_event_responses aer
      WHERE aer.event_id = ${eventId} AND aer.deleted = false
    `.execute(db);

    const paymentData = paymentsResult.rows[0] as any;
    const totalCollected = parseFloat(paymentData?.total_collected) || 0;
    const completedAmount = parseFloat(paymentData?.completed_amount) || 0;
    const pendingAmount = parseFloat(paymentData?.pending_amount) || 0;

    const platformShare = Math.round((totalCollected * platformPct / 100) * 100) / 100;
    const orgShare = Math.round((totalCollected * orgPct / 100) * 100) / 100;

    const platformSettled = Math.round((completedAmount * platformPct / 100) * 100) / 100;
    const orgSettled = Math.round((completedAmount * orgPct / 100) * 100) / 100;

    const platformPending = Math.round((pendingAmount * platformPct / 100) * 100) / 100;
    const orgPending = Math.round((pendingAmount * orgPct / 100) * 100) / 100;

    return res.status(200).json({
      success: true,
      message: "Settlement report generated successfully.",
      data: {
        eventId,
        eventName: event.name,
        splitConfig: {
          platformPercentage: platformPct,
          organizationPercentage: orgPct,
        },
        totals: {
          totalCollected,
          totalTransactions: paymentData?.total_transactions || 0,
          completedPayments: paymentData?.completed_payments || 0,
          pendingPayments: paymentData?.pending_payments || 0,
        },
        settlement: {
          platformShare,
          organizationShare: orgShare,
          platformSettled,
          organizationSettled: orgSettled,
          platformPending,
          organizationPending: orgPending,
        },
        completedAmount,
        pendingAmount,
      },
    });
  } catch (error: any) {
    console.error("Get settlement report error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Payment Coupon/Discount System (Round 9) ====================

/**
 * Create a discount coupon
 */
const createCoupon = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const {
      code,
      discount_type,
      discount_value,
      max_uses,
      valid_from,
      valid_until,
      applicable_event_ids,
    } = req.body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required.",
      });
    }

    const validTypes = ["percentage", "flat"];
    if (!discount_type || !validTypes.includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: "discount_type must be 'percentage' or 'flat'.",
      });
    }

    if (discount_value === undefined || discount_value === null || Number(discount_value) <= 0) {
      return res.status(400).json({
        success: false,
        message: "discount_value must be greater than 0.",
      });
    }

    if (discount_type === "percentage" && Number(discount_value) > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100.",
      });
    }

    // Check if code is already in use
    const existing = await sql`
      SELECT id FROM payment_coupons WHERE UPPER(code) = UPPER(${code.trim()})
    `.execute(db);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists.",
      });
    }

    const eventIdsJson = applicable_event_ids
      ? JSON.stringify(applicable_event_ids)
      : null;

    const result = await sql`
      INSERT INTO payment_coupons (
        organization_id, code, discount_type, discount_value,
        max_uses, valid_from, valid_until, applicable_event_ids, is_active
      )
      VALUES (
        ${organizationId},
        ${code.trim().toUpperCase()},
        ${discount_type},
        ${Number(discount_value)},
        ${max_uses ? Number(max_uses) : 0},
        ${valid_from || sql`NOW()`},
        ${valid_until || null},
        ${eventIdsJson}::jsonb,
        true
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create coupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Validate a coupon code
 */
const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, event_id } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required.",
      });
    }

    const coupon = await sql`
      SELECT * FROM payment_coupons
      WHERE UPPER(code) = UPPER(${code.trim()}) AND is_active = true
    `.execute(db);

    if (coupon.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or is inactive.",
      });
    }

    const couponData = coupon.rows[0] as any;

    // Check expiry
    if (couponData.valid_until && new Date(couponData.valid_until) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired.",
      });
    }

    // Check valid_from
    if (couponData.valid_from && new Date(couponData.valid_from) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not yet active.",
      });
    }

    // Check usage count
    if (couponData.max_uses > 0 && couponData.current_uses >= couponData.max_uses) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached.",
      });
    }

    // Check event applicability
    if (event_id && couponData.applicable_event_ids) {
      const applicableIds = couponData.applicable_event_ids;
      if (Array.isArray(applicableIds) && applicableIds.length > 0) {
        if (!applicableIds.includes(Number(event_id))) {
          return res.status(400).json({
            success: false,
            message: "Coupon is not applicable to this event.",
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Coupon is valid.",
      data: {
        id: couponData.id,
        code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: couponData.discount_value,
        remaining_uses: couponData.max_uses > 0 ? couponData.max_uses - couponData.current_uses : null,
      },
    });
  } catch (error: any) {
    console.error("Validate coupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Apply coupon to a transaction
 */
const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { code, transaction_id, original_amount } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required.",
      });
    }

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required.",
      });
    }

    if (!original_amount || Number(original_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid original_amount is required.",
      });
    }

    // Find and validate coupon
    const coupon = await sql`
      SELECT * FROM payment_coupons
      WHERE UPPER(code) = UPPER(${code.trim()}) AND is_active = true
    `.execute(db);

    if (coupon.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or is inactive.",
      });
    }

    const couponData = coupon.rows[0] as any;

    // Check expiry
    if (couponData.valid_until && new Date(couponData.valid_until) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired.",
      });
    }

    // Check valid_from
    if (couponData.valid_from && new Date(couponData.valid_from) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not yet active.",
      });
    }

    // Check usage count
    if (couponData.max_uses > 0 && couponData.current_uses >= couponData.max_uses) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached.",
      });
    }

    // Calculate discount
    const amount = Number(original_amount);
    let discountAmount = 0;

    if (couponData.discount_type === "percentage") {
      discountAmount = Math.round((amount * Number(couponData.discount_value) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(Number(couponData.discount_value), amount);
    }

    const finalAmount = Math.max(amount - discountAmount, 0);

    // Increment coupon usage
    await sql`
      UPDATE payment_coupons
      SET current_uses = current_uses + 1
      WHERE id = ${couponData.id}
    `.execute(db);

    // Update transaction amount (if the transactions table has an amount field)
    await sql`
      UPDATE transactions
      SET amount = ${finalAmount},
          notes = COALESCE(notes, '') || ' | Coupon ' || ${couponData.code} || ' applied: -' || ${discountAmount}::text
      WHERE transaction_id = ${transaction_id}
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      data: {
        coupon_code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: Number(couponData.discount_value),
        original_amount: amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        transaction_id,
      },
    });
  } catch (error: any) {
    console.error("Apply coupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all coupons for an organization with usage stats
 */
const getCoupons = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const coupons = await sql`
      SELECT *,
        CASE
          WHEN max_uses > 0 THEN max_uses - current_uses
          ELSE NULL
        END as remaining_uses,
        CASE
          WHEN is_active = false THEN 'inactive'
          WHEN valid_until IS NOT NULL AND valid_until < NOW() THEN 'expired'
          WHEN valid_from IS NOT NULL AND valid_from > NOW() THEN 'scheduled'
          WHEN max_uses > 0 AND current_uses >= max_uses THEN 'exhausted'
          ELSE 'active'
        END as computed_status
      FROM payment_coupons
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully.",
      data: coupons.rows,
    });
  } catch (error: any) {
    console.error("Get coupons error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Round 10: Payment Invoice Generation ====================

/**
 * Generate invoice data for a completed payment.
 * Auto-generates invoice number, stores payer details, event details, amount breakdown.
 */
const generateInvoice = async (req: Request, res: Response) => {
  try {
    const userId = Number(req?.user?.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const {
      transaction_id,
      payer_id,
      payer_name,
      payer_email,
      organization_id,
      event_id,
      event_name,
      subtotal,
      discount,
      tax,
      total,
      payment_method,
      payment_status,
      razorpay_payment_id,
      razorpay_order_id,
    } = req.body;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: "transaction_id is required.",
      });
    }

    if (subtotal === undefined || total === undefined) {
      return res.status(400).json({
        success: false,
        message: "subtotal and total are required.",
      });
    }

    // Check for existing invoice with this transaction_id
    const existingInvoice = await sql`
      SELECT id, invoice_number FROM payment_invoices WHERE transaction_id = ${transaction_id}
    `.execute(db);

    if (existingInvoice.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice already exists for this transaction.",
        data: existingInvoice.rows[0],
      });
    }

    // Auto-generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${datePart}-${randomPart}`;

    const result = await sql`
      INSERT INTO payment_invoices (
        invoice_number, transaction_id, payer_id, payer_name, payer_email,
        organization_id, event_id, event_name, subtotal, discount, tax, total,
        payment_method, payment_status, razorpay_payment_id, razorpay_order_id
      ) VALUES (
        ${invoiceNumber},
        ${transaction_id},
        ${payer_id ? Number(payer_id) : null},
        ${payer_name || null},
        ${payer_email || null},
        ${organization_id ? Number(organization_id) : null},
        ${event_id ? Number(event_id) : null},
        ${event_name || null},
        ${Number(subtotal)},
        ${discount ? Number(discount) : 0},
        ${tax ? Number(tax) : 0},
        ${Number(total)},
        ${payment_method || null},
        ${payment_status || "COMPLETED"},
        ${razorpay_payment_id || null},
        ${razorpay_order_id || null}
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Invoice generated successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Generate invoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get invoice by ID or transaction ID.
 */
const getInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.invoiceId;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required.",
      });
    }

    // Try by numeric ID first, then by invoice_number, then by transaction_id
    let invoice;
    const numericId = Number(invoiceId);

    if (!isNaN(numericId)) {
      invoice = await sql`
        SELECT * FROM payment_invoices WHERE id = ${numericId}
      `.execute(db);
    }

    if (!invoice || invoice.rows.length === 0) {
      invoice = await sql`
        SELECT * FROM payment_invoices WHERE invoice_number = ${invoiceId} OR transaction_id = ${invoiceId}
      `.execute(db);
    }

    if (!invoice || invoice.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice fetched successfully.",
      data: invoice.rows[0],
    });
  } catch (error: any) {
    console.error("Get invoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * List all invoices for an organization with filters (date range, status).
 */
const getOrganizationInvoices = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let invoices;
    if (status && startDate && endDate) {
      invoices = await sql`
        SELECT * FROM payment_invoices
        WHERE organization_id = ${organizationId}
          AND payment_status = ${status}
          AND created_at >= ${startDate}::timestamp
          AND created_at <= ${endDate}::timestamp
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);
    } else if (status) {
      invoices = await sql`
        SELECT * FROM payment_invoices
        WHERE organization_id = ${organizationId}
          AND payment_status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);
    } else if (startDate && endDate) {
      invoices = await sql`
        SELECT * FROM payment_invoices
        WHERE organization_id = ${organizationId}
          AND created_at >= ${startDate}::timestamp
          AND created_at <= ${endDate}::timestamp
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);
    } else {
      invoices = await sql`
        SELECT * FROM payment_invoices
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.execute(db);
    }

    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM payment_invoices WHERE organization_id = ${organizationId}
    `.execute(db);

    const total = Number((countResult.rows[0] as any)?.total || 0);

    // Summary stats
    const stats = await sql`
      SELECT
        COUNT(*)::int as total_invoices,
        COALESCE(SUM(total), 0)::numeric as total_revenue,
        COALESCE(SUM(discount), 0)::numeric as total_discounts,
        COALESCE(SUM(tax), 0)::numeric as total_tax
      FROM payment_invoices
      WHERE organization_id = ${organizationId}
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully.",
      data: invoices.rows,
      summary: stats.rows[0],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get organization invoices error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Subscription Plans (Round 11) ====================

/**
 * Create a subscription plan (org only)
 */
const createSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { name, description, price, billing_cycle, features } = req.body;

    if (!name || !price || !billing_cycle) {
      return res.status(400).json({
        success: false,
        message: "name, price, and billing_cycle are required.",
      });
    }

    const validCycles = ['monthly', 'quarterly', 'yearly'];
    if (!validCycles.includes(billing_cycle)) {
      return res.status(400).json({
        success: false,
        message: `Invalid billing_cycle. Must be one of: ${validCycles.join(', ')}`,
      });
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number.",
      });
    }

    const featuresJson = features ? JSON.stringify(features) : null;

    const result = await sql`
      INSERT INTO subscription_plans (name, description, price, billing_cycle, features, is_active, created_at)
      VALUES (${name}, ${description || null}, ${Number(price)}, ${billing_cycle}, ${featuresJson ? sql`${featuresJson}::jsonb` : sql`NULL`}, true, NOW())
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Subscription plan created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create subscription plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * List all active subscription plans (public, no auth)
 */
const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const plans = await sql`
      SELECT * FROM subscription_plans
      WHERE is_active = true
      ORDER BY price ASC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Subscription plans fetched successfully.",
      data: plans.rows,
    });
  } catch (error: any) {
    console.error("Get subscription plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Affiliate subscribes to a plan (auth required)
 */
const subscribeToPlan = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req?.user?.id);
    const { plan_id } = req.body;

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: "plan_id is required.",
      });
    }

    // Verify plan exists and is active
    const plan = await sql`
      SELECT * FROM subscription_plans WHERE id = ${Number(plan_id)} AND is_active = true
    `.execute(db);

    if (plan.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found or inactive.",
      });
    }

    const planRow = plan.rows[0] as any;

    // Check if user already has an active subscription
    const existing = await sql`
      SELECT * FROM affiliate_subscriptions
      WHERE affiliate_id = ${affiliateId} AND status = 'ACTIVE'
    `.execute(db);

    if (existing.rows.length > 0) {
      // Cancel the old subscription before creating a new one
      await sql`
        UPDATE affiliate_subscriptions
        SET status = 'CANCELLED', cancelled_at = NOW()
        WHERE affiliate_id = ${affiliateId} AND status = 'ACTIVE'
      `.execute(db);
    }

    // Calculate renewal date based on billing cycle
    let renewalInterval = '1 month';
    if (planRow.billing_cycle === 'quarterly') {
      renewalInterval = '3 months';
    } else if (planRow.billing_cycle === 'yearly') {
      renewalInterval = '1 year';
    }

    const result = await sql`
      INSERT INTO affiliate_subscriptions (affiliate_id, plan_id, status, started_at, renewal_date)
      VALUES (${affiliateId}, ${Number(plan_id)}, 'ACTIVE', NOW(), NOW() + ${sql.raw(`INTERVAL '${renewalInterval}'`)})
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully.",
      data: {
        subscription: result.rows[0],
        plan: planRow,
      },
    });
  } catch (error: any) {
    console.error("Subscribe to plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get the authenticated user's active subscription (auth required)
 */
const getMySubscription = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req?.user?.id);

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await sql`
      SELECT asub.*, sp.name as plan_name, sp.description as plan_description,
             sp.price, sp.billing_cycle, sp.features
      FROM affiliate_subscriptions asub
      INNER JOIN subscription_plans sp ON sp.id = asub.plan_id
      WHERE asub.affiliate_id = ${affiliateId}
      ORDER BY asub.started_at DESC
      LIMIT 1
    `.execute(db);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subscription found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription fetched successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Get my subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== PAYMENT RECEIPTS (Round 12) ====================

/**
 * Generate a receipt for a specific payment
 * GET /api/payments/receipts/:paymentId
 * paymentId here is the payment_id (Razorpay payment ID) from affiliate_event_responses
 */
const generateReceipt = async (req: Request, res: Response) => {
  try {
    const paymentId = req.params.paymentId;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Query payment details with event and affiliate info
    // affiliate_event_responses uses composite PK (affiliate_id, event_id)
    const receipt = await sql`
      SELECT
        aer.affiliate_id,
        aer.event_id,
        aer.payment_id,
        aer.order_id,
        aer.amount_paid,
        aer.payment_status,
        aer.payment_time,
        aer.submitted_at,
        e.name as event_name,
        e."startDate" as event_start_date,
        e."endDate" as event_end_date,
        a.name as affiliate_name,
        a.email as affiliate_email,
        a.phone as affiliate_phone,
        so.name as organization_name,
        so.email as organization_email
      FROM affiliate_event_responses aer
      LEFT JOIN events e ON e.id = aer.event_id
      LEFT JOIN affiliates a ON a.id = aer.affiliate_id
      LEFT JOIN sports_organizations so ON so.id = e."organizationId"
      WHERE aer.payment_id = ${paymentId}
        AND aer.deleted = false
    `.execute(db);

    if (receipt.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = receipt.rows[0] as any;

    // Generate a receipt number from the payment_id
    const receiptNumber = `KIBI-REC-${payment.payment_id || `${payment.affiliate_id}-${payment.event_id}`}`;

    return res.status(200).json({
      success: true,
      message: "Receipt generated successfully",
      data: {
        receiptNumber,
        paymentId: payment.payment_id,
        orderId: payment.order_id,
        date: payment.payment_time || payment.submitted_at,
        amount: payment.amount_paid,
        paymentStatus: payment.payment_status,
        event: {
          id: payment.event_id,
          name: payment.event_name,
          startDate: payment.event_start_date,
          endDate: payment.event_end_date,
        },
        affiliate: {
          id: payment.affiliate_id,
          name: payment.affiliate_name,
          email: payment.affiliate_email,
          phone: payment.affiliate_phone,
        },
        organization: {
          name: payment.organization_name,
          email: payment.organization_email,
        },
      },
    });
  } catch (error) {
    console.error("Generate receipt error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all receipts for the logged-in affiliate
 * GET /api/payments/my-receipts
 */
const getMyReceipts = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req.user?.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
    }

    const receipts = await sql`
      SELECT
        aer.affiliate_id,
        aer.event_id,
        aer.payment_id,
        aer.order_id,
        aer.amount_paid,
        aer.payment_status,
        aer.payment_time,
        aer.submitted_at,
        CONCAT('KIBI-REC-', COALESCE(aer.payment_id, aer.affiliate_id::text || '-' || aer.event_id::text)) as receipt_number,
        e.name as event_name
      FROM affiliate_event_responses aer
      LEFT JOIN events e ON e.id = aer.event_id
      WHERE aer.affiliate_id = ${affiliateId}
        AND aer.payment_status = 'SUCCESS'
        AND aer.deleted = false
      ORDER BY aer.payment_time DESC NULLS LAST, aer.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(*)::int as total
      FROM affiliate_event_responses
      WHERE affiliate_id = ${affiliateId}
        AND payment_status = 'SUCCESS'
        AND deleted = false
    `.execute(db);
    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Receipts retrieved successfully",
      data: receipts.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get my receipts error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all receipts for an organization's events
 * GET /api/payments/organization-receipts
 */
const getOrganizationReceipts = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.user?.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const eventId = req.query.eventId ? Number(req.query.eventId) : null;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    let whereClause = sql`
      e."organizationId" = ${organizationId}
      AND aer.payment_status = 'SUCCESS'
      AND aer.deleted = false
    `;

    if (eventId) {
      whereClause = sql`${whereClause} AND aer.event_id = ${eventId}`;
    }

    if (dateFrom) {
      whereClause = sql`${whereClause} AND aer.payment_time >= ${dateFrom}::timestamp`;
    }

    if (dateTo) {
      whereClause = sql`${whereClause} AND aer.payment_time <= ${dateTo}::timestamp`;
    }

    const receipts = await sql`
      SELECT
        aer.affiliate_id,
        aer.event_id,
        aer.payment_id,
        aer.order_id,
        aer.amount_paid,
        aer.payment_status,
        aer.payment_time,
        aer.submitted_at,
        CONCAT('KIBI-REC-', COALESCE(aer.payment_id, aer.affiliate_id::text || '-' || aer.event_id::text)) as receipt_number,
        e.name as event_name,
        a.name as affiliate_name,
        a.email as affiliate_email,
        a.phone as affiliate_phone
      FROM affiliate_event_responses aer
      LEFT JOIN events e ON e.id = aer.event_id
      LEFT JOIN affiliates a ON a.id = aer.affiliate_id
      WHERE ${whereClause}
      ORDER BY aer.payment_time DESC NULLS LAST, aer.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(*)::int as total
      FROM affiliate_event_responses aer
      LEFT JOIN events e ON e.id = aer.event_id
      WHERE ${whereClause}
    `.execute(db);
    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Organization receipts retrieved successfully",
      data: receipts.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get organization receipts error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  placeOrder,
  createOrder,
  generatePaymentSignature,
  orderStatus,
  webhookHandler,
  handleRazorpayWebhook,
  getWebhookLogs,
  requestRefund,
  getTransactionHistory,
  getOrganizationTransactions,
  getPaymentStats,
  reconcilePayments,
  getPaymentsByEvent,
  exportPayments,
  configureSplit,
  getSplitConfig,
  getSettlementReport,
  createCoupon,
  validateCoupon,
  applyCoupon,
  getCoupons,
  generateInvoice,
  getInvoice,
  getOrganizationInvoices,
  createSubscriptionPlan,
  getSubscriptionPlans,
  subscribeToPlan,
  getMySubscription,
  generateReceipt,
  getMyReceipts,
  getOrganizationReceipts,
};
