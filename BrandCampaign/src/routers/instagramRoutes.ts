import express from "express";
import { affiliateAuth } from "../middlewares/auth";
import { InstagramController } from "../controllers/InstagramController";
import { InstagramService } from "../services/InstagramService";
import { InstagramRepository } from "../repositories/InstagramRepository";
import { errorHandler } from "../middlewares/errorHandler";

// Initialize repository
const instagramRepository = new InstagramRepository();

// Initialize service
const instagramService = new InstagramService(instagramRepository);

// Initialize controller
const instagramController = new InstagramController(instagramService);

const instagramRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Instagram
 *   description: Instagram Business Account Connection APIs
 */

/**
 * @swagger
 * /social/instagram/connect:
 *   post:
 *     summary: Connect Instagram Business/Creator Account
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fbAccessToken
 *             properties:
 *               fbAccessToken:
 *                 type: string
 *                 example: EAAGm0PX4ZCpsBAKcZ...
 *                 description: Facebook User Access Token from login
 *     responses:
 *       200:
 *         description: Instagram account connected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "17841406449303797"
 *                     username:
 *                       type: string
 *                       example: "iamaasimmalik"
 *                     followers_count:
 *                       type: number
 *                       example: 370
 *                     edge_followed_by:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                           example: 370
 *       400:
 *         description: Missing fbAccessToken or no IG business account found
 *       500:
 *         description: Internal server error
 */
instagramRouter.post(
  "/instagram/connect",
  affiliateAuth,
  instagramController.connectInstagram,
  errorHandler
);

/**
 * @swagger
 * /social/instagram/me:
 *   get:
 *     summary: Get saved Instagram business account details
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instagram account details fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "17841406449303797"
 *                     username:
 *                       type: string
 *                       example: "iamaasimmalik"
 *                     followers_count:
 *                       type: number
 *                       example: 370
 *                     pageId:
 *                       type: string
 *                       example: "1234567890"
 *                     pageName:
 *                       type: string
 *                       example: "My Facebook Page"
 *       404:
 *         description: No Instagram account found
 */
instagramRouter.get(
  "/instagram/me",
  affiliateAuth,
  instagramController.getInstagramDetails,
  errorHandler
);

/**
 * @swagger
 * /social/instagram/delete:
 *   delete:
 *     summary: Delete Instagram account data for the authenticated affiliate
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instagram account data deleted successfully
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
 *                   example: "Instagram account data deleted successfully"
 *       400:
 *         description: No Instagram account found to delete
 *       500:
 *         description: Internal server error
 */
instagramRouter.delete(
  "/instagram/delete",
  affiliateAuth,
  instagramController.deleteInstagramAccount,
  errorHandler
);

export { instagramRouter };
