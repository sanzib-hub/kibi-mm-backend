import express from "express";
import{
    createProductConfiguration,
    createStakeholders,
    updateRazorpayProduct,

} from "../controllers/routePayment/routePaymentController.js";
import { organizationOnly } from "../middlewares/auth";

const routePaymentRouter = express.Router();

/**
 * @swagger
 * /api/routePayment/create-stakeholder/{account_id}:
 *   post:
 *     summary: Create a stakeholder for a Razorpay linked account
 *     description: Adds a new stakeholder to a Razorpay linked account using the account_id.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay linked account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Stakeholder's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               percentage_ownership:
 *                 type: number
 *                 format: float
 *                 description: Stakeholder's ownership percentage (max two decimals)
 *                 example: 25.50
 *               relationship:
 *                 type: object
 *                 properties:
 *                   director:
 *                     type: boolean
 *                     example: true
 *                   executive:
 *                     type: boolean
 *                     example: false
 *               phone:
 *                 type: object
 *                 properties:
 *                   primary:
 *                     type: string
 *                     example: "+919876543210"
 *                   secondary:
 *                     type: string
 *                     example: "+918765432109"
 *               addresses:
 *                 type: object
 *                 properties:
 *                   residential:
 *                     type: object
 *                     properties:
 *                       street:
 *                         type: string
 *                         example: "123 Main St"
 *                       city:
 *                         type: string
 *                         example: "Bengaluru"
 *                       state:
 *                         type: string
 *                         example: "Karnataka"
 *                       postal_code:
 *                         type: string
 *                         example: "560034"
 *                       country:
 *                         type: string
 *                         example: "India"
 *               kyc:
 *                 type: object
 *                 properties:
 *                   pan:
 *                     type: string
 *                     example: "ABCDE1234F"
 *               notes:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   note1: "Main investor"
 *     responses:
 *       200:
 *         description: Stakeholder created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Stakeholder created successfully"
 *               data:
 *                 id: "stk_ABC123"
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 percentage_ownership: 25.50
 *       400:
 *         description: Missing required account_id or invalid payload
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Missing required field: account_id in URL"
 *       500:
 *         description: Failed to create stakeholder
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Failed to create stakeholder"
 *               error: "Razorpay API error message"
 */
routePaymentRouter.post("/create-stakeholder/:account_id", organizationOnly, createStakeholders);

/**
 * @swagger
 * /api/routePayment/{account_id}/configure:
 *   post:
 *     summary: Request product configuration for a Razorpay account
 *     description: Sends a request to configure a product for the given Razorpay linked account.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay linked account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_name:
 *                 type: string
 *                 description: Name of the product to configure
 *                 example: "Event Registration Fee"
 *               tnc_accepted:
 *                 type: boolean
 *                 description: Whether terms and conditions are accepted
 *                 example: true
 *     responses:
 *       200:
 *         description: Product configuration requested successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Product configuration requested successfully"
 *               data:
 *                 product_id: "prd_ABC123"
 *                 product_name: "Event Registration Fee"
 *                 tnc_accepted: true
 *                 status: "requested"
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Missing or invalid fields: account_id (URL), product_name, tnc_accepted are required"
 *       500:
 *         description: Internal server error while requesting product configuration
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Internal server error while requesting product configuration"
 *               error: "Razorpay API error message"
 */
routePaymentRouter.post("/:account_id/configure", organizationOnly, createProductConfiguration);

/**
 * @swagger
 * /api/routePayment/{account_id}/products/{product_id}:
 *   patch:
 *     summary: Update Razorpay product configuration
 *     description: Updates the settlements and T&C acceptance for a product linked to a Razorpay account.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay linked account ID
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay product ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settlements:
 *                 type: object
 *                 properties:
 *                   account_number:
 *                     type: string
 *                     example: "1234567890"
 *                     description: Bank account number for settlements
 *                   ifsc_code:
 *                     type: string
 *                     example: "HDFC0001234"
 *                     description: IFSC code of the bank branch
 *                   beneficiary_name:
 *                     type: string
 *                     example: "John Doe"
 *                     description: Name of the account holder
 *                 required:
 *                   - account_number
 *                   - ifsc_code
 *                   - beneficiary_name
 *               tnc_accepted:
 *                 type: boolean
 *                 description: Optional flag indicating if terms and conditions are accepted
 *                 example: true
 *     responses:
 *       200:
 *         description: Product configuration updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Product configuration updated successfully."
 *               data:
 *                 product_id: "prd_ABC123"
 *                 settlements:
 *                   account_number: "1234567890"
 *                   ifsc_code: "HDFC0001234"
 *                   beneficiary_name: "John Doe"
 *                 tnc_accepted: true
 *                 status: "active"
 *       400:
 *         description: Missing or invalid parameters or settlements
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Settlements object with account_number, ifsc_code, and beneficiary_name is required."
 *       500:
 *         description: Failed to update product configuration
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Failed to update product configuration"
 *               error: "Razorpay API error message"
 */

routePaymentRouter.patch("/:account_id/products/:product_id", organizationOnly, updateRazorpayProduct);


export { routePaymentRouter };
