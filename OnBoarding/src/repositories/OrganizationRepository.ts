import { db } from "../database/kysely/databases.js";
import {
  SportsOrganization,
  Affiliate,
  InvitationCode,
  NewAffiliate,
  NewInvitationCode,
  NewAuditLog,
  SportsCategory,
} from "../database/kysely/types.js";
import type { Transaction } from "kysely";




export class OrganizationRepository {

  async runInTransaction<T>(
  callback: (trx: Transaction<any>) => Promise<T>
): Promise<T> {
  return await db.transaction().execute(callback);
}
  /**
   * Find organization by email
   */
 async findByEmail(email: string): Promise<SportsOrganization | undefined> {
  return await db
    .selectFrom("sports_organizations")
    .selectAll()
    .where("email", "=", email)
    .where("deleted", "=", false)
    .executeTakeFirst();
}


  /**
   * Get organization by ID
   */
  async findById(id: number): Promise<SportsOrganization | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Get organization name by ID
   */
  async getNameById(id: number): Promise<{ name: string } | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .select("name")
      .where("id", "=", id)
      .executeTakeFirst();
  }

  /**
   * Update organization
   */
  async update(id: number, data: Partial<SportsOrganization>): Promise<SportsOrganization> {
    const result = await db
      .updateTable("sports_organizations")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Organization not found");
    }

    return result;
  }

  /**
   * Check if phone exists in another organization
   */
  async findOrganizationByPhoneExcludingId(
    phone: string,
    excludeId: number
  ): Promise<{ id: number } | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .select("id")
      .where("phone", "=", phone)
      .where("deleted", "=", false)
      .where("id", "!=", excludeId)
      .executeTakeFirst();
  }

  /**
   * Check if email exists in another organization
   */
 async findOrganizationByEmailExcludingId(
  email: string,
  excludeId: number
): Promise<{ id: number } | undefined> {
  return await db
    .selectFrom("sports_organizations")
    .select("id")
    .where("email", "=", email)
    .where("deleted", "=", false)
    .where("id", "!=", excludeId)
    .executeTakeFirst();
}


  /**
   * Check if sports category exists and is active
   */
  async isValidSportsCategory(id: number): Promise<boolean> {
    const row = await db
      .selectFrom("sports_category")
      .select(["id"])
      .where("id", "=", Number(id))
      .where("deleted", "=", false)
      .where("status", "=", "ACTIVE")
      .executeTakeFirst();

    return !!row;
  }

  /**
   * Check if affiliate exists by phone or email in organization
   */
async findAffiliateByPhoneOrEmail(
  organizationId: number,
  phone: string,
  email?: string
): Promise<{
  id: number;
  phone: string;
  email: string | undefined; // ✅ FIX
  invitationStatus: string;
  status: string;
} | undefined> {
  let query = db
    .selectFrom("affiliates")
    .innerJoin(
      "affiliate_organizations",
      "affiliates.id",
      "affiliate_organizations.affiliateId"
    )
    .select([
      "affiliates.id",
      "affiliates.phone",
      "affiliates.email",
      "affiliates.invitationStatus",
      "affiliates.status",
    ])
    .where("affiliate_organizations.organizationId", "=", organizationId)
    .where("affiliate_organizations.deleted", "=", false)
    .where("affiliates.deleted", "=", false)
    .where((eb) => {
      if (email) {
        return eb.or([
          eb("affiliates.phone", "=", phone),
          eb("affiliates.email", "=", email),
        ]);
      }
      return eb("affiliates.phone", "=", phone);
    });

  return await query.executeTakeFirst();
}


async deactivateInvitationCodes(affiliateId: number) {
  await db
    .updateTable("invitation_codes")
    .set({ status: "REVOKED" })
    .where("metadata", "like", `%\"affiliateId\":${affiliateId}%`)
    .where("status", "=", "ACTIVE")
    .execute();
}



async updateAffiliate(
  affiliateId: number,
  data: Partial<Affiliate>
) {
  return await db
    .updateTable("affiliates")
    .set(data)
    .where("id", "=", affiliateId)
    .execute();
}


  /**
   * Create affiliate and organization mapping
   */
  async createAffiliate(data: NewAffiliate, organizationId: number): Promise<Affiliate> {
    const result = await db
      .insertInto("affiliates")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create affiliate");
    }

    // Create mapping entry
    await db
      .insertInto("affiliate_organizations")
      .values({
        affiliateId: result.id,
        organizationId: organizationId,
        deleted: false,
        createdAt: new Date(),
      })
      .execute();

    return result;
  }

  /**
   * Create invitation code
   */
  async createInvitationCode(data: NewInvitationCode): Promise<void> {
    await db.insertInto("invitation_codes").values(data).execute();
  }

  /**
   * Update affiliate invitation status
   */
  async updateAffiliateInvitationStatus(
    affiliateId: number,
    status: "SENT" | "PENDING"
  ): Promise<void> {
    await db
      .updateTable("affiliates")
      .set({ invitationStatus: status })
      .where("id", "=", affiliateId)
      .execute();
  }

  /**
   * Create audit log
   */
  async createAuditLog(data: NewAuditLog): Promise<void> {
    await db.insertInto("audit_logs").values(data).execute();
  }

  /**
   * Get affiliates with pagination and filters
   */
  async getAffiliates(params: {
    organizationId: number;
    status?: string;
    role?: string;
    invitationStatus?: string;
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ affiliates: Affiliate[]; total: number }> {
    let query = db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .selectAll("affiliates")
      .where("affiliate_organizations.organizationId", "=", params.organizationId)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false);

    if (params.status) {
      query = query.where("affiliates.status", "=", params.status as any);
    }

    if (params.role) {
      query = query.where("affiliates.role", "=", params.role as any);
    }

    if (params.invitationStatus) {
      query = query.where("affiliates.invitationStatus", "=", params.invitationStatus as any);
    }

    if (params.search) {
      query = query.where((eb) =>
        eb.or([
          eb("affiliates.name", "ilike", `%${params.search}%`),
          eb("affiliates.phone", "ilike", `%${params.search}%`),
          eb("affiliates.email", "ilike", `%${params.search}%`),
        ])
      );
    }

    const offset = (params.page - 1) * params.limit;
    const affiliates = await query
      .orderBy("affiliates.createdAt", "desc")
      .limit(params.limit)
      .offset(offset)
      .execute();

    let countQuery = db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .select((eb) => eb.fn.count("affiliates.id").as("count"))
      .where("affiliate_organizations.organizationId", "=", params.organizationId)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false);

    if (params.status) {
      countQuery = countQuery.where("affiliates.status", "=", params.status as any);
    }

    if (params.role) {
      countQuery = countQuery.where("affiliates.role", "=", params.role as any);
    }

    if (params.invitationStatus) {
      countQuery = countQuery.where("affiliates.invitationStatus", "=", params.invitationStatus as any);
    }

    if (params.search) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("affiliates.name", "ilike", `%${params.search}%`),
          eb("affiliates.phone", "ilike", `%${params.search}%`),
          eb("affiliates.email", "ilike", `%${params.search}%`),
        ])
      );
    }

    const total = await countQuery.executeTakeFirst();

    return {
      affiliates,
      total: Number(total?.count || 0),
    };
  }

  /**
   * Get affiliate by ID and organization ID
   */
  async getAffiliateByIdAndOrganization(
    id: number,
    organizationId: number
  ): Promise<Affiliate | undefined> {
    return await db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .selectAll("affiliates")
      .where("affiliates.id", "=", Number(id))
      .where("affiliate_organizations.organizationId", "=", organizationId)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Update affiliate invitation code
   */
  async updateAffiliateInvitationCode(
    id: number,
    invitationCode: string,
    invitationStatus: "PENDING"
  ): Promise<void> {
    await db
      .updateTable("affiliates")
      .set({
        invitationCode,
        invitationStatus,
        updatedAt: new Date(),
      })
      .where("id", "=", Number(id))
      .execute();
  }

  /**
   * Update invitation code status to EXPIRED
   */
  async expireInvitationCode(code: string): Promise<void> {
    await db
      .updateTable("invitation_codes")
      .set({ status: "EXPIRED" })
      .where("code", "=", code)
      .execute();
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(organizationId: number): Promise<{
    totalAffiliates: number;
    activeAffiliates: number;
    pendingInvitations: number;
    recentAffiliates: number;
  }> {
    const stats = await Promise.all([
      db
        .selectFrom("affiliates")
        .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
        .select((eb) => eb.fn.count("affiliates.id").as("count"))
        .where("affiliate_organizations.organizationId", "=", organizationId)
        .where("affiliate_organizations.deleted", "=", false)
        .where("affiliates.deleted", "=", false)
        .executeTakeFirst(),

      db
        .selectFrom("affiliates")
        .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
        .select((eb) => eb.fn.count("affiliates.id").as("count"))
        .where("affiliate_organizations.organizationId", "=", organizationId)
        .where("affiliates.status", "=", "VERIFIED")
        .where("affiliate_organizations.deleted", "=", false)
        .where("affiliates.deleted", "=", false)
        .executeTakeFirst(),

      db
        .selectFrom("affiliates")
        .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
        .select((eb) => eb.fn.count("affiliates.id").as("count"))
        .where("affiliate_organizations.organizationId", "=", organizationId)
        .where("affiliates.invitationStatus", "in", ["PENDING", "SENT"])
        .where("affiliate_organizations.deleted", "=", false)
        .where("affiliates.deleted", "=", false)
        .executeTakeFirst(),

      db
        .selectFrom("affiliates")
        .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
        .select((eb) => eb.fn.count("affiliates.id").as("count"))
        .where("affiliate_organizations.organizationId", "=", organizationId)
        .where("affiliates.createdAt", ">=", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .where("affiliate_organizations.deleted", "=", false)
        .where("affiliates.deleted", "=", false)
        .executeTakeFirst(),
    ]);

    return {
      totalAffiliates: Number(stats[0]?.count || 0),
      activeAffiliates: Number(stats[1]?.count || 0),
      pendingInvitations: Number(stats[2]?.count || 0),
      recentAffiliates: Number(stats[3]?.count || 0),
    };
  }

  /**
   * Update affiliate status
   */
  async updateAffiliateStatus(
    id: number,
    status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED"
  ): Promise<Affiliate> {
    const result = await db
      .updateTable("affiliates")
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where("id", "=", Number(id))
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Affiliate not found");
    }

    return result;
  }

  /**
   * Delete affiliate (soft delete mapping)
   */
  async deleteAffiliate(id: number, organizationId: number): Promise<void> {
    await db
      .updateTable("affiliate_organizations")
      .set({ deleted: true })
      .where("affiliateId", "=", Number(id))
      .where("organizationId", "=", Number(organizationId))
      .where("deleted", "=", false)
      .execute();
  }

  /**
   * Get affiliate full profile for organization
   */
 async getAffiliateFullProfile(affiliateId: number, organizationId: number): Promise<any> {
  const affiliate = await db
    .selectFrom("affiliates")
    .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
    .leftJoin(
      "sports_organizations",
      "affiliate_organizations.organizationId",
      "sports_organizations.id"
    )
    .leftJoin(
      "sports_category",
      "affiliates.sportsCategoryId",
      "sports_category.id"
    )
    .select((eb) => [
      "affiliates.id",
      "affiliates.name",
      "affiliates.email",
      "affiliates.phone",
      "affiliates.dateOfBirth",
      "affiliates.gender",
      "affiliates.position",
      "affiliates.profilePicture",
      "affiliates.coverPhoto",
      "affiliates.bio",
      "affiliates.achievements",
      "affiliates.status",
      "affiliates.createdAt",
      "affiliates.followersRange",
      "affiliates.geography",
      "affiliates.height",
      "affiliates.weight",
      "affiliates.city",
      eb.ref("sports_organizations.name").as("organizationName"),
      eb.ref("sports_category.title").as("sportsCategoryTitle"),
    ])
    .where("affiliates.id", "=", affiliateId)
    .where("affiliate_organizations.organizationId", "=", organizationId)
    .where("affiliate_organizations.deleted", "=", false)
    .where("affiliates.deleted", "=", false)
    .executeTakeFirst();

  if (!affiliate) {
    return null;
  }

  const [experience, awards, education, certificates, publications, campaignCollaborators] =
    await Promise.all([
      db
        .selectFrom("experience")
        .selectAll()
        .where("affiliateId", "=", affiliateId)
        .orderBy("fromDate", "desc")
        .execute(),
      db
        .selectFrom("affiliate_award_recognitions")
        .selectAll()
        .where("affiliateId", "=", affiliateId)
        .execute(),
      db
        .selectFrom("education")
        .selectAll()
        .where("affiliateId", "=", affiliateId)
        .execute(),
      db
        .selectFrom("affiliate_certificates")
        .selectAll()
        .where("affiliateId", "=", affiliateId)
        .execute(),
      db
        .selectFrom("affiliate_publications")
        .selectAll()
        .where("affiliateId", "=", affiliateId)
        .execute(),
      db
        .selectFrom("campaign_collaborator")
        .selectAll()
        .where("affiliate_id", "=", affiliateId)
        .execute(),
    ]);

  return {
    ...affiliate,
    experience,
    awards,
    education,
    certificates,
    publications,
    campaignCollaborators,
  };
}
}

