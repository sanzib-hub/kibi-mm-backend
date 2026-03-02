import { db } from "../database/kysely/databases";
import {
  SportsCategory,
  NewSportsCategory,
  SportsCategoryUpdate,
} from "../database/kysely/types";
import { sql } from "kysely";

/**
 * Repository class for Sports Category database operations
 */
export class SportsCategoryRepository {
  /**
   * Find sports category by title
   */
  async findCategoryByTitle(title: string): Promise<SportsCategory[]> {
    return await db
      .selectFrom("sports_category")
      .selectAll()
      .where("title", "=", title)
      .where("deleted", "=", false)
      .where("status", "=", "ACTIVE")
      .execute();
  }

  /**
   * Find sports category by ID
   */
  async findCategoryById(id: number): Promise<SportsCategory | undefined> {
    return await db
      .selectFrom("sports_category")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Get all active sports categories
   */
  async getAllActiveCategories(): Promise<SportsCategory[]> {
    return await db
      .selectFrom("sports_category")
      .selectAll()
      .where("deleted", "=", false)
      .where("status", "=", "ACTIVE")
      .execute();
  }

  /**
   * Get all sports categories with filters and pagination
   */
  async getCategoriesWithFilters(
    filters: {
      status?: string;
      title?: string;
      id?: number;
    },
    limit: number,
    offset: number
  ): Promise<SportsCategory[]> {
    let query = db
      .selectFrom("sports_category")
      .selectAll()
      .where("deleted", "=", false);

    if (filters.status) {
      query = query.where(
        "status",
        "=",
        String(filters.status).toUpperCase()
      );
    }

    if (filters.title) {
      query = query.where("title", "ilike", `%${filters.title}%`);
    }

    if (filters.id) {
      query = query.where("id", "=", filters.id);
    }

    return await query.limit(limit).offset(offset).execute();
  }

  /**
   * Get total categories count with optional filters
   */
  async getTotalCategoriesCount(filters?: {
    status?: string;
    title?: string;
    id?: number;
  }): Promise<number> {
    let query = db
      .selectFrom("sports_category")
      .select((eb) => eb.fn.count("sports_category.id").as("count"))
      .where("sports_category.deleted", "=", false);

    if (filters) {
      if (filters.status) {
        query = query.where(
          "status",
          "=",
          String(filters.status).toUpperCase()
        );
      }

      if (filters.title) {
        query = query.where("title", "ilike", `%${filters.title}%`);
      }

      if (filters.id) {
        query = query.where("id", "=", filters.id);
      }
    }

    const countResult = await query.executeTakeFirst();

    return Number(countResult?.count ?? 0);
  }

  /**
   * Create sports category
   */
  async createCategory(data: NewSportsCategory): Promise<SportsCategory> {
    return await db
      .insertInto("sports_category")
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Update sports category
   */
  async updateCategory(
    id: number,
    data: SportsCategoryUpdate
  ): Promise<SportsCategory> {
    const updated = await db
      .updateTable("sports_category")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }

  /**
   * Soft delete sports category
   */
  async deleteCategory(id: number): Promise<SportsCategory> {
    const deleted = await db
      .updateTable("sports_category")
      .set({
        deleted: true,
        status: "INACTIVE",
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!deleted) {
      throw new Error("DELETE_FAILED");
    }

    return deleted;
  }
}

