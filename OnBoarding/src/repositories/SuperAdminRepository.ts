import { db } from "../database/kysely/databases.js";
import { SuperAdmin, SportsOrganization, NonAffiliateRequest, Affiliate, OTPVerification, SponsorshipTeam } from "../database/kysely/types.js";
import { NewSportsOrganization, NewInvitationCode, NewAuditLog, NewAffiliate, NewOTPVerification, NewSponsorshipTeam } from "../database/kysely/types.js";

export class SuperAdminRepository {
  /**
   * Find super admin by email
   */
  async findByEmail(email: string): Promise<SuperAdmin | undefined> {
    return await db
      .selectFrom("super_admin")
      .selectAll()
      .where("email", "=", email)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Check if organization exists by email
   */
  async findOrganizationByEmail(email: string): Promise<{ id: number } | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .select("id")
      .where("email", "=", email)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Check if organization exists by phone
   */
  async findOrganizationByPhone(phone: string): Promise<{ id: number } | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .select("id")
      .where("phone", "=", phone)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Create new organization
   */
  async createOrganization(data: NewSportsOrganization): Promise<SportsOrganization> {
    const result = await db
      .insertInto("sports_organizations")
      .values(data)
      .returningAll()
      .executeTakeFirst();
    
    if (!result) {
      throw new Error("Failed to create organization");
    }
    
    return result;
  }

  /**
   * Get all organizations with pagination and filters
   */
  async getAllOrganizations(params: {
    status?: string | undefined;
    page: number;
    limit: number;
    search?: string | undefined;
  }): Promise<{ organizations: SportsOrganization[]; total: number }> {
    let query = db
      .selectFrom("sports_organizations")
      .selectAll()
      .where("deleted", "=", false)
      .where("id", "!=", 1);

    if (params.status) {
      query = query.where("status", "=", params.status as any);
    }

    if (params.search) {
      query = query.where((eb: any) =>
        eb.or([
          eb("name", "ilike", `%${params.search}%`),
          eb("email", "ilike", `%${params.search}%`),
        ])
      );
    }

    const offset = (params.page - 1) * params.limit;
    const organizations = await query
      .orderBy("createdAt", "desc")
      .limit(params.limit)
      .offset(offset)
      .execute();

    const totalResult = await db
      .selectFrom("sports_organizations")
      .select((eb: any) => eb.fn.count("id").as("count"))
      .where("id", "!=", 1)
      .where("deleted", "=", false)
      .executeTakeFirst();

    const total = Number((totalResult as { count: string | number } | undefined)?.count || 0);

    return { organizations, total };
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: number): Promise<SportsOrganization | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Update organization status
   */
  async updateOrganizationStatus(
    id: number,
    status: "APPROVED" | "REJECTED" | "SUSPENDED"
  ): Promise<SportsOrganization> {
    const result = await db
      .updateTable("sports_organizations")
      .set({
        status,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Organization not found");
    }

    return result;
  }

  /**
   * Create audit log
   */
  async createAuditLog(data: NewAuditLog): Promise<void> {
    await db.insertInto("audit_logs").values(data).execute();
  }

  /**
   * Get non-affiliate requests with pagination
   */
  async getNonAffiliateRequests(params: {
  page: number;
  limit: number;
}): Promise<{ requests: Affiliate[]; total: number }> {
  const offset = (params.page - 1) * params.limit;

  // ---------------------------
  // FETCH REQUESTS
  // ---------------------------
  const requests = await db
    .selectFrom("affiliates")
    .innerJoin(
      "affiliate_organizations",
      "affiliate_organizations.affiliateId",
      "affiliates.id"
    )
    .selectAll("affiliates")
    .where("affiliate_organizations.organizationId", "=", 1) // ✅ non-affiliate
    .where("affiliate_organizations.deleted", "=", false)
    .where("affiliates.deleted", "=", false)
    .where("affiliates.status", "=", "VERIFIED")
    .orderBy("affiliates.createdAt", "desc")
    .limit(params.limit)
    .offset(offset)
    .execute();

  // ---------------------------
  // COUNT
  // ---------------------------
  const totalResult = await db
    .selectFrom("affiliates")
    .innerJoin(
      "affiliate_organizations",
      "affiliate_organizations.affiliateId",
      "affiliates.id"
    )
    .select((eb) => eb.fn.count("affiliates.id").as("count"))
    .where("affiliate_organizations.organizationId", "=", 1)
    .where("affiliate_organizations.deleted", "=", false)
    .where("affiliates.deleted", "=", false)
    .where("affiliates.status", "=", "VERIFIED")
    .executeTakeFirst();

  const total = Number(totalResult?.count ?? 0);

  return { requests, total };
}

  /**
   * Get non-affiliate request by ID
   */
  async getNonAffiliateRequestById(id: number): Promise<NonAffiliateRequest | undefined> {
    return await db
      .selectFrom("non_affiliate_requests")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Update non-affiliate request
   */
  async updateNonAffiliateRequest(
    id: number,
    data: {
      status: "APPROVED" | "REJECTED";
      reviewedBy: number;
      reviewedAt: Date;
      reviewComments?: string | undefined;
      invitationCodeId?: number | undefined;
    }
  ): Promise<NonAffiliateRequest> {
    const result = await db
      .updateTable("non_affiliate_requests")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Non-affiliate request not found");
    }

    return result;
  }



  /**
   * Get all affiliates with pagination and filters
   */
  async getAllAffiliates(params: {
    status?: string | undefined;
    role?: string | undefined;
    organizationId?: number | undefined;
    invitationStatus?: string | undefined;
    page: number;
    limit: number;
    search?: string | undefined;
    phone?: string | undefined;
  }): Promise<{ affiliates: any[]; total: number }> {
    let query = db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .leftJoin(
        "sports_organizations",
        "affiliate_organizations.organizationId",
        "sports_organizations.id"
      )
      .select([
        "affiliates.id",
        "affiliates.name",
        "affiliates.role",
        "affiliates.email",
        "affiliates.phone",
        "affiliates.dateOfBirth",
        "affiliates.gender",
        "affiliates.sportsCategoryId",
        "affiliates.position",
        "affiliates.invitationStatus",
        "affiliates.status",
        "affiliate_organizations.organizationId",
        "affiliates.createdAt",
        "affiliates.updatedAt",
        "sports_organizations.name as organizationName",
        "sports_organizations.displayName as displayName",
        "sports_organizations.email as organizationEmail",
      ])
      .where("affiliates.deleted", "=", false)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliate_organizations.organizationId", "!=", 1);

    if (params.status) {
      query = query.where("affiliates.status", "=", params.status as any);
    }

    if (params.role) {
      query = query.where("affiliates.role", "=", params.role as any);
    }

    if (params.organizationId) {
      query = query.where("affiliate_organizations.organizationId", "=", Number(params.organizationId));
    }

    if (params.invitationStatus) {
      query = query.where("affiliates.invitationStatus", "=", params.invitationStatus as any);
    }

    if (params.phone) {
      query = query.where("affiliates.phone", "ilike", `%${params.phone}%`);
    }

    if (params.search) {
      query = query.where((eb: any) =>
        eb.or([
          eb("affiliates.name", "ilike", `%${params.search}%`),
          eb("affiliates.email", "ilike", `%${params.search}%`),
          eb("affiliates.phone", "ilike", `%${params.search}%`),
          eb("sports_organizations.name", "ilike", `%${params.search}%`),
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
      .leftJoin(
        "sports_organizations",
        "affiliate_organizations.organizationId",
        "sports_organizations.id"
      )
      .select((eb: any) => eb.fn.count("affiliates.id").as("count"))
      .where("affiliate_organizations.organizationId", "!=", 1)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false);

    if (params.status) {
      countQuery = countQuery.where("affiliates.status", "=", params.status as any);
    }
    if (params.role) {
      countQuery = countQuery.where("affiliates.role", "=", params.role as any);
    }
    if (params.organizationId) {
      countQuery = countQuery.where("affiliate_organizations.organizationId", "=", Number(params.organizationId));
    }
    if (params.invitationStatus) {
      countQuery = countQuery.where("affiliates.invitationStatus", "=", params.invitationStatus as any);
    }
    if (params.phone) {
      countQuery = countQuery.where("affiliates.phone", "ilike", `%${params.phone}%`);
    }
    if (params.search) {
      countQuery = countQuery.where((eb: any) =>
        eb.or([
          eb("affiliates.name", "ilike", `%${params.search}%`),
          eb("affiliates.email", "ilike", `%${params.search}%`),
          eb("affiliates.phone", "ilike", `%${params.search}%`),
          eb("sports_organizations.name", "ilike", `%${params.search}%`),
        ])
      );
    }

    const totalResult = (await countQuery.executeTakeFirst()) as { count: string };
    const total = Number(totalResult?.count ?? 0);

    return { affiliates, total };
  }

  /**
   * Get non-affiliates (affiliates with organizationId = 1)
   */
  async getNonAffiliates(params: {
    page: number;
    limit: number;
  }): Promise<{ affiliates: Affiliate[]; total: number }> {
    const offset = (params.page - 1) * params.limit;

    const countResult = await db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .select(db.fn.count("affiliates.id").as("count"))
      .where("affiliate_organizations.organizationId", "=", 1)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false)
      .where("affiliates.status", "=", "VERIFIED")
      .where("affiliates.addedBy", "=", 1)
      .executeTakeFirst();

    const total = Number(countResult?.count ?? 0);

    const affiliates = await db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .selectAll("affiliates")
      .where("affiliate_organizations.organizationId", "=", 1)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false)
      .where("affiliates.status", "=", "VERIFIED")
      .where("affiliates.addedBy", "=", 1)
      .orderBy("affiliates.createdAt", "desc")
      .limit(params.limit)
      .offset(offset)
      .execute();

    return { affiliates, total };
  }

  /**
   * Get organization by ID for affiliate onboarding
   */
  async getOrganizationForAffiliateOnboarding(id: number): Promise<SportsOrganization | undefined> {
    return await db
      .selectFrom("sports_organizations")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .where("status", "=", "APPROVED")
      .where("isVerified", "=", true)
      .executeTakeFirst();
  }

  /**
   * Check if affiliate exists by phone in organization
   */
  async findAffiliateByPhoneInOrganization(
    phone: string,
    organizationId: number
  ): Promise<Affiliate | undefined> {
    return await db
      .selectFrom("affiliates")
      .innerJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .selectAll("affiliates")
      .where("affiliate_organizations.organizationId", "=", organizationId)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.phone", "=", phone)
      .where("affiliates.deleted", "=", false)
      .executeTakeFirst();
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
   * Get affiliate by ID with full details
   */
  async getAffiliateById(id: number): Promise<any> {
    return await db
      .selectFrom("affiliates as a")
      .leftJoin("affiliate_organizations", "a.id", "affiliate_organizations.affiliateId")
      .leftJoin("sports_organizations", "affiliate_organizations.organizationId", "sports_organizations.id")
      .leftJoin("sports_category", "a.sportsCategoryId", "sports_category.id")
      .leftJoin("affiliates_brands as ab", "ab.affiliateId", "a.id")
      .leftJoin("brands as b", "ab.brandId", "b.id")
      .select((eb) => [
        "a.id",
        "a.name",
        "a.email",
        "a.phone",
        "a.dateOfBirth",
        "a.gender",
        "a.position",
        "a.profilePicture",
        "a.coverPhoto",
        "a.bio",
        "a.achievements",
        "a.status",
        "a.createdAt",
        "a.followersRange",
        "a.geography",
        "a.experience",
        "a.coverPhoto",
        "a.height",
        "a.weight",
        "a.city",
        "sports_organizations.name as organizationName",
        "ab.brandId",
        "b.name as brandName",
        "b.logo_url as brandLogo",
        eb.ref("sports_category.title").as("sportsCategoryTitle"),
      ])
      .where("a.id", "=", id)
      .where("affiliate_organizations.deleted", "=", false)
      .where("a.deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Get affiliate related data (experience, awards, education, etc.)
   */
  async getAffiliateRelatedData(affiliateId: number): Promise<{
    experience: any[];
    awards: any[];
    education: any[];
    certificates: any[];
    publications: any[];
    campaignCollaborators: any[];
  }> {
    const [experience, awards, education, certificates, publications, campaignCollaborators] =
      await Promise.all([
        db
          .selectFrom("experience")
          .selectAll()
          .where("affiliateId", "=", affiliateId)
          .where("deleted", "=", false)
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
          .where("deleted", "=", false)
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
      experience,
      awards,
      education,
      certificates,
      publications,
      campaignCollaborators,
    };
  }

  /**
   * Delete affiliate (soft delete)
   */
  async deleteAffiliate(id: number): Promise<void> {
    await db
      .updateTable("affiliates")
      .set({ deleted: true })
      .where("id", "=", id)
      .where("deleted", "=", false)
      .execute();
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
   * Create invitation code
   */
  async createInvitationCode(data: NewInvitationCode): Promise<{ id: number; code: string }> {
    const result = await db
      .insertInto("invitation_codes")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create invitation code");
    }

    return { id: result.id, code: result.code };
  }

  /**
   * Get OTP verification record by email (using phone field to store email)
   */
  async getOTPVerificationByEmail(
    email: string,
    type: string
  ): Promise<OTPVerification | undefined> {
    return await db
      .selectFrom("otp_verification")
      .selectAll()
      .where("phone", "=", email)
      .where("type", "=", type as any)
      .executeTakeFirst();
  }

  /**
   * Create OTP verification record (using phone field to store email)
   */
  async createOTPVerification(data: NewOTPVerification): Promise<void> {
    await db.insertInto("otp_verification").values(data).execute();
  }

  /**
   * Delete OTP verification records by email and type
   */
  async deleteOTPVerificationByEmailAndType(email: string, type: string): Promise<void> {
    await db
      .deleteFrom("otp_verification")
      .where("phone", "=", email)
      .where("type", "=", type as any)
      .execute();
  }

  /**
   * Update OTP verification
   */
  async updateOTPVerification(
    id: number,
    data: { verified?: boolean; attempts?: number }
  ): Promise<void> {
    await db
      .updateTable("otp_verification")
      .set(data)
      .where("id", "=", id)
      .execute();
  }

  /**
   * Update OTP verification by email and type
   */
  async updateOTPVerificationByEmailAndType(
    email: string,
    type: string,
    data: { verified: boolean }
  ): Promise<void> {
    await db
      .updateTable("otp_verification")
      .set(data)
      .where("phone", "=", email)
      .where("type", "=", type as any)
      .execute();
  }

  /**
   * Check if sponsorship team member exists by email
   */
  async findSponsorshipTeamByEmail(email: string): Promise<{ id: number } | undefined> {
    return await db
      .selectFrom("sponsorship_team")
      .select("id")
      .where("email", "=", email)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }
async getAllSponsorshipTeam(
  page: number,
  limit: number
): Promise<{
  data: { id: number; name: string; email: string; active: boolean }[];
  total: number;
}> {
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db
      .selectFrom("sponsorship_team")
      .select(["id", "name", "email", "active"])
      .limit(limit)
      .offset(offset)
      .execute(),

    db
      .selectFrom("sponsorship_team")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    data,
    total: Number(countResult.count),
  };
}


  /**
   * Create new sponsorship team member
   */
  async createSponsorshipTeam(data: NewSponsorshipTeam): Promise<SponsorshipTeam> {
    const result = await db
      .insertInto("sponsorship_team")
      .values(data)
      .returningAll()
      .executeTakeFirst();
    
    if (!result) {
      throw new Error("Failed to create sponsorship team member");
    }
    
    return result;
  }
}

