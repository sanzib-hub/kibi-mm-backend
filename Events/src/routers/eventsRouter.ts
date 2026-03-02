import express from "express";
import {
  organizationAuth,
  affiliateAuth,
  adminAuth,
  multiRole,
} from "../middlewares/auth";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  getAllEvents,
  registerAffiliateWithEvent,
  getRegisteredAffiliates,
  getEventsByOrganization,
  deleteOrgEvent,
  approveEvent,
  getEventsForAdmin,
  getAffiliateEventPayments,
  getEventTeamDetail,
  getNearestEvents,
  createEventTeam,
  joinEventTeam,
  getEventTeams,
  getEventById,
  getEventTeamMembers,
  getEventTeamStatus,
  getDeepLink,
  bulkActionEvents,
  cancelEvent,
  cancelRegistration,
  publishResults,
  getResults,
  createFixture,
  getFixtures,
  updateFixture,
  getTicket,
  getMyTickets,
  checkIn,
  submitEventForApproval,
  getEventsPendingApproval,
  approveEventForApproval,
  rejectEventForApproval,
  searchEvents,
  getEventCategories,
  getFeaturedEvents,
  getCheckInAnalytics,
  getCheckInList,
  joinWaitlist,
  leaveWaitlist,
  getWaitlist,
  promoteFromWaitlist,
  generateCertificate,
  getCertificate,
  getAffiliateCertificates,
  bulkGenerateCertificates,
  createRecurringEvent,
  getRecurringInstances,
  updateRecurringSeries,
  getAttendanceAnalytics,
  createCategory,
  getCategories,
  addEventTags,
  getEventsByTag,
  getPopularTags,
  submitEventReview,
  getEventReviews,
  getAffiliateReviews,
  createEventTemplate,
  getEventTemplates,
  createEventFromTemplate,
  deleteEventTemplate,
  registerTeam,
  getEventTeamsR9,
  getTeamDetails,
  updateTeamRoster,
  createVenue,
  getVenues,
  getVenueDetails,
  updateVenue,
  generateBracket,
  getBracket,
  updateMatchResult,
  createSponsorshipTier,
  getSponsorshipTiers,
  applySponsor,
  getEventSponsors,
  updateLiveScore,
  getLiveScores,
  getLiveScoreHistory,
  createMediaRequest,
  getMediaRequests,
  submitMediaResponse,
  getMediaResponses,
  generateCheckInCode,
  performCheckIn,
  getCheckInStats,
  getAttendeeList,
  createSurvey,
  getSurvey,
  submitSurveyResponse,
  getSurveyResults,
  setEventNotificationPrefs,
  getEventNotificationPrefs,
  getEventSubscribers,
  sendEventNotification,
  getOrgCalendar,
  addCalendarEntry,
  deleteCalendarEntry,
  getUpcomingDeadlines,
  addMerchandise,
  getEventMerchandise,
  updateMerchandise,
  purchaseMerchandise,
  getMerchandiseOrders,
} from "../controllers/events/eventsController";
import { UserTypes } from "../interfaces/jwtPayloads";

const eventsRouter = express.Router();

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     description: Retrieves a list of all public events with optional filtering. Includes both active and expired events.
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter events by name (case-insensitive, partial match)
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         description: Filter events by organization ID
 *       - in: query
 *         name: participationFee
 *         schema:
 *           type: number
 *         description: Filter events by participation fee
 *       - in: query
 *         name: organizerPhoneNumber
 *         schema:
 *           type: string
 *         pattern: ^(\+91)?[6-9]\d{9}$
 *         description: Filter events by organizer's phone number (Indian mobile format)
 *       - in: query
 *         name: venue
 *         schema:
 *           type: string
 *         description: Filter events by venue (case-insensitive, partial match)
 *       - in: query
 *         name: organizationName
 *         schema:
 *           type: string
 *         description: Filter events by organization name (case-insensitive, partial match)
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Filter events by address (case-insensitive, partial match)
 *       - in: query
 *         name: isApprovedByAdmin
 *         schema:
 *           type: boolean
 *         description: Filter events by approval status
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [International, National, State, League, District]
 *         description: Filter events by type
 *       - in: query
 *         name: deleted
 *         schema:
 *           type: boolean
 *         description: Include deleted events (defaults to false)
 *     responses:
 *       200:
 *         description: Events retrieved successfully
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
 *                   example: Events fetched successfully
 *                 count:
 *                   type: integer
 *                   description: Number of events returned
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         maxLength: 255
 *                         example: "Football Tournament 2025"
 *                       description:
 *                         type: string
 *                         maxLength: 1500
 *                         example: "Annual under-19 football tournament"
 *                       organizerEmail:
 *                         type: string
 *                         format: email
 *                         example: "organizer@sports.com"
 *                       organizerPhoneNumber:
 *                         type: string
 *                         pattern: ^(\+91)?[6-9]\d{9}$
 *                         example: "9876543210"
 *                       organizationName:
 *                         type: string
 *                         example: "Sports Club"
 *                       organizationId:
 *                         type: integer
 *                         example: 1
 *                       venue:
 *                         type: string
 *                         example: "Mumbai Football Arena"
 *                       address:
 *                         type: string
 *                         example: "123 Sports Complex, Mumbai"
 *                       mapLink:
 *                         type: string
 *                         example: "https://maps.google.com/?q=12.34,56.78"
 *                       startDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-12-01"
 *                       endDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-12-05"
 *                       startTime:
 *                         type: string
 *                         example: "09:00:00"
 *                       participationFee:
 *                         type: number
 *                         example: 1000
 *                       eventType:
 *                         type: string
 *                         enum: [International, National, State, League, District]
 *                         example: "International"
 *                       formId:
 *                         type: integer
 *                         example: 1
 *                       imageUrl:
 *                         type: string
 *                         example: "https://example.com/event-image.jpg"
 *                       deleted:
 *                         type: boolean
 *                         example: false
 *                       isApprovedByAdmin:
 *                         type: boolean
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-03T12:00:00Z"
 *       404:
 *         description: No events found
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
 *                   example: No events found.
 *                 data:
 *                   type: array
 *                   description: Empty array when no events are found
 *                   items:
 *                     type: object
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
 *                   example: Error fetching events
 *     examples:
 *       sampleRequest:
 *         description: Sample request to get football tournaments
 *         value: /api/events?eventType=International&organizationName=Sports%20Club
 */
eventsRouter.get("/", affiliateAuth, getAllEvents);

/**
 * @swagger
 * /api/events/getEventsForAdmin:
 *   get:
 *     summary: Get all events for admin
 *     description: Allows an authenticated admin to fetch a paginated list of all events with optional filters such as name, organization, venue, and event type.
 *     tags:
 *       - Events
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
 *         description: Number of results per page (default is 10)
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *           example: "Summer Championship"
 *         description: Filter by event name
 *       - in: query
 *         name: organizationId
 *         required: false
 *         schema:
 *           type: integer
 *           example: 5
 *         description: Filter by organization ID
 *       - in: query
 *         name: participationFee
 *         required: false
 *         schema:
 *           type: number
 *           example: 500
 *         description: Filter by participation fee
 *       - in: query
 *         name: organizerPhoneNumber
 *         required: false
 *         schema:
 *           type: string
 *           example: "+91-9876543210"
 *         description: Filter by organizer phone number
 *       - in: query
 *         name: venue
 *         required: false
 *         schema:
 *           type: string
 *           example: "Bangalore Sports Complex"
 *         description: Filter by venue
 *       - in: query
 *         name: organizationName
 *         required: false
 *         schema:
 *           type: string
 *           example: "KIBI Sports"
 *         description: Filter by organization name
 *       - in: query
 *         name: address
 *         required: false
 *         schema:
 *           type: string
 *           example: "MG Road, Bangalore"
 *         description: Filter by address
 *       - in: query
 *         name: eventType
 *         required: false
 *         schema:
 *           type: string
 *           example: "TOURNAMENT"
 *         description: Filter by event type
 *     responses:
 *       200:
 *         description: Events fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Events fetched successfully"
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                         example: "KIBI Summer Championship"
 *                       description:
 *                         type: string
 *                         example: "Annual summer tournament for all age groups"
 *                       startDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-04-20"
 *                       endDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-04-25"
 *                       startTime:
 *                         type: string
 *                         example: "09:00 AM"
 *                       participationFee:
 *                         type: number
 *                         example: 500
 *                       venue:
 *                         type: string
 *                         example: "Bangalore Stadium"
 *                       address:
 *                         type: string
 *                         example: "123 Sports Avenue, Bangalore"
 *                       mapLink:
 *                         type: string
 *                         format: uri
 *                         example: "https://maps.google.com/?q=12.9716,77.5946"
 *                       organizerEmail:
 *                         type: string
 *                         example: "events@kibisports.com"
 *                       organizationName:
 *                         type: string
 *                         example: "KIBI Sports"
 *                       organizationId:
 *                         type: integer
 *                         example: 5
 *                       organizerPhoneNumber:
 *                         type: string
 *                         example: "+91-9988776655"
 *                       imageUrl:
 *                         type: string
 *                         format: uri
 *                         example: "https://example-bucket.s3.ap-south-1.amazonaws.com/event-banner.jpg"
 *                       isApprovedByAdmin:
 *                         type: boolean
 *                         example: true
 *                       deleted:
 *                         type: boolean
 *                         example: false
 *                       eventType:
 *                         type: string
 *                         example: "TOURNAMENT"
 *                       formId:
 *                         type: integer
 *                         example: 9
 *                       form_values:
 *                         type: string
 *                         example: '{"fields": ["name", "age", "category"]}'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     hasNext:
 *                       type: boolean
 *                       example: true
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: No events found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No events found."
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   example: []
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
eventsRouter.get("/getEventsForAdmin", adminAuth, getEventsForAdmin);

//for DeepLink
eventsRouter.get("/getLink/:id", getDeepLink)
eventsRouter.get("/getEventById/:id", affiliateAuth, getEventById)


/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     description: Creates a new event. Only accessible by organization users.
 *     tags: [Events]
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
 *               - description
 *               - organizerEmail
 *               - organizerPhoneNumber
 *               - organizationName
 *               - venue
 *               - address
 *               - startDate
 *               - endDate
 *               - startTime
 *               - participationFee
 *               - eventType
 *               - formId
 *               - imageUrl
 *               - mapLink
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Football Tournament 2025"
 *                 description: Name of the event (max 255 characters)
 *               description:
 *                 type: string
 *                 maxLength: 1500
 *                 example: "Annual under-19 football tournament"
 *                 description: Detailed description of the event (max 1500 characters)
 *               organizerEmail:
 *                 type: string
 *                 format: email
 *                 example: "organizer@sports.com"
 *                 description: Contact email for the event organizer
 *               organizerPhoneNumber:
 *                 type: string
 *                 pattern: ^(\+91)?[6-9]\d{9}$
 *                 example: "9876543210"
 *                 description: Valid Indian mobile number with or without +91 prefix
 *               organizationName:
 *                 type: string
 *                 example: "Sports Club"
 *                 description: Name of the organizing entity
 *               venue:
 *                 type: string
 *                 example: "Mumbai Football Arena"
 *                 description: Name of the venue
 *               address:
 *                 type: string
 *                 example: "123 Sports Complex, Mumbai"
 *                 description: Complete address of the venue
 *               mapLink:
 *                 type: string
 *                 example: "https://maps.google.com/?q=12.34,56.78"
 *                 description: Google Maps or similar link to the venue
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-01"
 *                 description: Event start date (must be in the future)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-05"
 *                 description: Event end date (must be in the future and >= startDate)
 *               startTime:
 *                 type: string
 *                 example: "09:00:00"
 *                 description: Event start time in HH:mm:ss format
 *               participationFee:
 *                 type: number
 *                 example: 1000
 *                 description: Registration fee for the event
 *               eventType:
 *                 type: string
 *                 enum: [International, National, State, League, District]
 *                 example: "International"
 *                 description: Type/level of the event
 *               formId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the registration form to be used for this event
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/event-image.jpg"
 *                 description: URL of the event image
 *     responses:
 *       201:
 *         description: Event created successfully
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
 *                   example: "Event created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     organizerEmail:
 *                       type: string
 *                     organizerPhoneNumber:
 *                       type: string
 *                     organizationName:
 *                       type: string
 *                     organizationId:
 *                       type: integer
 *                     venue:
 *                       type: string
 *                     address:
 *                       type: string
 *                     mapLink:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                     startTime:
 *                       type: string
 *                     participationFee:
 *                       type: number
 *                     eventType:
 *                       type: string
 *                     formId:
 *                       type: integer
 *                     imageUrl:
 *                       type: string
 *                     deleted:
 *                       type: boolean
 *                     isApprovedByAdmin:
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
 *               validationError:
 *                 value:
 *                   success: false
 *                   message: "name is required"
 *               duplicateEvent:
 *                 value:
 *                   success: false
 *                   message: "Event already exists with this name in this organization"
 *               formError:
 *                 value:
 *                   success: false
 *                   message: "Form does not exist with this id in this organization"
 *               missingOrgId:
 *                 value:
 *                   success: false
 *                   message: "Organization ID is required"
 *               invalidPhone:
 *                 value:
 *                   success: false
 *                   message: "Organizer phone number must be a valid Indian mobile number"
 *               invalidDates:
 *                 value:
 *                   success: false
 *                   message: "Start date must be in the future"
 *               dateOrder:
 *                 value:
 *                   success: false
 *                   message: "End date must be greater than or equal to start date"
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
 *                   example: "Unauthorized access. Please provide valid authentication token"
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
 *                   example: "Access denied. Only organization users can create events"
 *       404:
 *         description: Not Found - Organization or Form not found
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
 *               organizationNotFound:
 *                 value:
 *                   success: false
 *                   message: "Organization does not exist with this id"
 *               formNotFound:
 *                 value:
 *                   success: false
 *                   message: "Form does not exist with this id in this organization"
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
 *                   example: "Internal server error while creating event"
 */

eventsRouter.post("/", organizationAuth, createEvent);

/**
 * @swagger
 * /api/events/organization/{eventId}:
 *   delete:
 *     summary: Delete organization event
 *     description: Deletes an event created by the organization. Only the organization that created the event can delete it.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to delete
 *     responses:
 *       200:
 *         description: Event deleted successfully
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
 *                   example: Event and related mappings deleted successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Bad Request - Missing or invalid parameters
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
 *               missingOrgId:
 *                 value:
 *                   success: false
 *                   message: Organization ID is required.
 *               missingEventId:
 *                 value:
 *                   success: false
 *                   message: Event ID is required.
 *               invalidEventId:
 *                 value:
 *                   success: false
 *                   message: Invalid event ID provided.
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
 *                   example: Unauthorized access. Please provide valid authentication token.
 *       403:
 *         description: Forbidden - Not authorized to delete this event
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
 *                   example: Access denied. You can only delete events from your own organization.
 *       404:
 *         description: Event not found or already deleted
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
 *                   example: Event does not exist with this ID or is already deleted.
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
 *                   example: Internal server error while deleting event.
 */
eventsRouter.delete("/organization/:eventId", organizationAuth, deleteOrgEvent);

/**
 * @swagger
 * /api/events/{eventId}:
 *   put:
 *     summary: Update event
 *     description: Updates an existing event. Only accessible by the creating organization.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Football Tournament 2025"
 *               description:
 *                 type: string
 *                 example: "Updated tournament description"
 *               organizerEmail:
 *                 type: string
 *                 format: email
 *                 example: "organizer@sports.com"
 *               organizerPhoneNumber:
 *                 type: string
 *                 example: "+91-9876543210"
 *               venue:
 *                 type: string
 *                 example: "New Sports Arena"
 *               address:
 *                 type: string
 *                 example: "456 Sports Complex, Mumbai"
 *               mapLink:
 *                 type: string
 *                 example: "https://maps.google.com/?q=12.34,56.78"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-20"
 *               startTime:
 *                 type: string
 *                 example: "10:00:00"
 *               participationFee:
 *                 type: number
 *                 example: 1500
 *               eventFee:
 *                 type: number
 *                 example: 2000
 *                 description: Event fee for the event
 *               eventType:
 *                 type: string
 *                 enum: [International, National, State, League, District]
 *                 example: "International"
 *               newFormId:
 *                 type: integer
 *                 description: Optional - ID of the new form to associate with this event
 *                 example: 2
 *               organizationName:
 *                 type: string
 *                 example: "Sports Club"
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/updated-event-image.jpg"
 *
 *     responses:
 *       200:
 *         description: Event updated successfully
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
 *                   example: Event updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Event'
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
 *               missingEventId:
 *                 value:
 *                   success: false
 *                   message: Event ID is required.
 *               missingOrgId:
 *                 value:
 *                   success: false
 *                   message: Organization ID is required.
 *               validationError:
 *                 value:
 *                   success: false
 *                   message: startDate must be a valid date
 *               noUpdateData:
 *                 value:
 *                   success: false
 *                   message: Provide data to be updated.
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
 *         description: Forbidden - Not authorized to update this event
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
 *         description: Event not found
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
 *                   example: Event not found with this event id.
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
 *             examples:
 *               databaseError:
 *                 value:
 *                   success: false
 *                   message: Internal server error while updating event.
 *               formMappingError:
 *                 value:
 *                   success: false
 *                   message: Event updated but unable to update the new form with this event. Try again later.
 */

// ==================== Venue Management (Round 9) ====================
// NOTE: Static prefix routes must come BEFORE /:eventId parametric routes

// POST /api/events/venues — create a venue (organization auth)
eventsRouter.post("/venues", organizationAuth, createVenue);

// GET /api/events/venues — list venues (public, no auth)
eventsRouter.get("/venues", getVenues);

// GET /api/events/venues/:venueId — get venue details (public, no auth)
eventsRouter.get("/venues/:venueId", getVenueDetails);

// PATCH /api/events/venues/:venueId — update venue (organization auth)
eventsRouter.patch("/venues/:venueId", organizationAuth, updateVenue);

// ==================== Team/Group Registration (Round 9) ====================

// PATCH /api/events/teams/:teamId/roster — update team roster (affiliate auth, captain only)
eventsRouter.patch("/teams/:teamId/roster", affiliateAuth, updateTeamRoster);

// GET /api/events/teams/:teamId/details — get full team details (public, no auth)
eventsRouter.get("/teams/:teamId/details", getTeamDetails);

eventsRouter.patch("/:eventId", organizationAuth, updateEvent);

/**
 * @swagger
 * /api/events/organization/{eventId}/affiliates:
 *   get:
 *     summary: Get registered affiliates
 *     description: Get list of affiliates registered for a specific event, including their registration and payment details.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to get registrations for
 *     responses:
 *       200:
 *         description: Registered affiliates retrieved successfully
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
 *                   example: Registered affiliates fetched successfully.
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       affiliate_id:
 *                         type: integer
 *                       event_id:
 *                         type: integer
 *                       form_id:
 *                         type: integer
 *                       response_data:
 *                         type: object
 *                       status:
 *                         type: string
 *                       submitted_at:
 *                         type: string
 *                         format: date-time
 *                       payment_id:
 *                         type: string
 *                       order_id:
 *                         type: string
 *                       amount_paid:
 *                         type: number
 *                       payment_status:
 *                         type: string
 *                       payment_time:
 *                         type: string
 *                         format: date-time
 *                       affiliate_name:
 *                         type: string
 *                       affiliate_email:
 *                         type: string
 *                       affiliate_phone:
 *                         type: string
 *                       affiliate_role:
 *                         type: string
 *                       affiliate_sports_category_id:
 *                         type: string
 *                       affiliate_position:
 *                         type: string
 *       400:
 *         description: Bad Request - Invalid input
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
 *                   example: Event ID is required.
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
 *         description: Forbidden - Not authorized to view registrations
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
 *         description: Event not found
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
 *                   example: Event not found.
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
 *                   example: Error fetching registered affiliates
 */
eventsRouter.get(
  "/organization/:eventId/affiliates",
  organizationAuth,
  getRegisteredAffiliates
);

/**
 * @swagger
 * /api/events/organization:
 *   get:
 *     summary: Get organization events
 *     description: Get all events created by the authenticated organization, including draft, published and closed events.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization events retrieved successfully
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
 *                   example: Events fetched successfully
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
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                         format: date-time
 *                       end_date:
 *                         type: string
 *                         format: date-time
 *                       organization_id:
 *                         type: integer
 *                       form_id:
 *                         type: integer
 *                       status:
 *                         type: string
 *                         enum: [DRAFT, PUBLISHED, CLOSED]
 *                       participation_fee:
 *                         type: number
 *                       venue:
 *                         type: string
 *                       address:
 *                         type: string
 *                       map_link:
 *                         type: string
 *                       organizer_email:
 *                         type: string
 *                       organizer_phone:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad Request - Missing or invalid parameters
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
 *                   example: Organization ID is required.
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
 *         description: Forbidden - Not authorized to view organization events
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
 *         description: No events found
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
 *                   example: No events found for this organization
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
 *                   example: Error fetching organization events
 */
eventsRouter.get("/organization", organizationAuth, getEventsByOrganization); //404 not found no events found for this organization

/**
 * @swagger
 * /api/events/register:
 *   post:
 *     summary: Register affiliate for event
 *     description: Registers an authenticated affiliate for a specific event. Requires valid payment information and form submission.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliate_id
 *               - event_id
 *               - form_id
 *               - response_data
 *               - payment_id
 *               - order_id
 *               - amount_paid
 *               - payment_status
 *               - payment_time
 *             properties:
 *               affiliate_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the affiliate registering for the event
 *               event_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the event to register for
 *               form_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the registration form being submitted
 *               response_data:
 *                 type: object
 *                 description: Form submission data
 *                 example:
 *                   name: "John Doe"
 *                   age: 25
 *                   email: "john@example.com"
 *               payment_id:
 *                 type: string
 *                 example: "pay_123456789"
 *                 description: Payment ID from payment gateway
 *               order_id:
 *                 type: string
 *                 example: "order_123456789"
 *                 description: Order ID from payment gateway
 *               amount_paid:
 *                 type: number
 *                 example: 1000
 *                 description: Amount paid for registration
 *               payment_status:
 *                 type: string
 *                 enum: [PENDING, COMPLETED, FAILED]
 *                 example: "COMPLETED"
 *                 description: Status of the payment
 *               payment_time:
 *                 type: string
 *                 example: "03-10-2025, 10:30:00"
 *                 description: Payment timestamp in DD-MM-YYYY, HH:mm:ss format
 *     responses:
 *       201:
 *         description: Successfully registered for event
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
 *                   example: athlete registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     affiliate_id:
 *                       type: integer
 *                     event_id:
 *                       type: integer
 *                     form_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     submitted_at:
 *                       type: string
 *                       format: date-time
 *                     payment_id:
 *                       type: string
 *                     payment_status:
 *                       type: string
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
 *               validationError:
 *                 value:
 *                   success: false
 *                   message: affiliate_id is required
 *               invalidPaymentTime:
 *                 value:
 *                   success: false
 *                   message: Invalid payment_time format. Expected format dd-MM-yyyy, HH:mm:ss
 *               duplicateRegistration:
 *                 value:
 *                   success: false
 *                   message: Affiliate is already registered for this event.
 *               pendingApproval:
 *                 value:
 *                   success: false
 *                   message: Event is not approved for registration yet.
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
 *         description: Forbidden - Not authorized to register
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
 *                   example: Affiliate account not found or not verified
 *       404:
 *         description: Resource not found
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
 *               affiliateNotFound:
 *                 value:
 *                   message: Affiliate not found with this id.
 *               eventNotFound:
 *                 value:
 *                   message: Event not found with this id.
 *               formNotFound:
 *                 value:
 *                   message: Form not found or not associated with this event.
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
 *                   example: Error registering affiliate
 */
eventsRouter.post("/register", affiliateAuth, registerAffiliateWithEvent);

/**
 * @swagger
 * /api/events/{eventId}/approve:
 *   patch:
 *     summary: Approve event (Admin)
 *     description: Approves an event for public visibility. Only accessible by admin users.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to approve
 *     responses:
 *       200:
 *         description: Event approved successfully
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
 *                   example: Event approved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     start_date:
 *                       type: string
 *                       format: date-time
 *                     end_date:
 *                       type: string
 *                       format: date-time
 *                     organization_id:
 *                       type: integer
 *                     form_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [DRAFT, PUBLISHED, CLOSED]
 *                     is_approved:
 *                       type: boolean
 *                     approved_at:
 *                       type: string
 *                       format: date-time
 *                     approved_by:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request - Invalid input
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
 *                   example: Event ID is required.
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
 *         description: Forbidden - Not authorized to approve events
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
 *                   example: Admin access required
 *       404:
 *         description: Event not found
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
 *                   example: Event not found
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
 *                   example: Error approving event
 */
eventsRouter.patch("/:eventId/approve", adminAuth, approveEvent);

/**
 * @swagger
 * /api/events/bulk-action/selected:
 *   post:
 *     summary: Bulk action on selected events (Super Admin)
 *     description: |
 *       Applies an action (approve/disapprove) to specific selected events using a single efficient bulk update query.
 *       This endpoint is optimized to prevent server overload by using a single database operation.
 *       Only accessible by Super Admin users.
 *       
 *       Example requests:
 *       - Approve: { "action": "approve", "eventIds": [1, 3, 5, 8, 12, 45, 78] }
 *       - Disapprove: { "action": "disapprove", "eventIds": [10, 22, 30] }
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - eventIds
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, disapprove]
 *                 example: "approve"
 *                 description: The action to apply to selected events
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 3, 5, 8, 12, 45, 78]
 *                 description: Array of event IDs to apply the action to
 *     responses:
 *       200:
 *         description: Bulk action completed successfully
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
 *                   example: "Successfully approved 7 event(s)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       example: "approve"
 *                     isApprovedByAdmin:
 *                       type: boolean
 *                       example: true
 *                     requestedCount:
 *                       type: integer
 *                       example: 7
 *                       description: Number of event IDs provided in request
 *                     validCount:
 *                       type: integer
 *                       example: 7
 *                       description: Number of valid, non-deleted events found
 *                     updatedCount:
 *                       type: integer
 *                       example: 5
 *                       description: Number of events that were actually updated (changed status)
 *                     alreadyHadStatusCount:
 *                       type: integer
 *                       example: 2
 *                       description: Number of events that already had the target status
 *                     missingEventIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: Event IDs that were not found or were deleted (only included if present)
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad Request - Invalid action, missing eventIds, or invalid IDs
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
 *                   example: "eventIds must be a non-empty array of event IDs."
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
 *                   example: "Access token required"
 *       403:
 *         description: Forbidden - Not authorized (Super Admin access required)
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
 *                   example: "Admin access required"
 *       404:
 *         description: No valid events found with provided IDs
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
 *                   example: "No valid events found with the provided IDs."
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestedCount:
 *                       type: integer
 *                       example: 7
 *                     foundCount:
 *                       type: integer
 *                       example: 0
 *                     missingEventIds:
 *                       type: array
 *                       items:
 *                         type: integer
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
 *                   example: "Internal server error while performing bulk action"
 *                 error:
 *                   type: string
 *                   example: "Database connection error"
 */
eventsRouter.post("/bulk-action/selected", adminAuth, bulkActionEvents);

/**
 * @swagger
 * /api/events/{eventId}/affiliates:
 *   get:
 *     summary: Get event registrations (Admin)
 *     description: Get list of all affiliates registered for an event. Admin access only.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to get registrations for
 *     responses:
 *       200:
 *         description: Registrations retrieved successfully
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
 *                   example: Event registrations fetched successfully
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       affiliate_id:
 *                         type: integer
 *                       affiliate_name:
 *                         type: string
 *                       affiliate_email:
 *                         type: string
 *                       affiliate_phone:
 *                         type: string
 *                       affiliate_role:
 *                         type: string
 *                       affiliate_sports_category_id:
 *                         type: string
 *                       affiliate_position:
 *                         type: string
 *                       registration_status:
 *                         type: string
 *                         enum: [PENDING, APPROVED, REJECTED]
 *                       registration_date:
 *                         type: string
 *                         format: date-time
 *                       form_data:
 *                         type: object
 *                         description: Form submission data
 *                       payment_status:
 *                         type: string
 *                         enum: [PENDING, COMPLETED, FAILED]
 *                       amount_paid:
 *                         type: number
 *                       payment_date:
 *                         type: string
 *                         format: date-time
 *                       order_id:
 *                         type: string
 *                       payment_id:
 *                         type: string
 *       400:
 *         description: Bad Request - Invalid input
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
 *                   example: Event ID is required.
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
 *         description: Forbidden - Not authorized to view registrations
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
 *                   example: Admin access required
 *       404:
 *         description: Event not found
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
 *                   example: Event not found
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
 *                   example: Error fetching event registrations
 */
eventsRouter.get("/:eventId/affiliates", adminAuth, getRegisteredAffiliates);

/**
 * @swagger
 * /api/events/{eventId}:
 *   delete:
 *     summary: Delete event (Admin)
 *     description: Deletes an event and all its associated data (registrations, form responses, payments). This action is irreversible and can only be performed by admin users.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to permanently delete
 *     responses:
 *       200:
 *         description: Event successfully deleted
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
 *                   example: Event and all associated data deleted successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: integer
 *                       example: 1
 *                     deletedRecords:
 *                       type: object
 *                       properties:
 *                         registrations:
 *                           type: integer
 *                           example: 5
 *                         formResponses:
 *                           type: integer
 *                           example: 5 102050018383
 *                         payments:
 *                           type: integer
 *                           example: 5
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
 *             examples:
 *               missingEventId:
 *                 value:
 *                   success: false
 *                   message: Event ID is required.
 *               invalidEventId:
 *                 value:
 *                   success: false
 *                   message: Invalid event ID provided.
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
 *         description: Forbidden - Not authorized to delete events
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
 *                   example: Admin access required
 *       404:
 *         description: Event not found
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
 *                   example: Event not found with this ID.
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
 *             examples:
 *               databaseError:
 *                 value:
 *                   success: false
 *                   message: Internal server error while deleting event.
 *               relatedDataError:
 *                 value:
 *                   success: false
 *                   message: Error deleting associated event data. Some data may remain.
 */
eventsRouter.delete("/:eventId", adminAuth, deleteEvent);

/**
 * @swagger
 * /events/participate:
 *   get:
 *     summary: Get all paid event registrations for the logged-in affiliate
 *     description: |
 *       This endpoint returns all paid event registration details for the currently authenticated affiliate.
 *       Requires valid **affiliateAuth** middleware authentication (JWT token).
 *     tags:
 *       - Affiliate - Events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched affiliate event payment details
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
 *                   example: "Affiliate event payment details fetched successfully"
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       event_name:
 *                         type: string
 *                         example: "National Sports Meet"
 *                       event_type:
 *                         type: string
 *                         example: "Tournament"
 *                       venue:
 *                         type: string
 *                         example: "Indira Stadium"
 *                       organization:
 *                         type: string
 *                         example: "KIBI Sports Club"
 *                       payment_id:
 *                         type: string
 *                         example: "pay_JU12saf34asf2"
 *                       payment_amount:
 *                         type: string
 *                         example: "₹ 499.00"
 *                       payment_date:
 *                         type: string
 *                         example: "07 Nov 2025, 10:30 AM"
 *                       event_duration:
 *                         type: string
 *                         example: "05 Nov - 06 Nov"
 *       401:
 *         description: Unauthorized access (invalid or missing JWT token)
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
 *                   example: "Unauthorized: Invalid user token"
 *       404:
 *         description: No paid event registrations found for this affiliate
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
 *                   example: "No paid event registrations found for this affiliate."
 *       500:
 *         description: Internal server error while fetching affiliate event payments
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
 *                   example: "Failed to fetch affiliate event payments"
 */
eventsRouter.get("/participate", affiliateAuth, getAffiliateEventPayments);

// Event tickets & check-in
eventsRouter.get("/my-tickets", affiliateAuth, getMyTickets);
eventsRouter.post("/check-in", affiliateAuth, checkIn);

eventsRouter.get("/nearby", affiliateAuth, getNearestEvents);

eventsRouter.post("/create-team", affiliateAuth, createEventTeam);

eventsRouter.post("/join-team", affiliateAuth, joinEventTeam);

eventsRouter.get(
  "/get-event-teams/:eventId",
  multiRole([
    UserTypes.AFFILIATE,
    UserTypes.ORGANIZATION,
    UserTypes.SUPER_ADMIN,
  ]),
  getEventTeams
);

eventsRouter.get(
  "/get-event-team-members/:teamId",
  multiRole([
    UserTypes.AFFILIATE,
    UserTypes.ORGANIZATION,
    UserTypes.SUPER_ADMIN,
  ]),
  getEventTeamMembers
);

eventsRouter.get(
  "/get-event-team-details/:teamId",
  multiRole([
    UserTypes.AFFILIATE,
    UserTypes.ORGANIZATION,
    UserTypes.SUPER_ADMIN,
  ]),
  getEventTeamDetail
);

eventsRouter.get(
  "/get-event-team-status/:eventId",
  multiRole([
    UserTypes.AFFILIATE,
    UserTypes.ORGANIZATION,
    UserTypes.SUPER_ADMIN,
  ]),
  getEventTeamStatus
);

// Event cancellation
// Get ticket for specific event
eventsRouter.get("/:eventId/ticket", affiliateAuth, getTicket);

eventsRouter.patch("/:eventId/cancel", organizationAuth, cancelEvent);

// Registration cancellation
eventsRouter.post("/cancel-registration", affiliateAuth, cancelRegistration);

// Event results
eventsRouter.post("/:eventId/results", organizationAuth, publishResults);
eventsRouter.get("/:eventId/results", affiliateAuth, getResults);

// Event fixtures/schedule
eventsRouter.post("/:eventId/fixtures", organizationAuth, createFixture);
eventsRouter.get("/:eventId/fixtures", affiliateAuth, getFixtures);
eventsRouter.patch("/fixtures/:fixtureId", organizationAuth, updateFixture);

// ==================== Event Approval Workflow ====================

// POST /api/events/:eventId/submit-for-approval — org submits event for approval
eventsRouter.post("/:eventId/submit-for-approval", organizationAuth, submitEventForApproval);

// GET /api/events/pending-approval — super admin gets all pending events
eventsRouter.get("/pending-approval", adminAuth, getEventsPendingApproval);

// PATCH /api/events/:eventId/approve-request — super admin approves event
eventsRouter.patch("/:eventId/approve-request", adminAuth, approveEventForApproval);

// PATCH /api/events/:eventId/reject — super admin rejects event
eventsRouter.patch("/:eventId/reject", adminAuth, rejectEventForApproval);

// ==================== Event Search & Discovery (Public) ====================

// GET /api/events/search — public search with filters
eventsRouter.get("/search", searchEvents);

// GET /api/events/categories — distinct sport categories
eventsRouter.get("/categories", getEventCategories);

// GET /api/events/featured — featured events by registration count
eventsRouter.get("/featured", getFeaturedEvents);

// ==================== Event Check-in Analytics ====================

// GET /api/events/:eventId/check-in-analytics — check-in analytics for an event
eventsRouter.get(
  "/:eventId/check-in-analytics",
  multiRole([UserTypes.ORGANIZATION, UserTypes.SUPER_ADMIN]),
  getCheckInAnalytics
);

// GET /api/events/:eventId/check-in-list — paginated check-in list
eventsRouter.get(
  "/:eventId/check-in-list",
  multiRole([UserTypes.ORGANIZATION, UserTypes.SUPER_ADMIN]),
  getCheckInList
);

// ==================== Event Waitlist ====================

// POST /api/events/:eventId/waitlist — affiliate joins waitlist
eventsRouter.post("/:eventId/waitlist", affiliateAuth, joinWaitlist);

// DELETE /api/events/:eventId/waitlist — affiliate leaves waitlist
eventsRouter.delete("/:eventId/waitlist", affiliateAuth, leaveWaitlist);

// GET /api/events/:eventId/waitlist — org/admin gets waitlist
eventsRouter.get(
  "/:eventId/waitlist",
  multiRole([UserTypes.ORGANIZATION, UserTypes.SUPER_ADMIN]),
  getWaitlist
);

// POST /api/events/:eventId/waitlist/promote — org/admin promotes next in waitlist
eventsRouter.post(
  "/:eventId/waitlist/promote",
  multiRole([UserTypes.ORGANIZATION, UserTypes.SUPER_ADMIN]),
  promoteFromWaitlist
);

// ==================== Event Certificates ====================

// POST /api/events/:eventId/certificates — org generates certificate for an affiliate
eventsRouter.post(
  "/:eventId/certificates",
  multiRole([UserTypes.ORGANIZATION, UserTypes.SUPER_ADMIN]),
  generateCertificate
);

// GET /api/events/certificates/:certificateId — get certificate by ID
eventsRouter.get("/certificates/:certificateId", affiliateAuth, getCertificate);

// GET /api/events/my-certificates — affiliate gets their own certificates
eventsRouter.get("/my-certificates", affiliateAuth, getAffiliateCertificates);

// POST /api/events/:eventId/certificates/bulk — bulk generate certificates
eventsRouter.post(
  "/:eventId/certificates/bulk",
  multiRole([UserTypes.ORGANIZATION, UserTypes.SUPER_ADMIN]),
  bulkGenerateCertificates
);

// ==================== Recurring Events (Round 7) ====================

// POST /api/events/recurring — create a recurring event with instances
eventsRouter.post("/recurring", organizationAuth, createRecurringEvent);

// GET /api/events/:eventId/instances — get all instances of a recurring event
eventsRouter.get("/:eventId/instances", affiliateAuth, getRecurringInstances);

// PATCH /api/events/:eventId/recurring — update all future instances of a recurring event
eventsRouter.patch("/:eventId/recurring", organizationAuth, updateRecurringSeries);

// ==================== Attendance Analytics (Round 7) ====================

// GET /api/events/:eventId/attendance-analytics — comprehensive attendance analytics
eventsRouter.get("/:eventId/attendance-analytics", organizationAuth, getAttendanceAnalytics);

// ==================== Event Categories & Tags (Round 8) ====================

// POST /api/events/categories — create a category (org only)
eventsRouter.post("/categories", organizationAuth, createCategory);

// GET /api/events/categories/all — get all categories in tree structure (public, no auth)
eventsRouter.get("/categories/all", getCategories);

// GET /api/events/tags/popular — top 20 most-used tags (public, no auth)
eventsRouter.get("/tags/popular", getPopularTags);

// GET /api/events/by-tag/:tagName — search events by tag (affiliate auth)
eventsRouter.get("/by-tag/:tagName", affiliateAuth, getEventsByTag);

// POST /api/events/:eventId/tags — add tags to an event (org only)
eventsRouter.post("/:eventId/tags", organizationAuth, addEventTags);

// ==================== Event Reviews & Ratings (Round 8) ====================

// GET /api/events/reviews/my — get reviews by the authenticated affiliate
eventsRouter.get("/reviews/my", affiliateAuth, getAffiliateReviews);

// POST /api/events/:eventId/reviews — submit a review for an event (affiliate auth)
eventsRouter.post("/:eventId/reviews", affiliateAuth, submitEventReview);

// GET /api/events/:eventId/reviews — get reviews for an event (public, no auth)
eventsRouter.get("/:eventId/reviews", getEventReviews);

// ==================== Event Templates (Round 8) ====================

// POST /api/events/templates — create an event template (org only)
eventsRouter.post("/templates", organizationAuth, createEventTemplate);

// GET /api/events/templates — list templates for the org (org only)
eventsRouter.get("/templates", organizationAuth, getEventTemplates);

// POST /api/events/templates/:templateId/create — create event from template (org only)
eventsRouter.post("/templates/:templateId/create", organizationAuth, createEventFromTemplate);

// DELETE /api/events/templates/:templateId — delete a template (org only)
eventsRouter.delete("/templates/:templateId", organizationAuth, deleteEventTemplate);

// ==================== Team Registration - Event-scoped routes (Round 9) ====================

// POST /api/events/:eventId/teams — register a team for an event (affiliate auth)
eventsRouter.post("/:eventId/teams", affiliateAuth, registerTeam);

// GET /api/events/:eventId/teams-list — get all teams for an event (public, no auth)
eventsRouter.get("/:eventId/teams-list", getEventTeamsR9);

// ==================== Event Bracket / Tournament System (Round 10) ====================

// POST /api/events/:eventId/bracket/generate — generate tournament bracket (org only)
eventsRouter.post("/:eventId/bracket/generate", organizationAuth, generateBracket);

// GET /api/events/:eventId/bracket — get full bracket (public, no auth)
eventsRouter.get("/:eventId/bracket", getBracket);

// PATCH /api/events/bracket/matches/:matchId — record match result (org only)
eventsRouter.patch("/bracket/matches/:matchId", organizationAuth, updateMatchResult);

// ==================== Event Sponsorship Tiers (Round 10) ====================

// POST /api/events/:eventId/sponsorship-tiers — create a sponsorship tier (org only)
eventsRouter.post("/:eventId/sponsorship-tiers", organizationAuth, createSponsorshipTier);

// GET /api/events/:eventId/sponsorship-tiers — get all tiers for an event (public, no auth)
eventsRouter.get("/:eventId/sponsorship-tiers", getSponsorshipTiers);

// POST /api/events/:eventId/sponsors/apply — apply as sponsor (org only)
eventsRouter.post("/:eventId/sponsors/apply", organizationAuth, applySponsor);

// GET /api/events/:eventId/sponsors — get all sponsors (public, no auth)
eventsRouter.get("/:eventId/sponsors", getEventSponsors);

// ==================== Event Live Scoring (Round 11) ====================

// POST /api/events/:eventId/live-scores — update live score (org only)
eventsRouter.post("/:eventId/live-scores", organizationAuth, updateLiveScore);

// GET /api/events/:eventId/live-scores — get all live scores (public, no auth)
eventsRouter.get("/:eventId/live-scores", getLiveScores);

// GET /api/events/:eventId/live-scores/:matchLabel/history — score history (public, no auth)
eventsRouter.get("/:eventId/live-scores/:matchLabel/history", getLiveScoreHistory);

// ==================== Event Media Requests (Round 11) ====================

// POST /api/events/media-requests/:requestId/respond — submit media response (affiliate auth)
eventsRouter.post("/media-requests/:requestId/respond", affiliateAuth, submitMediaResponse);

// GET /api/events/media-requests/:requestId/responses — get responses (org auth)
eventsRouter.get("/media-requests/:requestId/responses", organizationAuth, getMediaResponses);

// POST /api/events/:eventId/media-requests — create media request (org only)
eventsRouter.post("/:eventId/media-requests", organizationAuth, createMediaRequest);

// GET /api/events/:eventId/media-requests — get media requests (affiliate auth)
eventsRouter.get("/:eventId/media-requests", affiliateAuth, getMediaRequests);

// ==================== Event Check-In Management (Round 12) ====================

// POST /api/events/:eventId/check-in/generate — generate check-in code (org only)
eventsRouter.post("/:eventId/check-in/generate", organizationAuth, generateCheckInCode);

// POST /api/events/:eventId/check-in — affiliate checks in with code
eventsRouter.post("/:eventId/check-in", affiliateAuth, performCheckIn);

// GET /api/events/:eventId/check-in/stats — get check-in statistics (org only)
eventsRouter.get("/:eventId/check-in/stats", organizationAuth, getCheckInStats);

// GET /api/events/:eventId/check-in/attendees — get checked-in attendee list (org only)
eventsRouter.get("/:eventId/check-in/attendees", organizationAuth, getAttendeeList);

// ==================== Post-Event Feedback Surveys (Round 13) ====================

// POST /api/events/:eventId/survey — create a feedback survey (org only)
eventsRouter.post("/:eventId/survey", organizationAuth, createSurvey);

// GET /api/events/:eventId/survey — get survey for an event (affiliate auth)
eventsRouter.get("/:eventId/survey", affiliateAuth, getSurvey);

// POST /api/events/:eventId/survey/respond — submit survey response (affiliate auth)
eventsRouter.post("/:eventId/survey/respond", affiliateAuth, submitSurveyResponse);

// GET /api/events/:eventId/survey/results — get aggregated results (org only)
eventsRouter.get("/:eventId/survey/results", organizationAuth, getSurveyResults);

// ==================== Event Notification Preferences (Round 13) ====================

// POST /api/events/:eventId/notification-prefs — set notification prefs (affiliate auth)
eventsRouter.post("/:eventId/notification-prefs", affiliateAuth, setEventNotificationPrefs);

// GET /api/events/:eventId/notification-prefs — get notification prefs (affiliate auth)
eventsRouter.get("/:eventId/notification-prefs", affiliateAuth, getEventNotificationPrefs);

// GET /api/events/:eventId/subscribers — get event subscribers (org only)
eventsRouter.get("/:eventId/subscribers", organizationAuth, getEventSubscribers);

// POST /api/events/:eventId/notify — send notification to subscribers (org only)
eventsRouter.post("/:eventId/notify", organizationAuth, sendEventNotification);

// ==================== Organization Calendar (Round 14) ====================

// GET /api/events/org-calendar — get org calendar (org only)
eventsRouter.get("/org-calendar", organizationAuth, getOrgCalendar);

// POST /api/events/calendar-entry — add custom calendar entry (org only)
eventsRouter.post("/calendar-entry", organizationAuth, addCalendarEntry);

// DELETE /api/events/calendar-entry/:entryId — delete custom calendar entry (org only)
eventsRouter.delete("/calendar-entry/:entryId", organizationAuth, deleteCalendarEntry);

// GET /api/events/upcoming-deadlines — get upcoming deadlines (org only)
eventsRouter.get("/upcoming-deadlines", organizationAuth, getUpcomingDeadlines);

// ==================== Event Merchandise (Round 14) ====================

// PUT /api/events/merchandise/:itemId — update merchandise item (org only)
eventsRouter.put("/merchandise/:itemId", organizationAuth, updateMerchandise);

// POST /api/events/merchandise/:itemId/purchase — purchase merchandise item (affiliate auth)
eventsRouter.post("/merchandise/:itemId/purchase", affiliateAuth, purchaseMerchandise);

// POST /api/events/:eventId/merchandise — add merchandise to event (org only)
eventsRouter.post("/:eventId/merchandise", organizationAuth, addMerchandise);

// GET /api/events/:eventId/merchandise — list merchandise for event (affiliate auth)
eventsRouter.get("/:eventId/merchandise", affiliateAuth, getEventMerchandise);

// GET /api/events/:eventId/merchandise/orders — get merchandise orders (org only)
eventsRouter.get("/:eventId/merchandise/orders", organizationAuth, getMerchandiseOrders);

export { eventsRouter };
