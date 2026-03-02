import express from "express";
import { affiliateOnly, authenticate, organizationOnly } from "../middlewares/auth.js";
import { AffiliateController } from "../controllers/AffiliateController.js";

const affiliateRouter = express.Router();
const affiliateController = new AffiliateController();

// Public routes (no auth required)

/**
 * @swagger
 * /api/affiliate/request-otp:
 *   post:
 *     summary: Request OTP for Affiliate Signup
 *     description: >
 *       This endpoint allows an affiliate to request an OTP using a valid invitation code.
 *       - Validates invitation code (active, not expired, not deleted).
 *       - Matches recipient phone for affiliate invitations.
 *       - Optimizes SMS costs by reusing cached OTP if still valid.
 *       - Stores OTP in DB with expiry and attempt tracking.
 *       - Sends OTP via SMS service.
 *     tags:
 *       - Affiliate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - invitationCode
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *                 description: Phone number of the affiliate.
 *               invitationCode:
 *                 type: string
 *                 example: "INVITE123"
 *                 description: Unique invitation code.
 *     responses:
 *       200:
 *         description: OTP sent successfully or existing OTP reused.
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
 *                   example: OTP sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     expiresIn:
 *                       type: integer
 *                       example: 600
 *                     cached:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Validation error or invalid/expired invitation code.
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
 *                   example: Invalid or expired invitation code
 *       500:
 *         description: Internal server error or SMS service failure.
 *         content:clouds
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
affiliateRouter.post("/request-otp", affiliateController.requestOTP);

affiliateRouter.post("/resend-otp", affiliateController.resendOTP);


/**
 * @swagger
 * /affiliate/verify-otp-signup:
 *   post:
 *     summary: Verify OTP and complete Affiliate Signup
 *     description: >
 *       This endpoint verifies the OTP sent to the affiliate's phone and completes the signup process.
 *       - Verifies OTP from cache or DB (with expiry, attempts, and reuse protection).
 *       - Validates invitation code (active, not expired, not used).
 *       - Handles two flows:
 *         - **AFFILIATE** → Activates pre-created affiliate record linked to an organization.
 *         - **NON_AFFILIATE** → Creates a new affiliate record approved by Super Admin.
 *       - Returns a JWT token and affiliate details on successful signup.
 *     tags:
 *       - Affiliate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *               - invitationCode
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               invitationCode:
 *                 type: string
 *                 example: "INVITE123"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "StrongPass@123"
 *     responses:
 *       200:
 *         description: Signup successful, JWT token returned
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
 *                   example: Affiliate signup completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     affiliate:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 101
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         phone:
 *                           type: string
 *                           example: "9876543210"
 *                         organizationId:
 *                           type: integer
 *                           example: 5
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *       400:
 *         description: Validation error, invalid OTP, or expired/invalid invitation code
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
 *                   example: Your verification code has expired. Please request a new one.
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
 *                   example: Internal server error
 */
affiliateRouter.post("/verify-otp-signup", affiliateController.verifyOTPAndSignup);

/**
 * @swagger
 * /api/affiliate/request-invitation:
 *   post:
 *     summary: Request Non-Affiliate Invitation
 *     description: >
 *       This endpoint allows a user to request a non-affiliate invitation.
 *       - Prevents duplicate pending requests for the same phone number.
 *       - Stores request details for Super Admin review.
 *       - Returns the request ID, status, and submission timestamp.
 *     tags:
 *       - Affiliate
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
 *               - sportsCategoryId
 *               - experience
 *               - reason
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               sportsCategoryId:
 *                 type: string
 *                 example: "Football"
 *               experience:
 *                 type: string
 *                 example: "5 years of experience in local clubs"
 *               reason:
 *                 type: string
 *                 example: "Looking to join as a non-affiliate for wider exposure"
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: URL or identifier of uploaded document
 *                 example: ["https://example.com/certificate1.pdf", "https://example.com/id-proof.png"]
 *     responses:
 *       201:
 *         description: Invitation request submitted successfully
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
 *                   example: Invitation request submitted successfully. You will be notified once reviewed.
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: integer
 *                       example: 42
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-17T10:15:30.000Z"
 *       400:
 *         description: Validation error or duplicate pending request
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
 *                   example: A request is already pending for this phone number
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
 *                   example: Internal server error
 */
affiliateRouter.post("/request-invitation", affiliateController.requestNonAffiliateInvitation);

/**
 * @swagger
 * /api/affiliate/login:
 *   post:
 *     summary: Affiliate login
 *     description: Allows an affiliate to log in using phone and password. Returns a JWT token on success.
 *     tags:
 *       - Affiliate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *                 description: Affiliate phone number
 *               password:
 *                 type: string
 *                 example: "Password123"
 *                 description: Affiliate password
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and affiliate info
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
 *                       description: JWT token for authentication
 *                     affiliate:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "12345"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         phone:
 *                           type: string
 *                           example: "9876543210"
 *                         organizationId:
 *                           type: string
 *                           example: "org_001"
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *       400:
 *         description: Validation error (e.g., missing phone or password)
 *       401:
 *         description: Invalid credentials or inactive affiliate
 *       500:
 *         description: Internal server error
 */

affiliateRouter.post("/login", affiliateController.affiliateLogin);

/**
 * @swagger
 * /api/affiliate/login/verify-otp:
 *   post:
 *     summary: Affiliate login verify otp
 *     description: Allows an affiliate to log in using phone and otp. Returns a JWT token on success.
 *     tags:
 *       - Affiliate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *                 description: Affiliate phone number
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: Affiliate password
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and affiliate info
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
 *                       description: JWT token for authentication
 *                     affiliate:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "12345"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         phone:
 *                           type: string
 *                           example: "9876543210"
 *                         organizationId:
 *                           type: string
 *                           example: "org_001"
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *       400:
 *         description: Validation error (e.g., missing phone or password)
 *       401:
 *         description: Invalid credentials or inactive affiliate
 *       500:
 *         description: Internal server error
 */

affiliateRouter.post("/login/verify-otp", affiliateController.verifyAffiliateLoginOTP);

/**
 * @swagger
 * /api/affiliate/profile:
 *   get:
 *     summary: Get affiliate profile
 *     description: Retrieves the profile details of the currently authenticated affiliate, including organization info.
 *     tags:
 *       - Affiliate
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                   example: Profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: aff_12345
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: john.doe@example.com
 *                     phone:
 *                       type: string
 *                       example: +919876543210
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                       example: 1995-06-15
 *                     gender:
 *                       type: string
 *                       example: Male
 *                     sportsCategoryId:
 *                       type: string
 *                       example: Football
 *                     position:
 *                       type: string
 *                       example: Forward
 *                     profilePicture:
 *                       type: string
 *                       example: https://example.com/images/john.jpg
 *                     bio:
 *                       type: string
 *                       example: Passionate football player with 5 years of experience
 *                     achievements:
 *                       type: string
 *                       example: "State level champion 2021"
 *                     status:
 *                       type: string
 *                       example: active
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-09-16T10:20:30.000Z
 *                     organizationName:
 *                       type: string
 *                       example: Elite Sports Club
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */

// Protected routes (Affiliate only)
affiliateRouter.get("/profile", affiliateOnly, affiliateController.getProfile);

/**
 * @swagger
 * /api/affiliate/profile/update:
 *   put:
 *     summary: Update affiliate profile
 *     description: Allows authenticated affiliates to update their profile information
 *     tags:
 *       - Affiliate
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1995-06-15"
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: "MALE"
 *               sportsCategoryId:
 *                 type: string
 *                 example: "Football"
 *               position:
 *                 type: string
 *                 example: "Forward"
 *               bio:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Professional footballer with 5 years experience"
 *               achievements:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "State champion 2024, National runner-up 2023"
 *               profilePicture:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/profile.jpg"
 *              followers:
 *                type: integer
 *                example: 1500
 *              city:
 *                type: string
 *                example: "New York"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     # ... other profile fields
 *       400:
 *         description: Validation error or email already in use
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Affiliate not found
 *       500:
 *         description: Internal server error
 */
affiliateRouter.put("/profile/update", affiliateOnly, affiliateController.updateProfile);

/**
 * @swagger
 * /api/affiliate/getPresignedUrl:
 *   post:
 *     summary: Generate a presigned S3 upload URL
 *     description: Allows authenticated affiliates to generate a temporary presigned URL for uploading files directly to AWS S3.
 *     tags:
 *       - Affiliate
 *     security:
 *       - bearerAuth: []   # JWT token required
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
 *                 example: "profile.jpg"
 *                 description: Name of the file to be uploaded
 *               fileType:
 *                 type: string
 *                 example: "image/jpeg"
 *                 description: MIME type of the file being uploaded
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
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
 *                   example: "https://s3.amazonaws.com/your-bucket/abc123?AWSAccessKeyId=..."
 *                 fileUrl:
 *                   type: string
 *                   example: "https://your-bucket.s3.ap-south-1.amazonaws.com/abc123-profile.jpg"
 *       400:
 *         description: Missing required fields (fileName or fileType)
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
 *         description: Unauthorized - Missing or invalid token
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
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
affiliateRouter.post("/getPresignedUrl", affiliateOnly, affiliateController.getPresignedUrl);

/**
 * @swagger
 * /api/affiliate/athletes-under-my-org:
 *   get:
 *     summary: Get all athletes under the affiliate's organization
 *     description: Allows an authenticated affiliate to fetch a paginated list of all athletes linked to their organization.
 *     tags:
 *       - Affiliate
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination (default is 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of athletes per page (default is 10)
 *     responses:
 *       200:
 *         description: Successfully fetched athletes under the affiliate's organization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 25
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 12
 *                       name:
 *                         type: string
 *                         example: "Rahul Sharma"
 *                       email:
 *                         type: string
 *                         example: "rahul@example.com"
 *                       phone:
 *                         type: string
 *                         example: "+91-9876543210"
 *                       profilePicture:
 *                         type: string
 *                         format: uri
 *                         example: "https://example-bucket.s3.ap-south-1.amazonaws.com/rahul.jpg"
 *                       bio:
 *                         type: string
 *                         example: "State-level football player with 3 years of experience"
 *                       achievements:
 *                         type: string
 *                         example: "Gold medal - State Championship 2023"
 *                       status:
 *                         type: string
 *                         example: "ACTIVE"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-06T10:30:00.000Z"
 *       403:
 *         description: Forbidden - Only affiliates can access this resource or access denied
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
 *                   example: "Only affiliates can access this resource."
 *       404:
 *         description: Affiliate not linked to any organization
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
 *                   example: "Affiliate is not linked to any organization."
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
affiliateRouter.get(
  "/athletes-under-my-org",
  affiliateOnly,
  affiliateController.getAllAthletesUnderOrganization
);



affiliateRouter.post(
  "/athleteUpdate",
  affiliateOnly,
  affiliateController.athleteUpdate
);


/**
 * @swagger
 * /api/affiliate/getSameOrganizationAffiliatesData/{id}:
 *   get:
 *     summary: Get affiliate details from the same organization
 *     description: Allows an authenticated affiliate to fetch detailed information of another affiliate from the same organization. Access is restricted to affiliates within the same organization.
 *     tags:
 *       - Affiliate
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 42
 *         description: ID of the affiliate whose details are to be fetched
 *     responses:
 *       200:
 *         description: Affiliate details fetched successfully
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
 *                   example: "Affiliate details fetched successfully."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     name:
 *                       type: string
 *                       example: "Amit Kumar"
 *                     email:
 *                       type: string
 *                       example: "amit.kumar@example.com"
 *                     phone:
 *                       type: string
 *                       example: "+91-9876543210"
 *                     organizationId:
 *                       type: integer
 *                       example: 7
 *                     role:
 *                       type: string
 *                       example: "ATHLETE"
 *                     bio:
 *                       type: string
 *                       example: "Professional basketball player with 5 years of experience"
 *                     achievements:
 *                       type: string
 *                       example: "Gold medalist - State Tournament 2023"
 *                     profilePicture:
 *                       type: string
 *                       format: uri
 *                       example: "https://example-bucket.s3.ap-south-1.amazonaws.com/amit.jpg"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-05T14:22:00.000Z"
 *       400:
 *         description: Affiliate ID missing in request parameters
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
 *                   example: "Affiliate ID is required in params."
 *       403:
 *         description: Access denied or invalid organization
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
 *                   example: "Access denied to affiliates of other organizations."
 *       404:
 *         description: Organization not found for the given affiliate
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
 *                   example: "Organization not found for the given affiliate."
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
affiliateRouter.get(
  "/getSameOrganizationAffiliatesData/:id",
  affiliateOnly,
  affiliateController.getSameOrganizationAffiliatesData
);

affiliateRouter.post("/sign-in", affiliateController.signin);

// affiliateRouter.post('/otpRequestForNonAffiliate', otpRequestForNonAffiliate )
affiliateRouter.post("/validateNonAffiliateOTP", affiliateController.validateNonAffiliateOTP);

affiliateRouter.post("/validateInviteCode", affiliateController.validateInviteCode); //TODO => INCLUDE THIS API IN POSTMAN
affiliateRouter.post("/validateOTP", affiliateController.validateAffiliateOTP);

// case 1 -> if exist and affiliate
// call sign in + validate otp

// case 2 -> if exist and non affiliate
// call sign in + validate otp

// case 3 -> does not exist and affiliate
// validateInviteCode

// case 4 -> does not exist and non-affiliate
// otp request + validate non affiliate otp(includes, name, role and phone) -> if success ->

// -------------------------EXPERIENCE------------------------------
affiliateRouter.post("/add-experience", affiliateOnly, affiliateController.addExperience);
affiliateRouter.delete(
  "/delete-experience/:id",
  affiliateOnly,
  affiliateController.deleteExperience
);
affiliateRouter.put("/update-experience/:id", affiliateOnly, affiliateController.updateExperience);
affiliateRouter.get("/get-experience", affiliateOnly, affiliateController.getExperiences);

// -------------------------EDUCATION------------------------------
affiliateRouter.post("/add-education", affiliateOnly, affiliateController.addEducation);
affiliateRouter.delete("/delete-education/:id", affiliateOnly, affiliateController.deleteEducation);
affiliateRouter.put("/update-education/:id", affiliateOnly, affiliateController.updateEducation);
affiliateRouter.get("/get-education", affiliateOnly, affiliateController.getEducation);

affiliateRouter.post("/create-certificate", affiliateOnly, affiliateController.createAffiliateCertificate);
affiliateRouter.get("/get-certificate", affiliateOnly, affiliateController.getAllAffiliateCertificates);
affiliateRouter.get(
  "/get-certificate/:id",
  affiliateOnly,
  affiliateController.getAffiliateCertificateById
);
affiliateRouter.put(
  "/update-certificate/:id",
  affiliateOnly,
  affiliateController.updateAffiliateCertificate
);
affiliateRouter.delete(
  "/delete-certificate/:id",
  affiliateOnly,
  affiliateController.deleteAffiliateCertificate
);

affiliateRouter.post("/create-award", affiliateOnly, affiliateController.createAffiliateAwardRecognition);
affiliateRouter.get("/get-award", affiliateOnly, affiliateController.getAllAffiliateAwardRecognitions);
affiliateRouter.get(
  "/get-award/:id",
  affiliateOnly,
  affiliateController.getAffiliateAwardRecognitionById
);
affiliateRouter.put(
  "/update-award/:id",
  affiliateOnly,
  affiliateController.updateAffiliateAwardRecognition
);
affiliateRouter.delete(
  "/delete-award/:id",
  affiliateOnly,
  affiliateController.deleteAffiliateAwardRecognition
);

affiliateRouter.post(
  "/create-publication",
  affiliateOnly,
  affiliateController.createAffiliatePublication
);
affiliateRouter.get(
  "/getPublications",
  affiliateOnly,
  affiliateController.getAllAffiliatePublications
);
affiliateRouter.get(
  "/get-publication/:id",
  affiliateOnly,
  affiliateController.getAffiliatePublicationById
);
affiliateRouter.put(
  "/update-publication/:id",
  affiliateOnly,
  affiliateController.updateAffiliatePublication
);
affiliateRouter.delete(
  "/delete-publication/:id",
  affiliateOnly,
  affiliateController.deleteAffiliatePublication
);

affiliateRouter.post("/create-collaborate", affiliateOnly, affiliateController.createCollaborator);
affiliateRouter.get(
  "/get-collaborator",
  affiliateOnly,
  affiliateController.getCollaboratorByAffiliate
);
affiliateRouter.put(
  "/update-collaborator/:id",
  affiliateOnly,
  affiliateController.updateCollaborator
);
affiliateRouter.delete(
  "/delete-collaborator/:id",
  affiliateOnly,
  affiliateController.deleteCollaborator
);

affiliateRouter.get("/basic-info", affiliateOnly, affiliateController.getBasicInfo);

affiliateRouter.post("/add-brand/:id", affiliateOnly, affiliateController.addBrand);
affiliateRouter.delete("/delete-brand/:id", affiliateOnly, affiliateController.deleteBrand);
affiliateRouter.get("/get-all-brands", affiliateOnly, affiliateController.getAllBrandsForAffiliate);
affiliateRouter.patch(
  "/update-brand/:id",
  affiliateOnly,
  affiliateController.updateBrand
);
affiliateRouter.delete(
  "/delete-profile",
  affiliateOnly,
  affiliateController.deleteProfile
);

affiliateRouter.post("/generate-profile-link", affiliateOnly, affiliateController.generateProfileLink);
affiliateRouter.get("/public/:slug", affiliateController.getPublicProfile);

affiliateRouter.post("/rapid-api", affiliateOnly, affiliateController.fetchDataFromRapidApi)

affiliateRouter.get("/ig-data", affiliateOnly, affiliateController.getInstagramData)
affiliateRouter.post("/ig-delete", affiliateOnly, affiliateController.deleteInstagramData)

// KYC submission
affiliateRouter.post("/kyc/submit", affiliateOnly, affiliateController.submitKYC);

// Forgot/Reset password (no auth required)
affiliateRouter.post("/forgot-password", affiliateController.forgotPassword);
affiliateRouter.post("/reset-password", affiliateController.resetPassword);

// Affiliate search/discovery (public, no auth)
affiliateRouter.get("/search", affiliateController.searchAffiliates);

// Profile strength
affiliateRouter.get("/profile-strength", affiliateOnly, affiliateController.getProfileStrength);

// Notification preferences
affiliateRouter.get("/notification-preferences", affiliateOnly, affiliateController.getNotificationPreferences);
affiliateRouter.put("/notification-preferences", affiliateOnly, affiliateController.updateNotificationPreferences);

// Follow system
affiliateRouter.post("/follow", affiliateOnly, affiliateController.followAffiliate);
affiliateRouter.delete("/follow/:affiliateId", affiliateOnly, affiliateController.unfollowAffiliate);
affiliateRouter.get("/followers/:affiliateId", affiliateController.getFollowers);
affiliateRouter.get("/following/:affiliateId", affiliateController.getFollowing);

// -------------------------MEDIA GALLERY------------------------------
affiliateRouter.post("/media", affiliateOnly, affiliateController.addMediaItem);
affiliateRouter.get("/:affiliateId/media", affiliateController.getMediaGallery);
affiliateRouter.delete("/media/:mediaId", affiliateOnly, affiliateController.deleteMediaItem);
affiliateRouter.patch("/media/reorder", affiliateOnly, affiliateController.reorderMedia);

// -------------------------INVITATION SYSTEM------------------------------
affiliateRouter.post("/invitations/generate", organizationOnly, affiliateController.generateInvitation);
affiliateRouter.get("/invitations", organizationOnly, affiliateController.getInvitations);
affiliateRouter.post("/invitations/accept", authenticate, affiliateController.acceptInvitation);
affiliateRouter.delete("/invitations/:id", organizationOnly, affiliateController.revokeInvitation);

// -------------------------ENDORSEMENT SYSTEM------------------------------
affiliateRouter.post("/endorse", affiliateOnly, affiliateController.endorseAffiliate);
affiliateRouter.delete("/endorse/:endorsementId", affiliateOnly, affiliateController.removeEndorsement);
affiliateRouter.get("/:affiliateId/endorsements", affiliateController.getEndorsements);
affiliateRouter.get("/:affiliateId/endorsement-stats", affiliateController.getEndorsementStats);

// -------------------------PERFORMANCE STATS------------------------------
affiliateRouter.get("/:affiliateId/performance", affiliateOnly, affiliateController.getPerformanceStats);
affiliateRouter.post("/:affiliateId/view", affiliateOnly, affiliateController.trackProfileView);
affiliateRouter.get("/leaderboard", affiliateController.getLeaderboard);

// -------------------------FEEDBACK SYSTEM------------------------------
affiliateRouter.post("/feedback", affiliateOnly, affiliateController.submitFeedback);
affiliateRouter.get("/feedback", affiliateOnly, affiliateController.getMyFeedback);

// -------------------------PORTFOLIO / MEDIA KIT (Round 7)------------------------------

// GET /api/affiliate/:affiliateId/portfolio — public portfolio (no auth)
affiliateRouter.get("/:affiliateId/portfolio", affiliateController.getPortfolio);

// GET /api/affiliate/:affiliateId/portfolio/export — portfolio PDF export (auth required)
affiliateRouter.get("/:affiliateId/portfolio/export", authenticate, affiliateController.generatePortfolioPDF);

// -------------------------AVAILABILITY CALENDAR (Round 8)------------------------------

// POST /api/affiliate/availability — set availability slots (affiliate auth)
affiliateRouter.post("/availability", affiliateOnly, affiliateController.setAvailability);

// GET /api/affiliate/:affiliateId/availability — get availability for a date range
affiliateRouter.get("/:affiliateId/availability", authenticate, affiliateController.getAvailability);

// GET /api/affiliate/:affiliateId/availability/check — check availability for event time window
affiliateRouter.get("/:affiliateId/availability/check", authenticate, affiliateController.checkAvailabilityForEvent);

// -------------------------MESSAGING / INBOX (Round 9)------------------------------

// POST /api/affiliate/messages — send a direct message (auth required)
affiliateRouter.post("/messages", authenticate, affiliateController.sendMessage);

// GET /api/affiliate/messages/conversations — get all conversations (auth required)
affiliateRouter.get("/messages/conversations", authenticate, affiliateController.getConversations);

// GET /api/affiliate/messages/:otherAffiliateId — get messages with another affiliate (auth required)
affiliateRouter.get("/messages/:otherAffiliateId", authenticate, affiliateController.getConversationMessages);

// PATCH /api/affiliate/messages/:otherAffiliateId/read — mark messages as read (auth required)
affiliateRouter.patch("/messages/:otherAffiliateId/read", authenticate, affiliateController.markMessagesRead);

// -------------------------SKILLS & ENDORSEMENT BADGES (Round 10)------------------------------

// GET /api/affiliate/skills/top — top endorsed skills leaderboard (public, no auth)
affiliateRouter.get("/skills/top", affiliateController.getTopSkills);

// POST /api/affiliate/skills — add a skill (auth required)
affiliateRouter.post("/skills", authenticate, affiliateController.addSkill);

// POST /api/affiliate/skills/:skillId/endorse — endorse another affiliate's skill (auth required)
affiliateRouter.post("/skills/:skillId/endorse", authenticate, affiliateController.endorseSkill);

// GET /api/affiliate/:affiliateId/skills — get all skills for an affiliate (public, no auth)
affiliateRouter.get("/:affiliateId/skills", affiliateController.getSkills);

// -------------------------TRAINING / COURSE ENROLLMENT (Round 10)------------------------------

// GET /api/affiliate/courses/my-enrollments — get own enrollments (auth required)
affiliateRouter.get("/courses/my-enrollments", authenticate, affiliateController.getMyEnrollments);

// POST /api/affiliate/courses/:courseId/enroll — enroll in a course (auth required)
affiliateRouter.post("/courses/:courseId/enroll", authenticate, affiliateController.enrollInCourse);

// PATCH /api/affiliate/courses/enrollments/:enrollmentId/progress — update progress (auth required)
affiliateRouter.patch("/courses/enrollments/:enrollmentId/progress", authenticate, affiliateController.updateCourseProgress);

// GET /api/affiliate/courses/:courseId/leaderboard — course leaderboard (public, no auth)
affiliateRouter.get("/courses/:courseId/leaderboard", affiliateController.getCourseLeaderboard);

// -------------------------AFFILIATE GOALS (Round 11)------------------------------

// POST /api/affiliate/goals — set a personal goal (auth required)
affiliateRouter.post("/goals", authenticate, affiliateController.setGoal);

// GET /api/affiliate/goals — get all goals with progress (auth required)
affiliateRouter.get("/goals", authenticate, affiliateController.getGoals);

// PATCH /api/affiliate/goals/:goalId — update goal progress (auth required)
affiliateRouter.patch("/goals/:goalId", authenticate, affiliateController.updateGoalProgress);

// DELETE /api/affiliate/goals/:goalId — delete a goal (auth required)
affiliateRouter.delete("/goals/:goalId", authenticate, affiliateController.deleteGoal);

// -------------------------PERSONAL ANALYTICS (Round 12)------------------------------

// GET /api/affiliate/analytics/personal — get aggregated personal stats (affiliate auth)
affiliateRouter.get("/analytics/personal", affiliateOnly, affiliateController.getPersonalAnalytics);

// GET /api/affiliate/analytics/timeline — get recent activity timeline (affiliate auth)
affiliateRouter.get("/analytics/timeline", affiliateOnly, affiliateController.getActivityTimeline);

// POST /api/affiliate/profile-views/:affiliateId — increment profile views (public, no auth)
affiliateRouter.post("/profile-views/:affiliateId", affiliateController.updateProfileViews);

// -------------------------BADGE / ACHIEVEMENT SYSTEM (Round 13)------------------------------

// GET /api/affiliate/badges — get all badge definitions (public, no auth)
affiliateRouter.get("/badges", affiliateController.getBadges);

// GET /api/affiliate/my-badges — get badges earned by logged-in affiliate (affiliate auth)
affiliateRouter.get("/my-badges", affiliateOnly, affiliateController.getMyBadges);

// POST /api/affiliate/badges/check — check and award new badges (affiliate auth)
affiliateRouter.post("/badges/check", affiliateOnly, affiliateController.checkAndAwardBadges);

// GET /api/affiliate/badges/leaderboard — badge leaderboard (public, no auth)
affiliateRouter.get("/badges/leaderboard", affiliateController.getLeaderboardByBadges);

// -------------------------AFFILIATE REFERRAL TRACKING (Round 14)------------------------------

// GET /api/affiliate/referrals/stats — get referral stats (affiliate auth)
affiliateRouter.get("/referrals/stats", affiliateOnly, affiliateController.getReferralStats);

// GET /api/affiliate/referrals/list — list referred users (affiliate auth)
affiliateRouter.get("/referrals/list", affiliateOnly, affiliateController.getMyReferrals);

// POST /api/affiliate/referrals/generate-link — generate referral link (affiliate auth)
affiliateRouter.post("/referrals/generate-link", affiliateOnly, affiliateController.generateReferralLink);

// POST /api/affiliate/referrals/convert — track referral conversion (no auth - called during registration)
affiliateRouter.post("/referrals/convert", affiliateController.trackReferralConversion);

// -------------------------AFFILIATE COMPARISON TOOL (Round 14)------------------------------

// POST /api/affiliate/compare — compare 2-4 affiliates side by side (public, no auth)
affiliateRouter.post("/compare", affiliateController.compareAffiliates);

// GET /api/affiliate/:affiliateId/similar — find similar affiliates (public, no auth)
affiliateRouter.get("/:affiliateId/similar", affiliateController.getSimilarAffiliates);

// -------------------------NOTIFICATION CENTER (Round 14)------------------------------

// GET /api/affiliate/notifications — get paginated notification history (affiliate auth)
affiliateRouter.get("/notifications", affiliateOnly, affiliateController.getNotificationHistory);

// PATCH /api/affiliate/notifications/read-all — mark all as read (affiliate auth)
// NOTE: This must be before the /:notificationId/read route to avoid param capture
affiliateRouter.patch("/notifications/read-all", affiliateOnly, affiliateController.markAllNotificationsRead);

// GET /api/affiliate/notifications/unread-count — get unread count (affiliate auth)
affiliateRouter.get("/notifications/unread-count", affiliateOnly, affiliateController.getUnreadCount);

// PATCH /api/affiliate/notifications/:notificationId/read — mark one as read (affiliate auth)
affiliateRouter.patch("/notifications/:notificationId/read", affiliateOnly, affiliateController.markNotificationRead);

export { affiliateRouter };
