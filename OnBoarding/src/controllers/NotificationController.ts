import { Request, Response, NextFunction } from "express";
import { db } from "../database/kysely/databases.js";
import { sql } from "kysely";
import * as admin from "firebase-admin";
import { createTransport } from "nodemailer";

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn("Firebase service account not configured. Push notifications will be disabled.");
    }
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err);
  }
}

/**
 * Internal utility function to send FCM push notification
 * Can be imported and used by other controllers/services
 */
export const sendPushNotification = async (
  affiliateId: number,
  title: string,
  body: string,
  data?: Record<string, any>,
  notificationType?: string
): Promise<void> => {
  try {
    // Store notification in database
    await db
      .insertInto("notifications" as any)
      .values({
        user_id: affiliateId,
        user_type: "affiliate",
        title,
        body,
        data: data ? JSON.stringify(data) : null,
        notification_type: notificationType || null,
        is_read: false,
      })
      .execute();

    // Attempt to send FCM push if Firebase is initialized
    if (admin.apps.length > 0) {
      // Look up the user's FCM token from the affiliates table or a tokens table
      const affiliate = await db
        .selectFrom("affiliates")
        .select(["id", "fcm_token" as any])
        .where("id", "=", affiliateId)
        .where("deleted", "=", false)
        .executeTakeFirst();

      const fcmToken = (affiliate as any)?.fcm_token;
      if (fcmToken) {
        const message: admin.messaging.Message = {
          token: fcmToken,
          notification: {
            title,
            body,
          },
          data: data
            ? Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
              )
            : {},
        };

        await admin.messaging().send(message);
      }
    }
  } catch (error) {
    console.error("Send push notification error:", error);
    // Don't throw - notification failures shouldn't break the calling flow
  }
};

export class NotificationController {
  /**
   * Get notifications for the authenticated user (paginated)
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const notifications = await db
        .selectFrom("notifications" as any)
        .selectAll()
        .where("user_id", "=", userId)
        .where("user_type", "=", "affiliate")
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Notifications fetched successfully",
        count: notifications.length,
        data: notifications,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Mark a single notification as read
   */
  markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Notification ID is required",
        });
      }

      const notification = await db
        .selectFrom("notifications" as any)
        .select(["id", "user_id"])
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      await db
        .updateTable("notifications" as any)
        .set({ is_read: true })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .execute();

      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Mark all notifications as read for the authenticated user
   */
  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      await db
        .updateTable("notifications" as any)
        .set({ is_read: true })
        .where("user_id", "=", userId)
        .where("user_type", "=", "affiliate")
        .where("is_read", "=", false)
        .execute();

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Mark all read error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get count of unread notifications
   */
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const result = await db
        .selectFrom("notifications" as any)
        .select(sql`COUNT(*)`.as("count"))
        .where("user_id", "=", userId)
        .where("user_type", "=", "affiliate")
        .where("is_read", "=", false)
        .executeTakeFirst();

      return res.status(200).json({
        success: true,
        message: "Unread count fetched successfully",
        data: {
          unreadCount: Number((result as any)?.count || 0),
        },
      });
    } catch (error) {
      console.error("Get unread count error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get available email templates
   * GET /api/notifications/email-templates
   */
  getEmailTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = EMAIL_TEMPLATES;
      const templateList = Object.entries(templates).map(([key, template]) => ({
        name: key,
        subject: template.subject,
        description: template.description,
      }));

      return res.status(200).json({
        success: true,
        message: "Email templates fetched successfully",
        count: templateList.length,
        data: templateList,
      });
    } catch (error) {
      console.error("Get email templates error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Preview an email template with sample data
   * POST /api/notifications/email-templates/preview
   */
  previewEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateName, data } = req.body;

      if (!templateName) {
        return res.status(400).json({
          success: false,
          message: "templateName is required",
        });
      }

      const template = EMAIL_TEMPLATES[templateName as keyof typeof EMAIL_TEMPLATES];
      if (!template) {
        return res.status(404).json({
          success: false,
          message: `Template '${templateName}' not found. Available: ${Object.keys(EMAIL_TEMPLATES).join(", ")}`,
        });
      }

      const sampleData = data || template.sampleData;
      const renderedSubject = renderTemplate(template.subject, sampleData);
      const renderedBody = renderTemplate(template.body, sampleData);

      return res.status(200).json({
        success: true,
        message: "Template preview rendered successfully",
        data: {
          templateName,
          subject: renderedSubject,
          html: renderedBody,
          sampleData,
        },
      });
    } catch (error) {
      console.error("Preview email template error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // ==================== BULK NOTIFICATION SYSTEM (Round 7) ====================

  /**
   * Send bulk notification to multiple affiliates.
   * Accepts target criteria: all, by sport, by event, or custom list of IDs.
   * POST /api/notifications/bulk
   */
  sendBulkNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = req.user!.id;
      const senderType = req.user!.type;
      const {
        title,
        body,
        notificationType,
        targetCriteria,
        data: notificationData,
      } = req.body;

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: "title and body are required.",
        });
      }

      if (!targetCriteria || !targetCriteria.type) {
        return res.status(400).json({
          success: false,
          message: "targetCriteria with type (all, by_sport, by_event, custom) is required.",
        });
      }

      const { type: criteriaType, sportsCategoryId, eventId, affiliateIds } = targetCriteria;
      const validCriteriaTypes = ["all", "by_sport", "by_event", "custom"];
      if (!validCriteriaTypes.includes(criteriaType)) {
        return res.status(400).json({
          success: false,
          message: `targetCriteria.type must be one of: ${validCriteriaTypes.join(", ")}`,
        });
      }

      // Determine the organization ID for scoping
      const organizationId = req.user!.organizationId || req.user!.id;

      // Resolve target affiliate IDs based on criteria
      let targetIds: number[] = [];

      if (criteriaType === "all") {
        const result = await sql`
          SELECT id FROM affiliates
          WHERE "organizationId" = ${organizationId} AND deleted = false AND status = 'VERIFIED'
        `.execute(db);
        targetIds = result.rows.map((r: any) => r.id);
      } else if (criteriaType === "by_sport") {
        if (!sportsCategoryId) {
          return res.status(400).json({
            success: false,
            message: "sportsCategoryId is required for by_sport criteria.",
          });
        }
        const result = await sql`
          SELECT id FROM affiliates
          WHERE "organizationId" = ${organizationId}
            AND "sportsCategoryId" = ${sportsCategoryId}
            AND deleted = false AND status = 'VERIFIED'
        `.execute(db);
        targetIds = result.rows.map((r: any) => r.id);
      } else if (criteriaType === "by_event") {
        if (!eventId) {
          return res.status(400).json({
            success: false,
            message: "eventId is required for by_event criteria.",
          });
        }
        const result = await sql`
          SELECT DISTINCT affiliate_id as id
          FROM affiliate_event_responses
          WHERE event_id = ${eventId} AND deleted = false
        `.execute(db);
        targetIds = result.rows.map((r: any) => r.id);
      } else if (criteriaType === "custom") {
        if (!affiliateIds || !Array.isArray(affiliateIds) || affiliateIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "affiliateIds array is required for custom criteria.",
          });
        }
        targetIds = affiliateIds.map(Number).filter((id: number) => !isNaN(id) && id > 0);
      }

      if (targetIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No target affiliates found matching the criteria.",
        });
      }

      // Cap at 1000 to prevent abuse
      if (targetIds.length > 1000) {
        targetIds = targetIds.slice(0, 1000);
      }

      // Create notification records for each target
      let sentCount = 0;
      let failedCount = 0;

      for (const affiliateId of targetIds) {
        try {
          await db
            .insertInto("notifications" as any)
            .values({
              user_id: affiliateId,
              user_type: "affiliate",
              title,
              body,
              data: notificationData ? JSON.stringify(notificationData) : null,
              notification_type: notificationType || "BULK",
              is_read: false,
            })
            .execute();
          sentCount++;
        } catch (err) {
          failedCount++;
        }
      }

      return res.status(201).json({
        success: true,
        message: `Bulk notification sent. ${sentCount} delivered, ${failedCount} failed.`,
        data: {
          targetCriteria: criteriaType,
          totalTargets: targetIds.length,
          sentCount,
          failedCount,
        },
      });
    } catch (error) {
      console.error("Send bulk notification error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get notification delivery analytics: sent count, read count, read rate, by type.
   * GET /api/notifications/analytics
   */
  getNotificationAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.user!.organizationId || req.user!.id;

      // Overall stats
      const overallStats = await sql`
        SELECT
          COUNT(*)::int as total_sent,
          COUNT(*) FILTER (WHERE n.is_read = true)::int as total_read,
          CASE WHEN COUNT(*) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE n.is_read = true)::numeric / COUNT(*)::numeric) * 100, 2)
            ELSE 0
          END as read_rate
        FROM notifications n
        INNER JOIN affiliates a ON a.id = n.user_id
        WHERE a."organizationId" = ${organizationId}
          AND a.deleted = false
          AND n.user_type = 'affiliate'
      `.execute(db);

      // Stats by notification type
      const statsByType = await sql`
        SELECT
          COALESCE(n.notification_type, 'general') as notification_type,
          COUNT(*)::int as sent_count,
          COUNT(*) FILTER (WHERE n.is_read = true)::int as read_count,
          CASE WHEN COUNT(*) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE n.is_read = true)::numeric / COUNT(*)::numeric) * 100, 2)
            ELSE 0
          END as read_rate
        FROM notifications n
        INNER JOIN affiliates a ON a.id = n.user_id
        WHERE a."organizationId" = ${organizationId}
          AND a.deleted = false
          AND n.user_type = 'affiliate'
        GROUP BY n.notification_type
        ORDER BY sent_count DESC
      `.execute(db);

      // Delivery trend (last 30 days, daily)
      const deliveryTrend = await sql`
        SELECT
          TO_CHAR(DATE(n.created_at), 'YYYY-MM-DD') as date,
          COUNT(*)::int as sent_count,
          COUNT(*) FILTER (WHERE n.is_read = true)::int as read_count
        FROM notifications n
        INNER JOIN affiliates a ON a.id = n.user_id
        WHERE a."organizationId" = ${organizationId}
          AND a.deleted = false
          AND n.user_type = 'affiliate'
          AND n.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(n.created_at)
        ORDER BY date ASC
      `.execute(db);

      return res.status(200).json({
        success: true,
        message: "Notification analytics fetched successfully.",
        data: {
          overall: overallStats.rows[0] || { total_sent: 0, total_read: 0, read_rate: 0 },
          byType: statsByType.rows,
          deliveryTrend: deliveryTrend.rows,
        },
      });
    } catch (error) {
      console.error("Get notification analytics error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

// ==================== Email Templates & Utility ====================

const EMAIL_TEMPLATES = {
  WELCOME: {
    subject: "Welcome to KIBI Sports, {{name}}!",
    description: "Sent when a new affiliate joins the platform",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">Welcome to KIBI Sports!</h2>
        <p>Hi {{name}},</p>
        <p>We are thrilled to have you on board. Your account has been created successfully.</p>
        <p>Organization: <strong>{{organizationName}}</strong></p>
        <p>You can now explore campaigns, events, and connect with the sports community.</p>
        <p>Best regards,<br/>KIBI Sports Team</p>
      </div>
    `,
    sampleData: { name: "Arjun Mehta", organizationName: "KIBI Sports Academy" },
  },
  KYC_APPROVED: {
    subject: "KYC Approved - {{name}}",
    description: "Sent when KYC documents are approved",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #34a853;">KYC Verification Approved</h2>
        <p>Hi {{name}},</p>
        <p>Your KYC documents have been reviewed and <strong>approved</strong>.</p>
        <p>You now have full access to all platform features.</p>
        <p>Best regards,<br/>KIBI Sports Team</p>
      </div>
    `,
    sampleData: { name: "Priya Sharma" },
  },
  KYC_REJECTED: {
    subject: "KYC Rejected - Action Required",
    description: "Sent when KYC documents are rejected",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea4335;">KYC Verification Rejected</h2>
        <p>Hi {{name}},</p>
        <p>Unfortunately, your KYC documents have been <strong>rejected</strong>.</p>
        <p>Reason: {{reason}}</p>
        <p>Please re-submit your documents with the correct information.</p>
        <p>Best regards,<br/>KIBI Sports Team</p>
      </div>
    `,
    sampleData: { name: "Rahul Singh", reason: "Document image unclear, please re-upload" },
  },
  EVENT_REGISTRATION: {
    subject: "Event Registration Confirmed - {{eventName}}",
    description: "Sent when an affiliate registers for an event",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">Event Registration Confirmed</h2>
        <p>Hi {{name}},</p>
        <p>You have successfully registered for <strong>{{eventName}}</strong>.</p>
        <p>Date: {{eventDate}}</p>
        <p>Venue: {{venue}}</p>
        <p>Please arrive 30 minutes before the scheduled start time.</p>
        <p>Best regards,<br/>KIBI Sports Team</p>
      </div>
    `,
    sampleData: {
      name: "Vikram Patel",
      eventName: "National Football Championship 2026",
      eventDate: "March 15, 2026",
      venue: "Mumbai Sports Arena",
    },
  },
  CAMPAIGN_APPROVED: {
    subject: "Campaign Application Approved - {{campaignName}}",
    description: "Sent when an affiliate is approved for a campaign",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #34a853;">Campaign Application Approved</h2>
        <p>Hi {{name}},</p>
        <p>Congratulations! Your application for <strong>{{campaignName}}</strong> has been approved.</p>
        <p>Brand: {{brandName}}</p>
        <p>Please check the campaign details in your dashboard for next steps.</p>
        <p>Best regards,<br/>KIBI Sports Team</p>
      </div>
    `,
    sampleData: {
      name: "Ananya Gupta",
      campaignName: "Summer Fitness Campaign",
      brandName: "FitPro India",
    },
  },
  INVITATION: {
    subject: "You have been invited to join KIBI Sports",
    description: "Sent when an affiliate is invited to the platform",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">You're Invited to KIBI Sports!</h2>
        <p>Hi {{name}},</p>
        <p>You have been invited to join <strong>{{organizationName}}</strong> on KIBI Sports.</p>
        <p>Your invitation code: <strong style="font-size: 18px;">{{invitationCode}}</strong></p>
        <p>Download the KIBI Sports app and use this code to sign up.</p>
        <p>Best regards,<br/>KIBI Sports Team</p>
      </div>
    `,
    sampleData: {
      name: "Deepak Kumar",
      organizationName: "Elite Sports Academy",
      invitationCode: "KIBI-AB1234",
    },
  },
};

/**
 * Simple template renderer: replaces {{key}} with data[key]
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * Internal utility: send email notification using nodemailer
 * Can be imported and used by other controllers/services
 */
export const sendEmailNotification = async (
  templateName: string,
  recipientEmail: string,
  data: Record<string, any>
): Promise<void> => {
  try {
    const template = EMAIL_TEMPLATES[templateName as keyof typeof EMAIL_TEMPLATES];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const subject = renderTemplate(template.subject, data);
    const html = renderTemplate(template.body, data);

    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP not configured. Skipping email send.");
      return;
    }

    const transporter = createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"KIBI Sports" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html,
    });

    console.log(`Email sent: ${templateName} to ${recipientEmail}`);
  } catch (error) {
    console.error("Send email notification error:", error);
    // Don't throw - email failures shouldn't break the calling flow
  }
};
