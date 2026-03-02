import express from "express";
import cors from "cors";
import helmet from "helmet";
import { checkoutRouter } from "./routers/checkoutRouters";
// import payoutRouter from "./routers/payoutRouters";
import { routePaymentRouter } from "./routers/routePaymentRouters";
import { mediaRouter } from "./routers/mediarouters";
import { subscriptionRouter } from "./routers/subscriptionRouter";
import { setupSwagger } from "./utils/swagger/payments";


const app = express();

// ==================== Rate Limiting Middleware ====================
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window

app.use((req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, message: "Too many requests, please try again later." });
  }

  entry.count++;
  return next();
});

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'], credentials: true }));
app.use(helmet());
app.use("/api/payments/webhook-handler", express.raw({ type: "application/json", limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));


setupSwagger(app);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KIBI Payments Microservice",
    version: "1.0.0",
    description: "Handles payment flow and payout for KIBI Sports Platform",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use("/api/payments", checkoutRouter);
app.use("/api/routePayment",routePaymentRouter)
app.use("/api/media",mediaRouter)
app.use("/api/subscriptions", subscriptionRouter);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    availableRoutes: [
       "GET / - Service info",
      "GET /health - Health check",

      // Payments Routes
      "POST /api/payments/place-order",
      "POST /api/payments/create-order",
      "POST /api/payments/generate-signature",
      "POST /api/payments/order-status/:order_id",
      "POST /api/payments/webhook-handler",

      // Route Payment Routes
      "POST /api/routePayment/create-stakeholder/:account_id",
      "POST /api/routePayment/:account_id/configure",
      "PATCH /api/routePayment/:account_id/products/:product_id",

      // Subscription Routes
      "POST /api/subscriptions/create-plan",
    ]
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

export default app;
