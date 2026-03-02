import express from "express";
import { superAdminOnly } from "../middlewares/auth.js";
import { SuperAdminController } from "../controllers/SuperAdminController.js";

const superAdminRouter = express.Router();
const superAdminController = new SuperAdminController();

// Public routes (no auth required)
/**
 * @swagger
 * /api/super-admin/login:
 *   post:
 *     summary: Super Admin Login - Request OTP
 *     description: Authenticates a Super Admin using email and password, then sends an OTP to the registered email address. The OTP must be verified using the /verify-otp endpoint to complete login.
 *     tags:
 *       - Super Admin
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
 *                 example: "admin@kibisports.com"
 *                 description: Registered email of the Super Admin.
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Admin@123"
 *                 description: Account password of the Super Admin.
 *     responses:
 *       200:
 *         description: OTP sent successfully to email. Use the /verify-otp endpoint with the received OTP to complete login.
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
 *                   example: "OTP sent successfully to your email"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "admin@kibisports.com"
 *                     expiresIn:
 *                       type: integer
 *                       example: 600
 *                       description: OTP expiration time in seconds (10 minutes)
 *       400:
 *         description: Validation error in the request body (missing or invalid email/password)
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
 *                   example: "\"email\" is required"
 *       401:
 *         description: Invalid credentials or inactive account
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
 *                   example: "Invalid credentials"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
superAdminRouter.post("/login", superAdminController.login);

/**
 * @swagger
 * /api/super-admin/verify-otp:
 *   post:
 *     summary: Verify OTP and Login
 *     description: Verifies the OTP sent to email and generates a JWT token for Super Admin login.
 *     tags:
 *       - Super Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@kibisports.com"
 *                 description: Registered email of the Super Admin.
 *               otp:
 *                 type: string
 *                 length: 6
 *                 example: "123456"
 *                 description: 6-digit OTP received via email.
 *     responses:
 *       200:
 *         description: OTP verified successfully. Returns JWT token and user information.
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Super Admin"
 *                         email:
 *                           type: string
 *                           example: "admin@kibisports.com"
 *                         role:
 *                           type: string
 *                           example: "SUPER_ADMIN"
 *       400:
 *         description: Validation error or invalid/expired OTP
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
 *                   example: "The verification code you entered is incorrect. Please check and try again." or "Your verification code has expired. Please request a new one."
 *       401:
 *         description: Invalid credentials or inactive account
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
 *                   example: "Invalid credentials"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
superAdminRouter.post("/verify-otp", superAdminController.verifyOTPAndLogin);

// Protected routes (Super Admin only)
/**
 * @swagger
 * /api/super-admin/organizations:
 *   post:
 *     summary: Onboard a new sports organization
 *     description: Allows a Super Admin to onboard a new sports organization with pre-approved status. The organization is automatically verified and marked for first login setup.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []   # JWT token required (Super Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - address
 *               - displayName
 *               - organizationType
 *             properties:
 *               name:
 *                 type: string
 *                 example: "KIBI Sports Academy"
 *                 description: Name of the sports organization.
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "info@kibisportsacademy.com"
 *                 description: Official email address of the organization.
 *               phone:
 *                 type: string
 *                 example: "+91-9876543210"
 *                 description: Contact number of the organization.
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass@123"
 *                 description: Password for organization admin login.
 *               address:
 *                 type: string
 *                 example: "123 Stadium Road, Sector 9, Gurgaon"
 *                 description: Physical address of the organization.
 *               displayName:
 *                 type: string
 *                 example: "KIBI Sports Academy"
 *                 description: Display name for the organization (set to organization name).
 *               organizationType:
 *                 type: string
 *                 example: "Academy"
 *                 description: Type of sports organization (e.g., Academy, Club, School, etc.).
 *               city:
 *                 type: string
 *                 example: "Gurgaon"
 *               state:
 *                 type: string
 *                 example: "Haryana"
 *               country:
 *                 type: string
 *                 example: "India"
 *               district:
 *                 type: string
 *                 example: "Gurgaon"
 *               pincode:
 *                 type: string
 *                 example: "122001"
 *               logo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example-bucket.s3.ap-south-1.amazonaws.com/logo.png"
 *               description:
 *                 type: string
 *                 example: "A top-tier sports academy focused on athlete development and training."
 *               website:
 *                 type: string
 *                 example: "https://www.kibisportsacademy.com"
 *               registrationNumber:
 *                 type: string
 *                 example: "REG2025A001"
 *               establishedYear:
 *                 type: integer
 *                 example: 2018
 *               sportsCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "Football"
 *                 description: List of sports offered by the organization.
 *     responses:
 *       201:
 *         description: Sports organization onboarded successfully.
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
 *                   example: "Sports organization onboarded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     name:
 *                       type: string
 *                       example: "KIBI Sports Academy"
 *                     email:
 *                       type: string
 *                       example: "info@kibisportsacademy.com"
 *                     status:
 *                       type: string
 *                       example: "APPROVED"
 *       400:
 *         description: Validation error or duplicate email/phone found.
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
 *                   example: "Organization with this email already exists"
 *       401:
 *         description: Unauthorized — missing or invalid Super Admin token.
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
 *                   example: "Unauthorized access. Super Admin only."
 *       500:
 *         description: Internal server error.
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
 *                   example: "Internal server error"
 */
superAdminRouter.post(
  "/organizations",
  superAdminOnly,
  superAdminController.onboardOrganization
);

/**
 * @swagger
 * /api/super-admin/sponsorship-team:
 *   post:
 *     summary: Onboard a new sponsorship team member
 *     description: Allows a Super Admin to onboard a new sponsorship team member. The team member is automatically activated and ready to use.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []   # JWT token required (Super Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Full name of the sponsorship team member.
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@kibisports.com"
 *                 description: Email address of the sponsorship team member.
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass@123"
 *                 description: Password for sponsorship team member login.
 *     responses:
 *       201:
 *         description: Sponsorship team member onboarded successfully.
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
 *                   example: "Sponsorship team member onboarded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@kibisports.com"
 *                     active:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error or duplicate email found.
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
 *                   example: "Sponsorship team member with this email already exists"
 *       401:
 *         description: Unauthorized — missing or invalid Super Admin token.
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
 *                   example: "Unauthorized access. Super Admin only."
 *       500:
 *         description: Internal server error.
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
 *                   example: "Internal server error"
 */
superAdminRouter.post(
  "/sponsorship-team",
  superAdminOnly,
  superAdminController.onboardSponsorshipTeam
);

superAdminRouter.get("/sponsorship-team", superAdminOnly, superAdminController.getSponsorshipTeam)

/**
 * @swagger
 * /api/super-admin/organizations:
 *   get:
 *     summary: Get all sports organizations
 *     description: Allows the Super Admin to view a paginated list of all onboarded sports organizations. Supports filters by status and search by name or email.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []   # JWT token required (Super Admin only)
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *           example: "APPROVED"
 *         description: Filter organizations by approval status.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: "academy"
 *         description: Search by organization name or email (case-insensitive).
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination. Defaults to 1.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of records per page. Defaults to 10.
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully.
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
 *                   example: "Organizations retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     organizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 12
 *                           name:
 *                             type: string
 *                             example: "KIBI Sports Academy"
 *                           email:
 *                             type: string
 *                             example: "info@kibisportsacademy.com"
 *                           phone:
 *                             type: string
 *                             example: "+91-9876543210"
 *                           address:
 *                             type: string
 *                             example: "123 Stadium Road, Sector 9, Gurgaon"
 *                           city:
 *                             type: string
 *                             example: "Gurgaon"
 *                           state:
 *                             type: string
 *                             example: "Haryana"
 *                           country:
 *                             type: string
 *                             example: "India"
 *                           organizationType:
 *                             type: string
 *                             example: "Academy"
 *                           status:
 *                             type: string
 *                             example: "APPROVED"
 *                           isVerified:
 *                             type: boolean
 *                             example: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-08T09:32:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 42
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *       401:
 *         description: Unauthorized — missing or invalid Super Admin token.
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
 *                   example: "Unauthorized access. Super Admin only."
 *       500:
 *         description: Internal server error.
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
 *                   example: "Internal server error"
 */
superAdminRouter.get("/organizations", superAdminOnly, superAdminController.getAllOrganizations);

/**
 * @swagger
 * /api/super-admin/organizations/{id}/status:
 *   patch:
 *     summary: Update the status of a sports organization
 *     description: Allows the Super Admin to update the approval status of a sports organization (e.g., APPROVED, REJECTED, or SUSPENDED). Also records an audit log of the change.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []   # JWT token required (Super Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 15
 *         description: ID of the organization whose status is to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, SUSPENDED]
 *                 example: "APPROVED"
 *                 description: New status for the organization.
 *               comments:
 *                 type: string
 *                 example: "Verified all documents. Approved successfully."
 *                 description: Optional comments or remarks related to the status update.
 *     responses:
 *       200:
 *         description: Organization status updated successfully.
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
 *                   example: "Organization status updated to APPROVED"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 15
 *                     name:
 *                       type: string
 *                       example: "KIBI Sports Academy"
 *                     email:
 *                       type: string
 *                       example: "info@kibisportsacademy.com"
 *                     phone:
 *                       type: string
 *                       example: "+91-9876543210"
 *                     status:
 *                       type: string
 *                       example: "APPROVED"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-08T11:25:00.000Z"
 *       400:
 *         description: Invalid input data or missing fields.
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
 *                   example: "\"status\" is required"
 *       404:
 *         description: Organization not found.
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
 *                   example: "Organization not found"
 *       401:
 *         description: Unauthorized — missing or invalid Super Admin token.
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
 *                   example: "Unauthorized access. Super Admin only."
 *       500:
 *         description: Internal server error.
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
 *                   example: "Internal server error"
 */
superAdminRouter.patch(
  "/organizations/:id/status",
  superAdminOnly,
  superAdminController.updateOrganizationStatus
);

/**
 * @swagger
 * /superadmin/non-affiliate-requests:
 *   get:
 *     summary: Get all non-affiliate requests
 *     description: Retrieve a paginated list of non-affiliate athlete requests filtered by status. Only accessible to super admins.
 *     tags:
 *       - Super Admin - Non Affiliate Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *           default: PENDING
 *         description: Filter requests by their status.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to return per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved non-affiliate requests.
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
 *                   example: Non-affiliate requests retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     requests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 12
 *                           name:
 *                             type: string
 *                             example: Rohan Sharma
 *                           email:
 *                             type: string
 *                             example: rohan@example.com
 *                           phone:
 *                             type: string
 *                             example: 9876543210
 *                           status:
 *                             type: string
 *                             example: PENDING
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-11-08T12:45:30.000Z
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *       400:
 *         description: Invalid query parameters.
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
 *                   example: Invalid status value.
 *       500:
 *         description: Internal server error.
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
 *                   example: Internal server error
 */
superAdminRouter.get(
  "/non-affiliate-requests",
  superAdminOnly,
  superAdminController.getNonAffiliateRequests
);

/**
 * @swagger
 * /superadmin/non-affiliate-requests/{id}/review:
 *   patch:
 *     summary: Review a non-affiliate request (approve or reject)
 *     description: Allows a super admin to review a non-affiliate request and either approve or reject it. When approved, an invitation code is automatically generated and sent via SMS.
 *     tags:
 *       - Super Admin - Non Affiliate Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 15
 *         description: ID of the non-affiliate request to review.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 example: APPROVED
 *                 description: Decision for the request.
 *               comments:
 *                 type: string
 *                 example: Verified athlete details and approved the request.
 *                 description: Optional admin comments for review.
 *     responses:
 *       200:
 *         description: Request reviewed successfully.
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
 *                   example: Request approved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 15
 *                     name:
 *                       type: string
 *                       example: Rohan Sharma
 *                     email:
 *                       type: string
 *                       example: rohan@example.com
 *                     phone:
 *                       type: string
 *                       example: 9876543210
 *                     status:
 *                       type: string
 *                       example: APPROVED
 *                     reviewedBy:
 *                       type: integer
 *                       example: 1
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-08T13:15:00.000Z
 *                     reviewComments:
 *                       type: string
 *                       example: Verified athlete details and approved the request.
 *                     invitationCodeId:
 *                       type: integer
 *                       example: 102
 *       400:
 *         description: Invalid request parameters or already reviewed request.
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
 *                   example: Request has already been reviewed.
 *       404:
 *         description: Non-affiliate request not found.
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
 *                   example: Request not found.
 *       500:
 *         description: Internal server error.
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
 *                   example: Internal server error
 */
superAdminRouter.patch(
  "/non-affiliate-requests/:id/review",
  superAdminOnly,
  superAdminController.reviewNonAffiliateRequest
);

/**
 * @swagger
 * /superadmin/affiliates:
 *   get:
 *     summary: Get all affiliates
 *     description: Fetch a paginated list of all affiliates with optional filters for status, role, organization, and invitation status. Super admins can use this to view affiliate details across all organizations.
 *     tags:
 *       - Super Admin - Affiliates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, PENDING]
 *         description: Filter affiliates by account status.
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           example: COACH
 *         description: Filter affiliates by role (e.g., COACH, MANAGER, PHYSIO).
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Filter affiliates belonging to a specific organization.
 *       - in: query
 *         name: invitationStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, EXPIRED]
 *           example: ACCEPTED
 *         description: Filter affiliates by invitation status.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: John
 *         description: Search affiliates by name, email, or organization name (case-insensitive).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to return per page.
 *     responses:
 *       200:
 *         description: Affiliates retrieved successfully.
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
 *                   example: Affiliates retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     affiliates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 25
 *                           name:
 *                             type: string
 *                             example: Riya Mehta
 *                           email:
 *                             type: string
 *                             example: riya@example.com
 *                           phone:
 *                             type: string
 *                             example: 9876543210
 *                           role:
 *                             type: string
 *                             example: COACH
 *                           invitationStatus:
 *                             type: string
 *                             example: ACCEPTED
 *                           status:
 *                             type: string
 *                             example: ACTIVE
 *                           organizationId:
 *                             type: integer
 *                             example: 12
 *                           organizationName:
 *                             type: string
 *                             example: Elite Sports Academy
 *                           organizationEmail:
 *                             type: string
 *                             example: admin@elitesports.com
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-10-12T08:45:00.000Z
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-10-25T14:10:00.000Z
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 45
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *       400:
 *         description: Invalid query parameters or bad request.
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
 *                   example: Invalid filters.
 *       500:
 *         description: Internal server error.
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
 *                   example: Internal server error
 */
superAdminRouter.get("/affiliates", superAdminOnly, superAdminController.getAllAffiliates);

/**
 * @swagger
 * /superAdmin/getPresignedUrl:
 *   post:
 *     summary: Generate a presigned S3 upload URL
 *     description: Generates a presigned URL that allows the client to upload a file directly to AWS S3. Only accessible by super admin users.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "profile-picture.png"
 *                 description: Name of the file to be uploaded
 *               fileType:
 *                 type: string
 *                 example: "image/png"
 *                 description: MIME type of the file
 *     responses:
 *       200:
 *         description: Successfully generated a presigned URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 uploadUrl:
 *                   type: string
 *                   example: "https://your-bucket.s3.amazonaws.com/123456-profile-picture.png?X-Amz-Signature=..."
 *                 fileUrl:
 *                   type: string
 *                   example: "https://your-bucket.s3.ap-south-1.amazonaws.com/123456-profile-picture.png"
 *       400:
 *         description: Missing fileName or fileType in the request body
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
 *                   example: "fileName and fileType are required"
 *       401:
 *         description: Unauthorized – Only super admins can access this route
 *       500:
 *         description: Failed to generate presigned URL
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
 *                   example: "Failed to generate presigned URL"
 */
superAdminRouter.post("/getPresignedUrl", superAdminOnly, superAdminController.getPresignedUrl);

/**
 * @swagger
 * /superAdmin/addAffiliate:
 *   post:
 *     summary: Add a new affiliate to an organization
 *     description: Allows a super admin to onboard an affiliate (athlete, coach, or staff) under a verified and approved organization. An invitation code is generated and sent via SMS to the affiliate.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *               - name
 *               - phone
 *               - role
 *             properties:
 *               organizationId:
 *                 type: integer
 *                 example: 12
 *                 description: ID of the approved organization to which the affiliate will be added
 *               name:
 *                 type: string
 *                 example: "Rohit Sharma"
 *                 description: Full name of the affiliate
 *               email:
 *                 type: string
 *                 example: "rohit@example.com"
 *                 description: Email address of the affiliate
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *                 description: Phone number of the affiliate (used for SMS invitation)
 *               role:
 *                 type: string
 *                 example: "COACH"
 *                 description: Role of the affiliate (e.g., ATHLETE, COACH, STAFF)
 *               gender:
 *                 type: string
 *                 example: "MALE"
 *                 description: Gender of the affiliate
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1996-04-30"
 *                 description: Date of birth of the affiliate
 *               city:
 *                 type: string
 *                 example: "Mumbai"
 *                 description: City of the affiliate
 *               state:
 *                 type: string
 *                 example: "Maharashtra"
 *                 description: State of the affiliate
 *               pincode:
 *                 type: string
 *                 example: "400001"
 *                 description: Postal code of the affiliate
 *     responses:
 *       201:
 *         description: Affiliate added and invitation sent successfully
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
 *                   example: "Affiliate added and invitation sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 45
 *                     name:
 *                       type: string
 *                       example: "Rohit Sharma"
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     invitationCode:
 *                       type: string
 *                       example: "KIBI-AB1234"
 *                     invitationStatus:
 *                       type: string
 *                       example: "SENT"
 *       400:
 *         description: Invalid input or missing required fields
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
 *                   example: "Organization Id is required."
 *       401:
 *         description: Unauthorized – Only super admins can access this route
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal Server error."
 */
superAdminRouter.post("/addAffiliate", superAdminOnly, superAdminController.onboardAffiliateByAdmin);

/**
 * @swagger
 * /superAdmin/deleteAffiliate/{id}:
 *   delete:
 *     summary: Delete an affiliate (soft delete)
 *     description: Allows a super admin to soft delete an affiliate by ID. The record remains in the database but is marked as deleted.
 *     tags:
 *       - Super Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 25
 *         description: ID of the affiliate to be deleted
 *     responses:
 *       200:
 *         description: Affiliate deleted successfully
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
 *                   example: "Affiliate deleted successfully."
 *       400:
 *         description: Invalid or missing affiliate ID
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
 *                   example: "Invalid affiliate ID"
 *       404:
 *         description: Affiliate not found or already deleted
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
 *                   example: "Affiliate not found or might have been already deleted."
 *       401:
 *         description: Unauthorized – Only super admins can access this route
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error."
 */
superAdminRouter.delete(
  "/deleteAffiliate/:id",
  superAdminOnly,
  superAdminController.deleteAffiliateByAdmin
);

superAdminRouter.get("/getAffiliateData/:id", superAdminOnly, superAdminController.getAffiliateData);

// Organization update by super admin
superAdminRouter.put("/organizations/:orgId", superAdminOnly, superAdminController.updateOrganization);

// Audit logs
superAdminRouter.get("/audit-logs", superAdminOnly, superAdminController.getAuditLogs);

// Content moderation
superAdminRouter.get("/reported-content", superAdminOnly, superAdminController.getReportedContent);
superAdminRouter.patch("/reports/:reportId/review", superAdminOnly, superAdminController.reviewReport);

// KYC Queue and Review
superAdminRouter.get("/kyc-queue", superAdminOnly, superAdminController.getKYCQueue);
superAdminRouter.patch("/kyc/:affiliateId/review", superAdminOnly, superAdminController.reviewKYC);

// Bulk Affiliate Import
superAdminRouter.post("/affiliates/bulk-import", superAdminOnly, superAdminController.bulkImportAffiliates);
superAdminRouter.get("/affiliates/import-template", superAdminOnly, superAdminController.getBulkImportTemplate);

// ==================== Organization Verification Workflow ====================

// GET /api/super-admin/organizations/verification-queue
superAdminRouter.get(
  "/organizations/verification-queue",
  superAdminOnly,
  superAdminController.getOrganizationsForVerification
);

// PATCH /api/super-admin/organizations/:orgId/verify
superAdminRouter.patch(
  "/organizations/:orgId/verify",
  superAdminOnly,
  superAdminController.verifyOrganization
);

// PATCH /api/super-admin/organizations/:orgId/reject
superAdminRouter.patch(
  "/organizations/:orgId/reject",
  superAdminOnly,
  superAdminController.rejectOrganization
);

// GET /api/super-admin/organizations/:orgId/verification-details
superAdminRouter.get(
  "/organizations/:orgId/verification-details",
  superAdminOnly,
  superAdminController.getVerificationDetails
);

// -------------------------FEEDBACK MANAGEMENT------------------------------
superAdminRouter.get("/feedback", superAdminOnly, superAdminController.getAllFeedback);
superAdminRouter.patch("/feedback/:feedbackId", superAdminOnly, superAdminController.respondToFeedback);
superAdminRouter.get("/feedback/stats", superAdminOnly, superAdminController.getFeedbackStats);

export { superAdminRouter };
