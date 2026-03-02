import express from "express";
import cors from "cors";
import helmet from "helmet";
import { superAdminRouter } from "./routers/superAdminRouter.js";
import { organizationRouter } from "./routers/organizationRouter.js";
import { affiliateRouter } from "./routers/affiliateRouter.js";
import communityRouter from "./routers/communityRouter.js";
import { notificationRouter } from "./routers/notificationRouter.js";
import {setupSwagger} from "./utils/swagger/onboarding.js";

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
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

setupSwagger(app);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KIBI Affiliate OnBoarding Microservice",
    version: "1.0.0",
    description: "Handles complete affiliate onboarding flow for KIBI Sports Platform",
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
app.use("/api/super-admin", superAdminRouter);
app.use("/api/organization", organizationRouter);
app.use("/api/affiliate", affiliateRouter);
app.use("/api/community", communityRouter);
app.use("/api/notifications", notificationRouter);



// 404 handler
// availableRoutes:
//   "GET / - Service info",
//   "GET /health - Health check",
//   "POST /api/super-admin/login - Super admin login",
//   "POST /api/organization/login - Organization login",
//   "POST /api/affiliate/request-otp - Request OTP for signup",
//   "POST /api/affiliate/request-invitation - Request invitation (non-affiliate)"
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error handler:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

export default app;
