import { db } from "../database/kysely/databases";
import { Database } from "../database/kysely/types";
import {
  Campaign,
  NewCampaign,
  CampaignUpdate,
  CampaignAffiliateRegistration,
  NewCampaignAffiliateRegistration,
  CampaignAffiliateRegistrationUpdate,
} from "../database/kysely/types";
import { CampaignQueryDto } from "../dtos/campaign.dto";
import { sql } from "kysely";

/**
 * Repository class for Campaign database operations
 * Handles all database queries related to campaigns
 */
export class CampaignRepository {
  /**
   * Apply campaign filters to a query builder
   */
  private applyCampaignFilters(
    query: any,
    filters: CampaignQueryDto
  ): any {
    const {
      sportsCategoryId,
      gender,
      dealType,
      active,
      geography,
      followersRange,
      ageRange,
    } = filters;

    if (sportsCategoryId) {
      query = query.where(
        "campaigns.id",
        "in",
        db
          .selectFrom("campaign_sports_categories")
          .select("campaignId")
          .where("sportsCategoryId", "=", Number(sportsCategoryId))
          .where("deleted", "=", false)
      );
    }

    if (gender) {
      query = query.where("campaigns.gender", "=", gender);
    }

    if (dealType) {
      query = query.where("campaigns.dealType", "=", dealType);
    }

    if (active !== undefined) {
      query = query.where("campaigns.active", "=", active);
    }

    if (geography) {
      query = query.where("campaigns.geography", "ilike", `%${geography}%`);
    }

    if (followersRange) {
      query = query.where(
        "campaigns.followersRange",
        "ilike",
        `%${followersRange}%`
      );
    }

    if (ageRange) {
      query = query.where("campaigns.ageRange", "ilike", `%${ageRange}%`);
    }

    return query;
  }
  /**
   * Check if brand exists
   */
  async findBrandById(brandId: number): Promise<boolean> {
    const brand = await db
      .selectFrom("brands")
      .select("id")
      .where("id", "=", brandId)
      .where("deleted", "=", false)
      .executeTakeFirst();

    return !!brand;
  }

  /**
   * Check if campaign exists by brandId and product
   */
  async findExistingCampaign(
    brandId: number,
    product: string
  ): Promise<Campaign | undefined> {
    return await db
      .selectFrom("campaigns")
      .selectAll()
      .where("brandId", "=", brandId)
      .where("product", "=", product)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Validate sports category IDs
   */
  async validateSportsCategoryIds(sportsIds: number[]): Promise<boolean> {
    if (sportsIds.length === 0) return true;

    const existingSports = await db
      .selectFrom("sports_category")
      .select("id")
      .where("id", "in", sportsIds)
      .where("deleted", "=", false)
      .execute();

    return existingSports.length === sportsIds.length;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    campaignData: Omit<NewCampaign, "id" | "createdAt" | "updatedAt" | "deleted" | "active">,
    sportsCategoryIds: number[]
  ): Promise<Campaign> {
    return await db.transaction().execute(async (trx) => {
      // Insert campaign
      const newCampaign = await trx
        .insertInto("campaigns")
        .values({
          ...campaignData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Insert sports categories
      if (sportsCategoryIds.length > 0) {
        await trx
          .insertInto("campaign_sports_categories")
          .values(
            sportsCategoryIds.map((id) => ({
              campaignId: newCampaign.id,
              sportsCategoryId: id,
              deleted: false,
              active: true,
            }))
          )
          .execute();
      }

      return newCampaign;
    });
  }

  /**
   * Find campaign by ID
   */
  async findCampaignById(campaignId: number): Promise<Campaign | undefined> {
    return await db
      .selectFrom("campaigns")
      .selectAll()
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: number,
    updateData: CampaignUpdate,
    sportsCategoryIds?: number[]
  ): Promise<Campaign> {
    return await db.transaction().execute(async (trx) => {
      // Update main campaign table
      const campaign = await trx
        .updateTable("campaigns")
        .set({ ...updateData, updatedAt: new Date() })
        .where("id", "=", campaignId)
        .returningAll()
        .executeTakeFirst();

      if (!campaign) {
        throw new Error("UPDATE_FAILED");
      }

      // Handle sports categories if provided
      if (sportsCategoryIds !== undefined) {
        // Delete existing pivot relations
        await trx
          .deleteFrom("campaign_sports_categories")
          .where("campaignId", "=", campaignId)
          .execute();

        // Insert new relations
        if (sportsCategoryIds.length > 0) {
          await trx
            .insertInto("campaign_sports_categories")
            .values(
              sportsCategoryIds.map((sid) => ({
                campaignId,
                sportsCategoryId: sid,
                deleted: false,
                active: true,
              }))
            )
            .execute();
        }
      }

      return campaign;
    });
  }

  /**
   * Soft delete campaign
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    await db
      .updateTable("campaigns")
      .set({
        deleted: true,
        active: false,
        updatedAt: new Date(),
      })
      .where("id", "=", campaignId)
      .execute();
  }

  /**
   * Get total campaigns count with optional filters
   */
  async getTotalCampaignsCount(filters?: CampaignQueryDto): Promise<number> {
    let query = db
      .selectFrom("campaigns")
      .select((eb) => eb.fn.count("campaigns.id").as("count"))
      .where("campaigns.deleted", "=", false);

    if (filters) {
      query = this.applyCampaignFilters(query, filters);
    }

    const result = await query.executeTakeFirst();

    return Number(result?.count ?? 0);
  }

  /**
   * Get paginated campaign IDs with optional filters
   */
  async getPaginatedCampaignIds(
    limit: number,
    offset: number,
    filters?: CampaignQueryDto
  ): Promise<number[]> {
    let query = db
      .selectFrom("campaigns")
      .select("campaigns.id")
      .where("campaigns.deleted", "=", false);

    if (filters) {
      query = this.applyCampaignFilters(query, filters);
    }

    const paginatedIds = await query
      .orderBy("campaigns.createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return paginatedIds.map((c) => c.id);
  }

  /**
   * Get campaigns with sports categories and brands by IDs
   */
  async getCampaignsWithDetails(ids: number[]): Promise<any[]> {
    return await db
      .selectFrom("campaigns")
      .leftJoin(
        "campaign_sports_categories",
        "campaign_sports_categories.campaignId",
        "campaigns.id"
      )
      .leftJoin(
        "sports_category",
        "sports_category.id",
        "campaign_sports_categories.sportsCategoryId"
      )
      .leftJoin("brands", "brands.id", "campaigns.brandId")
      .select([
        "campaigns.id",
        "campaigns.description",
        "campaigns.brandId",
        "campaigns.name",
        "campaigns.product",
        "campaigns.ageRange",
        "campaigns.gender",
        "campaigns.geography",
        "campaigns.followersRange",
        "campaigns.deliverables",
        "campaigns.budget",
        "campaigns.active",
        "campaigns.dealType",
        "campaigns.createdAt",
        "campaigns.updatedAt",
        "sports_category.id as categoryId",
        "sports_category.title as categoryTitle",
        "brands.name as brandName",
        "brands.logo_url as logo",
      ])
      .where("campaigns.id", "in", ids)
      .where("campaigns.deleted", "=", false)
      .orderBy("campaigns.createdAt", "desc")
      .execute();
  }

  /**
   * Get campaign by ID with all details
   */
  async getCampaignByIdWithDetails(campaignId: number): Promise<any[]> {
    return await db
      .selectFrom("campaigns")
      .leftJoin(
        "campaign_sports_categories",
        "campaign_sports_categories.campaignId",
        "campaigns.id"
      )
      .leftJoin(
        "sports_category",
        "sports_category.id",
        "campaign_sports_categories.sportsCategoryId"
      )
      .leftJoin("brands", "brands.id", "campaigns.brandId")
      .select([
        "campaigns.id",
        "campaigns.description",
        "campaigns.brandId",
        "campaigns.name",
        "campaigns.product",
        "campaigns.ageRange",
        "campaigns.gender",
        "campaigns.geography",
        "campaigns.followersRange",
        "campaigns.deliverables",
        "campaigns.budget",
        "campaigns.active",
        "campaigns.dealType",
        "campaigns.createdAt",
        "campaigns.updatedAt",
        "sports_category.id as categoryId",
        "sports_category.title as categoryTitle",
        "brands.name as brandName",
        "brands.logo_url as logo",
      ])
      .where("campaigns.id", "=", campaignId)
      .where("campaigns.deleted", "=", false)
      .execute();
  }

  /**
   * Get registered campaign IDs for an affiliate
   */
  async getRegisteredCampaignIds(affiliateId: number): Promise<number[]> {
    const registeredCampaignIds = await db
      .selectFrom("campaign_affiliate_registrations")
      .select("campaign_id")
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .execute();

    return registeredCampaignIds.map((r) => r.campaign_id);
  }

  /**
   * Get active campaigns with filters
   */
  async getActiveCampaignsWithDetails(
    excludedIds: number[],
    dealTypes: string[],
    limit: number,
    offset: number
  ): Promise<any[]> {
    let query = db
      .selectFrom("campaigns")
      .leftJoin(
        "campaign_sports_categories",
        "campaign_sports_categories.campaignId",
        "campaigns.id"
      )
      .leftJoin(
        "sports_category",
        "sports_category.id",
        "campaign_sports_categories.sportsCategoryId"
      )
      .leftJoin("brands", "brands.id", "campaigns.brandId")
      .select([
        "campaigns.id",
        "campaigns.description",
        "campaigns.brandId",
        "campaigns.name",
        "campaigns.product",
        "campaigns.ageRange",
        "campaigns.gender",
        "campaigns.geography",
        "campaigns.followersRange",
        "campaigns.deliverables",
        "campaigns.budget",
        "campaigns.active",
        "campaigns.dealType",
        "campaigns.createdAt",
        "campaigns.updatedAt",
        "sports_category.id as categoryId",
        "sports_category.title as categoryTitle",
        "brands.name as brandName",
        "brands.logo_url as logo",
      ])
      .where("campaigns.deleted", "=", false)
      .where("campaigns.active", "=", true)
      .limit(limit)
      .offset(offset);

    if (excludedIds.length > 0) {
      query = query.where("campaigns.id", "not in", excludedIds);
    }

    if (dealTypes.length > 0) {
      query = query.where("campaigns.dealType", "in", dealTypes as any);
    }

    return await query.execute();
  }

  /**
   * Get total active campaigns count
   */
  async getTotalActiveCampaignsCount(
    excludedIds: number[],
    dealTypes: string[]
  ): Promise<number> {
    let baseQuery = db
      .selectFrom("campaigns")
      .where("campaigns.deleted", "=", false)
      .where("campaigns.active", "=", true);

    if (excludedIds.length > 0) {
      baseQuery = baseQuery.where("campaigns.id", "not in", excludedIds);
    }

    if (dealTypes.length > 0) {
      baseQuery = baseQuery.where("campaigns.dealType", "in", dealTypes as any);
    }

    const totalResult = await baseQuery
      .select((eb) => eb.fn.count("campaigns.id").as("total"))
      .executeTakeFirst();

    return Number(totalResult?.total ?? 0);
  }

  /**
   * Toggle campaign active status
   */
  async toggleCampaignActive(campaignId: number): Promise<Campaign> {
    const existingCampaign = await this.findCampaignById(campaignId);
    if (!existingCampaign) {
      throw new Error("CAMPAIGN_NOT_FOUND");
    }

    const isActive = !existingCampaign.active;

    const updated = await db
      .updateTable("campaigns")
      .set({ active: isActive })
      .where("id", "=", campaignId)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }
}

