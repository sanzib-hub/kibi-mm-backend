import express from "express";
import cors from "cors";
import helmet from "helmet";
import { campaignRouter } from "./routers/campaignRouter";
import { setupSwagger } from "./utils/swagger/brandCampaign.js";
import { sportsCategoryRoute } from "./routers/sportsCategory.routes";
import { instagramRouter } from "./routers/instagramRoutes";
import { sponsorshipRouter } from "./routers/sponsorshipRouter";

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

// Root
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KIBI BrandCampaign Microservice",
    version: "1.0.0",
    description:
      "Handles brand campaign management, sports categories and Instagram integration.",
  });
});

// Health Check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ----------------------
// API ROUTES
// ----------------------
app.use("/api/campaigns", campaignRouter);
app.use("/api/sports-categories", sportsCategoryRoute);
app.use("/api/social", instagramRouter); // ⬅ ALL INSTAGRAM ROUTES MOUNTED HERE
app.use("/api/sponsorship", sponsorshipRouter);

// ----------------------
// 404 Handler
// ----------------------
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    availableRoutes: [
      // Service Info
      "GET / - Service info",
      "GET /health - Health check",

      // Campaign Routes
      "GET /api/campaigns - Get all campaigns (Authenticated)",
      "GET /api/campaigns/active - Get active campaigns (Authenticated)",
      "GET /api/campaigns/:id - Get campaign by ID (Authenticated)",
      "POST /api/campaigns - Create campaign (Admin only)",
      "PUT /api/campaigns/:id - Update campaign (Admin only)",
      "DELETE /api/campaigns/:id - Delete campaign (Admin only)",
      "GET /api/campaigns/:campaignId/registrations - Get campaign registrations (Admin only)",
      "PUT /api/campaigns/registrations/:registrationId - Update registration status (Admin only)",
      "POST /api/campaigns/register - Register affiliate for campaign (Affiliate only)",
      "GET /api/campaigns/:campaignId/approve - Approve campaign",
      "GET /api/campaign/getAllAppliedCampaigns - Get Applied Campaigns (Authenticated)",

      // Sports Categories
      "GET /api/sports-categories - Get all sports categories",
      "POST /api/sports-categories - Create sports category (Admin only)",
      "PATCH /api/sports-categories/:id - Update sports category (Admin only)",
      "DELETE /api/sports-categories/:id - Delete sports category (Admin only)",

      // Instagram Integration
      "POST /api/social/instagram/connect - Connect IG Business Account (Affiliate)",
      "GET /api/social/instagram/me - Get saved Instagram data (Affiliate)",

      // Sponsorship Team Routes
      "POST /api/sponsorship/login - Login for sponsorship team",
    ],
  });
});

// ----------------------
// Global Error Handler
// ----------------------
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
      error:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

export default app;
