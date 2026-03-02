import { db } from "../database/kysely/databases";
import { SponsorshipTeam, AffiliatesTable } from "../database/kysely/types";
import { sql } from "kysely";

type AffiliateRole = AffiliatesTable["role"];

/**
 * Repository class for Sponsorship Team database operations
 * Handles all database queries related to sponsorship team
 */
export class SponsorshipRepository {
  /**
   * Find sponsorship team member by email
   */
  async findByEmail(email: string): Promise<SponsorshipTeam | undefined> {
    return await db
      .selectFrom("sponsorship_team")
      .selectAll()
      .where("email", "=", email)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Find sponsorship team member by ID
   */
  async findById(id: number): Promise<SponsorshipTeam | undefined> {
    return await db
      .selectFrom("sponsorship_team")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Get all affiliates with optional filters and pagination
   */
  async getAffiliates(
    limit: number,
    offset: number,
    filters?: {
      status?: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
      role?: AffiliateRole;
      sportsCategoryId?: number;
      gender?: "MALE" | "FEMALE" | "OTHER";
      search?: string;
    }
  ): Promise<any[]> {
    let query = db
      .selectFrom("affiliates")
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef("affiliate_organizations.affiliateId", "=", "affiliates.id")
            .on("affiliate_organizations.deleted", "=", false)
      )
      .leftJoin("sports_category", "sports_category.id", "affiliates.sportsCategoryId")
      .where("affiliates.deleted", "=", false);

    // Apply filters
    if (filters?.status) {
      query = query.where("affiliates.status", "=", filters.status);
    }

    if (filters?.role) {
      query = query.where("affiliates.role", "=", filters.role);
    }

    if (filters?.sportsCategoryId) {
      query = query.where("affiliates.sportsCategoryId", "=", filters.sportsCategoryId);
    }

    if (filters?.gender) {
      query = query.where("affiliates.gender", "=", filters.gender);
    }

    if (filters?.search) {
      query = query.where((eb) =>
        eb.or([
          eb("affiliates.name", "ilike", `%${filters.search}%`),
          eb("affiliates.email", "ilike", `%${filters.search}%`),
          eb("affiliates.phone", "ilike", `%${filters.search}%`),
        ])
      );
    }

    return await query
      .select([
        "affiliates.id",
        "affiliates.name",
        "affiliates.role",
        "affiliates.email",
        "affiliates.phone",
        "affiliates.gender",
        "affiliates.dateOfBirth",
        "affiliates.sportsCategoryId",
        "affiliates.position",
        "affiliates.profilePicture",
        "affiliates.bio",
        "affiliates.achievements",
        "affiliates.status",
        "affiliates.geography",
        "affiliates.followersRange",
        "affiliates.profile_slug",
        "affiliates.createdAt",
        "affiliates.updatedAt",
        "affiliate_organizations.organizationId as organizationId",
        "sports_category.title as sportsCategoryTitle",
      ])
      .orderBy("affiliates.createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Get total count of affiliates with optional filters
   */
  async getAffiliatesCount(filters?: {
    status?: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
    role?: AffiliateRole;
    sportsCategoryId?: number;
    gender?: "MALE" | "FEMALE" | "OTHER";
    search?: string;
  }): Promise<number> {
    let query = db
      .selectFrom("affiliates")
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef("affiliate_organizations.affiliateId", "=", "affiliates.id")
            .on("affiliate_organizations.deleted", "=", false)
      )
      .where("affiliates.deleted", "=", false);

    // Apply filters
    if (filters?.status) {
      query = query.where("affiliates.status", "=", filters.status);
    }

    if (filters?.role) {
      query = query.where("affiliates.role", "=", filters.role);
    }

    if (filters?.sportsCategoryId) {
      query = query.where("affiliates.sportsCategoryId", "=", filters.sportsCategoryId);
    }

    if (filters?.gender) {
      query = query.where("affiliates.gender", "=", filters.gender);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where((eb) =>
        eb.or([
          eb("affiliates.name", "ilike", searchTerm),
          eb("affiliates.email", "ilike", searchTerm),
          eb("affiliates.phone", "ilike", searchTerm),
        ])
      );
    }

    const result = await query
      .select((eb) => eb.fn.count<number>("affiliates.id").as("count"))
      .executeTakeFirst();

    return result?.count ?? 0;
  }
}

