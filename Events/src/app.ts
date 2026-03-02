import express from "express";
import cors from "cors";
import helmet from "helmet";
import { eventsRouter } from "./routers/eventsRouter";
import { formsRouter } from "./routers/formsRouter";
import { kycRouter } from "./routers/kycRouter";
import { setupSwagger } from "./utils/swagger/events";


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

// Setup Swagger documentation
setupSwagger(app);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KIBI Events Microservice",
    version: "1.0.0",
    description: "Handles event management and athlete registrations for KIBI Sports Platform",
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
app.use("/api/events", eventsRouter);
app.use("/api/forms", formsRouter);
app.use("/api/kyc", kycRouter);
// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    availableRoutes: [
      "GET / - Service info",
      "GET /health - Health check",
      "GET /api/events - Get all events",
      "GET /api/events/organization/:organizationId - Get events by organization (Organization only)",
      "POST /api/events - Create event (Organization only)",
      "PUT /api/events/:eventId - Update event (Organization only)",
      "DELETE /api/events/:eventId - Delete event (Organization only)",
      "POST /api/events/register - Register affiliate for event (Affiliate only)",
      "GET /api/events/:eventId/affiliates - Get registered affiliates (Organization only)",
      "GET /api/forms - Get all forms",
      "GET /api/forms/:formId - Get form by ID",
      "POST /api/forms - Create form (Organization only)",
      "PUT /api/forms/:formId - Update form (Organization only)",
      "DELETE /api/forms/:formId - Delete form (Organization only)",
      "GET /api/forms/organization/:organizationId - Get organization forms"
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
