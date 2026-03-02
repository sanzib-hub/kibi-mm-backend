import { Request, Response } from "express";
import { db } from "../database/kysely/databases";
import { sql } from "kysely";

/**
 * Create a new campaign template.
 * Admin only.
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      defaultBudgetMin,
      defaultBudgetMax,
      defaultDurationDays,
      targetAudience,
      deliverables,
      terms,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required",
      });
    }

    const existing = await db
      .selectFrom("campaign_templates" as any)
      .selectAll()
      .where("name", "=", name)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A template with this name already exists",
      });
    }

    const template = await db
      .insertInto("campaign_templates" as any)
      .values({
        name,
        description: description || null,
        category,
        default_budget_min: defaultBudgetMin || null,
        default_budget_max: defaultBudgetMax || null,
        default_duration_days: defaultDurationDays || null,
        target_audience: targetAudience ? JSON.stringify(targetAudience) : null,
        deliverables: deliverables ? JSON.stringify(deliverables) : null,
        terms: terms || null,
        created_by: Number(req?.user?.id),
        status: "ACTIVE",
      })
      .returningAll()
      .executeTakeFirst();

    return res.status(201).json({
      success: true,
      message: "Campaign template created successfully",
      data: template,
    });
  } catch (error) {
    console.error("Create template error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all campaign templates with optional filters.
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    let query = db
      .selectFrom("campaign_templates" as any)
      .selectAll()
      .where("is_deleted", "=", false);

    if (category) {
      query = query.where("category", "=", category);
    }
    if (status) {
      query = query.where("status", "=", status);
    }

    const templates = await query
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    let countQuery = db
      .selectFrom("campaign_templates" as any)
      .select(sql`COUNT(*)::int`.as("total"))
      .where("is_deleted", "=", false);

    if (category) {
      countQuery = countQuery.where("category", "=", category);
    }
    if (status) {
      countQuery = countQuery.where("status", "=", status);
    }

    const countResult = await countQuery.executeTakeFirst();
    const total = (countResult as any)?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Templates retrieved successfully",
      data: {
        templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get templates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get a single template by ID.
 */
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required",
      });
    }

    const template = await db
      .selectFrom("campaign_templates" as any)
      .selectAll()
      .where("id", "=", templateId)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Template retrieved successfully",
      data: template,
    });
  } catch (error) {
    console.error("Get template by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update a campaign template.
 * Admin only.
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const {
      name,
      description,
      category,
      defaultBudgetMin,
      defaultBudgetMax,
      defaultDurationDays,
      targetAudience,
      deliverables,
      terms,
      status,
    } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required",
      });
    }

    const existing = await db
      .selectFrom("campaign_templates" as any)
      .selectAll()
      .where("id", "=", templateId)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (defaultBudgetMin !== undefined) updateData.default_budget_min = defaultBudgetMin;
    if (defaultBudgetMax !== undefined) updateData.default_budget_max = defaultBudgetMax;
    if (defaultDurationDays !== undefined) updateData.default_duration_days = defaultDurationDays;
    if (targetAudience !== undefined) updateData.target_audience = JSON.stringify(targetAudience);
    if (deliverables !== undefined) updateData.deliverables = JSON.stringify(deliverables);
    if (terms !== undefined) updateData.terms = terms;
    if (status !== undefined) updateData.status = status;

    const updated = await db
      .updateTable("campaign_templates" as any)
      .set(updateData)
      .where("id", "=", templateId)
      .where("is_deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    return res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update template error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Soft-delete a campaign template.
 * Admin only.
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required",
      });
    }

    const existing = await db
      .selectFrom("campaign_templates" as any)
      .selectAll()
      .where("id", "=", templateId)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    await db
      .updateTable("campaign_templates" as any)
      .set({ is_deleted: true, updated_at: new Date() })
      .where("id", "=", templateId)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete template error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
