import express from "express";
import { authenticate, superAdminOnly, organizationOnly } from "../middlewares/auth.js";
import { NotificationController } from "../controllers/NotificationController.js";

const notificationRouter = express.Router();
const notificationController = new NotificationController();

// GET /api/notifications/unread-count — get unread notification count
// (must be before /:id routes to avoid matching "unread-count" as :id)
notificationRouter.get("/unread-count", authenticate, notificationController.getUnreadCount);

// PATCH /api/notifications/read-all — mark all notifications as read
// (must be before /:id routes to avoid matching "read-all" as :id)
notificationRouter.patch("/read-all", authenticate, notificationController.markAllRead);

// ==================== Email Template Routes ====================

// GET /api/notifications/email-templates — list all available email templates (super admin only)
notificationRouter.get("/email-templates", superAdminOnly, notificationController.getEmailTemplates);

// POST /api/notifications/email-templates/preview — render template with sample data (super admin only)
notificationRouter.post("/email-templates/preview", superAdminOnly, notificationController.previewEmailTemplate);

// ==================== Bulk Notification System (Round 7) ====================

// POST /api/notifications/bulk — send bulk notification to multiple affiliates
notificationRouter.post("/bulk", organizationOnly, notificationController.sendBulkNotification);

// GET /api/notifications/analytics — notification delivery analytics
notificationRouter.get("/analytics", organizationOnly, notificationController.getNotificationAnalytics);

// GET /api/notifications — get user's notifications (paginated)
notificationRouter.get("/", authenticate, notificationController.getNotifications);

// PATCH /api/notifications/:id/read — mark one notification as read
notificationRouter.patch("/:id/read", authenticate, notificationController.markNotificationRead);

export { notificationRouter };
