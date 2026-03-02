import express from "express";
import { SponsorshipController } from "../controllers/SponsorshipController";
import { SponsorshipService } from "../services/SponsorshipService";
import { SponsorshipRepository } from "../repositories/SponsorshipRepository";
import { CampaignRepository } from "../repositories/CampaignRepository";
import { BrandRepository } from "../repositories/BrandRepository";
import { sponsorshipTeamAuth } from "../middlewares/auth";
import { errorHandler } from "../middlewares/errorHandler";

// Initialize repositories
const sponsorshipRepository = new SponsorshipRepository();
const campaignRepository = new CampaignRepository();
const brandRepository = new BrandRepository();

// Initialize service
const sponsorshipService = new SponsorshipService(sponsorshipRepository, campaignRepository, brandRepository);

// Initialize controller
const sponsorshipController = new SponsorshipController(sponsorshipService);

const sponsorshipRouter = express.Router();

// ==================== Sponsorship Team Routes ====================

/**
 * @swagger
 * /api/sponsorship/login:
 *   post:
 *     summary: Login for sponsorship team
 *     tags: [Sponsorship]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "sponsor@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     type:
 *                       type: string
 *                       example: "sponsorship"
 *                     sponsorshipTeam:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials or inactive account
 */
sponsorshipRouter.post(
  "/login",
  sponsorshipController.login,
  errorHandler
);

// ==================== Campaign Routes ====================

/**
 * @swagger
 * /api/sponsorship/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Sponsorship Campaign]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandId
 *               - name
 *               - description
 *               - product
 *               - sportsCategoryId
 *               - ageRange
 *               - gender
 *               - geography
 *               - followersRange
 *               - dealType
 *               - deliverables
 *               - budget
 *             properties:
 *               brandId:
 *                 type: number
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               product:
 *                 type: string
 *               sportsCategoryId:
 *                 type: array
 *                 items:
 *                   type: number
 *               ageRange:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, ANY]
 *               geography:
 *                 type: string
 *               followersRange:
 *                 type: string
 *               dealType:
 *                 type: string
 *               deliverables:
 *                 type: string
 *               budget:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *       400:
 *         description: Validation error
 */
sponsorshipRouter.post(
  "/campaigns",
  sponsorshipTeamAuth,
  sponsorshipController.createCampaign,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/campaigns:
 *   get:
 *     summary: Get all campaigns with optional filters and pagination
 *     tags: [Sponsorship Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sportsCategoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [MALE, FEMALE, ANY]
 *       - in: query
 *         name: dealType
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: geography
 *         schema:
 *           type: string
 *       - in: query
 *         name: followersRange
 *         schema:
 *           type: string
 *       - in: query
 *         name: ageRange
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 */
sponsorshipRouter.get(
  "/campaigns",
  sponsorshipTeamAuth,
  sponsorshipController.getAllCampaigns,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/campaigns/{id}:
 *   get:
 *     summary: Get a single campaign by ID
 *     tags: [Sponsorship Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Campaign fetched successfully
 *       404:
 *         description: Campaign not found
 */
sponsorshipRouter.get(
  "/campaigns/:id",
  sponsorshipTeamAuth,
  sponsorshipController.getCampaignById,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/campaigns/{id}:
 *   put:
 *     summary: Update an existing campaign by ID
 *     tags: [Sponsorship Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandId:
 *                 type: number
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               product:
 *                 type: string
 *               sportsCategoryId:
 *                 type: array
 *                 items:
 *                   type: number
 *               ageRange:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, ANY]
 *               geography:
 *                 type: string
 *               followersRange:
 *                 type: string
 *               dealType:
 *                 type: string
 *               deliverables:
 *                 type: string
 *               budget:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Campaign not found
 */
sponsorshipRouter.put(
  "/campaigns/:id",
  sponsorshipTeamAuth,
  sponsorshipController.updateCampaign,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/campaigns/{id}:
 *   delete:
 *     summary: Soft delete a campaign by ID
 *     tags: [Sponsorship Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 *       404:
 *         description: Campaign not found
 */
sponsorshipRouter.delete(
  "/campaigns/:id",
  sponsorshipTeamAuth,
  sponsorshipController.deleteCampaign,
  errorHandler
);

// ==================== Affiliate Routes ====================

/**
 * @swagger
 * /api/sponsorship/affiliates:
 *   get:
 *     summary: Get all affiliates with optional filters and pagination
 *     tags: [Sponsorship Affiliates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, VERIFIED, BANNED, FLAGGED]
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ATHLETE, COACH, SPORTS STAFF, NUTRITIONIST, PHYSIOTHERAPIST, PSYCHOLOGIST, SPORTS JOURNALIST, SPORTS MANAGEMENT PROFESSIONAL]
 *       - in: query
 *         name: sportsCategoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *     responses:
 *       200:
 *         description: Affiliates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       email:
 *                         type: string
 *                         nullable: true
 *                       phone:
 *                         type: string
 *                       gender:
 *                         type: string
 *                         nullable: true
 *                       dateOfBirth:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       sportsCategoryId:
 *                         type: integer
 *                         nullable: true
 *                       sportsCategoryTitle:
 *                         type: string
 *                         nullable: true
 *                       position:
 *                         type: string
 *                         nullable: true
 *                       profilePicture:
 *                         type: string
 *                         nullable: true
 *                       bio:
 *                         type: string
 *                         nullable: true
 *                       achievements:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                       geography:
 *                         type: string
 *                         nullable: true
 *                       followersRange:
 *                         type: string
 *                         nullable: true
 *                       profile_slug:
 *                         type: string
 *                         nullable: true
 *                       organizationId:
 *                         type: integer
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       400:
 *         description: Validation error
 */
sponsorshipRouter.get(
  "/affiliates",
  sponsorshipTeamAuth,
  sponsorshipController.getAllAffiliates,
  errorHandler
);

// ==================== Brand Routes ====================

/**
 * @swagger
 * /api/sponsorship/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Sponsorship Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - logo
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Nike"
 *               logo:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *     responses:
 *       201:
 *         description: Brand created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Brand with this name already exists
 */
sponsorshipRouter.post(
  "/brands",
  sponsorshipTeamAuth,
  sponsorshipController.createBrand,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Sponsorship Brand]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Brands retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       logo:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
sponsorshipRouter.get(
  "/brands",
  sponsorshipTeamAuth,
  sponsorshipController.getAllBrands,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/brands/{id}:
 *   get:
 *     summary: Get a single brand by ID
 *     tags: [Sponsorship Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Brand fetched successfully
 *       404:
 *         description: Brand not found
 */
sponsorshipRouter.get(
  "/brands/:id",
  sponsorshipTeamAuth,
  sponsorshipController.getBrandById,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/brands/{id}:
 *   put:
 *     summary: Update an existing brand by ID
 *     tags: [Sponsorship Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               logo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Brand not found
 *       409:
 *         description: Brand with this name already exists
 */
sponsorshipRouter.put(
  "/brands/:id",
  sponsorshipTeamAuth,
  sponsorshipController.updateBrand,
  errorHandler
);

/**
 * @swagger
 * /api/sponsorship/brands/{id}:
 *   delete:
 *     summary: Soft delete a brand by ID
 *     tags: [Sponsorship Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Brand deleted successfully
 *       404:
 *         description: Brand not found
 */
sponsorshipRouter.delete(
  "/brands/:id",
  sponsorshipTeamAuth,
  sponsorshipController.deleteBrand,
  errorHandler
);

export { sponsorshipRouter };

