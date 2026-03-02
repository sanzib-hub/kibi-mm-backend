import express from "express";
import { organizationAuth, authenticate } from "../middlewares/auth";
import {
  createForm,
  getAllForms,
  getFormById,
  updateForm,
  deleteForm,
  getOrganizationForms,
} from "../controllers/forms/formsController";

const formsRouter = express.Router();

/**
 * @swagger
 * /api/forms:
 *   get:
 *     summary: Get all forms
 *     description: Retrieves a list of all public forms with optional filtering by type and organization.
 *     tags: [Forms]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter forms by type
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         description: Filter forms by organization ID
 *     responses:
 *       200:
 *         description: Forms retrieved successfully
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
 *                   example: Forms fetched successfully
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       organization_id:
 *                         type: integer
 *                       fields:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             type:
 *                               type: string
 *                               enum: [text, number, select, date, file]
 *                             required:
 *                               type: boolean
 *                             options:
 *                               type: array
 *                               items:
 *                                 type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad Request - Invalid parameters
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
 *                   example: Invalid organization ID format
 *       404:
 *         description: No forms found
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
 *                   example: No forms found
 *                 data:
 *                   type: array
 *                   example: []
 *       500:
 *         description: Internal Server Error
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
 *                   example: Error fetching forms
 */
formsRouter.get("/", authenticate, getAllForms);

/**
 * @swagger
 * /api/forms/{formId}:
 *   get:
 *     summary: Get form by ID
 *     description: Retrieves a specific form by its ID with all fields and configuration.
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the form to retrieve
 *     responses:
 *       200:
 *         description: Form retrieved successfully
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
 *                   example: Form fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     organization_id:
 *                       type: integer
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [text, number, select, date, file]
 *                           required:
 *                             type: boolean
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request - Invalid form ID
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
 *                   example: Invalid form ID format
 *       404:
 *         description: Form not found
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
 *                   example: Form not found with this ID
 *       500:
 *         description: Internal Server Error
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
 *                   example: Error fetching form
 */
formsRouter.get("/:formId", authenticate, getFormById);

/**
 * @swagger
 * /api/forms:
 *   post:
 *     summary: Create new form
 *     description: Creates a new form for event registrations. Only accessible by organization users.
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formName
 *               - header
 *               - form_values
 *               - type
 *             properties:
 *               formName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 example: Event Registration Form
 *                 description: Name of the form
 *               header:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 example: Registration form for Football Tournament 2025
 *                 description: Header text for the form
 *               form_values:
 *                 type: object
 *                 required:
 *                   - fields
 *                 properties:
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required:
 *                         - id
 *                         - label
 *                         - type
 *                         - required
 *                         - order
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Unique identifier for the field
 *                         label:
 *                           type: string
 *                           description: Display label for the field
 *                         type:
 *                           type: string
 *                           enum: [text, number, email, tel, textarea, select, checkbox, radio, date, file]
 *                           description: Type of form field
 *                         required:
 *                           type: boolean
 *                           description: Whether the field is required
 *                         order:
 *                           type: number
 *                           description: Order of the field in the form
 *                         placeholder:
 *                           type: string
 *                           description: Placeholder text for the field
 *                         min:
 *                           type: number
 *                           description: Minimum value for number fields
 *                         max:
 *                           type: number
 *                           description: Maximum value for number fields
 *                         options:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Options for select, checkbox, or radio fields
 *                         validation:
 *                           type: object
 *                           description: Custom validation rules for the field
 *                         group:
 *                           type: string
 *                           description: Group name for organizing fields
 *                         maxLength:
 *                           type: number
 *                           description: Maximum length for text input
 *               type:
 *                 type: string
 *                 enum: [Team Sports, Individual Play]
 *                 description: Type of form activity
 *               minPlayers:
 *                 type: number
 *                 minimum: 1
 *                 nullable: true
 *                 description: Minimum number of players (required for Team Sports)
 *               maxPlayers:
 *                 type: number
 *                 minimum: 1
 *                 nullable: true
 *                 description: Maximum number of players (required for Team Sports)
 *     responses:
 *       201:
 *         description: Form created successfully
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
 *                   example: Form created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     formName:
 *                       type: string
 *                     header:
 *                       type: string
 *                     organizationId:
 *                       type: integer
 *                     form_values:
 *                       type: object
 *                     type:
 *                       type: string
 *                     minPlayers:
 *                       type: integer
 *                       nullable: true
 *                     maxPlayers:
 *                       type: integer
 *                       nullable: true
 *                     deleted:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request - Validation or input errors
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
 *             examples:
 *               missingFormName:
 *                 value:
 *                   success: false
 *                   message: formName is required
 *               missingFields:
 *                 value:
 *                   success: false
 *                   message: form_values.fields is required
 *               invalidType:
 *                 value:
 *                   success: false
 *                   message: type must be either Team Sports or Individual Play
 *               teamSportsValidation:
 *                 value:
 *                   success: false
 *                   message: Team Sports forms must have both minPlayers and maxPlayers defined
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
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
 *         description: Forbidden - Not an organization user
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
 *       500:
 *         description: Internal Server Error
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
 *                   example: Error creating form
 */
formsRouter.post("/", organizationAuth, createForm);

/**
 * @swagger
 * /api/forms/{formId}:
 *   put:
 *     tags:
 *       - Forms
 *     summary: Update an existing form
 *     description: Update form details with selective field updates. All fields are optional but must meet validation requirements when provided.
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the form to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               formName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 description: Name of the form
 *               header:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 description: Header text for the form
 *               form_values:
 *                 type: object
 *                 properties:
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required:
 *                         - id
 *                         - label
 *                         - type
 *                         - required
 *                         - order
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Unique identifier for the field
 *                         label:
 *                           type: string
 *                           description: Display label for the field
 *                         type:
 *                           type: string
 *                           enum: [text, number, email, tel, textarea, select, checkbox, radio, date, file]
 *                           description: Type of the form field
 *                         required:
 *                           type: boolean
 *                           description: Whether the field is required
 *                         order:
 *                           type: number
 *                           description: Order of the field in the form
 *                         placeholder:
 *                           type: string
 *                           description: Placeholder text for the field
 *                         min:
 *                           type: number
 *                           description: Minimum value for number fields
 *                         max:
 *                           type: number
 *                           description: Maximum value for number fields
 *                         options:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Options for select, checkbox, or radio fields
 *                         validation:
 *                           type: object
 *                           description: Custom validation rules for the field
 *                         group:
 *                           type: string
 *                           description: Group name for organizing fields
 *                         maxLength:
 *                           type: number
 *                           description: Maximum length for text input
 *               type:
 *                 type: string
 *                 enum: [Team Sports, Individual Play]
 *                 description: Type of form activity
 *               minPlayers:
 *                 type: number
 *                 minimum: 1
 *                 nullable: true
 *                 description: Minimum number of players (required for Team Sports)
 *               maxPlayers:
 *                 type: number
 *                 minimum: 1
 *                 nullable: true
 *                 description: Maximum number of players (required for Team Sports)
 *     responses:
 *       200:
 *         description: Form updated successfully
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
 *                   example: Form updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     formName:
 *                       type: string
 *                     header:
 *                       type: string
 *                     organizationId:
 *                       type: integer
 *                     form_values:
 *                       type: object
 *                     type:
 *                       type: string
 *                     minPlayers:
 *                       type: integer
 *                       nullable: true
 *                     maxPlayers:
 *                       type: integer
 *                       nullable: true
 *                     deleted:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or invalid request
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
 *                   example: Validation error message
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
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
 *         description: Forbidden - Organization Access required
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
 *                   example: Not authorized to update this form
 *       404:
 *         description: Form not found
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
 *                   example: Form not found
 *       500:
 *         description: Server error
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
formsRouter.put("/:formId", organizationAuth, updateForm);

/**
 * @swagger
 * /api/forms/{formId}:
 *   delete:
 *     summary: Delete form
 *     description: Deletes an existing form and all its associated data. Only accessible by the organization that created the form.
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the form to delete
 *     responses:
 *       200:
 *         description: Form deleted successfully
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
 *                   example: Form deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     formId:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Bad Request - Invalid form ID
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
 *                   example: Invalid form ID format
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
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
 *         description: Forbidden - Organization access required
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
 *                   example: Not authorized to delete this form
 *       404:
 *         description: Form not found
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
 *                   example: Form not found with this ID
 *       500:
 *         description: Internal Server Error
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
 *                   example: Error deleting form
 */
formsRouter.delete("/:formId", organizationAuth, deleteForm);

/**
 * @swagger
 * /api/forms/organization/{organizationId}:
 *   get:
 *     summary: Get organization forms
 *     description: Retrieves all forms created by a specific organization, including draft and published forms.
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the organization to get forms for
 *     responses:
 *       200:
 *         description: Organization forms retrieved successfully
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
 *                   example: Organization forms fetched successfully
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [DRAFT, PUBLISHED, ARCHIVED]
 *                       fields:
 *                         type: array
 *                         items:
 *                           type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       events_count:
 *                         type: integer
 *                         description: Number of events using this form
 *                       responses_count:
 *                         type: integer
 *                         description: Number of form submissions received
 *       400:
 *         description: Bad Request - Invalid organization ID
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
 *                   example: Invalid organization ID format
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
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
 *         description: Forbidden - Not authorized to view organization forms
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
 *                   example: Not authorized to view forms for this organization
 *       404:
 *         description: No forms found
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
 *                   example: No forms found for this organization
 *                 data:
 *                   type: array
 *                   example: []
 *       500:
 *         description: Internal Server Error
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
 *                   example: Error fetching organization forms
 */
formsRouter.get("/organization/:organizationId", authenticate, getOrganizationForms);

export { formsRouter };
