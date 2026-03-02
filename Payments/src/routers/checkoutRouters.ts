import express from "express";
import{
    placeOrder,
    createOrder,
    generatePaymentSignature,
    webhookHandler,
    handleRazorpayWebhook,
    getWebhookLogs,
    orderStatus,
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
} from "../controllers/checkout/checkoutController";
import { authenticate, organizationOnly } from "../middlewares/auth";

const checkoutRouter = express.Router();


/**
 * @swagger
 * /api/payments/place-order:
 *   post:
 *     summary: Place a new order transaction
 *     description: Creates a new transaction for an event and returns a transaction_id.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             eventId: 101
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Transaction created successfully"
 *               transaction_id: "550e8400-e29b-41d4-a716-446655440000"
 *               event_details:
 *                 id: 101
 *                 name: "Sample Event"
 *       400:
 *         description: Missing eventId
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Event ID is required to place an order."
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Event not found."
 *       500:
 *         description: Transaction creation failed
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Transaction creation failed"
 */
checkoutRouter.post("/place-order", authenticate, placeOrder);

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create an order in Razorpay
 *     description: Creates an order in Razorpay using transaction details.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             transaction_id: "550e8400-e29b-41d4-a716-446655440000"
 *             amount: 500
 *             currency: "INR"
 *             organizationId: "org_001"
 *             eventId: 101
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               order_id: "order_JDfklw93u2"
 *               transaction_id: "550e8400-e29b-41d4-a716-446655440000"
 *               amount: 500
 *               currency: "INR"
 *               notes:
 *                 organizationId: "org_001"
 *                 eventId: 101
 *       400:
 *         description: Missing parameters
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Missing required parameters (transaction_id, amount, currency, organizationId, evenId)"
 *       500:
 *         description: Order creation failed
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Order creation failed"
 */
checkoutRouter.post("/create-order", authenticate, createOrder);

/**
 * @swagger
 * /api/payments/generate-signature:
 *   post:
 *     summary: Generate payment signature
 *     description: Generates a signature to verify payment authenticity.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             razorpay_order_id: "order_JDfklw93u2"
 *             razorpay_payment_id: "pay_29QQoUBi66xm2f"
 *             payment_status: "captured"
 *     responses:
 *       200:
 *         description: Signature generated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               signature: "5d5c5f93c0f5f91f..."
 *       400:
 *         description: Missing parameters
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Missing payment verification parameters"
 *       500:
 *         description: Signature generation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Signature generation error"
 */
checkoutRouter.post("/generate-signature", authenticate, generatePaymentSignature);


/**
 * @swagger
 * /api/payments/order-status/{order_id}:
 *   get:
 *     summary: Get order status
 *     description: Fetches the current payment/order status from Razorpay.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay order ID
 *     responses:
 *       200:
 *         description: Order status fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               order_id: "order_JDfklw93u2"
 *               payment_status: "paid"
 *               fetched_at: "04-10-2025 14:35:22"
 *       400:
 *         description: Missing order ID
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Order ID is required"
 *       500:
 *         description: Failed to fetch order status
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Failed to fetch order status"
 */
checkoutRouter.get("/order-status/:order_id", authenticate, orderStatus);

/**
 * @swagger
 * /api/payments/webhook-handler:
 *   post:
 *     summary: Handle Razorpay Webhook Events
 *     description: Receives webhook events from Razorpay such as payment.captured, transfer.processed, and transfer.failed. Initiates fund transfers and logs events.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: "payment.captured"
 *                 description: Event type triggered by Razorpay
 *               payload:
 *                 type: object
 *                 description: Event payload containing relevant entity data
 *                 properties:
 *                   payment:
 *                     type: object
 *                     properties:
 *                       entity:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "pay_29QQoUBi66xm2f"
 *                           amount:
 *                             type: integer
 *                             example: 50000
 *                             description: Amount in paise
 *                           notes:
 *                             type: object
 *                             properties:
 *                               account_id:
 *                                 type: string
 *                                 example: "acc_123456789"
 *                                 description: Linked organization account ID
 *                   transfer:
 *                     type: object
 *                     properties:
 *                       entity:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "trf_123456789"
 *                           account:
 *                             type: string
 *                             example: "acc_987654321"
 *                           failure_reason:
 *                             type: string
 *                             example: "Insufficient balance"
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Webhook processed successfully"
 *       400:
 *         description: Bad Request (e.g., missing linked account ID)
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Missing linked account ID in payment notes"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Internal server error while handling webhook"
 *               error: "Error details"
 */
checkoutRouter.post("/webhook-handler",webhookHandler);

// Refund endpoint
checkoutRouter.post("/refund", authenticate, organizationOnly, requestRefund);

// Transaction history endpoints
checkoutRouter.get("/transactions", authenticate, getTransactionHistory);
checkoutRouter.get("/transactions/organization", organizationOnly, getOrganizationTransactions);

// Payment stats
checkoutRouter.get("/stats", organizationOnly, getPaymentStats);

// Payment Reconciliation
checkoutRouter.post("/reconcile", organizationOnly, reconcilePayments);

// Payments by Event
checkoutRouter.get("/event/:eventId", organizationOnly, getPaymentsByEvent);

// Export Payments for Event (CSV)
checkoutRouter.get("/event/:eventId/export", organizationOnly, exportPayments);

// ==================== Webhook Routes ====================

// POST /api/payments/webhook/razorpay — Razorpay webhook handler (NO auth, uses signature verification)
checkoutRouter.post("/webhook/razorpay", handleRazorpayWebhook);

// GET /api/payments/webhook-logs — view recent webhook events (org only)
checkoutRouter.get("/webhook-logs", organizationOnly, getWebhookLogs);

// ==================== Payment Split & Settlement (Round 8) ====================

// POST /api/payments/splits/configure — configure split rules for an event (org only)
checkoutRouter.post("/splits/configure", organizationOnly, configureSplit);

// GET /api/payments/splits/:eventId — get split config for an event (org only)
checkoutRouter.get("/splits/:eventId", organizationOnly, getSplitConfig);

// GET /api/payments/settlements/:eventId — get settlement report for an event (org only)
checkoutRouter.get("/settlements/:eventId", organizationOnly, getSettlementReport);

// ==================== Coupon / Discount System (Round 9) ====================

// POST /api/payments/coupons — create a coupon (org only)
checkoutRouter.post("/coupons", organizationOnly, createCoupon);

// POST /api/payments/coupons/validate — validate a coupon code (auth required)
checkoutRouter.post("/coupons/validate", authenticate, validateCoupon);

// POST /api/payments/coupons/apply — apply coupon to a transaction (auth required)
checkoutRouter.post("/coupons/apply", authenticate, applyCoupon);

// GET /api/payments/coupons — list all coupons for an org (org only)
checkoutRouter.get("/coupons", organizationOnly, getCoupons);

// ==================== Invoice Generation (Round 10) ====================

// POST /api/payments/invoices/generate — generate an invoice (auth required)
checkoutRouter.post("/invoices/generate", authenticate, generateInvoice);

// GET /api/payments/invoices — list org invoices (org only, must come before :invoiceId)
checkoutRouter.get("/invoices", organizationOnly, getOrganizationInvoices);

// GET /api/payments/invoices/:invoiceId — get invoice by ID/number/transaction (auth required)
checkoutRouter.get("/invoices/:invoiceId", authenticate, getInvoice);

// ==================== Subscription Plans (Round 11) ====================

// GET /api/payments/subscriptions/plans — list all active plans (public, no auth)
checkoutRouter.get("/subscriptions/plans", getSubscriptionPlans);

// GET /api/payments/subscriptions/my — get my subscription (auth required)
checkoutRouter.get("/subscriptions/my", authenticate, getMySubscription);

// POST /api/payments/subscriptions/plans — create a subscription plan (org only)
checkoutRouter.post("/subscriptions/plans", organizationOnly, createSubscriptionPlan);

// POST /api/payments/subscriptions/subscribe — subscribe to a plan (auth required)
checkoutRouter.post("/subscriptions/subscribe", authenticate, subscribeToPlan);

// ==================== Payment Receipts (Round 12) ====================

// GET /api/payments/my-receipts — get all receipts for logged-in affiliate (auth required)
checkoutRouter.get("/my-receipts", authenticate, getMyReceipts);

// GET /api/payments/organization-receipts — get all receipts for org's events (org only)
checkoutRouter.get("/organization-receipts", organizationOnly, getOrganizationReceipts);

// GET /api/payments/receipts/:paymentId — generate/get receipt for a payment (auth required)
checkoutRouter.get("/receipts/:paymentId", authenticate, generateReceipt);

export { checkoutRouter };
