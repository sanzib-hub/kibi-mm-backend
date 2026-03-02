import express from "express";
import { adminAuth, affiliateAuth, authenticate } from "../middlewares/auth";
import { CampaignController } from "../controllers/CampaignController";
import { BrandController } from "../controllers/BrandController";
import { CampaignService } from "../services/CampaignService";
import { BrandService } from "../services/BrandService";
import { CampaignRepository } from "../repositories/CampaignRepository";
import { CampaignRegistrationRepository } from "../repositories/CampaignRegistrationRepository";
import { BrandRepository } from "../repositories/BrandRepository";
import { errorHandler } from "../middlewares/errorHandler";
import {
  submitDeliverable,
  getDeliverables,
  reviewDeliverable,
} from "../controllers/deliverableController";
import {
  getCampaignAnalytics,
  getBrandDashboard,
  getRegistrationTrends,
} from "../controllers/analyticsController";
import {
  getRecommendedAffiliates,
  getRecommendedCampaigns,
  getCampaignMatchStats,
} from "../controllers/matchingController";
import {
  createPayout,
  getPayouts,
  getAffiliatePayouts,
  updatePayoutStatus,
  getPayoutSummary,
} from "../controllers/payoutController";
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController";

// Initialize repositories
const campaignRepository = new CampaignRepository();
const campaignRegistrationRepository = new CampaignRegistrationRepository();
const brandRepository = new BrandRepository();

// Initialize services
const campaignService = new CampaignService(
  campaignRepository,
  campaignRegistrationRepository
);
const brandService = new BrandService(brandRepository);

// Initialize controllers
const campaignController = new CampaignController(campaignService);
const brandController = new BrandController(brandService);

const campaignRouter = express.Router();

// ==================== Campaign Routes ====================

/**
 * @swagger
 * /api/campaigns/active:
 *   get:
 *     summary: Get all active campaigns
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/active",
  authenticate,
  campaignController.getAllActiveCampaigns,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/register:
 *   post:
 *     summary: Register an affiliate for a campaign
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/register",
  affiliateAuth,
  campaignController.registerAffiliateForCampaign,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/registrations/{registrationId}:
 *   put:
 *     summary: Update a campaign registration
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.put(
  "/registrations/:registrationId",
  adminAuth,
  campaignController.updateCampaignRegistration,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Get all campaigns with optional filters and pagination
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get("/", authenticate, campaignController.getAllCampaigns, errorHandler);

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Create a new brand campaign
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post("/", adminAuth, campaignController.createCampaign, errorHandler);

/**
 * @swagger
 * /api/campaigns/{campaignId}/eligible-affiliates:
 *   get:
 *     summary: Get eligible unregistered affiliates for a campaign
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/eligible-affiliates",
  authenticate,
  campaignController.getEligibleUnregisteredAffiliates,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/registrations:
 *   get:
 *     summary: Get campaign registrations with optional filters
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/registrations",
  authenticate,
  campaignController.getCampaignRegistrations,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/getAllAppliedCampaigns:
 *   get:
 *     summary: Get all campaigns applied by the logged-in affiliate
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/getAllAppliedCampaigns",
  affiliateAuth,
  campaignController.getAllAppliedCampaigns,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/getAllRejectedCampaigns:
 *   get:
 *     summary: Get all rejected campaigns for the logged-in affiliate
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/getAllRejectedCampaigns",
  affiliateAuth,
  campaignController.getAllRejectedCampaigns,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/approveMultipleAffiliatesForCampaign/{campaignId}:
 *   post:
 *     summary: Approve or reject multiple affiliates for a campaign
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/approveMultipleAffiliatesForCampaign/:campaignId",
  adminAuth,
  campaignController.approveMultipleAffiliatesForCampaign,
  errorHandler
);

/**
 * @swagger
 * /campaign/approveAffiliateForCampaign/{campaignId}/{affiliateId}:
 *   post:
 *     summary: Approve or reject an affiliate for a campaign
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/approveAffiliateForCampaign/:campaignId/:affiliateId",
  adminAuth,
  campaignController.approveAffiliateForCampaign,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/getApprovedCampaigns:
 *   get:
 *     summary: Get all approved campaigns for the logged-in affiliate
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/getApprovedCampaigns",
  affiliateAuth,
  campaignController.getApprovedCampaigns,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/approve:
 *   get:
 *     summary: Approve or disapprove a campaign by ID
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/approve",
  adminAuth,
  campaignController.approveCampaign,
  errorHandler
);

// ==================== Deliverable Routes ====================

/**
 * @swagger
 * /api/campaigns/{campaignId}/deliverables:
 *   post:
 *     summary: Submit a deliverable for a campaign
 *     tags: [Campaign Deliverables]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/:campaignId/deliverables",
  authenticate,
  submitDeliverable,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/deliverables:
 *   get:
 *     summary: Get deliverables for a campaign
 *     tags: [Campaign Deliverables]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/deliverables",
  authenticate,
  getDeliverables,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/deliverables/{deliverableId}/review:
 *   patch:
 *     summary: Review (approve/reject) a deliverable
 *     tags: [Campaign Deliverables]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.patch(
  "/deliverables/:deliverableId/review",
  adminAuth,
  reviewDeliverable,
  errorHandler
);

// ==================== Analytics Routes ====================

/**
 * @swagger
 * /api/campaigns/{campaignId}/analytics:
 *   get:
 *     summary: Get analytics for a specific campaign
 *     tags: [Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/analytics",
  authenticate,
  getCampaignAnalytics,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/brand/{brandId}/dashboard:
 *   get:
 *     summary: Get dashboard analytics for a brand
 *     tags: [Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/brand/:brandId/dashboard",
  authenticate,
  getBrandDashboard,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/registration-trends:
 *   get:
 *     summary: Get registration trends for a campaign
 *     tags: [Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/registration-trends",
  authenticate,
  getRegistrationTrends,
  errorHandler
);

// ==================== Matching/Recommendation Routes ====================

/**
 * @swagger
 * /api/campaigns/recommended-for-affiliate:
 *   get:
 *     summary: Get recommended campaigns for the logged-in affiliate
 *     tags: [Campaign Matching]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/recommended-for-affiliate",
  authenticate,
  getRecommendedCampaigns,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/my-payouts:
 *   get:
 *     summary: Get payouts for the logged-in affiliate across all campaigns
 *     tags: [Campaign Payouts]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/my-payouts",
  authenticate,
  getAffiliatePayouts,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/recommended-affiliates:
 *   get:
 *     summary: Get recommended affiliates for a campaign
 *     tags: [Campaign Matching]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/recommended-affiliates",
  authenticate,
  getRecommendedAffiliates,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/match-stats:
 *   get:
 *     summary: Get match statistics for a campaign
 *     tags: [Campaign Matching]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/match-stats",
  authenticate,
  getCampaignMatchStats,
  errorHandler
);

// ==================== Payout Routes ====================

/**
 * @swagger
 * /api/campaigns/payouts/{payoutId}/status:
 *   patch:
 *     summary: Update payout status (admin only)
 *     tags: [Campaign Payouts]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.patch(
  "/payouts/:payoutId/status",
  adminAuth,
  updatePayoutStatus,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/payouts:
 *   post:
 *     summary: Create a payout for an affiliate in a campaign (admin only)
 *     tags: [Campaign Payouts]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/:campaignId/payouts",
  adminAuth,
  createPayout,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/payouts:
 *   get:
 *     summary: Get payouts for a campaign
 *     tags: [Campaign Payouts]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/payouts",
  authenticate,
  getPayouts,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/payout-summary:
 *   get:
 *     summary: Get payout summary for a campaign
 *     tags: [Campaign Payouts]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/payout-summary",
  authenticate,
  getPayoutSummary,
  errorHandler
);

// ==================== Campaign Template Routes ====================

/**
 * @swagger
 * /api/campaigns/templates:
 *   post:
 *     summary: Create a new campaign template
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post("/templates", adminAuth, createTemplate, errorHandler);

/**
 * @swagger
 * /api/campaigns/templates:
 *   get:
 *     summary: Get all campaign templates
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get("/templates", authenticate, getTemplates, errorHandler);

/**
 * @swagger
 * /api/campaigns/templates/{templateId}:
 *   get:
 *     summary: Get a campaign template by ID
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get("/templates/:templateId", authenticate, getTemplateById, errorHandler);

/**
 * @swagger
 * /api/campaigns/templates/{templateId}:
 *   put:
 *     summary: Update a campaign template
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.put("/templates/:templateId", adminAuth, updateTemplate, errorHandler);

/**
 * @swagger
 * /api/campaigns/templates/{templateId}:
 *   delete:
 *     summary: Delete a campaign template
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.delete("/templates/:templateId", adminAuth, deleteTemplate, errorHandler);

// ==================== Campaign Reporting (Round 11) ====================

// POST /api/campaigns/compare — compare metrics between 2+ campaigns (admin auth)
campaignRouter.post(
  "/compare",
  adminAuth,
  campaignController.compareCampaigns,
  errorHandler
);

// POST /api/campaigns/:campaignId/reports/generate — generate campaign report (admin auth)
campaignRouter.post(
  "/:campaignId/reports/generate",
  adminAuth,
  campaignController.generateCampaignReport,
  errorHandler
);

// GET /api/campaigns/:campaignId/reports — list saved reports (admin auth)
campaignRouter.get(
  "/:campaignId/reports",
  adminAuth,
  campaignController.getCampaignReports,
  errorHandler
);

// ==================== Campaign Content Library (Round 9) ====================

// POST /api/campaigns/:campaignId/content — upload content (admin auth)
campaignRouter.post(
  "/:campaignId/content",
  adminAuth,
  campaignController.uploadContent,
  errorHandler
);

// GET /api/campaigns/:campaignId/content — get content for a campaign (admin auth)
campaignRouter.get(
  "/:campaignId/content",
  adminAuth,
  campaignController.getCampaignContent,
  errorHandler
);

// DELETE /api/campaigns/content/:contentId — delete a content entry (admin auth)
campaignRouter.delete(
  "/content/:contentId",
  adminAuth,
  campaignController.deleteContent,
  errorHandler
);

// ==================== Campaign Influencer Tiers (Round 10) ====================

// POST /api/campaigns/:campaignId/influencer-tiers — define influencer tiers (admin auth)
campaignRouter.post(
  "/:campaignId/influencer-tiers",
  adminAuth,
  campaignController.setInfluencerTiers,
  errorHandler
);

// GET /api/campaigns/:campaignId/influencer-tiers — get tiers for a campaign (admin auth)
campaignRouter.get(
  "/:campaignId/influencer-tiers",
  adminAuth,
  campaignController.getInfluencerTiers,
  errorHandler
);

// POST /api/campaigns/:campaignId/influencer-tiers/assign — assign affiliate to tier (admin auth)
campaignRouter.post(
  "/:campaignId/influencer-tiers/assign",
  adminAuth,
  campaignController.assignAffiliateToTier,
  errorHandler
);

// ==================== Campaign Milestones (Round 8) ====================

/**
 * @swagger
 * /api/campaigns/{campaignId}/milestones:
 *   post:
 *     summary: Create a milestone for a campaign
 *     tags: [Campaign Milestones]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/:campaignId/milestones",
  adminAuth,
  campaignController.createMilestone,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/milestones:
 *   get:
 *     summary: Get milestones for a campaign with progress data
 *     tags: [Campaign Milestones]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/milestones",
  adminAuth,
  campaignController.getMilestones,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/milestones/{milestoneId}/progress:
 *   patch:
 *     summary: Update progress toward a milestone
 *     tags: [Campaign Milestones]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.patch(
  "/milestones/:milestoneId/progress",
  adminAuth,
  campaignController.updateMilestoneProgress,
  errorHandler
);

// ==================== Campaign ROI Tracking (Round 7) ====================

/**
 * @swagger
 * /api/campaigns/{campaignId}/metrics:
 *   post:
 *     summary: Record a metric for a campaign (impressions, clicks, conversions, revenue)
 *     tags: [Campaign ROI]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/:campaignId/metrics",
  adminAuth,
  campaignController.trackCampaignMetric,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{campaignId}/roi:
 *   get:
 *     summary: Get ROI metrics for a campaign
 *     tags: [Campaign ROI]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/:campaignId/roi",
  adminAuth,
  campaignController.getCampaignROI,
  errorHandler
);

// ==================== Brand Routes ====================
// NOTE: All brand routes with static prefixes must be above the /:id catch-all

/**
 * @swagger
 * /api/campaigns/get-all-brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get(
  "/get-all-brands",
  authenticate,
  brandController.getAllBrands,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/create-brand:
 *   post:
 *     summary: Create a new brand
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.post(
  "/create-brand",
  adminAuth,
  brandController.createBrand,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/update-brand/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.put(
  "/update-brand/:id",
  adminAuth,
  brandController.updateBrand,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/delete-brand/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.delete(
  "/delete-brand/:id",
  adminAuth,
  brandController.deleteBrand,
  errorHandler
);

// ==================== Campaign Analytics Dashboard (Round 14) ====================
// NOTE: Static-prefix routes must be before /:id catch-all

// GET /api/campaigns/trends — monthly trends across all campaigns (admin auth)
campaignRouter.get(
  "/trends",
  adminAuth,
  campaignController.getCampaignTrends,
  errorHandler
);

// GET /api/campaigns/top-performers — top affiliates across campaigns (admin auth)
campaignRouter.get(
  "/top-performers",
  adminAuth,
  campaignController.getTopPerformers,
  errorHandler
);

// ==================== Campaign Application Review Workflow (Round 13) ====================
// NOTE: Static-prefix routes must be before /:id catch-all

// PATCH /api/campaigns/applications/:applicationId/status — update application status (admin auth)
campaignRouter.patch(
  "/applications/:applicationId/status",
  adminAuth,
  campaignController.updateApplicationStatus,
  errorHandler
);

// GET /api/campaigns/applications/:applicationId/history — get application review history (admin auth)
campaignRouter.get(
  "/applications/:applicationId/history",
  adminAuth,
  campaignController.getApplicationHistory,
  errorHandler
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get a single campaign by ID
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.get("/:id", authenticate, campaignController.getCampaignById, errorHandler);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     summary: Update an existing campaign by ID
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.put("/:id", adminAuth, campaignController.updateCampaign, errorHandler);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Soft delete a campaign by ID
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 */
campaignRouter.delete("/:id", adminAuth, campaignController.deleteCampaign, errorHandler);

// ==================== Campaign Analytics Dashboard - Parameterized routes (Round 14) ====================

// GET /api/campaigns/:campaignId/dashboard-analytics — detailed campaign analytics (admin auth)
campaignRouter.get(
  "/:campaignId/dashboard-analytics",
  adminAuth,
  campaignController.getCampaignDashboardAnalytics,
  errorHandler
);

// ==================== Campaign Application Review - Parameterized routes (Round 13) ====================

// GET /api/campaigns/:campaignId/applications/review — get applications for review (admin auth)
campaignRouter.get(
  "/:campaignId/applications/review",
  adminAuth,
  campaignController.getApplicationsForReview,
  errorHandler
);

// POST /api/campaigns/:campaignId/applications/bulk-update — bulk update applications (admin auth)
campaignRouter.post(
  "/:campaignId/applications/bulk-update",
  adminAuth,
  campaignController.bulkUpdateApplications,
  errorHandler
);

export { campaignRouter };
