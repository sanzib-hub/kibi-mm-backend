import express from "express";
import { adminAuth, authenticate, multiRole } from "../middlewares/auth";
import { SportsCategoryController } from "../controllers/SportsCategoryController";
import { SportsCategoryService } from "../services/SportsCategoryService";
import { SportsCategoryRepository } from "../repositories/SportsCategoryRepository";
import { errorHandler } from "../middlewares/errorHandler";
import { UserTypes } from "../interfaces/jwtPayloads";

// Initialize repository
const sportsCategoryRepository = new SportsCategoryRepository();

// Initialize service
const sportsCategoryService = new SportsCategoryService(sportsCategoryRepository);

// Initialize controller
const sportsCategoryController = new SportsCategoryController(sportsCategoryService);

const sportsCategoryRoute = express.Router();

/**
 * @swagger
 * /api/sports-category:
 *   get:
 *     summary: Get all active sports categories
 *     tags:
 *       - Sports Category
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sports categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Sports categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: Football
 *                       status:
 *                         type: string
 *                         example: ACTIVE
 *                       deleted:
 *                         type: boolean
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   example: 3
 *       500:
 *         description: Internal server error
 */

sportsCategoryRoute.get(
  "/",
  sportsCategoryController.getSportsCategories,
  errorHandler
);

/**
 * @swagger
 * /api/sports-category:
 *   post:
 *     summary: Create a new sports category
 *     tags:
 *       - Sports Category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Cricket
 *     responses:
 *       200:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category created successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: Cricket
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *                     deleted:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Category already exists
 *       404:
 *         description: Title is required
 *       500:
 *         description: Internal server error
 */

sportsCategoryRoute.post(
  "/",
  multiRole([UserTypes.SUPER_ADMIN, UserTypes.ORGANIZATION]),
  sportsCategoryController.createSportsCategory,
  errorHandler
);

// NOTE: /admin must be registered BEFORE any /:id parameterized routes
sportsCategoryRoute.get(
  "/admin",
  adminAuth,
  sportsCategoryController.getSportsCategoriesForAdmin,
  errorHandler
);

/**
 * @swagger
 * /api/sports-category/{id}:
 *   delete:
 *     summary: Soft delete a sports category
 *     tags:
 *       - Sports Category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the sports category to delete
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category deleted successfully.
 *       404:
 *         description: Category not found or ID missing
 *       400:
 *         description: Unable to delete the sports category
 *       500:
 *         description: Internal server error
 */

sportsCategoryRoute.delete(
  "/:id",
  multiRole([UserTypes.SUPER_ADMIN, UserTypes.ORGANIZATION]),
  sportsCategoryController.deleteSportsCategory,
  errorHandler
);

/**
 * @swagger
 * /api/sports-category/{id}:
 *   patch:
 *     summary: Update an existing sports category
 *     tags:
 *       - Sports Category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the sports category to update
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Basketball
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category updated successfully.
 *       400:
 *         description: Category does not exist or update failed
 *       404:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */

sportsCategoryRoute.patch(
  "/:id",
  multiRole([UserTypes.SUPER_ADMIN, UserTypes.ORGANIZATION]),
  sportsCategoryController.updateSportsCategory,
  errorHandler
);

export { sportsCategoryRoute };
