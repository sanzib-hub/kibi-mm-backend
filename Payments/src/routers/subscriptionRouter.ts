import express from "express";
import { createPlan, createSubscription, getOrganizationAffiliatesWithStatus, getPlansByOrganization , sendPlanSMS } from "../controllers/subscription/subscriptionController";
import { authenticate, organizationOnly } from "../middlewares/auth.js";

const subscriptionRouter = express.Router();

/**
 * @swagger
 * /api/subscriptions/create-plan:
 *   post:
 *     summary: Create a Razorpay subscription plan
 *     description: Creates a reusable billing template (amount + frequency) for recurring payments.
 *     tags:
 *       - Subscriptions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - period
 *               - interval
 *               - item
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: "monthly"
 *                 description: Billing period
 *               interval:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *                 description: Number of periods between each billing cycle
 *               item:
 *                 type: object
 *                 required:
 *                   - name
 *                   - amount
 *                   - currency
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Premium Plan"
 *                   amount:
 *                     type: number
 *                     example: 2300
 *                     description: Amount in rupees (e.g., 2300 for ₹2300)
 *                   currency:
 *                     type: string
 *                     example: "INR"
 *                     description: 3-letter currency code
 *                   description:
 *                     type: string
 *                     example: "Premium subscription plan"
 *               notes:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   plan_type: "premium"
 *     responses:
 *       201:
 *         description: Plan created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Plan created successfully"
 *               data:
 *                 id: 1
 *                 plan_id: "plan_ABC123"
 *                 entity: "plan"
 *                 interval: 1
 *                 period: "monthly"
 *                 item:
 *                   id: "item_XYZ789"
 *                   active: true
 *                   name: "Premium Plan"
 *                   description: "Premium subscription plan"
 *                   amount: 100000
 *                   currency: "INR"
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Missing required fields: period, interval, and item are required"
 *       500:
 *         description: Plan creation failed
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Plan creation failed"
 */
subscriptionRouter.post("/create-plan", organizationOnly, createPlan);

/**
 * @swagger
 * /api/subscriptions/plans/:affiliateId:
 *   get:
 *     summary: Get subscription plans for an affiliate
 *     description: Retrieves a list of all active subscription plans for the organization that the affiliate belongs to.
 *     tags:
 *       - Subscriptions
 *     parameters:
 *       - in: path
 *         name: affiliateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the affiliate
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Plans retrieved successfully"
 *               data: []
 *       400:
 *         description: Invalid affiliate ID
 *       404:
 *         description: Affiliate not found
 *       500:
 *         description: Failed to retrieve plans
 */
subscriptionRouter.get("/plans/:orgId", authenticate, getPlansByOrganization );

/**
 * @swagger
 * /api/subscriptions/organization/affiliates:
 *   get:
 *     summary: Get all affiliates of an organization with subscription status
 *     description: >
 *       Returns all affiliates mapped to the authenticated organization along with their
 *       subscription status:
 *       - "active"   -> Plan link sent and payment completed
 *       - "pending"  -> Plan link sent but payment not completed yet
 *       - "not sent" -> Plan link has not been sent to the affiliate
 *     tags:
 *       - Subscriptions
 *     responses:
 *       200:
 *         description: Affiliates with subscription status retrieved successfully
 *       400:
 *         description: Invalid organization ID
 *       500:
 *         description: Failed to retrieve affiliates with subscription status
 */
subscriptionRouter.get("/organization/affiliates", organizationOnly, getOrganizationAffiliatesWithStatus);

/**
 * @swagger
 * /api/subscriptions/send-plan-sms:
 *   post:
 *     summary: Send SMS with plan link to affiliate
 *     description: Sends an SMS containing a link to view all subscription plans for the organization. The link uses the organization ID so affiliates can see all plans created by the org.
 *     tags:
 *       - Subscriptions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliateId
 *               - planId
 *             properties:
 *               affiliateId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the affiliate
 *               planId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the selected plan
 *     responses:
 *       200:
 *         description: SMS sent successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "SMS sent successfully"
 *               data:
 *                 affiliateId: 1
 *                 affiliateName: "John Doe"
 *                 planId: 1
 *                 planName: "Premium Plan"
 *                 planLink: "https://admin.kibisports.com/subscription/org/5"
 *       400:
 *         description: Missing required fields or invalid data
 *       404:
 *         description: Affiliate or plan not found
 *       500:
 *         description: Failed to send SMS
 */
subscriptionRouter.post("/send-plan-sms",organizationOnly, sendPlanSMS);
// Subscription routes
subscriptionRouter.post("/create-subscription", authenticate, createSubscription);

export { subscriptionRouter };

