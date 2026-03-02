import { db } from "../database/kysely/databases";
import { BrandsTable } from "../database/kysely/types";
import { Selectable } from "kysely";

export type Brand = Selectable<BrandsTable>;

/**
 * Repository class for Brand database operations
 */
export class BrandRepository {
  /**
   * Find brand by name
   */
  async findBrandByName(name: string): Promise<Brand | undefined> {
    return await db
      .selectFrom("brands")
      .selectAll()
      .where("name", "=", name)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Find brand by ID
   */
  async findBrandById(brandId: number): Promise<Brand | undefined> {
    return await db
      .selectFrom("brands")
      .selectAll()
      .where("id", "=", brandId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Create a new brand
   */
  async createBrand(data: { name: string; logo_url: string }): Promise<Brand> {
    return await db
      .insertInto("brands")
      .values({
        name: data.name,
        logo_url: data.logo_url,
        deleted: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Get all brands
   */
  async getAllBrands(): Promise<Brand[]> {
    return await db
      .selectFrom("brands")
      .selectAll()
      .where("deleted", "=", false)
      .execute();
  }

  /**
   * Update brand
   */
  async updateBrand(
    brandId: number,
    data: { name?: string; logo_url?: string | null }
  ): Promise<Brand> {
    const updated = await db
      .updateTable("brands")
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where("id", "=", brandId)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }

  /**
   * Delete brand (soft delete)
   */
  async deleteBrand(brandId: number): Promise<void> {
    await db
      .updateTable("brands")
      .set({
        deleted: true,
        updated_at: new Date(),
      })
      .where("id", "=", brandId)
      .where("deleted", "=", false)
      .execute();
  }
}

