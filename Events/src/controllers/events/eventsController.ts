import { NextFunction, Request, Response } from "express";
import { db } from "../../database/kysely/databases";
import { sql, CompiledQuery } from "kysely";
// import { notifyAffiliatesByLocation } from "../../utils/firebase/locationNotificationService";
import {
  createEventSchema,
  updateEventSchema,
  registerAffiliateSchema,
} from "./eventSchema";
import { EventTable } from "../../database/kysely/types";
import { JwtPayload, UserTypes } from "../../interfaces/jwtPayloads";
import { randomUUID } from "crypto";

import { extractLatLngFromMapLink } from "../../utils/mapUtils";

export const generateInvitationCode = (length: number = 6): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "KIBI-";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Creates a new event with validation and organization/form verification
 * Includes security checks for organization existence and form ownership
 */
export const createEvent = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const payload = { ...req.body, organizationId };

    // ------------------------
    // Validate Request Body
    // ------------------------
    const { error } = await createEventSchema.validate(payload);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const {
      type,
      teamSize,
      eventFee,
      mapLink,
      latitude,
      longitude,
      name,
      formId,
      sportsCategoryId,
      brochure,
      age_limit,
    } = payload;

    // Remove only the fields that need special handling
    const rest = Object.keys(payload).reduce((acc, key) => {
      if (!["type", "teamSize", "eventFee", "mapLink", "latitude", "longitude", "name", "formId", "sportsCategoryId", "brochure", "age_limit", "organizationId"].includes(key)) {
        acc[key] = payload[key];
      }
      return acc;
    }, {} as any);

    // ------------------------
    // Business Rules
    // ------------------------
    if (type === "individual" && teamSize !== 1) {
      return res.status(400).json({
        success: false,
        message: "Individual events must have teamSize = 1.",
      });
    }

    if (teamSize < 1) {
      return res.status(400).json({
        success: false,
        message: "teamSize must be at least 1.",
      });
    }

    if (!mapLink) {
      return res.status(400).json({
        success: false,
        message: "mapLink is required.",
      });
    }

    // ------------------------
    // Participation Fee Calculation
    // ------------------------
    // Business Logic:
    // - Individual Event: Participant pays the full eventFee amount
    // - Team Event: Total team fee (eventFee) is divided equally among all team members
    //   Example: If team has 11 players and eventFee is ₹1100, each player pays ₹100
    const participationFee =
      type === "team" ? eventFee / teamSize : eventFee;

    // ------------------------
    // Pre-checks
    // ------------------------
    const [existingEvent, organizationExists, formExists] =
      await Promise.all([
        db
          .selectFrom("events")
          .select("id")
          .where("organizationId", "=", organizationId)
          .where("name", "=", name)
          .where("deleted", "=", false)
          .executeTakeFirst(),

        db
          .selectFrom("sports_organizations")
          .select("id")
          .where("id", "=", organizationId)
          .where("deleted", "=", false)
          .executeTakeFirst(),

        db
          .selectFrom("forms")
          .select("id")
          .where("id", "=", Number(formId))
          .where("organizationId", "=", organizationId)
          .where("deleted", "=", false)
          .executeTakeFirst(),
      ]);

    if (existingEvent) {
      return res.status(400).json({
        success: false,
        message: "Event already exists with this name in this organization.",
      });
    }

    if (!organizationExists) {
      return res.status(400).json({
        success: false,
        message: "Organization does not exist.",
      });
    }

    if (!formExists) {
      return res.status(400).json({
        success: false,
        message: "Form does not exist.",
      });
    }

    // ------------------------
    // Normalize Sports Category
    // ------------------------
    let parsedSportsCategoryIds: number[] = [];
    if (Array.isArray(sportsCategoryId)) {
      parsedSportsCategoryIds = sportsCategoryId.map(Number);
    } else if (typeof sportsCategoryId === "string") {
      parsedSportsCategoryIds = JSON.parse(sportsCategoryId).map(Number);
    }

    // ------------------------
    // Transaction
    // ------------------------
    const createdEvent = await db.transaction().execute(async (trx) => {
      const eventData = {
        ...rest,
        organizationId,
        type,
        teamSize,
        eventFee,
        mapLink,
        latitude,
        longitude,
        name,
        brochure: brochure || null,
        age_limit: age_limit ? Number(age_limit) : null,
        participationFee,
        deleted: false,
        isApprovedByAdmin: false,
        created_at: new Date(),
      };

      const newEvent = await trx
        .insertInto("events")
        .values(eventData)
        .returningAll()
        .executeTakeFirstOrThrow();

      const eventId = Number(newEvent.id);

      await trx
        .insertInto("events_forms")
        .values({
          eventId,
          formId: Number(formId),
          deleted: false,
        })
        .executeTakeFirstOrThrow();

      if (parsedSportsCategoryIds.length > 0) {
        await trx
          .insertInto("events_sports_category")
          .values(
            parsedSportsCategoryIds.map((categoryId) => ({
              event_id: eventId,
              sports_category_id: categoryId,
            }))
          )
          .execute();
      }

      return {
        ...newEvent,
        sportsCategoryId: parsedSportsCategoryIds,
        displayName: newEvent.organizationName,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: createdEvent,
    });
  } catch (err) {
    console.error("Error while creating event:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating event.",
    });
  }
};



export const deleteOrgEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = Number(req?.user?.id);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    // Step 1: Verify event exists and is not already deleted
    const existingEvent = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event does not exist with this ID or is already deleted.",
      });
    }

    // Step 2: Transaction for atomic delete
    await db.transaction().execute(async (trx) => {
      // Soft delete event
      await trx
        .updateTable("events")
        .set({ deleted: true })
        .where("id", "=", eventId)
        .where("organizationId", "=", organizationId)
        .where("deleted", "=", false)
        .executeTakeFirstOrThrow();

      // Cascade delete event-form mappings
      await trx
        .updateTable("events_forms")
        .set({ deleted: true })
        .where("eventId", "=", eventId)
        .where("deleted", "=", false)
        .execute();

      //deletes all the registration associated with this event.
      //only delete affiliate_event_responses if they exist
      const existingResponses = await trx
        .selectFrom("affiliate_event_responses")
        .selectAll()
        .where("event_id", "=", eventId)
        .where("deleted", "=", false)
        .execute();

      if (existingResponses.length != 0) {
        //if length is not 0, means we find some responses, so we can delete them
        await trx
          .updateTable("affiliate_event_responses")
          .set({ deleted: true })
          .where("event_id", "=", eventId)
          .where("deleted", "=", false)
          .execute();
      }
    });

    // Step 3: Respond success
    return res.status(200).json({
      success: true,
      message: "Event and related mappings deleted successfully.",
      data: { eventId },
    });
  } catch (err: any) {
    console.error("Error while deleting event:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting event.",
    });
  }
};

/**
 * Soft deletes an event and its associated form mappings
 * Implements cascade soft delete for data integrity
 */
export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    // Step 1: Verify event exists and is not already deleted
    const existingEvent = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event does not exist with this ID or is already deleted.",
      });
    }

    // Step 2: Transaction for atomic delete
    await db.transaction().execute(async (trx) => {
      // Soft delete event
      await trx
        .updateTable("events")
        .set({ deleted: true })
        .where("id", "=", eventId)
        .where("deleted", "=", false)
        .execute();

      // Cascade delete mappings
      await trx
        .updateTable("events_forms")
        .set({ deleted: true })
        .where("eventId", "=", eventId)
        .where("deleted", "=", false)
        .execute();

      //deletes all the registration associated with this event.
      //   const existingResponses = await trx
      //     .selectFrom("affiliate_event_responses")
      //     .selectAll()
      //     .where("event_id", "=", eventId)
      //     .where("deleted", "=", false)
      //     .execute();

      //   if (existingResponses.length != 0) {
      //     //if length is not 0, means we find some responses, so we can delete them
      //     await trx
      //       .updateTable("affiliate_event_responses")
      //       .set({ deleted: true })
      //       .where("event_id", "=", eventId)
      //       .where("deleted", "=", false)
      //       .execute();
      //   }
      // });

      await trx
        .updateTable("events_sports_category")
        .set({ deleted: true })
        .where("event_id", "=", eventId)
        .execute();

      // Soft delete all athlete registrations
      await trx
        .updateTable("affiliate_event_responses")
        .set({ deleted: true })
        .where("event_id", "=", eventId)
        .execute();
    });

    // Step 3: Respond success
    return res.status(200).json({
      success: true,
      message: "Event and related mappings deleted successfully.",
      data: { eventId },
    });
  } catch (err: any) {
    console.error("Error while deleting event:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting event.",
    });
  }
};

/**
 * Updates event details with selective field updates
 * Supports form remapping and maintains audit trail
 */
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide data to be updated.",
      });
    }

    // ------------------------
    // Validate Payload
    // ------------------------
    const { error } = await updateEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // ------------------------
    // Check Event Exists
    // ------------------------
    const existingEvent = await db
      .selectFrom("events")
      .select(["id", "type", "teamSize"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event does not exist with this ID.",
      });
    }

    // ------------------------
    // Build Update Object
    // ------------------------
    const updatableFields = [
      "name",
      "description",
      "organizerEmail",
      "organizerPhoneNumber",
      "venue",
      "organizationName",
      "address",
      "mapLink",
      "participationFee",
      "eventFee",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "imageUrl",
      "eventType",
      "brochure",
      "age_limit",
      "latitude",
      "longitude",
    ];

    const dataToUpdate: Record<string, any> = {};

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        dataToUpdate[field] = req.body[field];
      }
    }

    if ("isApprovedByAdmin" in req.body) {
      dataToUpdate.isApprovedByAdmin = req.body.isApprovedByAdmin;
    }

    // ------------------------
    // Participation Fee Calculation
    // ------------------------
    // Business Logic:
    // - Individual Event: Participant pays the full eventFee amount
    // - Team Event: Total team fee (eventFee) is divided equally among all team members
    //   Example: If team has 11 players and eventFee is ₹1100, each player pays ₹100
    // If eventFee is being updated, automatically recalculate participationFee
    if (req.body.eventFee !== undefined) {
      const eventFee = Number(req.body.eventFee);
      const eventType = existingEvent.type;
      const teamSize = existingEvent.teamSize;

      if (eventType === "team" && teamSize && teamSize > 0) {
        dataToUpdate.participationFee = eventFee / teamSize;
      } else {
        // For individual events or if teamSize is invalid, participationFee equals eventFee
        dataToUpdate.participationFee = eventFee;
      }
    }

    // ------------------------
    // Normalize Sports Categories
    // ------------------------
    let newSportsCategoryIds: number[] | undefined;

    if ("sportsCategoryId" in req.body) {
      const raw = req.body.sportsCategoryId;

      try {
        if (Array.isArray(raw)) {
          newSportsCategoryIds = raw.map(Number);
        } else if (typeof raw === "string") {
          const parsed = JSON.parse(raw);
          newSportsCategoryIds = Array.isArray(parsed)
            ? parsed.map(Number)
            : [Number(parsed)];
        } else {
          newSportsCategoryIds = [Number(raw)];
        }
      } catch {
        return res.status(400).json({
          success: false,
          message:
            "Invalid sportsCategoryId format. Expected array or JSON string.",
        });
      }
    }

    // ------------------------
    // Transaction
    // ------------------------
    const updatedEvent = await db.transaction().execute(async (trx) => {
      // 1️⃣ Update Event
      if (Object.keys(dataToUpdate).length > 0) {
        await trx
          .updateTable("events")
          .set(dataToUpdate)
          .where(
            sql<boolean>`
              id = ${eventId}
              AND "organizationId" = ${organizationId}
              AND deleted = false
            `
          )
          .execute();
      }

      // 2️⃣ Update Sports Categories
      if (Array.isArray(newSportsCategoryIds)) {
        const existing = await trx
          .selectFrom("events_sports_category")
          .select("sports_category_id")
          .where("event_id", "=", eventId)
          .execute();

        const oldIds = existing.map((c) => c.sports_category_id);

        const toAdd = newSportsCategoryIds.filter(
          (id) => !oldIds.includes(id)
        );
        const toRemove = oldIds.filter(
          (id) => !newSportsCategoryIds!.includes(id)
        );

        if (toRemove.length > 0) {
          await trx
            .deleteFrom("events_sports_category")
            .where("event_id", "=", eventId)
            .where("sports_category_id", "in", toRemove)
            .execute();
        }

        if (toAdd.length > 0) {
          await trx
            .insertInto("events_sports_category")
            .values(
              toAdd.map((id) => ({
                event_id: eventId,
                sports_category_id: id,
              }))
            )
            .execute();
        }
      }

      // 3️⃣ Update Form Mapping (FIXED)
      if (req.body.newFormId) {
        const newFormId = Number(req.body.newFormId);

        // soft-delete all existing mappings
        await trx
          .updateTable("events_forms")
          .set({ deleted: true })
          .where("eventId", "=", eventId)
          .execute();

        // check if mapping already exists
        const existingFormMapping = await trx
          .selectFrom("events_forms")
          .select("id")
          .where("eventId", "=", eventId)
          .where("formId", "=", newFormId)
          .executeTakeFirst();

        if (existingFormMapping) {
          // revive existing mapping
          await trx
            .updateTable("events_forms")
            .set({ deleted: false })
            .where("id", "=", existingFormMapping.id)
            .execute();
        } else {
          // insert new mapping
          await trx
            .insertInto("events_forms")
            .values({
              eventId,
              formId: newFormId,
              deleted: false,
            })
            .execute();
        }
      }

      // 4️⃣ Fetch Updated Event
      const event = await trx
        .selectFrom("events")
        .selectAll()
        .where("id", "=", eventId)
        .executeTakeFirstOrThrow();

      const categories = await trx
        .selectFrom("events_sports_category")
        .select("sports_category_id")
        .where("event_id", "=", eventId)
        .execute();

      return {
        ...event,
        sportsCategoryId: categories.map((c) => c.sports_category_id),
        displayName: event.organizationName,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (err: any) {
    console.error("Error while updating event:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating event.",
    });
  }
};

export const getDeepLink = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // 🔒 Single source of truth for domain
    const BASE_URL = process.env.FRONTEND_URL || "https://kibisports.com";

    // ✅ Deterministic deep link
    const deepLink = `${BASE_URL}/app/events/${eventId}`;

    return res.status(200).json({
      success: true,
      eventId,
      deepLink,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate deep link",
      error: error.message,
    });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload;
    const nearby = req.query.nearby === "true";
    const affiliateId = user?.id;

    let query = db
      .selectFrom("events")
      .leftJoin("events_forms", (join) =>
        join
          .onRef("events.id", "=", "events_forms.eventId")
          .on("events_forms.deleted", "=", false)
      )
      .leftJoin("forms", (join) =>
        join
          .onRef("events_forms.formId", "=", "forms.id")
          .on("forms.deleted", "=", false)
      )
      .select([
        "events.id",
        "events.name",
        "events.description",
        "events.startDate",
        "events.endDate",
        "events.startTime",
        "events.endTime",
        "events.eventFee",
        "events.participationFee",
        "events.venue",
        "events.teamSize",
        "events.address",
        "events.mapLink",
        "events.organizerEmail",
        "events.organizationName",
        "events.organizationId",
        "events.brochure",
        "events.age_limit",
        "events.organizerPhoneNumber",
        "events.imageUrl",
        "events.isApprovedByAdmin",
        "events.deleted",
        "events.eventType",
        "events.latitude",
        "events.longitude",
        "events_forms.formId as formId",
        "forms.form_values as form_values",
        "events.type as type",
      ])
      .where("events.deleted", "=", false);

    // 🔥 Apply admin approval filter only if affiliate is NOT 67
    if (affiliateId !== 67) {
      query = query.where("events.isApprovedByAdmin", "=", true);
    }

    /* --------------------------
       SPORTS CATEGORY FILTER
    -------------------------- */
    if (req.query.sportsCategoryId) {
      const categoryId = Number(req.query.sportsCategoryId);
      query = query.where(
        "events.id",
        "in",
        db
          .selectFrom("events_sports_category")
          .select("event_id")
          .where("sports_category_id", "=", categoryId)
      );
    }

    /* --------------------------
       GEO / NEARBY FILTER (PostGIS)
    -------------------------- */
    let lat: number | null = null;
    let lng: number | null = null;

    if (req.query.lat && req.query.long) {
      lat = Number(req.query.lat);
      lng = Number(req.query.long);
    } else if (nearby && affiliateId) {
      const affiliate = await db
        .selectFrom("affiliates")
        .select(["latitude", "longitude"])
        .where("id", "=", affiliateId)
        .executeTakeFirst();

      if (affiliate?.latitude && affiliate?.longitude) {
        lat = affiliate.latitude;
        lng = affiliate.longitude;
      }
    }

    if (lat !== null && lng !== null) {
      const RADIUS_METERS = 50_000; // 50km

      query = query
        .where((eb) =>
          sql<boolean>`
            ST_DWithin(
              events.geo,
              ST_SetSRID(
                ST_MakePoint(${lng}, ${lat}),
                4326
              )::geography,
              ${RADIUS_METERS}
            )
          `
        )
        .select(
          sql<number>`
            ST_Distance(
              events.geo,
              ST_SetSRID(
                ST_MakePoint(${lng}, ${lat}),
                4326
              )::geography
            )
          `.as("distance")
        )
        .orderBy("distance", "asc");
    } else if (nearby) {
      return res.status(404).json({
        success: false,
        message: "No events found.",
        data: [],
      });
    }

    /* --------------------------
       OTHER FILTERS
    -------------------------- */
    if (req.query.name) {
      query = query.where("events.name", "ilike", `%${req.query.name}%`);
    }

    if (req.query.organizationId) {
      query = query.where(
        "events.organizationId",
        "=",
        Number(req.query.organizationId)
      );
    }

    if (req.query.participationFee) {
      query = query.where(
        "events.participationFee",
        "=",
        Number(req.query.participationFee)
      );
    }

    if (req.query.organizerPhoneNumber) {
      query = query.where(
        "events.organizerPhoneNumber",
        "ilike",
        `%${req.query.organizerPhoneNumber}%`
      );
    }

    if (req.query.venue) {
      query = query.where("events.venue", "ilike", `%${req.query.venue}%`);
    }

    if (req.query.organizationName) {
      query = query.where(
        "events.organizationName",
        "ilike",
        `%${req.query.organizationName}%`
      );
    }

    if (req.query.address) {
      query = query.where("events.address", "ilike", `%${req.query.address}%`);
    }

    if (req.query.type) {
      query = query.where(
        "events.type",
        "=",
        req.query.type as "individual" | "team"
      );
    }

    if (req.query.eventType) {
      query = query.where(
        "events.eventType",
        "=",
        req.query.eventType as EventTable["eventType"]
      );
    }

    /* --------------------------
       HIDE PAID EVENTS
    -------------------------- */
    if (affiliateId) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            db
              .selectFrom("affiliate_event_responses")
              .select("affiliate_event_responses.event_id")
              .whereRef(
                "affiliate_event_responses.event_id",
                "=",
                eb.ref("events.id")
              )
              .where("affiliate_event_responses.affiliate_id", "=", affiliateId)
              .where(
                "affiliate_event_responses.payment_status",
                "=",
                "PAID"
              )
          )
        )
      );
    }

    /* --------------------------
       EXECUTE
    -------------------------- */
    const events = await query.execute();

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No events found.",
        data: [],
      });
    }

    const eventIds = events.map((e) => e.id);

    const sportsCategoryMap = await db
      .selectFrom("events_sports_category")
      .innerJoin(
        "sports_category",
        "sports_category.id",
        "events_sports_category.sports_category_id"
      )
      .select([
        "events_sports_category.event_id as event_id",
        "sports_category.id as id",
        "sports_category.title as name",
      ])
      .where("events_sports_category.event_id", "in", eventIds)
      .execute();

    const grouped = sportsCategoryMap.reduce((acc, item) => {
      if (!acc[item.event_id]) acc[item.event_id] = [];
      acc[item.event_id]!.push({ id: item.id, name: item.name });
      return acc;
    }, {} as Record<number, any[]>);

    const finalEvents = events.map((event) => ({
      ...event,
      displayName: event.organizationName,
      sports_category: grouped[event.id] || [],
    }));

    return res.status(200).json({
      success: true,
      message: "Events fetched successfully",
      count: finalEvents.length,
      data: finalEvents,
    });
  } catch (error: any) {
    console.error("Error in events controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event id is required",
      });
    }

    let query = db
      .selectFrom("events")
      .leftJoin("events_forms", (join) =>
        join
          .onRef("events.id", "=", "events_forms.eventId")
          .on("events_forms.deleted", "=", false)
      )
      .leftJoin("forms", (join) =>
        join
          .onRef("events_forms.formId", "=", "forms.id")
          .on("forms.deleted", "=", false)
      )
      .select([
        "events.id",
        "events.name",
        "events.description",
        "events.startDate",
        "events.endDate",
        "events.startTime",
        "events.endTime",
        "events.eventFee",
        "events.participationFee",
        "events.venue",
        "events.address",
        "events.mapLink",
        "events.organizerEmail",
        "events.organizationName",
        "events.organizationId",
        "events.brochure",
        "events.age_limit",
        "events.organizerPhoneNumber",
        "events.imageUrl",
        "events.isApprovedByAdmin",
        "events.deleted",
        "events.eventType",
        "events.latitude",
        "events.longitude",
        "events.displayName",
        "events_forms.formId as formId",
        "forms.form_values as form_values",
        "events.type as type",
      ])
      .where("events.deleted", "=", false)
      .where("events.id", "=", eventId);

    const event = await query.executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
        data: null,
      });
    }

    /* --------------------------
       FETCH SPORTS CATEGORIES
    -------------------------- */
    const sportsCategories = await db
      .selectFrom("events_sports_category")
      .innerJoin(
        "sports_category",
        "sports_category.id",
        "events_sports_category.sports_category_id"
      )
      .select([
        "sports_category.id as id",
        "sports_category.title as name",
      ])
      .where("events_sports_category.event_id", "=", eventId)
      .execute();

    const finalEvent = {
      ...event,
      sports_category: sportsCategories || [],
    };

    return res.status(200).json({
      success: true,
      message: "Event fetched successfully",
      data: finalEvent,
    });
  } catch (error: any) {
    console.error("Error in getEventById controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getEventsForAdmin = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    // First, get distinct event IDs with pagination
    let eventIdsQuery = db
      .selectFrom("events")
      .select("events.id")
      .where("events.deleted", "=", false);

    // Apply filters
    if (req.query.name) {
      eventIdsQuery = eventIdsQuery.where(
        "events.name",
        "ilike",
        `%${req.query.name}%`
      );
    }

    if (req.query.organizationId) {
      eventIdsQuery = eventIdsQuery.where(
        "events.organizationId",
        "=",
        Number(req.query.organizationId)
      );
    }

    if (req.query.participationFee) {
      eventIdsQuery = eventIdsQuery.where(
        "events.participationFee",
        "=",
        Number(req.query.participationFee)
      );
    }

    if (req.query.organizerPhoneNumber) {
      eventIdsQuery = eventIdsQuery.where(
        "events.organizerPhoneNumber",
        "ilike",
        `%${req.query.organizerPhoneNumber}%`
      );
    }

    if (req.query.venue) {
      eventIdsQuery = eventIdsQuery.where(
        "events.venue",
        "ilike",
        `%${req.query.venue}%`
      );
    }

    if (req.query.organizationName) {
      eventIdsQuery = eventIdsQuery.where(
        "events.organizationName",
        "ilike",
        `%${req.query.organizationName}%`
      );
    }

    if (req.query.address) {
      eventIdsQuery = eventIdsQuery.where(
        "events.address",
        "ilike",
        `%${req.query.address}%`
      );
    }

    if (req.query.eventType) {
      eventIdsQuery = eventIdsQuery.where(
        "events.eventType",
        "=",
        req.query.eventType as EventTable["eventType"]
      );
    }

    const eventIds = await eventIdsQuery
      .orderBy("events.id", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    if (!eventIds.length) {
      return res.status(404).json({
        success: false,
        message: "No events found",
        data: [],
      });
    }

    const ids = eventIds.map((e) => e.id);

    // Fetch full event data
    const events = await db
      .selectFrom("events")
      .leftJoin("events_forms", (join) =>
        join
          .onRef("events.id", "=", "events_forms.eventId")
          .on("events_forms.deleted", "=", false)
      )
      .leftJoin("forms", (join) =>
        join
          .onRef("events_forms.formId", "=", "forms.id")
          .on("forms.deleted", "=", false)
      )
      .leftJoin("events_sports_category", (join) =>
        join
          .onRef("events.id", "=", "events_sports_category.event_id")
          .on("events_sports_category.deleted", "=", false)
      )
      .leftJoin("sports_category", (join) =>
        join
          .onRef(
            "events_sports_category.sports_category_id",
            "=",
            "sports_category.id"
          )
          .on("sports_category.deleted", "=", false)
      )
      .select([
        "events.id",
        "events.name",
        "events.description",
        "events.startDate",
        "events.endDate",
        "events.startTime",
        "events.endTime",
        "events.participationFee",
        "events.venue",
        "events.address",
        "events.mapLink",
        "events.organizerEmail",
        "events.organizationName",
        "events.organizationId",
        "events.organizerPhoneNumber",
        "events.imageUrl",
        "events.isApprovedByAdmin",
        "events.deleted",
        "events.eventType",

        // ✅ REQUIRED FIELDS
        "events.type as eventTypeParticipation",
        sql<number>`events."teamSize"`.as("eventTeamSize"),
        "events.brochure as eventBrochure",


        "events_forms.formId as formId",
        "forms.form_values as form_values",
        "sports_category.id as sportsCategoryId",
        "sports_category.title as sportsCategoryTitle",
      ])
      .where("events.deleted", "=", false)
      .where("events.id", "in", ids)
      .execute();

    // Count for pagination
    const countResult = await db
      .selectFrom("events")
      .select(db.fn.count("events.id").as("count"))
      .where("events.deleted", "=", false)
      .executeTakeFirst();

    const total = Number(countResult?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    // Format response
    const eventsMap: Record<number, any> = {};

    events.forEach((row: any) => {
      if (!eventsMap[row.id]) {
        eventsMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          startDate: row.startDate,
          endDate: row.endDate,
          startTime: row.startTime,
          endTime: row.endTime,
          participationFee: row.participationFee,
          venue: row.venue,
          address: row.address,
          mapLink: row.mapLink,
          organizerEmail: row.organizerEmail,
          organizationName: row.organizationName,
          displayName: row.organizationName,
          organizationId: row.organizationId,
          organizerPhoneNumber: row.organizerPhoneNumber,
          imageUrl: row.imageUrl,
          isApprovedByAdmin: row.isApprovedByAdmin,
          deleted: row.deleted,
          eventType: row.eventType,

          // ✅ INCLUDED IN RESPONSE
          type: row.eventTypeParticipation,
          teamSize: row.eventTeamSize,
          brochure: row.eventBrochure,


          formId: row.formId,
          form_values: row.form_values,

          sportsCategoryId: null,
          sportsCategoryTitle: null,
          sportsCategories: [],
        };
      }

      if (row.sportsCategoryId) {
        if (!eventsMap[row.id].sportsCategoryId) {
          eventsMap[row.id].sportsCategoryId = row.sportsCategoryId;
          eventsMap[row.id].sportsCategoryTitle = row.sportsCategoryTitle;
        }

        const exists = eventsMap[row.id].sportsCategories.some(
          (cat: any) => cat.id === row.sportsCategoryId
        );

        if (!exists) {
          eventsMap[row.id].sportsCategories.push({
            id: row.sportsCategoryId,
            title: row.sportsCategoryTitle,
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Events fetched successfully",
      count: Object.values(eventsMap).length,
      data: Object.values(eventsMap),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error in events controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Registers an affiliate for an event with payment processing integration
 * Includes comprehensive validation and payment verification
 * Now supports all types of sports professionals (athletes, coaches, staff, etc.)
 */
export const registerAffiliateWithEvent = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate registration data
    const { error } = await registerAffiliateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const {
      event_id,
      form_id,
      response_data,
      payment_id,
      order_id,
      amount_paid,
      payment_status,
      payment_time,
    } = req.body;

    const affiliate_id = Number(req?.user?.id);

    // Parse and validate payment timestamp
    const normalizeDateString = (input: string): string => {
      if (!input || typeof input !== "string") {
        throw new Error(
          "Invalid payment time format: input must be a non-empty string"
        );
      }

      const parts = input.split(",").map((s) => s.trim());
      if (parts.length !== 2) {
        throw new Error(
          'Invalid payment time format: expected "DD-MM-YYYY, HH:MM:SS" format'
        );
      }

      const [datePart, timePart] = parts;
      if (!datePart || !timePart) {
        throw new Error(
          "Invalid payment time format: missing date or time component"
        );
      }

      const dateParts = datePart.split("-");
      if (dateParts.length !== 3) {
        throw new Error('Invalid date format: expected "DD-MM-YYYY" format');
      }

      const [day, month, year] = dateParts;
      if (!day || !month || !year) {
        throw new Error("Invalid date format: missing day, month, or year");
      }

      return `${year}-${month}-${day}T${timePart}`;
    };

    const normalizedDateStr = normalizeDateString(payment_time);
    const parsedPaymentTime = new Date(normalizedDateStr);

    if (isNaN(parsedPaymentTime.getTime())) {
      return res.status(400).json({
        message:
          "Invalid payment_time format. Expected format: dd-MM-yyyy, HH:mm:ss",
      });
    }

    // Verify affiliate exists and is active
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["id", "role", "name"])
      .where("id", "=", Number(affiliate_id))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      return res
        .status(404)
        .json({ message: "Affiliate not found with this id." });
    }

    // Verify event exists and is active
    const event = await db
      .selectFrom("events")
      .select(["id", "isApprovedByAdmin"])
      .where("id", "=", Number(event_id))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({ message: "Event not found with this id." });
    }

    // Security check: Only allow registration for approved events
    if (!event.isApprovedByAdmin) {
      return res.status(400).json({
        message: "Event is not approved for registration yet.",
      });
    }

    // Verify form exists and is associated with the event
    const form = await db
      .selectFrom("forms")
      .innerJoin("events_forms", "forms.id", "events_forms.formId")
      .select(["forms.id"])
      .where("forms.id", "=", form_id)
      .where("events_forms.eventId", "=", event_id)
      .where("forms.deleted", "=", false)
      .where("events_forms.deleted", "=", false)
      .executeTakeFirst();

    if (!form) {
      return res.status(404).json({
        message: "Form not found or not associated with this event.",
      });
    }

    // Check for duplicate registration
    const existingRegistration = await db
      .selectFrom("affiliate_event_responses")
      .select(["affiliate_id"])
      .where("affiliate_id", "=", affiliate_id)
      .where("event_id", "=", event_id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (existingRegistration) {
      return res.status(400).json({
        message: "Affiliate is already registered for this event.",
      });
    }

    // Prepare registration data
    const registrationData = {
      affiliate_id,
      event_id,
      form_id,
      response_data,
      status: "submitted",
      submitted_at: new Date(),
      deleted: false,
      payment_id,
      order_id,
      amount_paid,
      payment_status,
      payment_time: parsedPaymentTime,
    };

    // Insert affiliate registration
    const result = await db
      .insertInto("affiliate_event_responses")
      .values(registrationData)
      .returningAll()
      .executeTakeFirst();

    // Generate event ticket after successful registration
    let ticketData = null;
    try {
      const { randomBytes } = await import("crypto");
      const ticketCode = randomBytes(4).toString("hex").toUpperCase();
      const eventDetails = await db
        .selectFrom("events")
        .select(["name", "startDate"])
        .where("id", "=", Number(event_id))
        .executeTakeFirst();

      const qrData = JSON.stringify({
        ticketCode,
        eventId: event_id,
        affiliateId: affiliate_id,
        eventName: eventDetails?.name || "",
        date: eventDetails?.startDate || "",
      });

      ticketData = await db
        .insertInto("event_tickets" as any)
        .values({
          event_id: Number(event_id),
          affiliate_id: affiliate_id,
          ticket_code: ticketCode,
          qr_data: qrData,
          checked_in: false,
          created_at: new Date(),
        })
        .returningAll()
        .executeTakeFirst();
    } catch (ticketErr) {
      console.error("Ticket generation error (non-blocking):", ticketErr);
    }

    return res.status(201).json({
      message: `${affiliate.role
        .toLowerCase()
        .replace("_", " ")} registered successfully`,
      success: true,
      data: {
        ...result,
        ticket: ticketData || null,
      },
    });
  } catch (err: any) {
    console.error("Error registering affiliate:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Retrieves all affiliates registered for a specific event
 * Includes registration details and payment information
 * Now supports all types of sports professionals
 */
export const getRegisteredAffiliates = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    // Verify event exists
    const eventExists = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!eventExists) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Fetch registered affiliates with their details
    const registeredAffiliates = await db
      .selectFrom("affiliate_event_responses")
      .leftJoin(
        "affiliates",
        "affiliate_event_responses.affiliate_id",
        "affiliates.id"
      )
      .select([
        "affiliate_event_responses.affiliate_id",
        "affiliate_event_responses.event_id",
        "affiliate_event_responses.form_id",
        "affiliate_event_responses.response_data",
        "affiliate_event_responses.status",
        "affiliate_event_responses.submitted_at",
        "affiliate_event_responses.payment_id",
        "affiliate_event_responses.order_id",
        "affiliate_event_responses.amount_paid",
        "affiliate_event_responses.payment_status",
        "affiliate_event_responses.payment_time",
        "affiliates.name as affiliate_name",
        "affiliates.email as affiliate_email",
        "affiliates.phone as affiliate_phone",
        "affiliates.role as affiliate_role",
        "affiliates.profile_slug as profile_slug",
        "affiliates.sportsCategoryId as affiliate_sports_category_id",
        "affiliates.position as affiliate_position",
      ])
      .where("affiliate_event_responses.event_id", "=", eventId)
      .where("affiliate_event_responses.deleted", "=", false)
      .execute();

    return res.status(200).json({
      success: true,
      message:
        registeredAffiliates.length > 0
          ? "Registered affiliates fetched successfully."
          : "No affiliates registered for this event.",
      count: registeredAffiliates.length,
      data: registeredAffiliates,
    });
  } catch (error: any) {
    console.error("Error fetching registered affiliates:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all events for a specific organization
 * Public endpoint with pagination support
 */
export const getEventsByOrganization = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);

    const organizationExists = await db
      .selectFrom("sports_organizations")
      .select(["id", "name"])
      .where("id", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!organizationExists) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
        data: {},
      });
    }

    // Pagination
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const offset = (page - 1) * limit;

    // Filters
    const eventType = req.query.eventType as
      | EventTable["eventType"]
      | undefined;
    const isApproved =
      req.query.isApprovedByAdmin === "true"
        ? true
        : req.query.isApprovedByAdmin === "false"
        ? false
        : undefined;

    const nameFilter = req.query.name ? String(req.query.name) : undefined;
    const venueFilter = req.query.venue ? String(req.query.venue) : undefined;
    const typeFilter = req.query.type as "individual" | "team" | undefined;

    let query = db
      .selectFrom("events")
      .leftJoin("events_forms", (join) =>
        join
          .onRef("events.id", "=", "events_forms.eventId")
          .on("events_forms.deleted", "=", false)
      )
      .leftJoin(
        "events_sports_category",
        "events.id",
        "events_sports_category.event_id"
      )
      .leftJoin(
        "sports_category",
        "sports_category.id",
        "events_sports_category.sports_category_id"
      )
      .select([
        // ALL event columns
        "events.id",
        "events.name",
        "events.description",
        "events.startDate",
        "events.endDate",
        "events.startTime",
        "events.endTime",
        "events.participationFee",
        "events.venue",
        "events.address",
        "events.mapLink",
        "events.latitude",
        "events.longitude",
        "events.organizerEmail",
        "events.organizationName",
        "events.organizationId",
        "events.brochure",
        "events.age_limit",
        "events.organizerPhoneNumber",
        "events.imageUrl",
        "events.isApprovedByAdmin",
        "events.deleted",
        "events.eventType",
        "events.type",
        "events.teamSize",
        "events.created_at",
      ])
      .select(
        // Correct quoted column name for formId
        sql<number | null>`"events_forms"."formId"`.as("formId")
      )
      .select(
        // SPORTS CATEGORY ARRAY
        sql<any>`COALESCE(
          json_agg(
            CASE WHEN sports_category.id IS NOT NULL THEN
              json_build_object(
                'id', events_sports_category.sports_category_id,
                'title', sports_category.title
              )
            ELSE NULL END
          ) FILTER (WHERE sports_category.id IS NOT NULL),
          '[]'::json
        )`.as("sportsCategories")
      )
      .where("events.organizationId", "=", organizationId)
      .where("events.deleted", "=", false)
      .groupBy(["events.id", "events_forms.formId"]);

    // Apply filters
    if (eventType) query = query.where("events.eventType", "=", eventType);
    if (isApproved !== undefined)
      query = query.where("events.isApprovedByAdmin", "=", isApproved);
    if (nameFilter)
      query = query.where("events.name", "ilike", `%${nameFilter}%`);
    if (venueFilter)
      query = query.where("events.venue", "ilike", `%${venueFilter}%`);
    if (typeFilter)
      query = query.where("events.type", "=", typeFilter);

    query = query
      .orderBy("events.created_at", "desc")
      .limit(limit)
      .offset(offset);

    const events = await query.execute();

    // Count query
    let countQuery = db
      .selectFrom("events")
      .select((eb) => eb.fn.count("events.id").as("count"))
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false);

    if (eventType) countQuery = countQuery.where("eventType", "=", eventType);
    if (isApproved !== undefined)
      countQuery = countQuery.where("isApprovedByAdmin", "=", isApproved);
    if (nameFilter)
      countQuery = countQuery.where("name", "ilike", `%${nameFilter}%`);
    if (venueFilter)
      countQuery = countQuery.where("venue", "ilike", `%${venueFilter}%`);
    if (typeFilter)
      countQuery = countQuery.where("type", "=", typeFilter);

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    const eventsWithDisplayName = events.map((event) => ({
      ...event,
      displayName: event.organizationName,
    }));

    return res.status(200).json({
      success: true,
      message: `Events for ${organizationExists.name} fetched successfully.`,
      data: {
        events: eventsWithDisplayName,
        count: eventsWithDisplayName.length,
        organizationName: organizationExists.name,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching organization events:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: {},
    });
  }
};

export const approveEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    const existingEvent = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event does not exist with this ID.",
      });
    }

    const isApprovedByAdmin = true ? !existingEvent.isApprovedByAdmin : false;

    const updatedEvent = await db
      .updateTable("events")
      .set({ isApprovedByAdmin })
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    }
    return res.status(200).json({
      success: true,
      message: `Event ${
        isApprovedByAdmin ? "approved" : "disapproved"
      } successfully`,
      data: {
        ...updatedEvent,
        displayName: updatedEvent.organizationName,
      },
    });
  } catch (error: any) {
    console.error("Error approving event:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Bulk action API for Super Admin to approve/disapprove selected events
 * Uses a single efficient bulk update query to prevent server overload
 * Supports approve/disapprove actions for selected event IDs only
 */
export const bulkActionEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { action, eventIds } = req.body;

    // Validate action type
    if (!action || !["approve", "disapprove"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'approve' or 'disapprove'.",
      });
    }

    // Validate eventIds array
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "eventIds must be a non-empty array of event IDs.",
      });
    }

    // Validate and sanitize event IDs (must be numbers)
    const validEventIds = eventIds
      .map((id: any) => {
        const numId = Number(id);
        return isNaN(numId) || numId <= 0 ? null : numId;
      })
      .filter((id: number | null): id is number => id !== null);

    if (validEventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid event IDs provided. All IDs must be positive numbers.",
      });
    }

    // Remove duplicates
    const uniqueEventIds = [...new Set(validEventIds)];

    // Determine the approval status based on action
    const approvalStatus = action === "approve" ? true : false;

    // First, verify which events exist and are not deleted
    // This helps us provide accurate feedback about missing events
    const existingEvents = await db
      .selectFrom("events")
      .select(["id", "isApprovedByAdmin"])
      .where("id", "in", uniqueEventIds)
      .where("deleted", "=", false)
      .execute();

    const existingEventIds = existingEvents.map((e) => e.id);
    const missingEventIds = uniqueEventIds.filter((id) => !existingEventIds.includes(id));

    if (existingEventIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No valid events found with the provided IDs.",
        data: {
          requestedCount: uniqueEventIds.length,
          foundCount: 0,
          missingEventIds,
        },
      });
    }

    // Perform a single bulk update query for all events at once
    // This is much more efficient than individual updates and prevents server overload
    const updateResult = await db
      .updateTable("events")
      .set({ isApprovedByAdmin: approvalStatus })
      .where("id", "in", existingEventIds)
      .where("deleted", "=", false)
      .execute();

    // Count how many events already had the target status
    const alreadyHadStatus = existingEvents.filter(
      (e) => e.isApprovedByAdmin === approvalStatus
    ).length;

    // Calculate how many events were actually updated (changed status)
    const updatedCount = existingEventIds.length - alreadyHadStatus;

    return res.status(200).json({
      success: true,
      message: `Successfully ${action}d ${existingEventIds.length} event(s)`,
      data: {
        action,
        isApprovedByAdmin: approvalStatus,
        requestedCount: uniqueEventIds.length,
        validCount: existingEventIds.length,
        updatedCount,
        alreadyHadStatusCount: alreadyHadStatus,
        missingEventIds: missingEventIds.length > 0 ? missingEventIds : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error performing bulk action on events:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while performing bulk action",
      error: error.message,
    });
  }
};

export const getAffiliateEventPayments = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid user token",
      });
    }

    const affiliateId = Number(user.id);

    const records = await db
      .selectFrom("affiliate_event_responses")
      .innerJoin("events", "events.id", "affiliate_event_responses.event_id")
      .innerJoin(
        "sports_organizations",
        "sports_organizations.id",
        "events.organizationId"
      )
      .select((eb) => [
        // Payment info
        eb.ref("affiliate_event_responses.payment_id").as("paymentId"),
        eb.ref("affiliate_event_responses.amount_paid").as("paymentAmount"),
        eb.ref("affiliate_event_responses.payment_time").as("paymentDate"),
        eb.ref("affiliate_event_responses.payment_status").as("paymentStatus"),

        // Correct event ID + Form ID
        eb.ref("affiliate_event_responses.event_id").as("eventId"),
        eb.ref("affiliate_event_responses.form_id").as("formId"),

        // Event fields (verified)
        eb.ref("events.name").as("eventName"),
        eb.ref("events.description").as("description"),
        eb.ref("events.venue").as("venue"),
        eb.ref("events.address").as("address"),

        eb.ref("events.startDate").as("startDate"),
        eb.ref("events.endDate").as("endDate"),
        eb.ref("events.startTime").as("startTime"),
        eb.ref("events.endTime").as("endTime"),

        eb.ref("events.eventType").as("eventType"),
        eb.ref("events.participationFee").as("participationFee"),

        eb.ref("events.imageUrl").as("imageUrl"),
        eb.ref("events.brochure").as("brochure"),
        eb.ref("events.age_limit").as("ageLimit"),

        eb.ref("events.type").as("categoryType"),
        eb.ref("events.teamSize").as("teamSize"),
        eb.ref("events.latitude").as("latitude"),
        eb.ref("events.longitude").as("longitude"),

        // Organization
        eb.ref("events.organizationId").as("organizationId"),
        eb.ref("sports_organizations.name").as("organizationName"),
        eb.ref("events.isApprovedByAdmin").as("isApprovedByAdmin"),
      ])
      .where("affiliate_event_responses.affiliate_id", "=", affiliateId)
      .where("affiliate_event_responses.deleted", "=", false)
      .orderBy("affiliate_event_responses.payment_time", "desc")
      .execute();

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "No paid event registrations found for this affiliate.",
        data: [],
      });
    }

    const formattedData = records.map((r) => {
      const amount = r.paymentAmount ?? 0;
      const paymentDateObject = r.paymentDate ? new Date(r.paymentDate) : null;

      return {
        event_id: r.eventId,
        eventId: r.eventId,
        formId: r.formId ?? null,

        event_name: r.eventName,
        event_type: r.eventType,
        venue: r.venue,

        organization: r.organizationName,
        displayName: r.organizationName,

        payment_id: r.paymentId,
        payment_amount: `₹ ${(amount / 100).toFixed(2)}`,
        payment_date: paymentDateObject
          ? paymentDateObject.toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",

        event_duration:
          `${new Date(r.startDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })} - ` +
          `${new Date(r.endDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}`,

        // Event details
        description: r.description,
        participationFee: r.participationFee,
        brochure: r.brochure,
        address: r.address,

        // Time
        event_startTime: r.startTime,
        event_endTime: r.endTime,

        // Media
        image: r.imageUrl,

        // Extra
        age_limit: r.ageLimit,
        categoryType: r.categoryType,
        teamSize: r.teamSize,
        latitude: r.latitude,
        longitude: r.longitude,

        isApprovedByAdmin: r.isApprovedByAdmin,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Affiliate event payment details fetched successfully",
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching affiliate event payments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch affiliate event payments",
      error: (error as Error).message,
    });
  }
};



export const getNearestEvents = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req.user?.id);
    if (!affiliateId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: {},
      });
    }

    // 1️⃣ Get affiliate location
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["latitude", "longitude"])
      .where("id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate || !affiliate.latitude || !affiliate.longitude) {
      return res.status(400).json({
        success: false,
        message:
          "Location not found. Please update your profile with latitude & longitude.",
        data: {
          redirectTo: "UPDATE_LOCATION",
        },
      });
    }

    const lat = affiliate.latitude;
    const lng = affiliate.longitude;
    const RADIUS = 80; // KM

    // 2️⃣ Fetch events within 80 KM radius
    const events = await db
      .selectFrom("events")
      .selectAll()
      .select((eb) =>
        sql<number>`
          6371 * acos(
            cos(radians(${lat}))
            * cos(radians(latitude))
            * cos(radians(longitude) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(latitude))
          )
        `.as("distance")
      )
      .where("deleted", "=", false)
      .where("isApprovedByAdmin", "=", true)
      .where("latitude", "is not", null)
      .where("longitude", "is not", null)
      .where(
        sql<boolean>`
          6371 * acos(
            cos(radians(${lat}))
            * cos(radians(latitude))
            * cos(radians(longitude) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(latitude))
          ) <= ${RADIUS}
        `
      )
      .orderBy("distance", "asc")
      .execute();

    const eventsWithDisplayName = events.map((event) => ({
      ...event,
      displayName: event.organizationName,
    }));

    return res.status(200).json({
      success: true,
      message:
        eventsWithDisplayName.length > 0
          ? "Nearby events fetched successfully"
          : "No events found within 80 km radius",
      data: {
        events: eventsWithDisplayName,
        count: eventsWithDisplayName.length,
        radius: RADIUS,
        location: {
          latitude: lat,
          longitude: lng,
        },
      },
    });
  } catch (err: any) {
    console.error("Error fetching nearby events:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
      data: {},
    });
  }
};

export const createEventTeam = async (req: Request, res: Response) => {
  const requestId = randomUUID();

  const log = (step: string, meta?: any) => {
    console.log(
      `[createEventTeam][${requestId}] ${step}`,
      meta ? JSON.stringify(meta) : ""
    );
  };

  try {
    log("REQUEST_RECEIVED", {
      headers: req.headers,
      body: req.body,
      user: req.user,
    });

    const affiliateId = Number(req?.user?.id);

    if (!affiliateId || Number.isNaN(affiliateId)) {
      log("AUTH_FAILED", { affiliateId });
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { eventId, teamName, payment_mode } = req.body;

    log("INPUT_PARSED", { affiliateId, eventId, teamName, payment_mode });

    if (!eventId) {
      log("VALIDATION_FAILED", { reason: "eventId missing" });
      return res.status(400).json({
        success: false,
        message: "Event Id is required.",
      });
    }

    if (!teamName) {
      log("VALIDATION_FAILED", { reason: "teamName missing" });
      return res.status(400).json({
        success: false,
        message: "Team Name is required.",
      });
    }

    // Validate payment_mode - it is required and must be "all" or "split"
    if (!payment_mode) {
      log("VALIDATION_FAILED", { reason: "payment_mode missing" });
      return res.status(400).json({
        success: false,
        message: "payment_mode is required and must be either 'all' or 'split'.",
      });
    }

    if (payment_mode !== "all" && payment_mode !== "split") {
      log("VALIDATION_FAILED", { reason: "payment_mode invalid", payment_mode });
      return res.status(400).json({
        success: false,
        message: "payment_mode must be either 'all' or 'split'.",
      });
    }

    const finalPaymentMode = payment_mode;

    log("FETCHING_EVENT", { eventId });

    const event = await db
      .selectFrom("events")
      .select(["id", "type", "teamSize"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    log("EVENT_FETCH_RESULT", { event });

    if (!event) {
      log("EVENT_NOT_FOUND", { eventId });
      return res.status(404).json({
        success: false,
        message: "Event not found with the provided id.",
      });
    }

    if (event.type !== "team") {
      log("EVENT_TYPE_INVALID", { type: event.type });
      return res.status(400).json({
        success: false,
        message: "Event is not a team event.",
      });
    }

    log("CHECKING_EXISTING_TEAM", { affiliateId, eventId });

    const existingTeam = await db
      .selectFrom("event_teams")
      .select(["id", "status"])
      .where("eventId", "=", Number(eventId))
      .where("captainId", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    log("EXISTING_TEAM_RESULT", { existingTeam });

    // Allow creating a new team if existing team is PENDING (payment not completed)
    // Block only if there's a team with COMPLETED status
    if (existingTeam && existingTeam.status !== "PENDING") {
      log("DUPLICATE_TEAM_BLOCKED", { status: existingTeam.status });
      return res.status(400).json({
        success: false,
        message: "You have already created a team for this event",
      });
    }

    let teamCode: string;
    let attempts = 0;

    log("GENERATING_TEAM_CODE");

    while (true) {
      attempts++;
      teamCode = await generateInvitationCode();

      const codeExists = await db
        .selectFrom("event_teams")
        .select("id")
        .where("teamCode", "=", teamCode)
        .where("deleted", "=", false)
        .executeTakeFirst();

      if (!codeExists) break;

      log("TEAM_CODE_COLLISION", { teamCode, attempts });

      if (attempts > 10) {
        log("TEAM_CODE_TOO_MANY_COLLISIONS");
      }
    }

    log("TEAM_CODE_GENERATED", { teamCode });

    log("STARTING_TRANSACTION");

    const newEventTeam = await db.transaction().execute(async (trx) => {
      const createdTeam = await trx
        .insertInto("event_teams")
        .values({
          eventId: Number(eventId),
          captainId: affiliateId,
          teamName,
          teamCode,
          status: "PENDING",
          payment_mode: finalPaymentMode,
          deleted: false,
          createdAt: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      log("TEAM_INSERTED", { teamId: createdTeam.id });

      await trx
        .insertInto("event_team_members")
        .values({
          teamId: Number(createdTeam.id),
          affiliateId,
          isCaptain: true,
          joinedAt: new Date(),
          status: "ACTIVE",
          deleted: false,
        })
        .executeTakeFirstOrThrow();

      log("CAPTAIN_ADDED_AS_MEMBER", {
        teamId: createdTeam.id,
        affiliateId,
      });

      return createdTeam;
    });

    log("TEAM_CREATED_SUCCESSFULLY", { teamId: newEventTeam.id });

    return res.status(201).json({
      success: true,
      message: "Event team created successfully",
      data: newEventTeam,
    });
  } catch (err: any) {
    console.error(`[createEventTeam][${requestId}] ERROR`, {
      message: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const joinEventTeam = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req.user?.id);
    const { eventId, teamCode } = req.body;

    if (!eventId || !teamCode) {
      return res.status(400).json({
        success: false,
        message: "Event Id and Team Code are required",
      });
    }

    // 1️⃣ Validate event
    const event = await db
      .selectFrom("events")
      .select(["id", "type", "teamSize"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event || event.type !== "team") {
      return res.status(400).json({
        success: false,
        message: "Invalid team event",
      });
    }

    if (!event.teamSize || event.teamSize <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid team size",
      });
    }

    // 2️⃣ Validate team and get payment_mode
    const team = await db
      .selectFrom("event_teams")
      .select(["id", "teamName", "eventId", "payment_mode"])
      .where("eventId", "=", Number(eventId))
      .where("teamCode", "=", teamCode)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // 3️⃣ Prevent multiple teams per event (only block ACTIVE memberships)
    const activeMembership = await db
      .selectFrom("event_team_members")
      .innerJoin("event_teams", "event_team_members.teamId", "event_teams.id")
      .select("event_team_members.id")
      .where("event_team_members.affiliateId", "=", affiliateId)
      .where("event_teams.eventId", "=", Number(eventId))
      .where("event_team_members.status", "=", "ACTIVE")
      .where("event_team_members.deleted", "=", false)
      .executeTakeFirst();

    if (activeMembership) {
      return res.status(400).json({
        success: false,
        message: "Already joined a team in this event",
      });
    }

    // 3️⃣(b) Clean up any existing PENDING memberships to allow re-joining
    const pendingMemberships = await db
      .selectFrom("event_team_members")
      .innerJoin("event_teams", "event_team_members.teamId", "event_teams.id")
      .select("event_team_members.id")
      .where("event_team_members.affiliateId", "=", affiliateId)
      .where("event_teams.eventId", "=", Number(eventId))
      .where("event_team_members.status", "=", "PENDING")
      .where("event_team_members.deleted", "=", false)
      .execute();

    if (pendingMemberships.length > 0) {
      const pendingIds = pendingMemberships.map((m) => m.id);
      await db
        .updateTable("event_team_members")
        .set({ deleted: true })
        .where("id", "in", pendingIds)
        .execute();
    }

    // 4️⃣ Payment → status decision
    // If payment_mode is "all", participant can join directly without payment
    // If payment_mode is "split" or NULL, check if participant has paid
    let status: "ACTIVE" | "PENDING";
    
    if (team.payment_mode === "all") {
      // Payment mode is "all" - captain has already paid for the entire team
      // Participant can join directly without making payment
      status = "ACTIVE";
    } else {
      // Payment mode is "split" or NULL - each member pays individually
      const payment = await db
        .selectFrom("affiliate_event_responses")
        .select("payment_status")
        .where("affiliate_id", "=", affiliateId)
        .where("event_id", "=", Number(eventId))
        .where("deleted", "=", false)
        .executeTakeFirst();

      status = payment?.payment_status === "PAID" ? "ACTIVE" : "PENDING";
    }

    // 5️⃣ Enforce team size for ACTIVE members only
    if (status === "ACTIVE") {
      const activeCount = await db
        .selectFrom("event_team_members")
        .select("id")
        .where("teamId", "=", team.id)
        .where("status", "=", "ACTIVE")
        .where("deleted", "=", false)
        .execute();

      if (activeCount.length >= event.teamSize) {
        return res.status(400).json({
          success: false,
          message: "Team is already full",
        });
      }
    }

    // 6️⃣ Insert member
    const newMember = await db
      .insertInto("event_team_members")
      .values({
        teamId: team.id,
        affiliateId,
        isCaptain: false,
        status,
        deleted: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return res.status(201).json({
      success: true,
      message:
        status === "ACTIVE"
          ? "Successfully joined team"
          : "Joined team. Complete payment to activate.",
      data: newMember,
    });
  } catch (err: any) {
    console.error("Join team error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
};


export const getEventTeamStatus = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);

    if (!affiliateId || !eventId) {
      return res.status(400).json({
        success: false,
        message: "affiliateId and eventId are required",
      });
    }

    // 1️⃣ Fetch event (FULL INFO)
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.type !== "team") {
      return res.status(400).json({
        success: false,
        message: "This is not a team event",
      });
    }

    // 2️⃣ Find if affiliate already joined/created a team in this event
    const team = await db
      .selectFrom("event_teams")
      .selectAll()
      .where("eventId", "=", eventId)
      .where("deleted", "=", false)
      .where(({ eb, selectFrom }) =>
        eb.or([
          // captain case
          eb("captainId", "=", affiliateId),

          // member case
          eb.exists(
            selectFrom("event_team_members")
              .select("id")
              .whereRef("event_team_members.teamId", "=", "event_teams.id")
              .where("event_team_members.affiliateId", "=", affiliateId)
              .where("event_team_members.deleted", "=", false)
          ),
        ])
      )
      .executeTakeFirst();

    // If no team → return event only
    if (!team) {
      return res.status(200).json({
        success: true,
        event: {
          ...event,
          displayName: event.organizationName,
        },
        team: null,
        members: [],
      });
    }

    // 3️⃣ Fetch team members
    const members = await db
      .selectFrom("event_team_members")
      .innerJoin(
        "affiliates",
        "affiliates.id",
        "event_team_members.affiliateId"
      )
      .select([
        "event_team_members.id as id",
        "event_team_members.affiliateId",
        "event_team_members.isCaptain",
        "event_team_members.joinedAt",
        "affiliates.name",
        "affiliates.email",
        "affiliates.gender",
        "affiliates.phone",
      ])
      .where("event_team_members.teamId", "=", team.id)
      .where("event_team_members.deleted", "=", false)
      .execute();

    return res.status(200).json({
      success: true,
      event: {
        ...event,
        displayName: event.organizationName,
      },
      team,
      members,
    });
  } catch (err: any) {
    console.error("Error fetching event team status:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

export const getEventTeams = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (isNaN(eventId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid eventId" });
    }

    // Get logged-in affiliate ID
    const loggedInAffiliateId =
      req.user?.type === UserTypes.AFFILIATE
        ? Number(req.user?.id)
        : null;

    // ------------ 1. Check event ------------
    const event = await db
      .selectFrom("events")
      .select(["id", "name", "teamSize", "type"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.type !== "team") {
      return res.status(400).json({
        success: false,
        message: "Not a team event",
      });
    }

    // ------------ 2. Get all teams ------------
    const teams = await db
      .selectFrom("event_teams")
      .leftJoin("affiliates", "affiliates.id", "event_teams.captainId")
      .select((eb) => [
        "event_teams.id",
        "event_teams.teamName",
        "event_teams.teamCode",
        "event_teams.status",
        "event_teams.createdAt",
        "event_teams.captainId",

        // Captain info
        "affiliates.name as captainName",
        "affiliates.email as captainEmail",

        // Total member count
        eb
          .selectFrom("event_team_members")
          .select((eb2) => eb2.fn.count("id").as("count"))
          .whereRef("event_team_members.teamId", "=", "event_teams.id")
          .where("event_team_members.deleted", "=", false)
          .as("totalMembers"),
      ])
      .where("event_teams.eventId", "=", eventId)
      .where("event_teams.deleted", "=", false)
      .where("event_teams.status", "=", "COMPLETED")
      .execute();

    // No teams found
    if (!teams || teams.length === 0) {
      return res.status(200).json({
        success: true,
        event,
        teams: [],
      });
    }

    // Extract team IDs
    const teamIds = teams.map((t) => t.id).filter((id): id is number => !!id);

    // ------------ 3. Get ALL members (including captain) for these teams ------------
    const members = await db
      .selectFrom("event_team_members")
      .innerJoin(
        "affiliates",
        "affiliates.id",
        "event_team_members.affiliateId"
      )
      .select([
        "event_team_members.teamId",
        "event_team_members.affiliateId",
        "event_team_members.isCaptain",
        "event_team_members.joinedAt",
        "affiliates.name",
        "affiliates.email",
        "affiliates.role",
      ])
      .where("event_team_members.teamId", "in", teamIds)
      .where("event_team_members.deleted", "=", false)
      .execute();

    // Group members by team
    const membersByTeam: Record<number, any[]> = {};

    for (const m of members ?? []) {
      const teamId = m?.teamId;
      if (teamId == null) continue; // skip if null or undefined

      if (!membersByTeam[teamId]) {
        membersByTeam[teamId] = [];
      }

      membersByTeam[teamId].push(m);
    }

    // Attach members list to each team with member count information and sorting
    const finalTeams = teams.map((team) => {
      const totalMembersRequired = event.teamSize || 0;
      const membersJoined = Number(team.totalMembers) || 0;
      const membersLeft = Math.max(0, totalMembersRequired - membersJoined);

      // Get members for this team
      let teamMembers = membersByTeam[team.id] ?? [];

      // Sort members based on logged-in affiliate's role
      if (loggedInAffiliateId) {
        // Check if logged-in affiliate is the captain
        const isLoggedInUserCaptain = team.captainId === loggedInAffiliateId;

        if (isLoggedInUserCaptain) {
          // If logged-in affiliate is captain: captain first, then others by join order
          teamMembers.sort((a, b) => {
            // Captain always first
            if (a.isCaptain && !b.isCaptain) return -1;
            if (!a.isCaptain && b.isCaptain) return 1;
            // Both are non-captains, sort by joinedAt
            const aJoinedAt = a.joinedAt
              ? new Date(a.joinedAt).getTime()
              : 0;
            const bJoinedAt = b.joinedAt
              ? new Date(b.joinedAt).getTime()
              : 0;
            return aJoinedAt - bJoinedAt;
          });
        } else {
          // If logged-in affiliate is a member: captain first, then logged-in member, then others by join order
          teamMembers.sort((a, b) => {
            const aIsCaptain = a.isCaptain;
            const bIsCaptain = b.isCaptain;
            const aIsLoggedInUser = a.affiliateId === loggedInAffiliateId;
            const bIsLoggedInUser = b.affiliateId === loggedInAffiliateId;

            // Captain always first
            if (aIsCaptain && !bIsCaptain) return -1;
            if (!aIsCaptain && bIsCaptain) return 1;

            // If one is the logged-in user (and not captain), they come second
            if (aIsLoggedInUser && !bIsLoggedInUser && !aIsCaptain) return -1;
            if (!aIsLoggedInUser && bIsLoggedInUser && !bIsCaptain) return 1;

            // Both are neither captain nor logged-in user, sort by joinedAt
            const aJoinedAt = a.joinedAt
              ? new Date(a.joinedAt).getTime()
              : 0;
            const bJoinedAt = b.joinedAt
              ? new Date(b.joinedAt).getTime()
              : 0;
            return aJoinedAt - bJoinedAt;
          });
        }
      } else {
        // For non-affiliate users (organization, super admin), sort by joinedAt
        teamMembers.sort((a, b) => {
          // Captain first, then by joinedAt
          if (a.isCaptain && !b.isCaptain) return -1;
          if (!a.isCaptain && b.isCaptain) return 1;
          const aJoinedAt = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
          const bJoinedAt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
          return aJoinedAt - bJoinedAt;
        });
      }

      return {
        ...team,
        members: teamMembers,
        totalMembersRequired,
        membersJoined,
        membersLeft,
      };
    });

    return res.status(200).json({
      success: true,
      event,
      teams: finalTeams,
    });
  } catch (err: any) {
    console.error("Error fetching event teams:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getEventTeamDetail = async (req: Request, res: Response) => {
  try{
    const teamId = Number(req.params.teamId);
     const team = await db
      .selectFrom("event_teams")
      .select(["id", "teamName", "teamCode", "eventId", "captainId", "payment_mode"])
      .where("id", "=", teamId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found with the provided id.",
      });
    }

  return res.status(200).json({
      success: true,
      team,
    });
  }catch(err: any){
    console.error("Error fetching event teams:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export const getEventTeamMembers = async (req: Request, res: Response) => {
  try {
    const teamId = Number(req.params.teamId);

    // check team exists
    const team = await db
      .selectFrom("event_teams")
      .select(["id", "teamName", "teamCode", "eventId", "captainId"])
      .where("id", "=", teamId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found with the provided id.",
      });
    }

    // fetch members with affiliate details
    const members = await db
      .selectFrom("event_team_members")
      .innerJoin(
        "affiliates",
        "affiliates.id",
        "event_team_members.affiliateId"
      )
      .select([
        "event_team_members.id",
        "event_team_members.affiliateId",
        "event_team_members.isCaptain",
        "event_team_members.joinedAt",

        // affiliate data
        "affiliates.name",
        "affiliates.email",
        "affiliates.phone",
        "affiliates.gender",
      ])
      .where("event_team_members.teamId", "=", teamId)
      .where("event_team_members.deleted", "=", false)
      .execute();

    // Sort members based on logged-in affiliate's role
    const loggedInAffiliateId = req.user?.type === UserTypes.AFFILIATE ? Number(req.user?.id) : null;
    
    if (loggedInAffiliateId) {
      // Check if logged-in affiliate is the captain
      const isLoggedInUserCaptain = team.captainId === loggedInAffiliateId;
      
      if (isLoggedInUserCaptain) {
        // If logged-in affiliate is captain: captain first, then others by join order
        members.sort((a, b) => {
          // Captain always first
          if (a.isCaptain && !b.isCaptain) return -1;
          if (!a.isCaptain && b.isCaptain) return 1;
          // Both are non-captains, sort by joinedAt
          const aJoinedAt = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
          const bJoinedAt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
          return aJoinedAt - bJoinedAt;
        });
      } else {
        // If logged-in affiliate is a member: captain first, then logged-in member, then others by join order
        members.sort((a, b) => {
          const aIsCaptain = a.isCaptain;
          const bIsCaptain = b.isCaptain;
          const aIsLoggedInUser = a.affiliateId === loggedInAffiliateId;
          const bIsLoggedInUser = b.affiliateId === loggedInAffiliateId;
          
          // Captain always first
          if (aIsCaptain && !bIsCaptain) return -1;
          if (!aIsCaptain && bIsCaptain) return 1;
          
          // If one is the logged-in user (and not captain), they come second
          if (aIsLoggedInUser && !bIsLoggedInUser && !aIsCaptain) return -1;
          if (!aIsLoggedInUser && bIsLoggedInUser && !bIsCaptain) return 1;
          
          // Both are neither captain nor logged-in user, sort by joinedAt
          const aJoinedAt = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
          const bJoinedAt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
          return aJoinedAt - bJoinedAt;
        });
      }
    } else {
      // For non-affiliate users (organization, super admin), sort by joinedAt
      members.sort((a, b) => {
        // Captain first, then by joinedAt
        if (a.isCaptain && !b.isCaptain) return -1;
        if (!a.isCaptain && b.isCaptain) return 1;
        const aJoinedAt = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const bJoinedAt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return aJoinedAt - bJoinedAt;
      });
    }

    return res.status(200).json({
      success: true,
      team,
      members,
    });
  } catch (err: any) {
    console.error("Error fetching team members:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Cancel an event (organization only)
 */
export const cancelEvent = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Event ID is required.",
      });
    }

    // Verify org owns event
    const event = await db
      .selectFrom("events")
      .select(["id", "organizationId", "deleted"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel events from your own organization.",
      });
    }

    const updatedEvent = await db
      .updateTable("events")
      .set({
        isApprovedByAdmin: false,
        updated_at: new Date(),
      })
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Event cancelled successfully",
      data: updatedEvent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error cancelling event",
      error: (error as Error).message,
    });
  }
};

/**
 * Cancel registration for an event
 */
export const cancelRegistration = async (req: Request, res: Response) => {
  try {
    const { eventId, affiliateId } = req.body;

    if (!eventId || !affiliateId) {
      return res.status(400).json({
        success: false,
        message: "eventId and affiliateId are required.",
      });
    }

    const registration = await db
      .selectFrom("affiliate_event_responses")
      .select(["affiliate_id", "event_id", "status"])
      .where("affiliate_id", "=", Number(affiliateId))
      .where("event_id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found.",
      });
    }

    await db
      .updateTable("affiliate_event_responses")
      .set({ status: "CANCELLED" })
      .where("affiliate_id", "=", Number(affiliateId))
      .where("event_id", "=", Number(eventId))
      .where("deleted", "=", false)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Registration cancelled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error cancelling registration",
      error: (error as Error).message,
    });
  }
};

/**
 * Publish results for an event (organization only)
 */
export const publishResults = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);
    const { results } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Event ID is required.",
      });
    }

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Results array is required and must not be empty.",
      });
    }

    // Verify org owns event
    const event = await db
      .selectFrom("events")
      .select(["id", "organizationId"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You can only publish results for your own organization events.",
      });
    }

    const insertedResults = [];
    for (const result of results) {
      const inserted = await db
        .insertInto("event_results")
        .values({
          event_id: eventId,
          affiliate_id: result.affiliateId,
          position: result.position,
          award: result.award || null,
          stats: result.stats ? JSON.stringify(result.stats) : null,
          certificate_url: result.certificateUrl || null,
        })
        .returningAll()
        .executeTakeFirst();
      insertedResults.push(inserted);
    }

    return res.status(201).json({
      success: true,
      message: "Results published successfully",
      count: insertedResults.length,
      data: insertedResults,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error publishing results",
      error: (error as Error).message,
    });
  }
};

/**
 * Get results for an event
 */
export const getResults = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Event ID is required.",
      });
    }

    const results = await db
      .selectFrom("event_results as er")
      .leftJoin("affiliates as a", "a.id", "er.affiliate_id")
      .select([
        "er.id",
        "er.event_id",
        "er.affiliate_id",
        "er.position",
        "er.award",
        "er.stats",
        "er.certificate_url",
        "er.created_at",
        "a.name as affiliate_name",
      ])
      .where("er.event_id", "=", eventId)
      .orderBy("er.position", "asc")
      .execute();

    return res.status(200).json({
      success: true,
      message: "Event results fetched successfully",
      count: results.length,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching event results",
      error: (error as Error).message,
    });
  }
};

/**
 * Create a fixture for an event (organization only)
 */
export const createFixture = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);
    const { round, matchNumber, participantA, participantB, scheduledAt, venueDetail } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Event ID is required.",
      });
    }

    // Verify org owns event
    const event = await db
      .selectFrom("events")
      .select(["id", "organizationId"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You can only create fixtures for your own organization events.",
      });
    }

    const fixture = await db
      .insertInto("event_fixtures")
      .values({
        event_id: eventId,
        round: round || null,
        match_number: matchNumber || null,
        participant_a: participantA || null,
        participant_b: participantB || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
        venue_detail: venueDetail || null,
        status: "SCHEDULED",
      })
      .returningAll()
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Fixture created successfully",
      data: fixture,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating fixture",
      error: (error as Error).message,
    });
  }
};

/**
 * Get fixtures for an event
 */
export const getFixtures = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Event ID is required.",
      });
    }

    const fixtures = await db
      .selectFrom("event_fixtures")
      .selectAll()
      .where("event_id", "=", eventId)
      .orderBy("match_number", "asc")
      .execute();

    return res.status(200).json({
      success: true,
      message: "Fixtures fetched successfully",
      count: fixtures.length,
      data: fixtures,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching fixtures",
      error: (error as Error).message,
    });
  }
};

/**
 * Update a fixture (organization only)
 */
export const updateFixture = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const fixtureId = Number(req.params.fixtureId);
    const { scoreA, scoreB, winner, status } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!fixtureId || isNaN(fixtureId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Fixture ID is required.",
      });
    }

    // Verify fixture exists and org owns the event
    const fixture = await db
      .selectFrom("event_fixtures as ef")
      .innerJoin("events as e", "e.id", "ef.event_id")
      .select(["ef.id", "e.organizationId"])
      .where("ef.id", "=", fixtureId)
      .executeTakeFirst();

    if (!fixture) {
      return res.status(404).json({
        success: false,
        message: "Fixture not found.",
      });
    }

    if (fixture.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You can only update fixtures for your own organization events.",
      });
    }

    const updateData: Record<string, any> = {};
    if (scoreA !== undefined) updateData.score_a = scoreA;
    if (scoreB !== undefined) updateData.score_b = scoreB;
    if (winner !== undefined) updateData.winner = winner;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide data to update.",
      });
    }

    const updatedFixture = await db
      .updateTable("event_fixtures")
      .set(updateData)
      .where("id", "=", fixtureId)
      .returningAll()
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Fixture updated successfully",
      data: updatedFixture,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating fixture",
      error: (error as Error).message,
    });
  }
};

/**
 * Get ticket for a specific event
 */
export const getTicket = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Event ID is required.",
      });
    }

    const ticket = await db
      .selectFrom("event_tickets as et" as any)
      .innerJoin("events as e", "e.id", "et.event_id" as any)
      .select([
        "et.id" as any,
        "et.ticket_code" as any,
        "et.qr_data" as any,
        "et.checked_in" as any,
        "et.checked_in_at" as any,
        "et.created_at" as any,
        "e.name as event_name",
        "e.startDate as event_start_date",
        "e.endDate as event_end_date",
        "e.venue as event_venue",
        "e.address as event_address",
      ])
      .where("et.event_id" as any, "=", eventId)
      .where("et.affiliate_id" as any, "=", affiliateId)
      .executeTakeFirst();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found for this event.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket fetched successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching ticket",
    });
  }
};

/**
 * Get all tickets for authenticated affiliate
 */
export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req?.user?.id);

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const tickets = await db
      .selectFrom("event_tickets as et" as any)
      .innerJoin("events as e", "e.id", "et.event_id" as any)
      .select([
        "et.id" as any,
        "et.event_id" as any,
        "et.ticket_code" as any,
        "et.qr_data" as any,
        "et.checked_in" as any,
        "et.checked_in_at" as any,
        "et.created_at" as any,
        "e.name as event_name",
        "e.startDate as event_start_date",
        "e.endDate as event_end_date",
        "e.venue as event_venue",
        "e.address as event_address",
        "e.imageUrl as event_image",
      ])
      .where("et.affiliate_id" as any, "=", affiliateId)
      .orderBy("et.created_at" as any, "desc")
      .execute();

    return res.status(200).json({
      success: true,
      message: "Tickets fetched successfully",
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    console.error("Get my tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching tickets",
    });
  }
};

/**
 * Check in with a ticket code
 */
export const checkIn = async (req: Request, res: Response) => {
  try {
    const { ticket_code } = req.body;

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        message: "ticket_code is required.",
      });
    }

    // Find the ticket
    const ticket = await db
      .selectFrom("event_tickets" as any)
      .selectAll()
      .where("ticket_code", "=", ticket_code)
      .executeTakeFirst();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found with this code.",
      });
    }

    if ((ticket as any).checked_in) {
      return res.status(400).json({
        success: false,
        message: "Ticket has already been checked in.",
        data: {
          checked_in_at: (ticket as any).checked_in_at,
        },
      });
    }

    // Perform check-in
    const updatedTicket = await db
      .updateTable("event_tickets" as any)
      .set({
        checked_in: true,
        checked_in_at: new Date(),
      })
      .where("ticket_code", "=", ticket_code)
      .returningAll()
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Check-in successful",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during check-in",
    });
  }
};

// ============================================================
// EVENT APPROVAL WORKFLOW
// ============================================================

/**
 * Submit an event for approval (Organization only)
 * Sets event status to PENDING_APPROVAL
 */
export const submitEventForApproval = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event exists and belongs to this organization
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("organizationId" as any, "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization",
      });
    }

    // Update event approval status
    const updatedEvent = await db
      .updateTable("events")
      .set({
        approval_status: "PENDING_APPROVAL",
        updated_at: new Date(),
      } as any)
      .where("id", "=", eventId)
      .returningAll()
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Event submitted for approval successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Submit event for approval error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all events with PENDING_APPROVAL status (Super Admin only)
 * Paginated
 */
export const getEventsPendingApproval = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    const events = await db
      .selectFrom("events")
      .selectAll()
      .where("approval_status" as any, "=", "PENDING_APPROVAL")
      .where("deleted", "=", false)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    // Get total count
    const countResult = await db
      .selectFrom("events")
      .select(sql`COUNT(*)`.as("total"))
      .where("approval_status" as any, "=", "PENDING_APPROVAL")
      .where("deleted", "=", false)
      .executeTakeFirst();

    const total = Number((countResult as any)?.total || 0);

    return res.status(200).json({
      success: true,
      message: "Pending approval events fetched successfully",
      count: events.length,
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get events pending approval error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Approve an event (Super Admin only)
 * Sets status to APPROVED and creates notification for the org
 */
export const approveEventForApproval = async (req: Request, res: Response) => {
  try {
    const adminId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event exists and is pending
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Update event status
    const updatedEvent = await db
      .updateTable("events")
      .set({
        approval_status: "APPROVED",
        "isApprovedByAdmin": true,
        updated_at: new Date(),
      } as any)
      .where("id", "=", eventId)
      .returningAll()
      .executeTakeFirst();

    // Create notification for the organization
    try {
      await db
        .insertInto("notifications" as any)
        .values({
          user_id: (event as any).organizationId,
          user_type: "organization",
          title: "Event Approved",
          body: `Your event "${(event as any).name}" has been approved by the admin.`,
          data: JSON.stringify({ eventId, action: "APPROVED" }),
          notification_type: "EVENT_APPROVAL",
          is_read: false,
        })
        .execute();
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return res.status(200).json({
      success: true,
      message: "Event approved successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Approve event error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reject an event (Super Admin only)
 * Sets status to REJECTED with reason, creates notification for org
 */
export const rejectEventForApproval = async (req: Request, res: Response) => {
  try {
    const adminId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);
    const { reason } = req.body;

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Update event status
    const updatedEvent = await db
      .updateTable("events")
      .set({
        approval_status: "REJECTED",
        rejection_reason: reason.trim(),
        "isApprovedByAdmin": false,
        updated_at: new Date(),
      } as any)
      .where("id", "=", eventId)
      .returningAll()
      .executeTakeFirst();

    // Create notification for the organization
    try {
      await db
        .insertInto("notifications" as any)
        .values({
          user_id: (event as any).organizationId,
          user_type: "organization",
          title: "Event Rejected",
          body: `Your event "${(event as any).name}" has been rejected. Reason: ${reason.trim()}`,
          data: JSON.stringify({ eventId, action: "REJECTED", reason: reason.trim() }),
          notification_type: "EVENT_REJECTION",
          is_read: false,
        })
        .execute();
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return res.status(200).json({
      success: true,
      message: "Event rejected successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Reject event error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Search Events (public, with filters)
 */
export const searchEvents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const {
      name,
      sport,
      location,
      dateFrom,
      dateTo,
      status,
      priceMin,
      priceMax,
    } = req.query;

    let query = (db
      .selectFrom("events as e")
      .leftJoin("events_sports_category as esc" as any, "esc.event_id" as any, "e.id") as any)
      .leftJoin("sports_category as sc" as any, "sc.id" as any, "esc.sports_category_id" as any)
      .select([
        "e.id",
        "e.name",
        "e.description",
        "e.startDate",
        "e.endDate",
        "e.startTime",
        "e.endTime",
        "e.participationFee",
        "e.address",
        "e.venue",
        "e.imageUrl",
        "e.eventType",
        "e.type",
        "e.organizationName",
        "e.organizationId",
        "e.brochure",
        "sc.title as sportCategory" as any,
      ])
      .where("e.deleted", "=", false)
      .where("e.isApprovedByAdmin", "=", true) as any;

    // Filter by name
    if (name) {
      query = query.where("e.name", "ilike", `%${name}%`);
    }

    // Filter by sport category title
    if (sport) {
      query = query.where("sc.title", "ilike", `%${sport}%`);
    }

    // Filter by location (address or venue)
    if (location) {
      query = query.where((eb: any) =>
        eb.or([
          eb("e.address", "ilike", `%${location}%`),
          eb("e.venue", "ilike", `%${location}%`),
        ])
      );
    }

    // Filter by date range
    if (dateFrom) {
      query = query.where("e.startDate", ">=", new Date(dateFrom as string));
    }
    if (dateTo) {
      query = query.where("e.endDate", "<=", new Date(dateTo as string));
    }

    // Filter by status (upcoming or past)
    if (status === "upcoming") {
      query = query.where("e.endDate", ">=", new Date());
    } else if (status === "past") {
      query = query.where("e.endDate", "<", new Date());
    }

    // Filter by price range
    if (priceMin) {
      query = query.where("e.participationFee", ">=", Number(priceMin));
    }
    if (priceMax) {
      query = query.where("e.participationFee", "<=", Number(priceMax));
    }

    // Count total results
    const countQuery = (db
      .selectFrom("events as e")
      .leftJoin("events_sports_category as esc" as any, "esc.event_id" as any, "e.id") as any)
      .leftJoin("sports_category as sc" as any, "sc.id" as any, "esc.sports_category_id" as any)
      .select(db.fn.countAll().as("total"))
      .where("e.deleted", "=", false)
      .where("e.isApprovedByAdmin", "=", true) as any;

    // Apply same filters to count query
    let countQ = countQuery;
    if (name) countQ = countQ.where("e.name", "ilike", `%${name}%`);
    if (sport) countQ = countQ.where("sc.title", "ilike", `%${sport}%`);
    if (location) {
      countQ = countQ.where((eb: any) =>
        eb.or([
          eb("e.address", "ilike", `%${location}%`),
          eb("e.venue", "ilike", `%${location}%`),
        ])
      );
    }
    if (dateFrom) countQ = countQ.where("e.startDate", ">=", new Date(dateFrom as string));
    if (dateTo) countQ = countQ.where("e.endDate", "<=", new Date(dateTo as string));
    if (status === "upcoming") countQ = countQ.where("e.endDate", ">=", new Date());
    else if (status === "past") countQ = countQ.where("e.endDate", "<", new Date());
    if (priceMin) countQ = countQ.where("e.participationFee", ">=", Number(priceMin));
    if (priceMax) countQ = countQ.where("e.participationFee", "<=", Number(priceMax));

    const countResult = await countQ.executeTakeFirst();
    const total = Number((countResult as any)?.total) || 0;

    const events = await query
      .orderBy("e.startDate", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Search events error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get Event Categories (distinct sport categories)
 */
export const getEventCategories = async (req: Request, res: Response) => {
  try {
    const categories = await sql`
      SELECT DISTINCT sc.id, sc.title
      FROM sports_category sc
      INNER JOIN events_sports_category esc ON esc.sports_category_id = sc.id AND esc.deleted = false
      INNER JOIN events e ON e.id = esc.event_id AND e.deleted = false AND e."isApprovedByAdmin" = true
      WHERE sc.deleted = false AND sc.status = 'ACTIVE'
      ORDER BY sc.title ASC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Event categories retrieved successfully",
      data: categories.rows,
    });
  } catch (error) {
    console.error("Get event categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get Featured Events (upcoming events ordered by registration count)
 */
export const getFeaturedEvents = async (req: Request, res: Response) => {
  try {
    const limitParam = Math.min(parseInt(req.query.limit as string) || 10, 20);

    const events = await sql`
      SELECT
        e.id,
        e.name,
        e.description,
        e."startDate",
        e."endDate",
        e."startTime",
        e."endTime",
        e."participationFee",
        e.address,
        e.venue,
        e."imageUrl",
        e."eventType",
        e.type,
        e."organizationName",
        e.brochure,
        COUNT(aer.affiliate_id)::int as registration_count
      FROM events e
      LEFT JOIN affiliate_event_responses aer
        ON aer.event_id = e.id AND aer.deleted = false
      WHERE e.deleted = false
        AND e."isApprovedByAdmin" = true
        AND e."endDate" >= NOW()
      GROUP BY e.id
      ORDER BY registration_count DESC, e."startDate" ASC
      LIMIT ${limitParam}
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Featured events retrieved successfully",
      data: events.rows,
    });
  } catch (error) {
    console.error("Get featured events error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get Check-in Analytics for an Event
 */
export const getCheckInAnalytics = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!eventId || isNaN(Number(eventId))) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id", "name", "startDate", "endDate"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Total registered
    const registeredResult = await sql`
      SELECT COUNT(*)::int as count FROM affiliate_event_responses
      WHERE event_id = ${Number(eventId)} AND deleted = false
    `.execute(db);
    const totalRegistered = (registeredResult.rows[0] as any)?.count || 0;

    // Total checked in
    const checkedInResult = await sql`
      SELECT COUNT(*)::int as count FROM event_tickets
      WHERE event_id = ${Number(eventId)} AND checked_in = true
    `.execute(db);
    const totalCheckedIn = (checkedInResult.rows[0] as any)?.count || 0;

    // Check-in rate
    const checkInRate = totalRegistered > 0
      ? Math.round((totalCheckedIn / totalRegistered) * 100 * 100) / 100
      : 0;

    // No-shows (registered but not checked in)
    const noShows = totalRegistered - totalCheckedIn;

    // Hourly check-in buckets
    const hourlyBuckets = await sql`
      SELECT
        EXTRACT(HOUR FROM checked_in_at)::int as hour,
        COUNT(*)::int as count
      FROM event_tickets
      WHERE event_id = ${Number(eventId)}
        AND checked_in = true
        AND checked_in_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM checked_in_at)
      ORDER BY hour ASC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Check-in analytics retrieved successfully",
      data: {
        eventId: Number(eventId),
        eventName: event.name,
        totalRegistered,
        totalCheckedIn,
        checkInRate,
        noShows,
        hourlyBuckets: hourlyBuckets.rows,
      },
    });
  } catch (error) {
    console.error("Get check-in analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get Check-in List for an Event (paginated)
 */
export const getCheckInList = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    if (!eventId || isNaN(Number(eventId))) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const checkIns = await sql`
      SELECT
        et.id as ticket_id,
        et.ticket_code,
        et.checked_in,
        et.checked_in_at,
        et.created_at as ticket_created_at,
        a.id as affiliate_id,
        a.name as affiliate_name,
        a.email as affiliate_email,
        a.phone as affiliate_phone,
        a."profilePicture" as affiliate_picture
      FROM event_tickets et
      INNER JOIN affiliates a ON a.id = et.affiliate_id
      WHERE et.event_id = ${Number(eventId)}
      ORDER BY et.checked_in_at DESC NULLS LAST, et.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    // Total count
    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM event_tickets
      WHERE event_id = ${Number(eventId)}
    `.execute(db);
    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Check-in list retrieved successfully",
      data: checkIns.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get check-in list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== Waitlist Functions ====================

/**
 * Join event waitlist when event is full
 * POST /api/events/:eventId/waitlist
 */
export const joinWaitlist = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if already registered for event
    const existingRegistration = await db
      .selectFrom("affiliate_event_responses" as any)
      .select(["id" as any])
      .where("event_id", "=", eventId)
      .where("affiliate_id", "=", affiliateId)
      .executeTakeFirst();

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: "Already registered for this event",
      });
    }

    // Check if already on waitlist
    const existingWaitlist = await db
      .selectFrom("event_waitlist" as any)
      .select(["id" as any])
      .where("event_id", "=", eventId)
      .where("affiliate_id", "=", affiliateId)
      .where("status", "=", "WAITING")
      .executeTakeFirst();

    if (existingWaitlist) {
      return res.status(400).json({
        success: false,
        message: "Already on the waitlist for this event",
      });
    }

    // Get current max position
    const maxPosition = await db
      .selectFrom("event_waitlist" as any)
      .select(sql`COALESCE(MAX(position), 0)`.as("max_pos"))
      .where("event_id", "=", eventId)
      .executeTakeFirst();

    const nextPosition = Number((maxPosition as any)?.max_pos || 0) + 1;

    // Add to waitlist
    const waitlistEntry = await db
      .insertInto("event_waitlist" as any)
      .values({
        event_id: eventId,
        affiliate_id: affiliateId,
        position: nextPosition,
        status: "WAITING",
      } as any)
      .returning(["id" as any, "event_id" as any, "affiliate_id" as any, "position" as any, "status" as any, "created_at" as any])
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Successfully joined the waitlist",
      data: waitlistEntry,
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Already on the waitlist for this event",
      });
    }
    console.error("Join waitlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Leave event waitlist
 * DELETE /api/events/:eventId/waitlist
 */
export const leaveWaitlist = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
    }

    const result = await db
      .deleteFrom("event_waitlist" as any)
      .where("event_id", "=", eventId)
      .where("affiliate_id", "=", affiliateId)
      .where("status", "=", "WAITING")
      .executeTakeFirst();

    if (Number(result?.numDeletedRows ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: "Waitlist entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Successfully removed from the waitlist",
    });
  } catch (error) {
    console.error("Leave waitlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get ordered waitlist for an event (org/admin)
 * GET /api/events/:eventId/waitlist
 */
export const getWaitlist = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const waitlist = await db
      .selectFrom("event_waitlist as ew" as any)
      .leftJoin("affiliates as a", "a.id", "ew.affiliate_id" as any)
      .select([
        "ew.id" as any,
        "ew.event_id" as any,
        "ew.affiliate_id" as any,
        "ew.position" as any,
        "ew.status" as any,
        "ew.promoted_at" as any,
        "ew.created_at" as any,
        "a.name as affiliate_name",
        "a.email as affiliate_email",
        "a.phone as affiliate_phone",
      ])
      .where("ew.event_id" as any, "=", eventId)
      .orderBy("ew.position" as any, "asc")
      .execute();

    return res.status(200).json({
      success: true,
      message: "Waitlist fetched successfully",
      count: waitlist.length,
      data: waitlist,
    });
  } catch (error) {
    console.error("Get waitlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Promote next person from waitlist to registered
 * POST /api/events/:eventId/waitlist/promote
 */
export const promoteFromWaitlist = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id", "name"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Get the next person in line (lowest position with WAITING status)
    const nextInLine = await db
      .selectFrom("event_waitlist" as any)
      .selectAll()
      .where("event_id", "=", eventId)
      .where("status", "=", "WAITING")
      .orderBy("position", "asc")
      .executeTakeFirst();

    if (!nextInLine) {
      return res.status(404).json({
        success: false,
        message: "No one on the waitlist to promote",
      });
    }

    // Update waitlist entry status to PROMOTED
    await db
      .updateTable("event_waitlist" as any)
      .set({
        status: "PROMOTED",
        promoted_at: new Date(),
      })
      .where("id", "=", (nextInLine as any).id)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Successfully promoted from waitlist",
      data: {
        waitlistId: (nextInLine as any).id,
        affiliateId: (nextInLine as any).affiliate_id,
        position: (nextInLine as any).position,
        status: "PROMOTED",
        promotedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Promote from waitlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== EVENT CERTIFICATES ====================

/**
 * Generate a certificate for an affiliate who participated in an event.
 * Only organization or admin can generate certificates.
 */
export const generateCertificate = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { affiliateId, certificateType, templateUrl } = req.body;

    if (!eventId || !affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Event ID and Affiliate ID are required",
      });
    }

    // Verify the event exists
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if certificate already exists
    const existing = await db
      .selectFrom("event_certificates" as any)
      .selectAll()
      .where("event_id", "=", Number(eventId))
      .where("affiliate_id", "=", Number(affiliateId))
      .executeTakeFirst();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Certificate already exists for this affiliate and event",
        data: existing,
      });
    }

    // Generate a unique certificate number
    const certNumber = `KIBI-CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const certificate = await db
      .insertInto("event_certificates" as any)
      .values({
        event_id: Number(eventId),
        affiliate_id: Number(affiliateId),
        certificate_type: certificateType || "PARTICIPATION",
        certificate_number: certNumber,
        template_url: templateUrl || null,
        issued_by: Number(req?.user?.id),
        status: "ISSUED",
      })
      .returningAll()
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      data: certificate,
    });
  } catch (error) {
    console.error("Generate certificate error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get a specific certificate by ID
 */
export const getCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        message: "Certificate ID is required",
      });
    }

    const certificate = await sql`
      SELECT ec.*, e.name as event_name, e.start_date as event_date,
             a.name as affiliate_name
      FROM event_certificates ec
      JOIN events e ON ec.event_id = e.id
      JOIN affiliate a ON ec.affiliate_id = a.id
      WHERE ec.id = ${certificateId}
    `.execute(db);

    if (!certificate.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate retrieved successfully",
      data: certificate.rows[0],
    });
  } catch (error) {
    console.error("Get certificate error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all certificates for a specific affiliate
 */
export const getAffiliateCertificates = async (req: Request, res: Response) => {
  try {
    const affiliateId = Number(req?.user?.id);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
    }

    const certificates = await sql`
      SELECT ec.*, e.name as event_name, e.start_date as event_date
      FROM event_certificates ec
      JOIN events e ON ec.event_id = e.id
      WHERE ec.affiliate_id = ${affiliateId}
      ORDER BY ec.issued_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(*)::int as total
      FROM event_certificates
      WHERE affiliate_id = ${affiliateId}
    `.execute(db);

    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Certificates retrieved successfully",
      data: {
        certificates: certificates.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get affiliate certificates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Bulk generate certificates for all registered affiliates of an event.
 * Only organization or admin can bulk generate.
 */
export const bulkGenerateCertificates = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { certificateType, templateUrl } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    // Verify the event exists
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", Number(eventId))
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Get all registered affiliates who don't already have certificates
    const registeredAffiliates = await sql`
      SELECT DISTINCT er.affiliate_id
      FROM event_registrations er
      LEFT JOIN event_certificates ec ON ec.event_id = er.event_id AND ec.affiliate_id = er.affiliate_id
      WHERE er.event_id = ${Number(eventId)}
        AND er.status = 'CONFIRMED'
        AND ec.id IS NULL
    `.execute(db);

    if (!registeredAffiliates.rows.length) {
      return res.status(400).json({
        success: false,
        message: "No eligible affiliates found for certificate generation",
      });
    }

    const issuedBy = Number(req?.user?.id);
    const results: { successful: any[]; failed: any[] } = { successful: [], failed: [] };

    for (const row of registeredAffiliates.rows) {
      try {
        const affId = (row as any).affiliate_id;
        const certNumber = `KIBI-CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const cert = await db
          .insertInto("event_certificates" as any)
          .values({
            event_id: Number(eventId),
            affiliate_id: affId,
            certificate_type: certificateType || "PARTICIPATION",
            certificate_number: certNumber,
            template_url: templateUrl || null,
            issued_by: issuedBy,
            status: "ISSUED",
          })
          .returningAll()
          .executeTakeFirst();

        results.successful.push(cert);
      } catch (err) {
        results.failed.push({
          affiliateId: (row as any).affiliate_id,
          error: (err as Error).message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Generated ${results.successful.length} certificates, ${results.failed.length} failed`,
      data: {
        successful: results.successful.length,
        failed: results.failed.length,
        details: results,
      },
    });
  } catch (error) {
    console.error("Bulk generate certificates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== RECURRING EVENTS (Round 7) ====================

/**
 * Create a recurring event: takes event data + recurrence rule,
 * creates a parent event + generates child event instances.
 */
export const createRecurringEvent = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const {
      recurrenceRule,
      ...eventData
    } = req.body;

    if (!recurrenceRule) {
      return res.status(400).json({
        success: false,
        message: "recurrenceRule is required. Must include frequency (weekly/monthly/custom), count, and optionally interval and daysOfWeek.",
      });
    }

    const { frequency, count, interval, daysOfWeek } = recurrenceRule;

    if (!frequency || !["weekly", "monthly", "custom"].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: "recurrenceRule.frequency must be one of: weekly, monthly, custom.",
      });
    }

    if (!count || count < 1 || count > 52) {
      return res.status(400).json({
        success: false,
        message: "recurrenceRule.count must be between 1 and 52.",
      });
    }

    if (!eventData.name || !eventData.startDate || !eventData.endDate) {
      return res.status(400).json({
        success: false,
        message: "name, startDate, and endDate are required.",
      });
    }

    // Verify organization exists
    const organizationExists = await db
      .selectFrom("sports_organizations")
      .select("id")
      .where("id", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!organizationExists) {
      return res.status(404).json({
        success: false,
        message: "Organization does not exist.",
      });
    }

    const result = await db.transaction().execute(async (trx) => {
      // Create the parent event
      const parentEvent = await trx
        .insertInto("events")
        .values({
          ...eventData,
          organizationId,
          is_recurring: true,
          recurrence_rule: JSON.stringify(recurrenceRule),
          deleted: false,
          isApprovedByAdmin: false,
          created_at: new Date(),
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();

      const parentId = Number(parentEvent.id);

      // Generate child instances based on recurrence rule
      const childEvents: any[] = [];
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);
      const eventDurationMs = endDate.getTime() - startDate.getTime();
      const stepInterval = interval || 1;

      for (let i = 1; i <= count; i++) {
        const instanceStart = new Date(startDate);
        const instanceEnd = new Date(startDate);

        if (frequency === "weekly") {
          instanceStart.setDate(startDate.getDate() + (7 * stepInterval * i));
        } else if (frequency === "monthly") {
          instanceStart.setMonth(startDate.getMonth() + (stepInterval * i));
        } else {
          // custom: use interval as days
          instanceStart.setDate(startDate.getDate() + (stepInterval * i));
        }

        instanceEnd.setTime(instanceStart.getTime() + eventDurationMs);

        const childEvent = await trx
          .insertInto("events")
          .values({
            ...eventData,
            organizationId,
            name: `${eventData.name} (#${i + 1})`,
            startDate: instanceStart,
            endDate: instanceEnd,
            parent_event_id: parentId,
            is_recurring: false,
            recurrence_rule: null,
            deleted: false,
            isApprovedByAdmin: false,
            created_at: new Date(),
          } as any)
          .returningAll()
          .executeTakeFirstOrThrow();

        childEvents.push(childEvent);
      }

      return { parentEvent, childEvents };
    });

    return res.status(201).json({
      success: true,
      message: `Recurring event created with ${result.childEvents.length} instances.`,
      data: {
        parentEvent: result.parentEvent,
        instances: result.childEvents,
        totalInstances: result.childEvents.length + 1,
      },
    });
  } catch (error: any) {
    console.error("Create recurring event error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating recurring event.",
    });
  }
};

/**
 * Get all child instances of a recurring event.
 */
export const getRecurringInstances = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    // Verify parent event exists
    const parentEvent = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!parentEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Get all child instances
    const instances = await sql`
      SELECT *
      FROM events
      WHERE parent_event_id = ${eventId}
        AND deleted = false
      ORDER BY "startDate" ASC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Recurring event instances fetched successfully.",
      data: {
        parentEvent,
        instances: instances.rows,
        count: instances.rows.length,
      },
    });
  } catch (error: any) {
    console.error("Get recurring instances error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Update all future instances of a recurring event series.
 */
export const updateRecurringSeries = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    const updateData = req.body;
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide data to update.",
      });
    }

    // Verify parent event exists and belongs to org
    const parentEvent = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!parentEvent) {
      return res.status(404).json({
        success: false,
        message: "Parent event not found or does not belong to your organization.",
      });
    }

    // Fields allowed for bulk update
    const allowedFields = [
      "description", "venue", "address", "mapLink",
      "organizerEmail", "organizerPhoneNumber", "imageUrl",
      "eventFee", "participationFee", "brochure", "age_limit",
    ];

    const fieldsToUpdate: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fieldsToUpdate[field] = updateData[field];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update. Allowed: " + allowedFields.join(", "),
      });
    }

    // Update parent event
    await db
      .updateTable("events")
      .set(fieldsToUpdate)
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .execute();

    // Update all future child instances
    const now = new Date().toISOString();
    const updateResult = await sql`
      UPDATE events
      SET ${sql.join(
        Object.entries(fieldsToUpdate).map(
          ([key, value]) => sql`${sql.ref(key)} = ${value}`
        ),
        sql`, `
      )}
      WHERE parent_event_id = ${eventId}
        AND deleted = false
        AND "startDate" >= ${now}
    `.execute(db);

    const updatedCount = Number((updateResult as any).numUpdatedRows ?? (updateResult as any).rowCount ?? 0);

    return res.status(200).json({
      success: true,
      message: `Recurring series updated. ${updatedCount} future instances updated.`,
      data: {
        parentEventId: eventId,
        futureInstancesUpdated: updatedCount,
        fieldsUpdated: Object.keys(fieldsToUpdate),
      },
    });
  } catch (error: any) {
    console.error("Update recurring series error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating recurring series.",
    });
  }
};

// ==================== ATTENDANCE ANALYTICS (Round 7) ====================

/**
 * Get attendance analytics for an event: attendance rate, check-in time distribution,
 * no-show count, repeat attendee count, demographics breakdown.
 */
export const getAttendanceAnalytics = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    // Verify event exists and belongs to org
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization.",
      });
    }

    // Total registered affiliates for this event
    const registeredResult = await sql`
      SELECT COUNT(*)::int as total
      FROM affiliate_event_responses
      WHERE event_id = ${eventId} AND deleted = false
    `.execute(db);
    const totalRegistered = (registeredResult.rows[0] as any)?.total || 0;

    // Total check-ins for this event
    const checkedInResult = await sql`
      SELECT COUNT(*)::int as total
      FROM event_check_ins
      WHERE event_id = ${eventId}
    `.execute(db);
    const totalCheckedIn = (checkedInResult.rows[0] as any)?.total || 0;

    // Attendance rate
    const attendanceRate = totalRegistered > 0
      ? Math.round((totalCheckedIn / totalRegistered) * 100 * 100) / 100
      : 0;

    // No-show count
    const noShowCount = Math.max(0, totalRegistered - totalCheckedIn);

    // Check-in time distribution (hourly buckets)
    const hourlyDistribution = await sql`
      SELECT
        EXTRACT(HOUR FROM checked_in_at)::int as hour,
        COUNT(*)::int as count
      FROM event_check_ins
      WHERE event_id = ${eventId}
      GROUP BY EXTRACT(HOUR FROM checked_in_at)
      ORDER BY hour ASC
    `.execute(db);

    // Repeat attendees: affiliates who attended other events by the same org
    const repeatAttendeeResult = await sql`
      SELECT COUNT(DISTINCT ci.affiliate_id)::int as count
      FROM event_check_ins ci
      WHERE ci.event_id = ${eventId}
        AND ci.affiliate_id IN (
          SELECT DISTINCT ci2.affiliate_id
          FROM event_check_ins ci2
          INNER JOIN events e ON e.id = ci2.event_id
          WHERE e."organizationId" = ${organizationId}
            AND e.deleted = false
            AND ci2.event_id != ${eventId}
        )
    `.execute(db);
    const repeatAttendeeCount = (repeatAttendeeResult.rows[0] as any)?.count || 0;

    // Demographics by sport category
    const sportBreakdown = await sql`
      SELECT
        sc.title as sport,
        COUNT(*)::int as count
      FROM affiliate_event_responses aer
      INNER JOIN affiliates a ON a.id = aer.affiliate_id
      LEFT JOIN sports_category sc ON sc.id = a."sportsCategoryId"
      WHERE aer.event_id = ${eventId} AND aer.deleted = false
      GROUP BY sc.title
      ORDER BY count DESC
    `.execute(db);

    // Demographics by age group
    const ageBreakdown = await sql`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(a."dateOfBirth")) < 18 THEN 'Under 18'
          WHEN EXTRACT(YEAR FROM AGE(a."dateOfBirth")) BETWEEN 18 AND 25 THEN '18-25'
          WHEN EXTRACT(YEAR FROM AGE(a."dateOfBirth")) BETWEEN 26 AND 35 THEN '26-35'
          WHEN EXTRACT(YEAR FROM AGE(a."dateOfBirth")) BETWEEN 36 AND 45 THEN '36-45'
          WHEN EXTRACT(YEAR FROM AGE(a."dateOfBirth")) > 45 THEN '45+'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*)::int as count
      FROM affiliate_event_responses aer
      INNER JOIN affiliates a ON a.id = aer.affiliate_id
      WHERE aer.event_id = ${eventId} AND aer.deleted = false
      GROUP BY age_group
      ORDER BY count DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Attendance analytics fetched successfully.",
      data: {
        eventId,
        eventName: event.name,
        totalRegistered,
        totalCheckedIn,
        attendanceRate,
        noShowCount,
        repeatAttendeeCount,
        checkInTimeDistribution: hourlyDistribution.rows,
        demographics: {
          bySport: sportBreakdown.rows,
          byAgeGroup: ageBreakdown.rows,
        },
      },
    });
  } catch (error: any) {
    console.error("Get attendance analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Round 8: Event Categories & Tags ====================

/**
 * Create a sport/event category with optional parent for subcategories
 */
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, icon_url, parent_category_id } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Category name must be 100 characters or less.",
      });
    }

    // Check for duplicate name
    const existing = await sql`
      SELECT id FROM event_categories WHERE LOWER(name) = LOWER(${name.trim()})
    `.execute(db);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }

    // If parent_category_id provided, verify it exists
    if (parent_category_id) {
      const parentExists = await sql`
        SELECT id FROM event_categories WHERE id = ${Number(parent_category_id)}
      `.execute(db);

      if (parentExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found.",
        });
      }
    }

    const result = await sql`
      INSERT INTO event_categories (name, description, icon_url, parent_category_id)
      VALUES (${name.trim()}, ${description || null}, ${icon_url || null}, ${parent_category_id ? Number(parent_category_id) : null})
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all categories in a tree structure (parent with nested children)
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allCategories = await sql`
      SELECT id, name, description, icon_url, parent_category_id, created_at
      FROM event_categories
      ORDER BY name ASC
    `.execute(db);

    const categories = allCategories.rows as any[];

    // Build tree structure
    const categoryMap: Record<number, any> = {};
    const roots: any[] = [];

    // First pass: index all categories
    for (const cat of categories) {
      categoryMap[cat.id] = { ...cat, children: [] };
    }

    // Second pass: build tree
    for (const cat of categories) {
      if (cat.parent_category_id && categoryMap[cat.parent_category_id]) {
        categoryMap[cat.parent_category_id].children.push(categoryMap[cat.id]);
      } else {
        roots.push(categoryMap[cat.id]);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully.",
      count: categories.length,
      data: roots,
    });
  } catch (error: any) {
    console.error("Get categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Add tags to an event (array of tag strings)
 */
export const addEventTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);
    const { tags } = req.body;

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tags must be a non-empty array of strings.",
      });
    }

    // Validate all tags are strings and within length
    for (const tag of tags) {
      if (typeof tag !== "string" || tag.trim().length === 0 || tag.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "Each tag must be a non-empty string of 50 characters or less.",
        });
      }
    }

    // Verify event exists and belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id", "organizationId"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You can only add tags to your own events.",
      });
    }

    // Insert tags (skip duplicates by checking existing)
    const normalizedTags = tags.map((t: string) => t.trim().toLowerCase());
    const uniqueTags = [...new Set(normalizedTags)];

    const existingTags = await sql`
      SELECT tag_name FROM event_tags WHERE event_id = ${eventId}
    `.execute(db);
    const existingSet = new Set((existingTags.rows as any[]).map((r) => r.tag_name));

    const newTags = uniqueTags.filter((t) => !existingSet.has(t));

    if (newTags.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All tags already exist for this event.",
        data: { added: 0 },
      });
    }

    // Build bulk insert values
    const valuesClause = newTags
      .map((_, i) => `($1, $${i + 2})`)
      .join(", ");

    await sql`
      INSERT INTO event_tags (event_id, tag_name)
      SELECT ${eventId}, unnest(${sql.raw(`ARRAY[${newTags.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]`)}::varchar[])
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: `${newTags.length} tag(s) added successfully.`,
      data: { added: newTags.length, tags: newTags },
    });
  } catch (error: any) {
    console.error("Add event tags error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Search events by tag name with pagination
 */
export const getEventsByTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tagName = req.params.tagName?.trim().toLowerCase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    if (!tagName) {
      return res.status(400).json({
        success: false,
        message: "Tag name is required.",
      });
    }

    const eventsResult = await sql`
      SELECT DISTINCT e.*, et.tag_name
      FROM events e
      INNER JOIN event_tags et ON et.event_id = e.id
      WHERE LOWER(et.tag_name) = ${tagName}
        AND e.deleted = false
      ORDER BY e."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(DISTINCT e.id)::int as total
      FROM events e
      INNER JOIN event_tags et ON et.event_id = e.id
      WHERE LOWER(et.tag_name) = ${tagName}
        AND e.deleted = false
    `.execute(db);

    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Events fetched by tag successfully.",
      count: eventsResult.rows.length,
      data: eventsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Get events by tag error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Return top 20 most-used tags with counts
 */
export const getPopularTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sql`
      SELECT
        et.tag_name,
        COUNT(*)::int as usage_count
      FROM event_tags et
      INNER JOIN events e ON e.id = et.event_id
      WHERE e.deleted = false
      GROUP BY et.tag_name
      ORDER BY usage_count DESC
      LIMIT 20
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Popular tags fetched successfully.",
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Get popular tags error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Round 8: Event Reviews & Ratings ====================

/**
 * Affiliate submits rating (1-5) + text review for an event they attended.
 * Checks actual attendance and prevents duplicate reviews.
 */
export const submitEventReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req?.user?.id);
    const { rating, review_text } = req.body;

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    if (!affiliateId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5.",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select("id")
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Check the affiliate actually attended (exists in affiliate_event_responses)
    const attended = await sql`
      SELECT affiliate_id FROM affiliate_event_responses
      WHERE affiliate_id = ${affiliateId} AND event_id = ${eventId} AND deleted = false
    `.execute(db);

    if (attended.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You can only review events you have attended.",
      });
    }

    // Check for duplicate review
    const existingReview = await sql`
      SELECT id FROM event_reviews
      WHERE event_id = ${eventId} AND affiliate_id = ${affiliateId}
    `.execute(db);

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this event.",
      });
    }

    const result = await sql`
      INSERT INTO event_reviews (event_id, affiliate_id, rating, review_text)
      VALUES (${eventId}, ${affiliateId}, ${rating}, ${review_text || null})
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Submit event review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all reviews for an event with pagination, include reviewer name and average rating.
 */
export const getEventReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const reviewsResult = await sql`
      SELECT
        er.id,
        er.event_id,
        er.affiliate_id,
        er.rating,
        er.review_text,
        er.created_at,
        a.name as reviewer_name,
        a."profilePicture" as reviewer_avatar
      FROM event_reviews er
      INNER JOIN affiliates a ON a.id = er.affiliate_id
      WHERE er.event_id = ${eventId}
      ORDER BY er.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const statsResult = await sql`
      SELECT
        COUNT(*)::int as total_reviews,
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) as average_rating
      FROM event_reviews
      WHERE event_id = ${eventId}
    `.execute(db);

    const stats = statsResult.rows[0] as any;
    const total = stats?.total_reviews || 0;

    return res.status(200).json({
      success: true,
      message: "Event reviews fetched successfully.",
      count: reviewsResult.rows.length,
      data: {
        averageRating: parseFloat(stats?.average_rating) || 0,
        totalReviews: total,
        reviews: reviewsResult.rows,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Get event reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all reviews by an affiliate
 */
export const getAffiliateReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req?.user?.id);

    if (!affiliateId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const reviewsResult = await sql`
      SELECT
        er.id,
        er.event_id,
        er.affiliate_id,
        er.rating,
        er.review_text,
        er.created_at,
        e.name as event_name,
        e."imageUrl" as event_image
      FROM event_reviews er
      INNER JOIN events e ON e.id = er.event_id
      WHERE er.affiliate_id = ${affiliateId}
      ORDER BY er.created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Affiliate reviews fetched successfully.",
      count: reviewsResult.rows.length,
      data: reviewsResult.rows,
    });
  } catch (error: any) {
    console.error("Get affiliate reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Round 8: Event Templates ====================

/**
 * Save event configuration as a reusable template
 */
export const createEventTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const { template_name, event_data } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!template_name || typeof template_name !== "string" || template_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Template name is required.",
      });
    }

    if (template_name.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: "Template name must be 200 characters or less.",
      });
    }

    if (!event_data || typeof event_data !== "object") {
      return res.status(400).json({
        success: false,
        message: "Event data object is required.",
      });
    }

    // Check duplicate template name for this org
    const existing = await sql`
      SELECT id FROM event_templates
      WHERE organization_id = ${organizationId}
        AND LOWER(template_name) = LOWER(${template_name.trim()})
    `.execute(db);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A template with this name already exists for your organization.",
      });
    }

    const result = await sql`
      INSERT INTO event_templates (organization_id, template_name, event_data)
      VALUES (${organizationId}, ${template_name.trim()}, ${JSON.stringify(event_data)}::jsonb)
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Event template created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create event template error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * List templates for an organization
 */
export const getEventTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const result = await sql`
      SELECT * FROM event_templates
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Event templates fetched successfully.",
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Get event templates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Create a new event pre-filled from a template, with new date/time
 */
export const createEventFromTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const templateId = Number(req.params.templateId);
    const { startDate, endDate, startTime, name } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!templateId || isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Valid template ID is required.",
      });
    }

    if (!startDate || !endDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: "startDate, endDate, and startTime are required.",
      });
    }

    // Get template
    const template = await sql`
      SELECT * FROM event_templates
      WHERE id = ${templateId} AND organization_id = ${organizationId}
    `.execute(db);

    if (template.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found or does not belong to your organization.",
      });
    }

    const templateData = template.rows[0] as any;
    const eventData = typeof templateData.event_data === "string"
      ? JSON.parse(templateData.event_data)
      : templateData.event_data;

    // Build event payload from template + new date/time + optional name override
    const eventName = name || eventData.name || templateData.template_name;

    // Check for duplicate event name
    const existingEvent = await db
      .selectFrom("events")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("name", "=", eventName)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (existingEvent) {
      return res.status(400).json({
        success: false,
        message: "An event with this name already exists in your organization.",
      });
    }

    // Extract fields from template event_data
    const {
      description,
      organizerEmail,
      organizerPhoneNumber,
      organizationName,
      venue,
      address,
      mapLink,
      eventFee,
      participationFee,
      type,
      teamSize,
      formId,
      imageUrl,
      eventType,
      brochure,
      age_limit,
      sportsCategoryId,
    } = eventData;

    // Parse mapLink for lat/lng
    let lat = eventData.latitude || null;
    let lng = eventData.longitude || null;
    if (mapLink && !lat) {
      try {
        const coords = await extractLatLngFromMapLink(mapLink);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch {}
    }

    const newEvent = await sql`
      INSERT INTO events (
        name, description, "organizerEmail", "organizerPhoneNumber", "organizationName",
        "organizationId", venue, address, "mapLink", latitude, longitude,
        "startDate", "endDate", "startTime", "eventFee", "participationFee",
        type, "teamSize", "formId", "imageUrl", "eventType", brochure,
        age_limit, "sportsCategoryId", deleted, "isApprovedByAdmin"
      ) VALUES (
        ${eventName}, ${description || null}, ${organizerEmail || null},
        ${organizerPhoneNumber || null}, ${organizationName || null},
        ${organizationId}, ${venue || null}, ${address || null},
        ${mapLink || null}, ${lat}, ${lng},
        ${startDate}, ${endDate}, ${startTime},
        ${eventFee || 0}, ${participationFee || eventFee || 0},
        ${type || "individual"}, ${teamSize || 1}, ${formId || null},
        ${imageUrl || null}, ${eventType || null}, ${brochure || null},
        ${age_limit || null}, ${sportsCategoryId || null},
        false, false
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Event created from template successfully.",
      data: newEvent.rows[0],
    });
  } catch (error: any) {
    console.error("Create event from template error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Delete an event template
 */
export const deleteEventTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const templateId = Number(req.params.templateId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!templateId || isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Valid template ID is required.",
      });
    }

    const result = await sql`
      DELETE FROM event_templates
      WHERE id = ${templateId} AND organization_id = ${organizationId}
      RETURNING id
    `.execute(db);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found or does not belong to your organization.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event template deleted successfully.",
      data: { id: templateId },
    });
  } catch (error: any) {
    console.error("Delete event template error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Team/Group Registration (Round 9) ====================

/**
 * Register a team for an event
 */
export const registerTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const { team_name, member_ids, team_size } = req.body;

    if (!team_name || typeof team_name !== "string" || team_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Team name is required.",
      });
    }

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "member_ids must be a non-empty array of affiliate IDs.",
      });
    }

    const requestedSize = team_size ? Number(team_size) : member_ids.length + 1;

    // Validate event exists and allows team registration
    const event = await sql`
      SELECT id, type, "teamSize" FROM events
      WHERE id = ${eventId} AND deleted = false
    `.execute(db);

    if (event.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const eventData = event.rows[0] as any;
    if (eventData.type === "individual") {
      return res.status(400).json({
        success: false,
        message: "This event does not allow team registration.",
      });
    }

    // Validate captain exists
    const captain = await sql`
      SELECT id FROM affiliates WHERE id = ${affiliateId} AND deleted = false
    `.execute(db);

    if (captain.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Captain affiliate not found.",
      });
    }

    // Validate all members exist
    const uniqueMemberIds = [...new Set(member_ids.map(Number))].filter(
      (id) => id !== affiliateId
    );

    if (uniqueMemberIds.length > 0) {
      const members = await sql`
        SELECT id FROM affiliates
        WHERE id = ANY(${sql.raw(`ARRAY[${uniqueMemberIds.join(",")}]`)})
          AND deleted = false
      `.execute(db);

      if (members.rows.length !== uniqueMemberIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more member IDs are invalid or do not exist.",
        });
      }
    }

    // Create team
    const teamResult = await sql`
      INSERT INTO event_teams (event_id, team_name, captain_id, team_size, status)
      VALUES (${eventId}, ${team_name.trim()}, ${affiliateId}, ${requestedSize}, 'REGISTERED')
      RETURNING *
    `.execute(db);

    const team = teamResult.rows[0] as any;

    // Add captain as a member with role CAPTAIN
    await sql`
      INSERT INTO event_team_members (team_id, affiliate_id, role)
      VALUES (${team.id}, ${affiliateId}, 'CAPTAIN')
      ON CONFLICT (team_id, affiliate_id) DO NOTHING
    `.execute(db);

    // Add other members
    for (const memberId of uniqueMemberIds) {
      await sql`
        INSERT INTO event_team_members (team_id, affiliate_id, role)
        VALUES (${team.id}, ${memberId}, 'MEMBER')
        ON CONFLICT (team_id, affiliate_id) DO NOTHING
      `.execute(db);
    }

    // Fetch team with members
    const teamWithMembers = await sql`
      SELECT et.*,
        (
          SELECT json_agg(json_build_object(
            'id', etm.id,
            'affiliate_id', etm.affiliate_id,
            'role', etm.role,
            'joined_at', etm.joined_at,
            'name', CONCAT(a."firstName", ' ', a."lastName")
          ))
          FROM event_team_members etm
          INNER JOIN affiliates a ON a.id = etm.affiliate_id
          WHERE etm.team_id = et.id
        ) as members
      FROM event_teams et
      WHERE et.id = ${team.id}
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Team registered successfully.",
      data: teamWithMembers.rows[0],
    });
  } catch (error: any) {
    console.error("Register team error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all teams registered for an event
 */
export const getEventTeamsR9 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const teams = await sql`
      SELECT et.*,
        (
          SELECT json_agg(json_build_object(
            'id', etm.id,
            'affiliate_id', etm.affiliate_id,
            'role', etm.role,
            'joined_at', etm.joined_at,
            'name', CONCAT(a."firstName", ' ', a."lastName"),
            'phone', a.phone
          ))
          FROM event_team_members etm
          INNER JOIN affiliates a ON a.id = etm.affiliate_id
          WHERE etm.team_id = et.id
        ) as members,
        CONCAT(cap."firstName", ' ', cap."lastName") as captain_name
      FROM event_teams et
      LEFT JOIN affiliates cap ON cap.id = et.captain_id
      WHERE et.event_id = ${eventId}
      ORDER BY et.created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Event teams fetched successfully.",
      data: teams.rows,
    });
  } catch (error: any) {
    console.error("Get event teams error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get full details of a specific team
 */
export const getTeamDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = Number(req.params.teamId);

    if (!teamId || isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Valid team ID is required.",
      });
    }

    const team = await sql`
      SELECT et.*,
        e.name as event_name,
        e.type as event_type,
        CONCAT(cap."firstName", ' ', cap."lastName") as captain_name,
        cap.phone as captain_phone,
        (
          SELECT json_agg(json_build_object(
            'id', etm.id,
            'affiliate_id', etm.affiliate_id,
            'role', etm.role,
            'joined_at', etm.joined_at,
            'name', CONCAT(a."firstName", ' ', a."lastName"),
            'phone', a.phone,
            'email', a.email,
            'profile_picture', a."profilePicture"
          ))
          FROM event_team_members etm
          INNER JOIN affiliates a ON a.id = etm.affiliate_id
          WHERE etm.team_id = et.id
        ) as members
      FROM event_teams et
      LEFT JOIN events e ON e.id = et.event_id
      LEFT JOIN affiliates cap ON cap.id = et.captain_id
      WHERE et.id = ${teamId}
    `.execute(db);

    if (team.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team details fetched successfully.",
      data: team.rows[0],
    });
  } catch (error: any) {
    console.error("Get team details error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Update team roster — add/remove members (captain only)
 */
export const updateTeamRoster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const affiliateId = Number(req?.user?.id);
    const teamId = Number(req.params.teamId);

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required.",
      });
    }

    if (!teamId || isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Valid team ID is required.",
      });
    }

    // Verify caller is the captain
    const team = await sql`
      SELECT id, captain_id, event_id FROM event_teams WHERE id = ${teamId}
    `.execute(db);

    if (team.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found.",
      });
    }

    const teamData = team.rows[0] as any;
    if (teamData.captain_id !== affiliateId) {
      return res.status(403).json({
        success: false,
        message: "Only the team captain can update the roster.",
      });
    }

    const { add_member_ids, remove_member_ids } = req.body;

    // Remove members
    if (Array.isArray(remove_member_ids) && remove_member_ids.length > 0) {
      const removeIds = remove_member_ids.map(Number).filter((id: number) => id !== affiliateId);
      if (removeIds.length > 0) {
        await sql`
          DELETE FROM event_team_members
          WHERE team_id = ${teamId}
            AND affiliate_id = ANY(${sql.raw(`ARRAY[${removeIds.join(",")}]`)})
            AND role != 'CAPTAIN'
        `.execute(db);
      }
    }

    // Add members
    if (Array.isArray(add_member_ids) && add_member_ids.length > 0) {
      const addIds = [...new Set(add_member_ids.map(Number))];

      // Validate all new members exist
      const members = await sql`
        SELECT id FROM affiliates
        WHERE id = ANY(${sql.raw(`ARRAY[${addIds.join(",")}]`)})
          AND deleted = false
      `.execute(db);

      if (members.rows.length !== addIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more member IDs to add are invalid.",
        });
      }

      for (const memberId of addIds) {
        await sql`
          INSERT INTO event_team_members (team_id, affiliate_id, role)
          VALUES (${teamId}, ${memberId}, 'MEMBER')
          ON CONFLICT (team_id, affiliate_id) DO NOTHING
        `.execute(db);
      }
    }

    // Update team_size
    const memberCount = await sql`
      SELECT COUNT(*)::int as count FROM event_team_members WHERE team_id = ${teamId}
    `.execute(db);

    await sql`
      UPDATE event_teams SET team_size = ${(memberCount.rows[0] as any).count}
      WHERE id = ${teamId}
    `.execute(db);

    // Fetch updated team
    const updatedTeam = await sql`
      SELECT et.*,
        (
          SELECT json_agg(json_build_object(
            'id', etm.id,
            'affiliate_id', etm.affiliate_id,
            'role', etm.role,
            'joined_at', etm.joined_at,
            'name', CONCAT(a."firstName", ' ', a."lastName")
          ))
          FROM event_team_members etm
          INNER JOIN affiliates a ON a.id = etm.affiliate_id
          WHERE etm.team_id = et.id
        ) as members
      FROM event_teams et
      WHERE et.id = ${teamId}
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Team roster updated successfully.",
      data: updatedTeam.rows[0],
    });
  } catch (error: any) {
    console.error("Update team roster error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Venue Management (Round 9) ====================

/**
 * Create a venue
 */
export const createVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const { name, address, city, state, capacity, facilities, map_coordinates, images } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Venue name is required.",
      });
    }

    const facilitiesJson = facilities ? JSON.stringify(facilities) : null;
    const imagesJson = images ? JSON.stringify(images) : null;

    const result = await sql`
      INSERT INTO venues (name, address, city, state, capacity, facilities, map_coordinates, images, organization_id)
      VALUES (
        ${name.trim()},
        ${address || null},
        ${city || null},
        ${state || null},
        ${capacity ? Number(capacity) : null},
        ${facilitiesJson}::jsonb,
        ${map_coordinates || null},
        ${imagesJson}::jsonb,
        ${organizationId}
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Venue created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create venue error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * List venues with optional filters (city, min_capacity)
 */
export const getVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city, min_capacity } = req.query;

    let query = `SELECT * FROM venues WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (city && typeof city === "string") {
      query += ` AND LOWER(city) = LOWER($${paramIdx})`;
      params.push(city);
      paramIdx++;
    }

    if (min_capacity) {
      query += ` AND capacity >= $${paramIdx}`;
      params.push(Number(min_capacity));
      paramIdx++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.executeQuery(CompiledQuery.raw(query, params));

    return res.status(200).json({
      success: true,
      message: "Venues fetched successfully.",
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Get venues error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get venue details with upcoming events at that venue
 */
export const getVenueDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venueId = Number(req.params.venueId);

    if (!venueId || isNaN(venueId)) {
      return res.status(400).json({
        success: false,
        message: "Valid venue ID is required.",
      });
    }

    const venue = await sql`
      SELECT * FROM venues WHERE id = ${venueId}
    `.execute(db);

    if (venue.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Venue not found.",
      });
    }

    // Fetch upcoming events at this venue (match by venue name or map_coordinates)
    const venueData = venue.rows[0] as any;
    const upcomingEvents = await sql`
      SELECT id, name, "startDate", "endDate", type, status
      FROM events
      WHERE deleted = false
        AND "startDate" >= NOW()
        AND (
          LOWER(location) = LOWER(${venueData.name})
          OR LOWER("mapLink") = LOWER(${venueData.map_coordinates || ''})
        )
      ORDER BY "startDate" ASC
      LIMIT 20
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Venue details fetched successfully.",
      data: {
        ...venueData,
        upcoming_events: upcomingEvents.rows,
      },
    });
  } catch (error: any) {
    console.error("Get venue details error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Update venue info
 */
export const updateVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const venueId = Number(req.params.venueId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!venueId || isNaN(venueId)) {
      return res.status(400).json({
        success: false,
        message: "Valid venue ID is required.",
      });
    }

    // Verify venue belongs to this organization
    const existing = await sql`
      SELECT id FROM venues WHERE id = ${venueId} AND organization_id = ${organizationId}
    `.execute(db);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Venue not found or does not belong to your organization.",
      });
    }

    const { name, address, city, state, capacity, facilities, map_coordinates, images } = req.body;

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIdx}`);
      params.push(name.trim());
      paramIdx++;
    }
    if (address !== undefined) {
      setClauses.push(`address = $${paramIdx}`);
      params.push(address);
      paramIdx++;
    }
    if (city !== undefined) {
      setClauses.push(`city = $${paramIdx}`);
      params.push(city);
      paramIdx++;
    }
    if (state !== undefined) {
      setClauses.push(`state = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }
    if (capacity !== undefined) {
      setClauses.push(`capacity = $${paramIdx}`);
      params.push(Number(capacity));
      paramIdx++;
    }
    if (facilities !== undefined) {
      setClauses.push(`facilities = $${paramIdx}::jsonb`);
      params.push(JSON.stringify(facilities));
      paramIdx++;
    }
    if (map_coordinates !== undefined) {
      setClauses.push(`map_coordinates = $${paramIdx}`);
      params.push(map_coordinates);
      paramIdx++;
    }
    if (images !== undefined) {
      setClauses.push(`images = $${paramIdx}::jsonb`);
      params.push(JSON.stringify(images));
      paramIdx++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update.",
      });
    }

    params.push(venueId);
    params.push(organizationId);

    const query = `
      UPDATE venues SET ${setClauses.join(", ")}
      WHERE id = $${paramIdx} AND organization_id = $${paramIdx + 1}
      RETURNING *
    `;

    const result = await db.executeQuery(CompiledQuery.raw(query, params));

    return res.status(200).json({
      success: true,
      message: "Venue updated successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Update venue error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Round 10: Event Bracket / Tournament System ====================

/**
 * Generate a single-elimination tournament bracket for an event.
 * Accepts list of participant IDs, shuffles them, creates match entries.
 * Handles byes for non-power-of-2 counts.
 */
export const generateBracket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    // Verify event exists and belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id", "name", "organizationId"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not own this event.",
      });
    }

    const { participants } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 participants are required. Each participant needs { id, name }.",
      });
    }

    // Validate participant entries
    for (const p of participants) {
      if (!p.id || !p.name) {
        return res.status(400).json({
          success: false,
          message: "Each participant must have id and name fields.",
        });
      }
    }

    // Check if bracket already exists for this event
    const existingBracket = await sql`
      SELECT COUNT(*)::int as count FROM event_brackets WHERE event_id = ${eventId}
    `.execute(db);

    if ((existingBracket.rows[0] as any)?.count > 0) {
      return res.status(400).json({
        success: false,
        message: "Bracket already exists for this event. Delete existing bracket first.",
      });
    }

    // Shuffle participants using Fisher-Yates algorithm
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const n = shuffled.length;
    // Find next power of 2
    let bracketSize = 1;
    while (bracketSize < n) {
      bracketSize *= 2;
    }

    const totalRounds = Math.log2(bracketSize);
    const numByes = bracketSize - n;

    // Build all matches for the bracket
    // Round 1 has bracketSize/2 matches
    // Each subsequent round has half the matches of the previous round

    // Total matches across all rounds
    const allMatches: Array<{
      round_number: number;
      match_number: number;
      participant_a_id: number | null;
      participant_a_name: string | null;
      participant_b_id: number | null;
      participant_b_name: string | null;
      status: string;
      winner_id: number | null;
    }> = [];

    // Generate round 1 matches
    let participantIdx = 0;
    const round1MatchCount = bracketSize / 2;

    for (let m = 0; m < round1MatchCount; m++) {
      const pA = participantIdx < shuffled.length ? shuffled[participantIdx] : null;
      participantIdx++;
      const pB = participantIdx < shuffled.length ? shuffled[participantIdx] : null;
      participantIdx++;

      const isBye = pA === null || pB === null;
      const winnerId = isBye ? (pA ? pA.id : pB?.id || null) : null;

      allMatches.push({
        round_number: 1,
        match_number: m + 1,
        participant_a_id: pA ? pA.id : null,
        participant_a_name: pA ? pA.name : null,
        participant_b_id: pB ? pB.id : null,
        participant_b_name: pB ? pB.name : null,
        status: isBye ? "BYE" : "PENDING",
        winner_id: winnerId,
      });
    }

    // Generate subsequent round matches (empty, to be filled as winners advance)
    let matchesInRound = round1MatchCount / 2;
    for (let round = 2; round <= totalRounds; round++) {
      for (let m = 0; m < matchesInRound; m++) {
        allMatches.push({
          round_number: round,
          match_number: m + 1,
          participant_a_id: null,
          participant_a_name: null,
          participant_b_id: null,
          participant_b_name: null,
          status: "PENDING",
          winner_id: null,
        });
      }
      matchesInRound = matchesInRound / 2;
    }

    // Insert all matches and collect their IDs
    const insertedMatches: any[] = [];
    for (const match of allMatches) {
      const result = await sql`
        INSERT INTO event_brackets (event_id, round_number, match_number, participant_a_id, participant_a_name, participant_b_id, participant_b_name, status, winner_id)
        VALUES (
          ${eventId},
          ${match.round_number},
          ${match.match_number},
          ${match.participant_a_id},
          ${match.participant_a_name},
          ${match.participant_b_id},
          ${match.participant_b_name},
          ${match.status},
          ${match.winner_id}
        )
        RETURNING *
      `.execute(db);
      insertedMatches.push(result.rows[0]);
    }

    // Now set next_match_id for each match: the winner of match M in round R feeds into
    // match ceil(M/2) in round R+1
    for (const match of insertedMatches) {
      if (match.round_number < totalRounds) {
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const nextMatch = insertedMatches.find(
          (m: any) => m.round_number === match.round_number + 1 && m.match_number === nextMatchNumber
        );
        if (nextMatch) {
          await sql`
            UPDATE event_brackets SET next_match_id = ${nextMatch.id} WHERE id = ${match.id}
          `.execute(db);
          match.next_match_id = nextMatch.id;
        }
      }
    }

    // Auto-advance bye winners to next round
    const byeMatches = insertedMatches.filter((m: any) => m.status === "BYE" && m.winner_id);
    for (const byeMatch of byeMatches) {
      if (byeMatch.next_match_id) {
        const nextMatch = insertedMatches.find((m: any) => m.id === byeMatch.next_match_id);
        if (nextMatch) {
          const winnerName = byeMatch.participant_a_id === byeMatch.winner_id
            ? byeMatch.participant_a_name
            : byeMatch.participant_b_name;

          // Fill slot A or B in the next match
          if (!nextMatch.participant_a_id) {
            await sql`
              UPDATE event_brackets
              SET participant_a_id = ${byeMatch.winner_id}, participant_a_name = ${winnerName}
              WHERE id = ${nextMatch.id}
            `.execute(db);
            nextMatch.participant_a_id = byeMatch.winner_id;
            nextMatch.participant_a_name = winnerName;
          } else {
            await sql`
              UPDATE event_brackets
              SET participant_b_id = ${byeMatch.winner_id}, participant_b_name = ${winnerName}
              WHERE id = ${nextMatch.id}
            `.execute(db);
            nextMatch.participant_b_id = byeMatch.winner_id;
            nextMatch.participant_b_name = winnerName;
          }
        }
      }
    }

    // Fetch the final bracket state
    const bracket = await sql`
      SELECT * FROM event_brackets WHERE event_id = ${eventId} ORDER BY round_number ASC, match_number ASC
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Tournament bracket generated successfully.",
      data: {
        eventId,
        totalParticipants: n,
        bracketSize,
        totalRounds,
        numByes,
        matches: bracket.rows,
      },
    });
  } catch (error: any) {
    console.error("Generate bracket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get full bracket for an event - all rounds and matches with participant names and scores.
 */
export const getBracket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const matches = await sql`
      SELECT * FROM event_brackets WHERE event_id = ${eventId} ORDER BY round_number ASC, match_number ASC
    `.execute(db);

    if (matches.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bracket found for this event.",
      });
    }

    // Group matches by round
    const rounds: Record<number, any[]> = {};
    for (const match of matches.rows as any[]) {
      if (!rounds[match.round_number]) {
        rounds[match.round_number] = [];
      }
      rounds[match.round_number]!.push(match);
    }

    const totalRounds = Math.max(...Object.keys(rounds).map(Number));

    return res.status(200).json({
      success: true,
      message: "Bracket fetched successfully.",
      data: {
        eventId,
        totalRounds,
        totalMatches: matches.rows.length,
        rounds,
      },
    });
  } catch (error: any) {
    console.error("Get bracket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Record the result of a match (winner, scores).
 * Automatically advance winner to the next round.
 */
export const updateMatchResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const matchId = Number(req.params.matchId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!matchId || isNaN(matchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid match ID is required.",
      });
    }

    const { winner_id, score_a, score_b } = req.body;

    if (!winner_id) {
      return res.status(400).json({
        success: false,
        message: "winner_id is required.",
      });
    }

    // Get the match
    const matchResult = await sql`
      SELECT eb.*, e."organizationId" FROM event_brackets eb
      INNER JOIN events e ON e.id = eb.event_id
      WHERE eb.id = ${matchId}
    `.execute(db);

    if (matchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Match not found.",
      });
    }

    const match = matchResult.rows[0] as any;

    if (match.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not own this event.",
      });
    }

    if (match.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Match result has already been recorded.",
      });
    }

    if (match.status === "BYE") {
      return res.status(400).json({
        success: false,
        message: "Cannot update result of a BYE match.",
      });
    }

    // Verify winner_id is one of the participants
    if (Number(winner_id) !== match.participant_a_id && Number(winner_id) !== match.participant_b_id) {
      return res.status(400).json({
        success: false,
        message: "winner_id must be one of the match participants.",
      });
    }

    // Update match result
    await sql`
      UPDATE event_brackets
      SET winner_id = ${Number(winner_id)},
          score_a = ${score_a || null},
          score_b = ${score_b || null},
          status = 'COMPLETED'
      WHERE id = ${matchId}
    `.execute(db);

    // Advance winner to next round if next_match_id exists
    if (match.next_match_id) {
      const winnerName = Number(winner_id) === match.participant_a_id
        ? match.participant_a_name
        : match.participant_b_name;

      // Check current state of next match
      const nextMatchResult = await sql`
        SELECT * FROM event_brackets WHERE id = ${match.next_match_id}
      `.execute(db);

      if (nextMatchResult.rows.length > 0) {
        const nextMatch = nextMatchResult.rows[0] as any;
        if (!nextMatch.participant_a_id) {
          await sql`
            UPDATE event_brackets
            SET participant_a_id = ${Number(winner_id)}, participant_a_name = ${winnerName}
            WHERE id = ${match.next_match_id}
          `.execute(db);
        } else if (!nextMatch.participant_b_id) {
          await sql`
            UPDATE event_brackets
            SET participant_b_id = ${Number(winner_id)}, participant_b_name = ${winnerName}
            WHERE id = ${match.next_match_id}
          `.execute(db);
        }
      }
    }

    // Fetch updated match
    const updatedMatch = await sql`
      SELECT * FROM event_brackets WHERE id = ${matchId}
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Match result recorded successfully.",
      data: updatedMatch.rows[0],
    });
  } catch (error: any) {
    console.error("Update match result error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Round 10: Event Sponsorship Tiers ====================

/**
 * Create sponsorship tiers for an event.
 */
export const createSponsorshipTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    // Verify event exists and belongs to org
    const event = await db
      .selectFrom("events")
      .select(["id", "organizationId"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (event.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not own this event.",
      });
    }

    const { tier_name, price, benefits, max_sponsors } = req.body;

    if (!tier_name || typeof tier_name !== "string" || tier_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "tier_name is required.",
      });
    }

    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required (non-negative number).",
      });
    }

    const result = await sql`
      INSERT INTO event_sponsorship_tiers (event_id, tier_name, price, benefits, max_sponsors)
      VALUES (
        ${eventId},
        ${tier_name.trim()},
        ${Number(price)},
        ${benefits ? JSON.stringify(benefits) : null}::jsonb,
        ${max_sponsors ? Number(max_sponsors) : 0}
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Sponsorship tier created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create sponsorship tier error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all sponsorship tiers for an event with current sponsor count.
 */
export const getSponsorshipTiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const tiers = await sql`
      SELECT est.*,
        (SELECT COUNT(*)::int FROM event_sponsors es WHERE es.tier_id = est.id AND es.status != 'REJECTED') as active_sponsors
      FROM event_sponsorship_tiers est
      WHERE est.event_id = ${eventId}
      ORDER BY est.price DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Sponsorship tiers fetched successfully.",
      data: tiers.rows,
    });
  } catch (error: any) {
    console.error("Get sponsorship tiers error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Organization applies as sponsor for a tier. Checks tier capacity.
 */
export const applySponsor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = Number(req?.user?.id);
    const eventId = Number(req.params.eventId);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const { tier_id, organization_name, logo_url } = req.body;

    if (!tier_id) {
      return res.status(400).json({
        success: false,
        message: "tier_id is required.",
      });
    }

    // Verify tier exists and belongs to this event
    const tierResult = await sql`
      SELECT * FROM event_sponsorship_tiers WHERE id = ${Number(tier_id)} AND event_id = ${eventId}
    `.execute(db);

    if (tierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sponsorship tier not found for this event.",
      });
    }

    const tier = tierResult.rows[0] as any;

    // Check capacity (max_sponsors of 0 means unlimited)
    if (tier.max_sponsors > 0 && tier.current_sponsors >= tier.max_sponsors) {
      return res.status(400).json({
        success: false,
        message: "This sponsorship tier is full.",
      });
    }

    // Check if this org already applied for this tier
    const existingApplication = await sql`
      SELECT id FROM event_sponsors
      WHERE event_id = ${eventId} AND tier_id = ${Number(tier_id)} AND organization_id = ${organizationId}
    `.execute(db);

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already applied as a sponsor for this tier.",
      });
    }

    // Insert sponsor application
    const result = await sql`
      INSERT INTO event_sponsors (event_id, tier_id, organization_id, organization_name, logo_url, status)
      VALUES (
        ${eventId},
        ${Number(tier_id)},
        ${organizationId},
        ${organization_name || null},
        ${logo_url || null},
        'PENDING'
      )
      RETURNING *
    `.execute(db);

    // Increment current_sponsors count on the tier
    await sql`
      UPDATE event_sponsorship_tiers SET current_sponsors = current_sponsors + 1 WHERE id = ${Number(tier_id)}
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Sponsor application submitted successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Apply sponsor error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all sponsors for an event grouped by tier.
 */
export const getEventSponsors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    // Get all tiers for the event
    const tiers = await sql`
      SELECT * FROM event_sponsorship_tiers WHERE event_id = ${eventId} ORDER BY price DESC
    `.execute(db);

    // Get all sponsors for the event
    const sponsors = await sql`
      SELECT es.*, est.tier_name, est.price as tier_price
      FROM event_sponsors es
      INNER JOIN event_sponsorship_tiers est ON est.id = es.tier_id
      WHERE es.event_id = ${eventId}
      ORDER BY est.price DESC, es.created_at ASC
    `.execute(db);

    // Group sponsors by tier
    const sponsorsByTier: Record<string, any> = {};
    for (const tier of tiers.rows as any[]) {
      sponsorsByTier[tier.tier_name] = {
        tier,
        sponsors: (sponsors.rows as any[]).filter((s: any) => s.tier_id === tier.id),
      };
    }

    return res.status(200).json({
      success: true,
      message: "Event sponsors fetched successfully.",
      data: sponsorsByTier,
    });
  } catch (error: any) {
    console.error("Get event sponsors error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Event Live Scoring (Round 11) ====================

/**
 * Update live score for an ongoing event match/game.
 * Upserts by (event_id, match_label). Also records history.
 */
export const updateLiveScore = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const {
      match_label,
      team_a_name,
      team_a_score,
      team_b_name,
      team_b_score,
      current_period,
      time_elapsed,
      commentary,
      status,
    } = req.body;

    if (!match_label) {
      return res.status(400).json({
        success: false,
        message: "match_label is required.",
      });
    }

    // Verify event belongs to this organization
    const event = await sql`
      SELECT id, "organizationId" FROM events WHERE id = ${eventId} AND deleted = false
    `.execute(db);

    if (event.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const eventRow = event.rows[0] as any;
    if (eventRow.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update scores for this event.",
      });
    }

    // Upsert live score
    const result = await sql`
      INSERT INTO event_live_scores (event_id, match_label, team_a_name, team_a_score, team_b_name, team_b_score, current_period, time_elapsed, commentary, status, updated_at)
      VALUES (${eventId}, ${match_label}, ${team_a_name || null}, ${team_a_score || '0'}, ${team_b_name || null}, ${team_b_score || '0'}, ${current_period || null}, ${time_elapsed || null}, ${commentary || null}, ${status || 'LIVE'}, NOW())
      ON CONFLICT (event_id, match_label) DO UPDATE SET
        team_a_name = COALESCE(EXCLUDED.team_a_name, event_live_scores.team_a_name),
        team_a_score = EXCLUDED.team_a_score,
        team_b_name = COALESCE(EXCLUDED.team_b_name, event_live_scores.team_b_name),
        team_b_score = EXCLUDED.team_b_score,
        current_period = COALESCE(EXCLUDED.current_period, event_live_scores.current_period),
        time_elapsed = COALESCE(EXCLUDED.time_elapsed, event_live_scores.time_elapsed),
        commentary = EXCLUDED.commentary,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `.execute(db);

    const liveScore = result.rows[0] as any;

    // Record history entry
    await sql`
      INSERT INTO event_live_score_history (live_score_id, team_a_score, team_b_score, current_period, time_elapsed, commentary, recorded_at)
      VALUES (${liveScore.id}, ${team_a_score || '0'}, ${team_b_score || '0'}, ${current_period || null}, ${time_elapsed || null}, ${commentary || null}, NOW())
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Live score updated successfully.",
      data: liveScore,
    });
  } catch (error: any) {
    console.error("Update live score error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all live scores for an event (public, no auth).
 */
export const getLiveScores = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const scores = await sql`
      SELECT * FROM event_live_scores
      WHERE event_id = ${eventId}
      ORDER BY
        CASE WHEN status = 'LIVE' THEN 0 ELSE 1 END,
        updated_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Live scores fetched successfully.",
      data: scores.rows,
    });
  } catch (error: any) {
    console.error("Get live scores error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get score update history for a specific match (public, no auth).
 */
export const getLiveScoreHistory = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const matchLabel = decodeURIComponent(req.params.matchLabel || '');

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    if (!matchLabel) {
      return res.status(400).json({
        success: false,
        message: "Match label is required.",
      });
    }

    // First find the live_score record
    const liveScoreResult = await sql`
      SELECT * FROM event_live_scores
      WHERE event_id = ${eventId} AND match_label = ${matchLabel}
    `.execute(db);

    if (liveScoreResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Live score not found for this match.",
      });
    }

    const liveScore = liveScoreResult.rows[0] as any;

    const history = await sql`
      SELECT * FROM event_live_score_history
      WHERE live_score_id = ${liveScore.id}
      ORDER BY recorded_at ASC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Live score history fetched successfully.",
      data: {
        current: liveScore,
        history: history.rows,
      },
    });
  } catch (error: any) {
    console.error("Get live score history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== Event Media Requests (Round 11) ====================

/**
 * Create a media request for an event (org creates it asking attendees for media).
 */
export const createMediaRequest = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    const { title, description, media_type, deadline } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    // Verify event belongs to this organization
    const event = await sql`
      SELECT id, "organizationId" FROM events WHERE id = ${eventId} AND deleted = false
    `.execute(db);

    if (event.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const eventRow = event.rows[0] as any;
    if (eventRow.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to create media requests for this event.",
      });
    }

    const result = await sql`
      INSERT INTO event_media_requests (event_id, title, description, media_type, deadline, created_by, created_at)
      VALUES (${eventId}, ${title}, ${description || null}, ${media_type || 'image'}, ${deadline || null}, ${organizationId}, NOW())
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Media request created successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create media request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all media requests for an event (affiliate auth).
 */
export const getMediaRequests = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const requests = await sql`
      SELECT * FROM event_media_requests
      WHERE event_id = ${eventId}
      ORDER BY created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Media requests fetched successfully.",
      data: requests.rows,
    });
  } catch (error: any) {
    console.error("Get media requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Submit a media response for a media request (affiliate submits media).
 */
export const submitMediaResponse = async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params.requestId);
    const affiliateId = Number(req?.user?.id);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Valid request ID is required.",
      });
    }

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required.",
      });
    }

    const { media_url, caption } = req.body;

    if (!media_url) {
      return res.status(400).json({
        success: false,
        message: "media_url is required.",
      });
    }

    // Verify media request exists
    const mediaRequest = await sql`
      SELECT * FROM event_media_requests WHERE id = ${requestId}
    `.execute(db);

    if (mediaRequest.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media request not found.",
      });
    }

    const reqRow = mediaRequest.rows[0] as any;

    // Check deadline
    if (reqRow.deadline && new Date(reqRow.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "The deadline for this media request has passed.",
      });
    }

    // Upsert response (unique per request + affiliate)
    const result = await sql`
      INSERT INTO event_media_responses (request_id, affiliate_id, media_url, caption, status, created_at)
      VALUES (${requestId}, ${affiliateId}, ${media_url}, ${caption || null}, 'SUBMITTED', NOW())
      ON CONFLICT (request_id, affiliate_id) DO UPDATE SET
        media_url = EXCLUDED.media_url,
        caption = EXCLUDED.caption,
        status = 'SUBMITTED',
        created_at = NOW()
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Media response submitted successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Submit media response error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Get all responses for a media request (org auth).
 */
export const getMediaResponses = async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params.requestId);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Valid request ID is required.",
      });
    }

    // Verify media request exists
    const mediaRequest = await sql`
      SELECT * FROM event_media_requests WHERE id = ${requestId}
    `.execute(db);

    if (mediaRequest.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media request not found.",
      });
    }

    const responses = await sql`
      SELECT emr.*, a.name as affiliate_name, a."profilePicture" as affiliate_picture
      FROM event_media_responses emr
      LEFT JOIN affiliates a ON a.id = emr.affiliate_id
      WHERE emr.request_id = ${requestId}
      ORDER BY emr.created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Media responses fetched successfully.",
      data: responses.rows,
    });
  } catch (error: any) {
    console.error("Get media responses error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==================== EVENT CHECK-IN MANAGEMENT (Round 12) ====================

/**
 * Generate a unique check-in code for an event
 * POST /api/events/:eventId/check-in/generate
 */
export const generateCheckInCode = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    // Verify event exists and belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id", "name"])
      .where("id", "=", eventId)
      .where("organizationId" as any, "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization",
      });
    }

    const { valid_from, valid_until } = req.body;

    // Generate a unique code
    const code = `KIBI-CHK-${randomUUID().substring(0, 8).toUpperCase()}`;

    const checkInEntry = await db
      .insertInto("event_check_ins" as any)
      .values({
        event_id: eventId,
        code,
        valid_from: valid_from ? new Date(valid_from) : new Date(),
        valid_until: valid_until ? new Date(valid_until) : null,
      } as any)
      .returning([
        "id" as any,
        "event_id" as any,
        "code" as any,
        "valid_from" as any,
        "valid_until" as any,
        "created_at" as any,
      ])
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Check-in code generated successfully",
      data: checkInEntry,
    });
  } catch (error) {
    console.error("Generate check-in code error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Affiliate checks in with a code
 * POST /api/events/:eventId/check-in
 */
export const performCheckIn = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req.user?.id);
    const { code } = req.body;

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        message: "Affiliate ID is required",
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Check-in code is required",
      });
    }

    // Validate the check-in code exists and is within time window
    const checkInCode = await db
      .selectFrom("event_check_ins" as any)
      .selectAll()
      .where("event_id", "=", eventId)
      .where("code", "=", code)
      .executeTakeFirst();

    if (!checkInCode) {
      return res.status(404).json({
        success: false,
        message: "Invalid check-in code",
      });
    }

    const now = new Date();
    const validFrom = (checkInCode as any).valid_from ? new Date((checkInCode as any).valid_from) : null;
    const validUntil = (checkInCode as any).valid_until ? new Date((checkInCode as any).valid_until) : null;

    if (validFrom && now < validFrom) {
      return res.status(400).json({
        success: false,
        message: "Check-in code is not yet valid",
      });
    }

    if (validUntil && now > validUntil) {
      return res.status(400).json({
        success: false,
        message: "Check-in code has expired",
      });
    }

    // Check if already checked in
    const existingCheckIn = await db
      .selectFrom("event_attendance_log" as any)
      .select(["id" as any])
      .where("event_id", "=", eventId)
      .where("affiliate_id", "=", affiliateId)
      .executeTakeFirst();

    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        message: "Already checked in to this event",
      });
    }

    // Record the check-in
    const attendance = await db
      .insertInto("event_attendance_log" as any)
      .values({
        event_id: eventId,
        affiliate_id: affiliateId,
        check_in_code: code,
        check_in_method: "CODE",
      } as any)
      .returning([
        "id" as any,
        "event_id" as any,
        "affiliate_id" as any,
        "check_in_code" as any,
        "check_in_method" as any,
        "checked_in_at" as any,
      ])
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Check-in successful",
      data: attendance,
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Already checked in to this event",
      });
    }
    console.error("Perform check-in error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get check-in statistics for an event
 * GET /api/events/:eventId/check-in/stats
 */
export const getCheckInStats = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id", "name"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Total registered
    const registeredResult = await sql`
      SELECT COUNT(*)::int as count FROM affiliate_event_responses
      WHERE event_id = ${eventId} AND deleted = false
    `.execute(db);
    const totalRegistered = (registeredResult.rows[0] as any)?.count || 0;

    // Total checked in via attendance log
    const checkedInResult = await sql`
      SELECT COUNT(*)::int as count FROM event_attendance_log
      WHERE event_id = ${eventId}
    `.execute(db);
    const totalCheckedIn = (checkedInResult.rows[0] as any)?.count || 0;

    // Check-in rate
    const checkInRate = totalRegistered > 0
      ? Math.round((totalCheckedIn / totalRegistered) * 100 * 100) / 100
      : 0;

    // Hourly check-in timeline
    const hourlyTimeline = await sql`
      SELECT
        EXTRACT(HOUR FROM checked_in_at)::int as hour,
        COUNT(*)::int as count
      FROM event_attendance_log
      WHERE event_id = ${eventId}
        AND checked_in_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM checked_in_at)
      ORDER BY hour ASC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Check-in stats retrieved successfully",
      data: {
        eventId,
        eventName: event.name,
        totalRegistered,
        totalCheckedIn,
        checkInRate,
        noShows: totalRegistered - totalCheckedIn,
        hourlyTimeline: hourlyTimeline.rows,
      },
    });
  } catch (error) {
    console.error("Get check-in stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get list of checked-in attendees with timestamps
 * GET /api/events/:eventId/check-in/attendees
 */
export const getAttendeeList = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const attendees = await sql`
      SELECT
        eal.id,
        eal.affiliate_id,
        eal.check_in_code,
        eal.check_in_method,
        eal.checked_in_at,
        a.name as affiliate_name,
        a.email as affiliate_email,
        a.phone as affiliate_phone,
        a."profilePicture" as affiliate_picture
      FROM event_attendance_log eal
      INNER JOIN affiliates a ON a.id = eal.affiliate_id
      WHERE eal.event_id = ${eventId}
      ORDER BY eal.checked_in_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM event_attendance_log
      WHERE event_id = ${eventId}
    `.execute(db);
    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Attendee list retrieved successfully",
      data: attendees.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get attendee list error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== Post-Event Feedback Surveys (Round 13) ====================

/**
 * Create a feedback survey for an event
 * POST /api/events/:eventId/survey
 */
export const createSurvey = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    const { title, questions } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Survey title is required",
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one question is required",
      });
    }

    // Validate question format
    const validTypes = ["rating", "text", "multiple_choice"];
    for (const q of questions) {
      if (!q.question || !q.type || !validTypes.includes(q.type)) {
        return res.status(400).json({
          success: false,
          message: `Each question must have a 'question' text and a valid 'type' (${validTypes.join(", ")})`,
        });
      }
      if (q.type === "multiple_choice" && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
        return res.status(400).json({
          success: false,
          message: "Multiple choice questions must have at least 2 options",
        });
      }
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization",
      });
    }

    // Check if survey already exists for this event
    const existingSurvey = await sql`
      SELECT id FROM event_surveys WHERE event_id = ${eventId} AND is_active = true
    `.execute(db);

    if (existingSurvey.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "An active survey already exists for this event",
      });
    }

    const result = await sql`
      INSERT INTO event_surveys (event_id, title, questions, is_active, created_at)
      VALUES (${eventId}, ${title.trim()}, ${JSON.stringify(questions)}::jsonb, true, NOW())
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Survey created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create survey error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get survey for an event (public)
 * GET /api/events/:eventId/survey
 */
export const getSurvey = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    const survey = await sql`
      SELECT * FROM event_surveys
      WHERE event_id = ${eventId} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `.execute(db);

    if (survey.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active survey found for this event",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Survey retrieved successfully",
      data: survey.rows[0],
    });
  } catch (error) {
    console.error("Get survey error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Submit survey response
 * POST /api/events/:eventId/survey/respond
 */
export const submitSurveyResponse = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Answers are required",
      });
    }

    // Get the active survey
    const survey = await sql`
      SELECT id, questions FROM event_surveys
      WHERE event_id = ${eventId} AND is_active = true
      LIMIT 1
    `.execute(db);

    if (survey.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active survey found for this event",
      });
    }

    const surveyData = survey.rows[0] as any;

    // Check if affiliate already submitted
    const existingResponse = await sql`
      SELECT id FROM event_survey_responses
      WHERE survey_id = ${surveyData.id}::uuid AND affiliate_id = ${affiliateId}
    `.execute(db);

    if (existingResponse.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a response for this survey",
      });
    }

    const result = await sql`
      INSERT INTO event_survey_responses (survey_id, affiliate_id, answers, submitted_at)
      VALUES (${surveyData.id}::uuid, ${affiliateId}, ${JSON.stringify(answers)}::jsonb, NOW())
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Survey response submitted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Submit survey response error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get aggregated survey results
 * GET /api/events/:eventId/survey/results
 */
export const getSurveyResults = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization",
      });
    }

    // Get the survey
    const survey = await sql`
      SELECT id, title, questions FROM event_surveys
      WHERE event_id = ${eventId} AND is_active = true
      LIMIT 1
    `.execute(db);

    if (survey.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active survey found for this event",
      });
    }

    const surveyData = survey.rows[0] as any;

    // Get all responses
    const responses = await sql`
      SELECT answers FROM event_survey_responses
      WHERE survey_id = ${surveyData.id}::uuid
    `.execute(db);

    const totalResponses = responses.rows.length;
    const questions = surveyData.questions as any[];

    // Aggregate results per question
    const aggregatedResults = questions.map((question: any, index: number) => {
      const questionAnswers = responses.rows.map((r: any) => {
        const ans = r.answers as any[];
        return ans[index]?.answer;
      }).filter((a: any) => a !== undefined && a !== null);

      if (question.type === "rating") {
        const numericAnswers = questionAnswers.map(Number).filter((n: number) => !isNaN(n));
        const average = numericAnswers.length > 0
          ? (numericAnswers.reduce((sum: number, val: number) => sum + val, 0) / numericAnswers.length).toFixed(2)
          : 0;
        return {
          question: question.question,
          type: question.type,
          total_answers: numericAnswers.length,
          average_rating: Number(average),
          distribution: [1, 2, 3, 4, 5].map((rating) => ({
            rating,
            count: numericAnswers.filter((n: number) => n === rating).length,
          })),
        };
      } else if (question.type === "multiple_choice") {
        const distribution: Record<string, number> = {};
        (question.options || []).forEach((opt: string) => {
          distribution[opt] = 0;
        });
        questionAnswers.forEach((answer: string) => {
          if (distribution[answer] !== undefined) {
            distribution[answer]++;
          }
        });
        return {
          question: question.question,
          type: question.type,
          total_answers: questionAnswers.length,
          distribution: Object.entries(distribution).map(([option, count]) => ({
            option,
            count,
            percentage: questionAnswers.length > 0
              ? ((count / questionAnswers.length) * 100).toFixed(1) + "%"
              : "0%",
          })),
        };
      } else {
        // text type
        return {
          question: question.question,
          type: question.type,
          total_answers: questionAnswers.length,
          responses: questionAnswers.slice(0, 50), // limit to 50 text responses
        };
      }
    });

    return res.status(200).json({
      success: true,
      message: "Survey results retrieved successfully",
      data: {
        survey_id: surveyData.id,
        title: surveyData.title,
        total_responses: totalResponses,
        results: aggregatedResults,
      },
    });
  } catch (error) {
    console.error("Get survey results error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== Event Notification Preferences (Round 13) ====================

/**
 * Set notification preferences for an event
 * POST /api/events/:eventId/notification-prefs
 */
export const setEventNotificationPrefs = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    const {
      remind_before_hours = 24,
      notify_updates = true,
      notify_results = true,
      notify_photos = true,
    } = req.body;

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Upsert preferences
    const result = await sql`
      INSERT INTO event_notification_prefs (event_id, affiliate_id, remind_before_hours, notify_updates, notify_results, notify_photos, created_at)
      VALUES (${eventId}, ${affiliateId}, ${remind_before_hours}, ${notify_updates}, ${notify_results}, ${notify_photos}, NOW())
      ON CONFLICT (event_id, affiliate_id) DO UPDATE SET
        remind_before_hours = ${remind_before_hours},
        notify_updates = ${notify_updates},
        notify_results = ${notify_results},
        notify_photos = ${notify_photos}
      RETURNING *
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Set event notification prefs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get notification preferences for an event
 * GET /api/events/:eventId/notification-prefs
 */
export const getEventNotificationPrefs = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const affiliateId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    const prefs = await sql`
      SELECT * FROM event_notification_prefs
      WHERE event_id = ${eventId} AND affiliate_id = ${affiliateId}
    `.execute(db);

    if (prefs.rows.length === 0) {
      // Return defaults
      return res.status(200).json({
        success: true,
        message: "Default notification preferences (not yet customized)",
        data: {
          event_id: eventId,
          affiliate_id: affiliateId,
          remind_before_hours: 24,
          notify_updates: true,
          notify_results: true,
          notify_photos: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification preferences retrieved successfully",
      data: prefs.rows[0],
    });
  } catch (error) {
    console.error("Get event notification prefs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get list of affiliates who subscribed to event notifications
 * GET /api/events/:eventId/subscribers
 */
export const getEventSubscribers = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const subscribers = await sql`
      SELECT
        enp.affiliate_id,
        enp.remind_before_hours,
        enp.notify_updates,
        enp.notify_results,
        enp.notify_photos,
        enp.created_at as subscribed_at,
        a.name as affiliate_name,
        a.email as affiliate_email,
        a.phone as affiliate_phone
      FROM event_notification_prefs enp
      INNER JOIN affiliates a ON a.id = enp.affiliate_id
      WHERE enp.event_id = ${eventId}
      ORDER BY enp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM event_notification_prefs
      WHERE event_id = ${eventId}
    `.execute(db);
    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Event subscribers retrieved successfully",
      data: subscribers.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get event subscribers error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Send a custom notification to all event subscribers
 * POST /api/events/:eventId/notify
 */
export const sendEventNotification = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required",
      });
    }

    const { title, message } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification message is required",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization",
      });
    }

    // Count subscribers
    const subscriberCount = await sql`
      SELECT COUNT(*)::int as total FROM event_notification_prefs
      WHERE event_id = ${eventId} AND notify_updates = true
    `.execute(db);
    const totalSubscribers = (subscriberCount.rows[0] as any)?.total || 0;

    // Store the notification
    const result = await sql`
      INSERT INTO event_notifications (event_id, title, message, sent_by, sent_at)
      VALUES (${eventId}, ${title.trim()}, ${message.trim()}, ${organizationId}, NOW())
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: {
        notification: result.rows[0],
        subscribers_notified: totalSubscribers,
      },
    });
  } catch (error) {
    console.error("Send event notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================= ORGANIZATION CALENDAR (Round 14) =========================

/**
 * Get all events, deadlines, and milestones for an org in calendar-friendly format
 * GET /api/events/org-calendar
 */
export const getOrgCalendar = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12.",
      });
    }

    // Get events for this org in the given month/year
    const events = await sql`
      SELECT
        id,
        name as title,
        "startDate" as date,
        'event' as type,
        description as details,
        '#4976FD' as color
      FROM events
      WHERE "organizationId" = ${organizationId}
        AND deleted = false
        AND EXTRACT(MONTH FROM "startDate") = ${month}
        AND EXTRACT(YEAR FROM "startDate") = ${year}
    `.execute(db);

    // Get event deadlines (registration end dates)
    const deadlines = await sql`
      SELECT
        id,
        CONCAT(name, ' - Registration Deadline') as title,
        "lastDateOfRegistration" as date,
        'deadline' as type,
        CONCAT('Last date to register for ', name) as details,
        '#FF6B6B' as color
      FROM events
      WHERE "organizationId" = ${organizationId}
        AND deleted = false
        AND "lastDateOfRegistration" IS NOT NULL
        AND EXTRACT(MONTH FROM "lastDateOfRegistration") = ${month}
        AND EXTRACT(YEAR FROM "lastDateOfRegistration") = ${year}
    `.execute(db);

    // Get custom calendar entries
    const customEntries = await sql`
      SELECT
        id,
        title,
        entry_date as date,
        entry_type as type,
        description as details,
        color
      FROM org_calendar_entries
      WHERE organization_id = ${organizationId}
        AND EXTRACT(MONTH FROM entry_date) = ${month}
        AND EXTRACT(YEAR FROM entry_date) = ${year}
    `.execute(db);

    const calendarItems = [
      ...events.rows,
      ...deadlines.rows,
      ...customEntries.rows,
    ];

    // Sort by date
    calendarItems.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return res.status(200).json({
      success: true,
      message: "Organization calendar retrieved successfully.",
      data: calendarItems,
      meta: { month, year },
    });
  } catch (error) {
    console.error("Get org calendar error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Add a custom calendar entry (non-event)
 * POST /api/events/calendar-entry
 */
export const addCalendarEntry = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const { date, title, description, entry_type, color } = req.body;

    if (!date || !title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "date and title are required.",
      });
    }

    const result = await sql`
      INSERT INTO org_calendar_entries (organization_id, entry_date, title, description, entry_type, color)
      VALUES (
        ${organizationId},
        ${date},
        ${title.trim()},
        ${description || null},
        ${entry_type || 'custom'},
        ${color || '#4976FD'}
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Calendar entry added successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Add calendar entry error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete a custom calendar entry
 * DELETE /api/events/calendar-entry/:entryId
 */
export const deleteCalendarEntry = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const entryId = req.params.entryId;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Entry ID is required.",
      });
    }

    const result = await sql`
      DELETE FROM org_calendar_entries
      WHERE id = ${entryId}::uuid AND organization_id = ${organizationId}
      RETURNING id
    `.execute(db);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Calendar entry not found or does not belong to your organization.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Calendar entry deleted successfully.",
    });
  } catch (error) {
    console.error("Delete calendar entry error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get upcoming deadlines for the org in next N days
 * GET /api/events/upcoming-deadlines
 */
export const getUpcomingDeadlines = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req?.user?.id);
    const days = Math.min(parseInt(req.query.days as string) || 7, 90);

    const deadlines = await sql`
      SELECT
        id,
        name as title,
        "lastDateOfRegistration" as deadline_date,
        "startDate" as event_date,
        CONCAT('Registration closes for ', name) as description,
        EXTRACT(DAY FROM ("lastDateOfRegistration" - NOW()))::int as days_remaining
      FROM events
      WHERE "organizationId" = ${organizationId}
        AND deleted = false
        AND "lastDateOfRegistration" IS NOT NULL
        AND "lastDateOfRegistration" >= NOW()
        AND "lastDateOfRegistration" <= NOW() + (${days} || ' days')::interval
      ORDER BY "lastDateOfRegistration" ASC
    `.execute(db);

    // Also get custom entries with upcoming dates
    const customDeadlines = await sql`
      SELECT
        id,
        title,
        entry_date as deadline_date,
        description,
        entry_type,
        color,
        EXTRACT(DAY FROM (entry_date - CURRENT_DATE))::int as days_remaining
      FROM org_calendar_entries
      WHERE organization_id = ${organizationId}
        AND entry_type = 'deadline'
        AND entry_date >= CURRENT_DATE
        AND entry_date <= CURRENT_DATE + (${days} || ' days')::interval
      ORDER BY entry_date ASC
    `.execute(db);

    const allDeadlines = [
      ...deadlines.rows.map((d: any) => ({ ...d, source: "event" })),
      ...customDeadlines.rows.map((d: any) => ({ ...d, source: "custom" })),
    ];

    allDeadlines.sort((a: any, b: any) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime());

    return res.status(200).json({
      success: true,
      message: "Upcoming deadlines retrieved successfully.",
      data: allDeadlines,
      meta: { days_range: days },
    });
  } catch (error) {
    console.error("Get upcoming deadlines error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================= EVENT MERCHANDISE (Round 14) =========================

/**
 * Add merchandise item to an event
 * POST /api/events/:eventId/merchandise
 */
export const addMerchandise = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const { name, description, price, stock_quantity, image_url, sizes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Merchandise name is required.",
      });
    }

    if (price === undefined || price === null || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required.",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization.",
      });
    }

    const sizesJson = JSON.stringify(sizes || []);

    const result = await sql`
      INSERT INTO event_merchandise (event_id, name, description, price, stock_quantity, image_url, sizes)
      VALUES (
        ${eventId},
        ${name.trim()},
        ${description || null},
        ${price},
        ${stock_quantity || 0},
        ${image_url || null},
        ${sizesJson}::jsonb
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Merchandise item added successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Add merchandise error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * List all merchandise for an event
 * GET /api/events/:eventId/merchandise
 */
export const getEventMerchandise = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    const merchandise = await sql`
      SELECT *
      FROM event_merchandise
      WHERE event_id = ${eventId} AND is_active = true
      ORDER BY created_at DESC
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Event merchandise retrieved successfully.",
      data: merchandise.rows,
    });
  } catch (error) {
    console.error("Get event merchandise error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update merchandise item details/stock
 * PUT /api/events/merchandise/:itemId
 */
export const updateMerchandise = async (req: Request, res: Response) => {
  try {
    const itemId = req.params.itemId;
    const organizationId = Number(req?.user?.id);

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Merchandise item ID is required.",
      });
    }

    // Verify the merchandise belongs to an event owned by this org
    const existing = await sql`
      SELECT em.id, em.event_id
      FROM event_merchandise em
      INNER JOIN events e ON e.id = em.event_id
      WHERE em.id = ${itemId}::uuid
        AND e."organizationId" = ${organizationId}
        AND e.deleted = false
    `.execute(db);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Merchandise item not found or does not belong to your organization.",
      });
    }

    const { name, description, price, stock_quantity, image_url, sizes, is_active } = req.body;

    const updates: string[] = [];
    const values: any = {};

    if (name !== undefined) { values.name = name.trim(); updates.push("name"); }
    if (description !== undefined) { values.description = description; updates.push("description"); }
    if (price !== undefined) { values.price = price; updates.push("price"); }
    if (stock_quantity !== undefined) { values.stock_quantity = stock_quantity; updates.push("stock_quantity"); }
    if (image_url !== undefined) { values.image_url = image_url; updates.push("image_url"); }
    if (sizes !== undefined) { values.sizes = JSON.stringify(sizes); updates.push("sizes"); }
    if (is_active !== undefined) { values.is_active = is_active; updates.push("is_active"); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update.",
      });
    }

    const result = await sql`
      UPDATE event_merchandise
      SET
        name = COALESCE(${values.name ?? null}, name),
        description = COALESCE(${values.description ?? null}, description),
        price = COALESCE(${values.price ?? null}, price),
        stock_quantity = COALESCE(${values.stock_quantity ?? null}, stock_quantity),
        image_url = COALESCE(${values.image_url ?? null}, image_url),
        sizes = COALESCE(${values.sizes ?? null}::jsonb, sizes),
        is_active = COALESCE(${values.is_active ?? null}, is_active)
      WHERE id = ${itemId}::uuid
      RETURNING *
    `.execute(db);

    return res.status(200).json({
      success: true,
      message: "Merchandise item updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update merchandise error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Record a merchandise purchase
 * POST /api/events/merchandise/:itemId/purchase
 */
export const purchaseMerchandise = async (req: Request, res: Response) => {
  try {
    const itemId = req.params.itemId;
    const affiliateId = Number(req?.user?.id);
    const { quantity, size } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Merchandise item ID is required.",
      });
    }

    const qty = parseInt(quantity) || 1;

    if (qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1.",
      });
    }

    // Get the merchandise item
    const item = await sql`
      SELECT * FROM event_merchandise
      WHERE id = ${itemId}::uuid AND is_active = true
    `.execute(db);

    if (item.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Merchandise item not found or not available.",
      });
    }

    const merchandise = item.rows[0] as any;

    if (merchandise.stock_quantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${merchandise.stock_quantity} items available.`,
      });
    }

    const totalAmount = parseFloat(merchandise.price) * qty;

    // Decrement stock
    await sql`
      UPDATE event_merchandise
      SET stock_quantity = stock_quantity - ${qty}
      WHERE id = ${itemId}::uuid
    `.execute(db);

    // Create order
    const order = await sql`
      INSERT INTO merchandise_orders (merchandise_id, event_id, affiliate_id, quantity, size, total_amount, status)
      VALUES (
        ${itemId}::uuid,
        ${merchandise.event_id},
        ${affiliateId},
        ${qty},
        ${size || null},
        ${totalAmount},
        'PENDING'
      )
      RETURNING *
    `.execute(db);

    return res.status(201).json({
      success: true,
      message: "Merchandise purchased successfully.",
      data: {
        order: order.rows[0],
        item_name: merchandise.name,
        remaining_stock: merchandise.stock_quantity - qty,
      },
    });
  } catch (error) {
    console.error("Purchase merchandise error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all orders for an event's merchandise (org view)
 * GET /api/events/:eventId/merchandise/orders
 */
export const getMerchandiseOrders = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);
    const organizationId = Number(req?.user?.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid event ID is required.",
      });
    }

    // Verify event belongs to this organization
    const event = await db
      .selectFrom("events")
      .select(["id"])
      .where("id", "=", eventId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to your organization.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const orders = await sql`
      SELECT
        mo.id,
        mo.quantity,
        mo.size,
        mo.total_amount,
        mo.status,
        mo.created_at,
        em.name as item_name,
        em.price as item_price,
        a.name as affiliate_name,
        a.phone as affiliate_phone
      FROM merchandise_orders mo
      INNER JOIN event_merchandise em ON em.id = mo.merchandise_id
      LEFT JOIN affiliates a ON a.id = mo.affiliate_id
      WHERE mo.event_id = ${eventId}
      ORDER BY mo.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(db);

    const countResult = await sql`
      SELECT COUNT(*)::int as total
      FROM merchandise_orders
      WHERE event_id = ${eventId}
    `.execute(db);
    const total = (countResult.rows[0] as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Merchandise orders retrieved successfully.",
      data: orders.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get merchandise orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
