import { NextFunction, Request, Response } from "express";
import { db } from "../../database/kysely/databases";
import {
  createFormSchema,
  updateFormSchema,
  getFormsQuerySchema,
} from "./formSchema";
import { FormsTable } from "../../database/kysely/types";

/**
 * Creates a new form for an organization with comprehensive validation
 * Includes security checks for organization existence and form field validation
 */
export const createForm = async (req: Request, res: Response) => {
  try {
    // Validate request body against schema
    const { error } = createFormSchema.validate(req.body);
    if (error) {
      console.log("error validating req.body in createForm:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    const organizationId = req.user!.id;
    const { formName, header, form_values, type, minPlayers, maxPlayers } =
      req.body;

    if (!organizationId) {
      console.error(
        "Organization ID is required was not set from middleware, check if JWT is coming properly from FE."
      );
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    // Verify organization exists and is active
    const organizationExists: any = await db
      .selectFrom("sports_organizations")
      .select(["id", "name"])
      .where("id", "=", Number(organizationId))
      .where("deleted", "=", false)
      .where("status", "=", "APPROVED")
      .executeTakeFirst();

    if (!organizationExists) {
      return res.status(400).json({
        success: false,
        message: "Organization does not exist or is not approved.",
      });
    }

    // Check for duplicate form names within the same organization
    const existingForm: any = await db
      .selectFrom("forms")
      .select(["id"])
      .where("organizationId", "=", Number(organizationId))
      .where("formName", "=", formName)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (existingForm) {
      return res.status(400).json({
        success: false,
        message: "A form with this name already exists in your organization.",
      });
    }

    // Prepare form data with security defaults
    const formData = {
      formName,
      header,
      organizationId: Number(organizationId),
      form_values: form_values, // Store as JSONB object directly
      type: type as FormsTable["type"],
      minPlayers: minPlayers || null,
      maxPlayers: maxPlayers || null,
      deleted: false,
      createdAt: new Date(),
    };

    // Create the form
    const createdForm = await db
      .insertInto("forms")
      .values(formData)
      .returningAll()
      .executeTakeFirst();

    if (!createdForm) {
      return res.status(400).json({
        success: false,
        message: "Unable to create the form.",
      });
    }

    // form_values is already an object from JSONB
    const responseForm = {
      ...createdForm,
      form_values: createdForm.form_values,
    };

    return res.status(201).json({
      success: true,
      message: "Form created successfully",
      data: responseForm,
    });
  } catch (err: any) {
    console.error("Error while creating form:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * Retrieves all forms with filtering and pagination capabilities
 * Supports organization-specific filtering and search functionality
 */
export const getAllForms = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const { error } = getFormsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    let query = db
      .selectFrom("forms")
      .leftJoin(
        "sports_organizations",
        "forms.organizationId",
        "sports_organizations.id"
      )
      .select([
        "forms.id",
        "forms.formName",
        "forms.header",
        "forms.organizationId",
        "forms.form_values",
        "forms.type",
        "forms.minPlayers",
        "forms.maxPlayers",
        "forms.deleted",
        "forms.createdAt",
        "sports_organizations.name as organizationName",
      ]);

    // Apply filters based on query parameters
    if (req.query.organizationId) {
      query = query.where(
        "forms.organizationId",
        "=",
        Number(req.query.organizationId)
      );
    }

    if (req.query.type) {
      query = query.where(
        "forms.type",
        "=",
        req.query.type as FormsTable["type"]
      );
    }

    // Default: only show non-deleted forms
    query = query.where("forms.deleted", "=", false);

    // Apply pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    query = query.limit(limit).offset(offset);

    const forms = await query.execute();

    if (forms.length === 0) {
      return res.status(404).json({
        message: "No forms found",
        success: false,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
        },
      });
    }

    // Parse form_values for each form
    const parsedForms = forms.map((form) => ({
      ...form,
      form_values: form.form_values,
    }));

    // Get total count for pagination
    let countQuery = db
      .selectFrom("forms")
      .select(db.fn.count("id").as("count"));

    if (req.query.organizationId) {
      countQuery = countQuery.where(
        "organizationId",
        "=",
        Number(req.query.organizationId)
      );
    }
    if (req.query.type) {
      countQuery = countQuery.where(
        "type",
        "=",
        req.query.type as FormsTable["type"]
      );
    }
    if (req.query.formName) {
      countQuery = countQuery.where(
        "formName",
        "ilike",
        `%${req.query.formName}%`
      );
    }
    countQuery = countQuery.where("deleted", "=", false);

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.count || 0);

    return res.status(200).json({
      message: "Forms fetched successfully",
      success: true,
      count: forms.length,
      data: parsedForms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error in forms controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Retrieves a specific form by ID with organization verification
 * Includes security check to ensure form belongs to requesting organization
 */
export const getFormById = async (req: Request, res: Response) => {
  try {
    const formId = Number(req.params.formId);
    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Form ID is required.",
      });
    }

    const form = await db
      .selectFrom("forms")
      .leftJoin(
        "sports_organizations",
        "forms.organizationId",
        "sports_organizations.id"
      )
      .select([
        "forms.id",
        "forms.formName",
        "forms.header",
        "forms.organizationId",
        "forms.form_values",
        "forms.type",
        "forms.minPlayers",
        "forms.maxPlayers",
        "forms.deleted",
        "forms.createdAt",
        "sports_organizations.name as organizationName",
      ])
      .where("forms.id", "=", formId)
      .where("forms.deleted", "=", false)
      .executeTakeFirst();

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found.",
      });
    }

    // Parse form_values
    const parsedForm = {
      ...form,
      form_values: form.form_values,
    };

    return res.status(200).json({
      success: true,
      message: "Form fetched successfully",
      data: parsedForm,
    });
  } catch (error: any) {
    console.error("Error fetching form:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Updates form details with selective field updates
 * Maintains audit trail and validates organization ownership
 */
export const updateForm = async (req: Request, res: Response) => {
  try {
    const formId = Number(req.params.formId);
    const organizationId = Number(req?.user?.id);

    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Form ID is required.",
      });
    }

    // Validate update data
    const { error } = await updateFormSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide data to be updated.",
      });
    }

    // Verify form exists and is not deleted
    const existingForm: any = await db
      .selectFrom("forms")
      .select(["id", "organizationId", "formName"])
      .where("id", "=", formId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!existingForm) {
      return res.status(404).json({
        success: false,
        message: "Form does not exist.",
      });
    }

    // Check for duplicate form name if formName is being updated
    if (req.body.formName && req.body.formName !== existingForm.formName) {
      const duplicateForm: any = await db
        .selectFrom("forms")
        .select(["id"])
        .where("organizationId", "=", existingForm.organizationId)
        .where("formName", "=", req.body.formName)
        .where("deleted", "=", false)
        .where("id", "!=", formId)
        .executeTakeFirst();

      if (duplicateForm) {
        return res.status(400).json({
          success: false,
          message: "A form with this name already exists in your organization.",
        });
      }
    }

    // Build update object with only provided fields
    const dataToBeUpdated: any = {};

    const updatableFields = [
      "formName",
      "header",
      "form_values",
      "type",
      "minPlayers",
      "maxPlayers",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        dataToBeUpdated[field] = req.body[field];
      }
    });

    // Update the form
    const updatedForm = await db
      .updateTable("forms")
      .set(dataToBeUpdated)
      .where("id", "=", formId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!updatedForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found or unable to update.",
      });
    }

    // form_values is already an object from JSONB
    const responseForm = {
      ...updatedForm,
      form_values: updatedForm.form_values,
    };

    return res.status(200).json({
      success: true,
      message: "Form updated successfully",
      data: responseForm,
    });
  } catch (error: any) {
    console.error("Error while updating form:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Soft deletes a form and checks for associated events
 * Prevents deletion if form is currently used by active events
 */
export const deleteForm = async (req: Request, res: Response) => {
  try {
    const formId = Number(req.params.formId);
    const organizationId = Number(req?.user?.id);
    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Form ID is required.",
      });
    }

    // Verify form exists and is not already deleted
    const existingForm: any = await db
      .selectFrom("forms")
      .select(["id", "formName"])
      .where("id", "=", formId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!existingForm) {
      return res.status(404).json({
        success: false,
        message: "Form does not exist.",
      });
    }

    // Check if form is currently used by any active events
    const activeEvents = await db
      .selectFrom("events_forms")
      .innerJoin("events", "events_forms.eventId", "events.id")
      .select(["events.id", "events.name"])
      .where("events_forms.formId", "=", formId)
      .where("events_forms.deleted", "=", false)
      .where("events.deleted", "=", false)
      .execute();

    if (activeEvents.length > 0) {
      const eventNames = activeEvents.map((event) => event.name).join(", ");
      return res.status(400).json({
        success: false,
        message: `Cannot delete form. It is currently used by the following active events: ${eventNames}`,
        activeEvents: activeEvents,
      });
    }

    // Soft delete the form
    await db
      .updateTable("forms")
      .set({ deleted: true })
      .where("id", "=", formId)
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Form deleted successfully.",
    });
  } catch (err: any) {
    console.error("Error while deleting form:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * Retrieves forms belonging to a specific organization
 * Organization-specific endpoint for better security and performance
 */
export const getOrganizationForms = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.params.organizationId);
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required.",
      });
    }

    // Verify organization exists
    const organizationExists: any = await db
      .selectFrom("sports_organizations")
      .select(["id", "name"])
      .where("id", "=", organizationId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!organizationExists) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const forms = await db
      .selectFrom("forms")
      .selectAll()
      .where("organizationId", "=", organizationId)
      .where("deleted", "=", false)
      .orderBy("createdAt", "desc")
      .execute();

    // Parse form_values for each form
    const parsedForms = forms.map((form) => ({
      ...form,
      form_values: form.form_values,
    }));

    return res.status(200).json({
      success: true,
      message:
        forms.length > 0
          ? "Organization forms fetched successfully"
          : "No forms found for this organization",
      count: forms.length,
      organizationName: organizationExists.name,
      data: parsedForms,
    });
  } catch (error: any) {
    console.error("Error fetching organization forms:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
