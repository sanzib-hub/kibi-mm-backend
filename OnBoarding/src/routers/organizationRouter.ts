import express from "express";
import { authenticate, organizationOnly } from "../middlewares/auth.js";
import { OrganizationController } from "../controllers/OrganizationController.js";

const organizationRouter = express.Router();
const organizationController = new OrganizationController();

// Public routes (no auth required)
/**
 * @swagger
 * /api/organization/login:
 *   post:
 *     summary: Organization Login
 *     description: >
 *       Authenticates a sports organization using registered email and password.
 *       Returns a JWT token if credentials are valid and the organization status is **APPROVED**.
 *     tags:
 *       - Organization - Auth
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
 *                 example: "org@example.com"
 *                 description: Registered email of the organization.
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "StrongPassw0rd!"
 *                 description: Account password.
 *     responses:
 *       200:
 *         description: Login successful — returns JWT token and organization summary.
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
 *                       description: JWT to be used in Authorization header as `Bearer <token>`.
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 12
 *                         name:
 *                           type: string
 *                           example: "Kibi Sports Academy"
 *                         email:
 *                           type: string
 *                           example: "org@example.com"
 *                         status:
 *                           type: string
 *                           example: "APPROVED"
 *                         isFirstLogin:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Validation error (e.g., missing email/password or invalid format).
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
 *                   example: "Email is required"
 *       401:
 *         description: Unauthorized — invalid credentials or organization not approved.
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
organizationRouter.post("/login", organizationController.login);

/**
 * @swagger
 * /api/organization/update-password:
 *   put:
 *     summary: Change Organization Password
 *     description: >
 *       Allows an authenticated organization to change its password.
 *       Requires a valid Bearer token and verifies the old password before updating.
 *     tags:
 *       - Organization - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 example: "OldPass@123"
 *                 description: Current password of the organization account.
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewPass@456"
 *                 description: New password to be set (must differ from the old one).
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewPass@456"
 *                 description: Must match the new password.
 *     responses:
 *       200:
 *         description: Password updated successfully.
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
 *                   example: "Password updated successfully"
 *       400:
 *         description: Bad Request — validation or password mismatch error.
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
 *                   example: "Old password is incorrect"
 *       401:
 *         description: Unauthorized — missing or invalid Bearer token.
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
 *                   example: "Access token required"
 *       403:
 *         description: Forbidden — organization not approved or deleted.
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
 *                   example: "Organization not approved yet"
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
organizationRouter.put(
  "/update-password",
  organizationOnly,
  organizationController.changePassword
);

// Protected routes (Organization only)

/**
 * @swagger
 * /api/organization/affiliates:
 *   post:
 *     summary: Add a new affiliate
 *     description: >
 *       This endpoint allows an organization to add a new affiliate under its account.
 *       - Requires a valid organization JWT (organizationOnly middleware).
 *       - Validates input fields using schema.
 *       - Prevents duplicate affiliates by checking phone or email within the same organization.
 *       - Generates an invitation code and sends it to the affiliate via SMS.
 *       - Creates an audit trail for compliance.
 *     tags:
 *       - Organization - Affiliates
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Alice Smith"
 *                 description: Full name of the affiliate.
 *               email:
 *                 type: string
 *                 example: "alice@example.com"
 *                 description: Email of the affiliate (must be unique within the organization).
 *               role:
 *                 type: string
 *                 example: "PLAYER"
 *                 description: Role of the affiliate in the organization.
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *                 description: Phone number of the affiliate (must be unique within the organization).
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1995-02-15"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 example: "Female"
 *               sportsCategoryId:
 *                 type: string
 *                 example: "Basketball"
 *               position:
 *                 type: string
 *                 example: "Forward"
 *               bio:
 *                 type: string
 *                 example: "College level basketball player"
 *               achievements:
 *                 type: string
 *                 example: "MVP 2020"
 *     responses:
 *       201:
 *         description: Affiliate created and invitation sent successfully.
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
 *                   example: Affiliate added and invitation sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     name:
 *                       type: string
 *                       example: Alice Smith
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     invitationCode:
 *                       type: string
 *                       example: INV12345
 *                     invitationStatus:
 *                       type: string
 *                       example: SENT
 *       400:
 *         description: Validation error or duplicate phone/email.
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
 *                   example: Affiliate with this phone number or email already exists
 *       401:
 *         description: Unauthorized (missing or invalid token).
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
 *                   example: Access token required
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
 *                   example: Organization not found
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

organizationRouter.post("/affiliates", organizationOnly, organizationController.addAffiliate);

/**
 * @swagger
 * /api/organization/affiliates/bulk:
 *   post:
 *     summary: Bulk Add Affiliates
 *     description: >
 *       This endpoint allows an organization to add multiple affiliates at once.
 *       - Validates each affiliate's details individually.
 *       - Prevents duplicates based on phone number or email.
 *       - Generates unique invitation codes for each affiliate.
 *       - Sends SMS invitations to affiliates.
 *       - Returns a summary of successful and failed inserts.
 *     tags:
 *       - Organization - Affiliates
 *     security:
 *       - bearerAuth: []  # Assuming you use JWT auth for organizationOnly
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliates
 *             properties:
 *               affiliates:
 *                 type: array
 *                 description: List of affiliate objects to add
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - email
 *                     - phone
 *                     - role
 *                     - dateOfBirth
 *                     - gender
 *                     - sportsCategoryId
 *                     - position
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Arjun Mehta"
 *                     email:
 *                       type: string
 *                       example: "arjun.mehta@example.com"
 *                     phone:
 *                       type: string
 *                       example: "9001122334"
 *                     role:
 *                       type: string
 *                       example: "PLAYER"
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                       example: "1997-08-21"
 *                     gender:
 *                       type: string
 *                       example: "MALE"
 *                     sportsCategoryId:
 *                       type: string
 *                       example: "Football"
 *                     position:
 *                       type: string
 *                       example: "Striker"
 *                     bio:
 *                       type: string
 *                       example: "University football team striker"
 *                     achievements:
 *                       type: string
 *                       example: "Top scorer 2023"
 *     responses:
 *       201:
 *         description: Bulk add processed successfully
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
 *                   example: "Processed 3 affiliates. 2 successful, 1 failed."
 *                 data:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 7
 *                           name:
 *                             type: string
 *                             example: "Neha Kapoor"
 *                           phone:
 *                             type: string
 *                             example: "9012233445"
 *                           invitationCode:
 *                             type: string
 *                             example: "53YX7TQ2"
 *                           status:
 *                             type: string
 *                             example: "SUCCESS"
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index:
 *                             type: integer
 *                             example: 0
 *                           phone:
 *                             type: string
 *                             example: "9001122334"
 *                           email:
 *                             type: string
 *                             example: "arjun.mehta@example.com"
 *                           error:
 *                             type: string
 *                             example: "Affiliate with this phone or email already exists"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 3
 *                         successful:
 *                           type: integer
 *                           example: 2
 *                         failed:
 *                           type: integer
 *                           example: 1
 *       400:
 *         description: Validation error or invalid affiliate data
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
 *                   example: "Validation error: email is required"
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
organizationRouter.post(
  "/affiliates/bulk",
  organizationOnly,
  organizationController.bulkAddAffiliates
);

/**
 * @swagger
 * /api/organization/affiliates:
 *   get:
 *     summary: Get all affiliates under an organization
 *     description: >
 *       This endpoint retrieves a paginated list of affiliates belonging to the authenticated organization.
 *       - Requires a valid organization JWT (verified via `organizationOnly` middleware).
 *       - Supports filtering by affiliate status, role, and invitation status.
 *       - Supports search across name, phone, and email fields.
 *       - Returns pagination metadata including total count and total pages.
 *       - Affiliates are returned in descending order of creation date.
 *     tags:
 *       - Organization - Affiliates
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: "ACTIVE"
 *         description: Filter affiliates by their status (e.g., ACTIVE, INACTIVE, PENDING).
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           example: "PLAYER"
 *         description: Filter affiliates by role.
 *       - in: query
 *         name: invitationStatus
 *         schema:
 *           type: string
 *           example: "SENT"
 *         description: Filter affiliates by invitation status (e.g., SENT, PENDING).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Alice"
 *         description: Search affiliates by name, phone, or email.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
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
 *                   example: "Affiliates retrieved successfully."
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
 *                             example: 101
 *                           name:
 *                             type: string
 *                             example: "Alice Smith"
 *                           email:
 *                             type: string
 *                             example: "alice@example.com"
 *                           phone:
 *                             type: string
 *                             example: "9876543210"
 *                           role:
 *                             type: string
 *                             example: "PLAYER"
 *                           status:
 *                             type: string
 *                             example: "ACTIVE"
 *                           invitationStatus:
 *                             type: string
 *                             example: "SENT"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-28T10:30:00.000Z"
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
 *                           example: 35
 *                         totalPages:
 *                           type: integer
 *                           example: 4
 *       401:
 *         description: Unauthorized — missing or invalid token.
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
 *                   example: "Access token required"
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
organizationRouter.get("/affiliates", organizationOnly, organizationController.getAffiliates);

/**
 * @swagger
 * /api/organization/affiliates/{id}/resend-invitation:
 *   post:
 *     summary: Resend invitation to an affiliate
 *     description: >
 *       This endpoint allows an organization to resend a new invitation to an existing affiliate.
 *       - Requires a valid organization JWT (validated via `organizationOnly` middleware).
 *       - Generates a new invitation code, invalidates the previous one, and sends a fresh SMS invitation.
 *       - Prevents resending invitations to affiliates who have already accepted.
 *       - Maintains an audit trail via `invitation_codes` table for tracking.
 *     tags:
 *       - Organization - Affiliates
 *     security:
 *       - bearerAuth: []   # JWT token required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Unique ID of the affiliate to resend the invitation to.
 *     responses:
 *       200:
 *         description: Invitation resent successfully.
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
 *                   example: Invitation resent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     affiliateId:
 *                       type: integer
 *                       example: 12
 *                     newInvitationCode:
 *                       type: string
 *                       example: INV56789
 *       400:
 *         description: Invalid request or invitation already accepted.
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
 *                   example: Invitation already accepted
 *       401:
 *         description: Unauthorized (missing or invalid token).
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
 *                   example: Access token required
 *       403:
 *         description: Forbidden (organization access required or organization not approved).
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
 *                   example: Organization access required
 *       404:
 *         description: Affiliate not found or does not belong to the organization.
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
 *                   example: Affiliate not found
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
organizationRouter.post(
  "/affiliates/:id/resend-invitation",
  organizationOnly,
  organizationController.resendInvitation
);

/**
 * @swagger
 * /api/organization/affiliates/{id}/status:
 *   patch:
 *     summary: Update Affiliate Status
 *     description: Allows an organization to update the status of a specific affiliate (e.g., PENDING, VERIFIED, BANNED, FLAGGED). Records the change in audit logs along with the reason for the update.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the affiliate whose status needs to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, VERIFIED, BANNED, FLAGGED]
 *                 description: New status to assign to the affiliate.
 *               reason:
 *                 type: string
 *                 description: Optional reason for the status change (recorded in audit logs).
 *             required:
 *               - status
 *           example:
 *             status: "BANNED"
 *             reason: "Suspicious activity detected"
 *     responses:
 *       200:
 *         description: ✅ Affiliate status successfully updated.
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
 *                   example: "Affiliate status updated to BANNED"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 23
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     status:
 *                       type: string
 *                       example: "BANNED"
 *                     updatedAt:
 *                       type: string
 *                       example: "2025-11-09T18:45:23.000Z"
 *       400:
 *         description: ⚠️ Bad Request — Validation failed or no status change needed.
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
 *                   example: "Affiliate status is already VERIFIED"
 *       404:
 *         description: ❌ Affiliate not found or unauthorized access attempt.
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
 *                   example: "Affiliate not found or does not belong to your organization"
 *       500:
 *         description: 💥 Internal Server Error — Something went wrong on the server.
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
organizationRouter.patch(
  "/affiliates/:id/status",
  organizationOnly,
  organizationController.updateAffiliateStatus
);

/**
 * @swagger
 * /api/organization/dashboard/stats:
 *   get:
 *     summary: Get Organization Dashboard Stats
 *     description: Retrieves key statistics for an organization’s dashboard, including total affiliates, active affiliates, pending invitations, and affiliates added in the last 30 days.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ✅ Dashboard statistics retrieved successfully.
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
 *                   example: "Dashboard stats retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAffiliates:
 *                       type: integer
 *                       example: 120
 *                     activeAffiliates:
 *                       type: integer
 *                       example: 85
 *                     pendingInvitations:
 *                       type: integer
 *                       example: 10
 *                     recentAffiliates:
 *                       type: integer
 *                       example: 15
 *       401:
 *         description: 🔒 Unauthorized — Only authenticated organizations can access this endpoint.
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
 *                   example: "Unauthorized access"
 *       500:
 *         description: 💥 Internal Server Error — Something went wrong on the server.
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
organizationRouter.get("/dashboard/stats", organizationOnly, organizationController.getDashboardStats);


/**
 * @swagger
 * /api/organization/details:
 *   get:
 *     summary: 🔒 Get Organization Details
 *     description: ✅ Retrieves the details of the logged-in sports organization.
 *     tags:
 *       - 🏢 Organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ✅ Organization details retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Organization details retrieved successfully"
 *               data:
 *                 id: 1
 *                 name: "SportsHub Pvt Ltd"
 *                 email: "contact@sportshub.com"
 *                 status: "APPROVED"
 *                 isFirstLogin: false
 *                 createdAt: "2025-05-20T10:00:00.000Z"
 *                 updatedAt: "2025-11-09T12:00:00.000Z"
 *       401:
 *         description: ❌ Missing or invalid access token.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Access token required"
 *       403:
 *         description: 🚫 Organization not approved or access denied.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Organization not approved yet"
 *       404:
 *         description: ⚠️ Organization not found.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Organization not found"
 *       500:
 *         description: 💥 Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Internal server error"
 */
organizationRouter.get("/details", organizationOnly, organizationController.getOrganizationDetails);

/**
 * @swagger
 * /api/organization/affiliate/{id}:
 *   delete:
 *     summary: Soft delete an affiliate
 *     description: Deletes an affiliate (soft delete) belonging to the authenticated organization. Requires a valid organization JWT token.
 *     tags:
 *       - Organization - Affiliates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the affiliate to delete.
 *         schema:
 *           type: integer
 *           example: 12
 *     responses:
 *       200:
 *         description: Affiliate deleted successfully.
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
 *                   example: Affiliate deleted successfully.
 *       400:
 *         description: Invalid affiliate ID.
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
 *                   example: Invalid affiliate ID
 *       401:
 *         description: Missing or invalid authentication token.
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
 *                   example: Access token required
 *       403:
 *         description: Organization not authorized or not approved.
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
 *                   example: Organization access required
 *       404:
 *         description: Affiliate not found or already deleted.
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
 *                   example: Affiliate not found or might have been already deleted.
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
 *                   example: Internal server error.
 */
organizationRouter.delete("/affiliate/:id", organizationOnly, organizationController.deleteAffiliate);


/**
 * @swagger
 * /api/organization/update:
 *   put:
 *     summary: Update organization details
 *     description: ✅ Updates organization profile details for the authenticated organization. Organization name cannot be changed. Requires a valid organization token 🔒.
 *     tags:
 *       - Organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: "Organization Name"
 *                 description: Display name (automatically set to organization name)
 *               email:
 *                 type: string
 *                 example: "admin@organization.com"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               password:
 *                 type: string
 *                 example: "newsecurepassword"
 *               organizationType:
 *                 type: string
 *                 example: "ACADEMY"
 *               address:
 *                 type: string
 *                 example: "123 Sports Avenue"
 *               city:
 *                 type: string
 *                 example: "Delhi"
 *               state:
 *                 type: string
 *                 example: "Delhi"
 *               country:
 *                 type: string
 *                 example: "India"
 *               district:
 *                 type: string
 *                 example: "West Delhi"
 *               pincode:
 *                 type: string
 *                 example: "110059"
 *               logo:
 *                 type: string
 *                 example: "https://cdn.example.com/logo.png"
 *               description:
 *                 type: string
 *                 example: "We are a sports academy promoting youth development."
 *               website:
 *                 type: string
 *                 example: "https://organization.com"
 *               registrationNumber:
 *                 type: string
 *                 example: "REG2025XYZ"
 *               establishedYear:
 *                 type: integer
 *                 example: 2015
 *               sportsCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Cricket", "Football", "Hockey"]
 *               status:
 *                 type: string
 *                 example: "APPROVED"
 *               isVerified:
 *                 type: boolean
 *                 example: true
 *               onboardedBy:
 *                 type: string
 *                 example: "System"
 *               isKycVerified:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: ✅ Organization details updated successfully.
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
 *                   example: Organization details updated successfully.
 *                 data:
 *                   type: object
 *                   example:
 *                     id: 12
 *                     name: "Elite Sports Academy"
 *                     email: "admin@organization.com"
 *                     phone: "+919876543210"
 *                     organizationType: "ACADEMY"
 *                     address: "123 Sports Avenue"
 *                     city: "Delhi"
 *                     state: "Delhi"
 *                     country: "India"
 *                     pincode: "110059"
 *                     website: "https://organization.com"
 *                     status: "APPROVED"
 *       400:
 *         description: ⚠️ Bad Request (invalid data or duplicate email/phone).
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
 *                   example: Invalid phone number format.
 *       401:
 *         description: 🔒 Authentication failed.
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
 *                   example: Access token required
 *       403:
 *         description: 🚫 Unauthorized — Organization access required or not approved.
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
 *                   example: Organization not approved yet
 *       404:
 *         description: ❌ Organization not found or update failed.
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
 *                   example: Organization not found.
 *       500:
 *         description: 💥 Internal server error.
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
organizationRouter.put("/update", organizationOnly, organizationController.updateOrganizationDetails);



/**
 * @swagger
 * /api/organization/forgot-password:
 *   post:
 *     summary: Send password reset link to organization's email
 *     description: Sends a reset password link to the provided email if it exists in the database. The link is valid for 15 minutes.
 *     tags:
 *       - Organization 🔒
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: org@example.com
 *                 description: Registered email address of the organization
 *     responses:
 *       200:
 *         description: ✅ Password reset link sent successfully
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
 *                   example: Link to reset password is sent to your email.
 *       400:
 *         description: ⚠️ Invalid email or missing fields
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
 *                   example: Invalid email Id.
 *       500:
 *         description: 💥 Internal server error
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
organizationRouter.post("/forgot-password", organizationController.forgotPassword);

/**
 * @swagger
 * /api/organization/reset-password:
 *   post:
 *     summary: Reset organization password
 *     description: Resets the organization's password using the provided reset token. The token must be valid and unexpired.
 *     tags:
 *       - Organization 🔒
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: The reset token received via email.
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 description: The new password to be set.
 *                 example: NewSecurePassword@123
 *               confirmNewPassword:
 *                 type: string
 *                 description: Must match the new password.
 *                 example: NewSecurePassword@123
 *     responses:
 *       200:
 *         description: ✅ Password reset successful.
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
 *                   example: Password reset successfully.
 *       400:
 *         description: ⚠️ Bad Request - Missing or invalid input.
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
 *                   example: Passwords do not match.
 *       500:
 *         description: 💥 Internal Server Error - Expired or invalid token.
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
 *                   example: Link expired, kindly go to forgot password page.
 */
organizationRouter.post("/reset-password", organizationController.setNewPassword);


/**
 * @swagger
 * /api/organization/getPresignedUrl:
 *   post:
 *     summary: "Generate AWS S3 Presigned URL"
 *     description: "Generates a temporary presigned URL for uploading files to S3. Requires a valid organization access token."
 *     tags:
 *       - Organization
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
 *               fileType:
 *                 type: string
 *                 example: "image/png"
 *     responses:
 *       200:
 *         description: "Presigned URL successfully generated."
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
 *                   example: "https://bucket-name.s3.amazonaws.com/..."
 *                 fileUrl:
 *                   type: string
 *                   example: "https://bucket-name.s3.region.amazonaws.com/..."
 *       400:
 *         description: "Missing or invalid fileName/fileType."
 *       401:
 *         description: "Unauthorized - Invalid or missing access token."
 *       500:
 *         description: "Server error while generating presigned URL."
 */
organizationRouter.post("/getPresignedUrl", authenticate, organizationController.getPresignedUrl);
organizationRouter.post("/affiliate/details",organizationOnly, organizationController.getAffiliateFullProfileForOrg);

// Organization Dashboard (comprehensive)
organizationRouter.get("/dashboard", organizationOnly, organizationController.getOrganizationDashboard);

// Organization Activity Feed
organizationRouter.get("/activity", organizationOnly, organizationController.getOrganizationActivity);

// -------------------------STAFF MANAGEMENT------------------------------
organizationRouter.post("/staff", organizationOnly, organizationController.addStaffMember);
organizationRouter.get("/staff", organizationOnly, organizationController.getStaffMembers);
organizationRouter.patch("/staff/:staffId", organizationOnly, organizationController.updateStaffRole);
organizationRouter.delete("/staff/:staffId", organizationOnly, organizationController.removeStaffMember);

// ==================== Detailed Analytics (Round 7) ====================

// GET /api/organization/analytics/detailed — comprehensive org analytics
organizationRouter.get("/analytics/detailed", organizationOnly, organizationController.getDetailedAnalytics);

// ==================== Organization Announcements (Round 9) ====================

// POST /api/organization/announcements — create an announcement (org only)
organizationRouter.post("/announcements", organizationOnly, organizationController.createAnnouncement);

// GET /api/organization/announcements — get active announcements (auth required)
organizationRouter.get("/announcements", authenticate, organizationController.getAnnouncements);

// DELETE /api/organization/announcements/:announcementId — soft-delete announcement (org only)
organizationRouter.delete("/announcements/:announcementId", organizationOnly, organizationController.deleteAnnouncement);

// ==================== Organization Branding (Round 11) ====================

// PUT /api/organization/branding — update branding (org only)
organizationRouter.put("/branding", organizationOnly, organizationController.updateBranding);

// GET /api/organization/:organizationId/branding — get branding (public, no auth)
organizationRouter.get("/:organizationId/branding", organizationController.getBranding);

// ==================== Staff Roles Management (Round 12) ====================

// POST /api/organization/staff-roles — create a custom staff role (org only)
organizationRouter.post("/staff-roles", organizationOnly, organizationController.createStaffRole);

// GET /api/organization/staff-roles — get all roles for the org (org only)
organizationRouter.get("/staff-roles", organizationOnly, organizationController.getStaffRoles);

// PUT /api/organization/staff-roles/:roleId — update role permissions (org only)
organizationRouter.put("/staff-roles/:roleId", organizationOnly, organizationController.updateStaffRolePermissions);

// DELETE /api/organization/staff-roles/:roleId — delete a role (org only)
organizationRouter.delete("/staff-roles/:roleId", organizationOnly, organizationController.deleteStaffRole);

// POST /api/organization/staff/:staffId/assign-role — assign role to staff (org only)
organizationRouter.post("/staff/:staffId/assign-role", organizationOnly, organizationController.assignStaffRole);

// ==================== Organization Onboarding Progress (Round 13) ====================

// GET /api/organization/onboarding-progress — get onboarding completion (org only)
organizationRouter.get("/onboarding-progress", organizationOnly, organizationController.getOnboardingProgress);

// GET /api/organization/onboarding-tips — get contextual tips (org only)
organizationRouter.get("/onboarding-tips", organizationOnly, organizationController.getOnboardingTips);

// ==================== Bulk Data Export (Round 13) ====================

// GET /api/organization/export/affiliates — export affiliates as CSV (org only)
organizationRouter.get("/export/affiliates", organizationOnly, organizationController.exportAffiliates);

// GET /api/organization/export/event-registrations/:eventId — export event registrations (org only)
organizationRouter.get("/export/event-registrations/:eventId", organizationOnly, organizationController.exportEventRegistrations);

// GET /api/organization/export/campaign-data/:campaignId — export campaign applications (org only)
organizationRouter.get("/export/campaign-data/:campaignId", organizationOnly, organizationController.exportCampaignData);

export { organizationRouter };
