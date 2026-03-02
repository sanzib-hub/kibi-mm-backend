import express from 'express';
import { validateGST, validatePAN } from '../controllers/kyc/kycController';
import { authenticate } from '../middlewares/auth';

export const kycRouter = express.Router();

/**
 * @swagger
 * /validatePAN:
 *   post:
 *     summary: Validate PAN using Digio KYC API
 *     description: This endpoint validates a PAN number using Digio API.
 *     tags:
 *       - KYC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pan
 *             properties:
 *               pan:
 *                 type: string
 *                 example: "ABCDE1234F"
 *     responses:
 *       200:
 *         description: PAN validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: PAN missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "PAN is required"
 *       500:
 *         description: Internal error or Digio API failure
 */
kycRouter.post('/validatePAN', authenticate, validatePAN);

/**
 * @swagger
 * /validateGST:
 *   post:
 *     summary: Validate GST using Digio KYC API
 *     description: This endpoint validates a GST number using Digio API.
 *     tags:
 *       - KYC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gst
 *             properties:
 *               gst:
 *                 type: string
 *                 example: "27AAECS1234F1Z5"
 *     responses:
 *       200:
 *         description: GST validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: GST missing in request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "GST is required"
 *       500:
 *         description: Internal error or Digio API failure
 */
kycRouter.post('/validateGST', authenticate, validateGST);