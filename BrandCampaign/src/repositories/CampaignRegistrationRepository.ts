import { db } from "../database/kysely/databases";
import {
  CampaignAffiliateRegistration,
  NewCampaignAffiliateRegistration,
  CampaignAffiliateRegistrationUpdate,
  CampaignRegistrationStatus,
} from "../database/kysely/types";

/**
 * Repository class for Campaign Registration database operations
 */
export class CampaignRegistrationRepository {
  /**
   * Find campaign with brand details
   */
  async findCampaignWithBrand(campaignId: number): Promise<any | undefined> {
    return await db
      .selectFrom("campaigns")
      .leftJoin("brands", "brands.id", "campaigns.brandId")
      .select([
        "campaigns.id as campaignId",
        "campaigns.active as active",
        "brands.name as brandName",
        "brands.logo_url as logo",
        "campaigns.ageRange",
        "campaigns.gender",
        "campaigns.geography",
        "campaigns.followersRange",
      ])
      .where("campaigns.id", "=", campaignId)
      .where("campaigns.deleted", "=", false)
      .where("campaigns.active", "=", true)
      .executeTakeFirst();
  }

  /**
   * Find affiliate by ID (includes organizationId from join table)
   */
  async findAffiliateById(affiliateId: number): Promise<any | undefined> {
    return await db
      .selectFrom("affiliates")
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef("affiliate_organizations.affiliateId", "=", "affiliates.id")
            .on("affiliate_organizations.deleted", "=", false)
      )
      .leftJoin(
        "instagram_accounts",
        (join) =>
          join
            .onRef("instagram_accounts.affiliateId", "=", "affiliates.id")
            .on("instagram_accounts.deleted", "=", false)
      )
      .selectAll("affiliates")
      .select("affiliate_organizations.organizationId as organizationId")
      .select("instagram_accounts.id as instagramAccountId")
      .select("instagram_accounts.igId as instagramIgId")
      .select("instagram_accounts.username as instagramUsername")
      .select("instagram_accounts.followersCount as instagramFollowersCount")
      .where("affiliates.id", "=", affiliateId)
      .where("affiliates.deleted", "=", false)
      .where("affiliates.status", "=", "VERIFIED")
      .executeTakeFirst();
  }

  /**
   * Find existing registration
   */
  async findExistingRegistration(
    campaignId: number,
    affiliateId: number
  ): Promise<CampaignAffiliateRegistration | undefined> {
    return await db
      .selectFrom("campaign_affiliate_registrations")
      .selectAll()
      .where("campaign_id", "=", campaignId)
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Create registration
   */
  async createRegistration(
    registrationData: NewCampaignAffiliateRegistration
  ): Promise<CampaignAffiliateRegistration> {
    return await db
      .insertInto("campaign_affiliate_registrations")
      .values({
        ...registrationData,
        registrationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Get campaign registrations with filters (includes organizationId from join table)
   */
  async getCampaignRegistrations(
    campaignId: number,
    filters: {
      status?: CampaignRegistrationStatus;
      affiliate_id?: number;
      organizationId?: number;
    },
    limit: number,
    offset: number
  ): Promise<any[]> {
    // Step 1: Get campaign registrations with pagination
    let query = db
      .selectFrom("campaign_affiliate_registrations")
      .innerJoin(
        "affiliates",
        "affiliates.id",
        "campaign_affiliate_registrations.affiliate_id"
      )
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef("affiliate_organizations.affiliateId", "=", "affiliates.id")
            .on("affiliate_organizations.deleted", "=", false)
      )
      .innerJoin(
        "campaigns",
        "campaigns.id",
        "campaign_affiliate_registrations.campaign_id"
      )
      .leftJoin("brands as b", "b.id", "campaigns.brandId")
      .select([
        "campaign_affiliate_registrations.id",
        "campaign_affiliate_registrations.campaign_id",
        "campaign_affiliate_registrations.affiliate_id",
        "campaign_affiliate_registrations.status",
        "campaign_affiliate_registrations.additionalData",
        "campaign_affiliate_registrations.registrationDate",
        "campaign_affiliate_registrations.createdAt",
        "campaign_affiliate_registrations.updatedAt",
        "affiliates.name as affiliateName",
        "affiliates.email as affiliateEmail",
        "affiliates.role as affiliateRole",
        "affiliates.phone as affiliatePhone",
        "affiliates.profile_slug as profileSlug",
        "affiliates.sportsCategoryId as affiliateSportsCategoryId",
        "affiliate_organizations.organizationId as organizationId",
        "b.name as brandName",
        "b.logo_url as logo",
      ])
      .where(
        "campaign_affiliate_registrations.campaign_id",
        "=",
        campaignId
      )
      .where("campaign_affiliate_registrations.deleted", "=", false);

    if (filters.status) {
      query = query.where(
        "campaign_affiliate_registrations.status",
        "=",
        filters.status
      );
    }
    if (filters.affiliate_id) {
      query = query.where(
        "campaign_affiliate_registrations.affiliate_id",
        "=",
        filters.affiliate_id
      );
    }
    if (filters.organizationId) {
      query = query.where(
        "affiliate_organizations.organizationId",
        "=",
        filters.organizationId
      );
    }

    const registrations = await query
      .orderBy("campaign_affiliate_registrations.registrationDate", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    // Step 2: Extract unique affiliate IDs
    const affiliateIds = registrations.map((r) => r.affiliate_id);

    if (affiliateIds.length === 0) {
      return registrations;
    }

    // Step 3: Fetch all affiliate-related data in parallel
    const [experience, awards, education, certificates, publications, collaborators] =
      await Promise.all([
        db
          .selectFrom("experience")
          .selectAll()
          .where("affiliateId", "in", affiliateIds)
          .orderBy("fromDate", "desc")
          .execute(),
        db
          .selectFrom("affiliate_award_recognitions")
          .selectAll()
          .where("affiliateId", "in", affiliateIds)
          .execute(),
        db
          .selectFrom("education")
          .selectAll()
          .where("affiliateId", "in", affiliateIds)
          .execute(),
        db
          .selectFrom("affiliate_certificates")
          .selectAll()
          .where("affiliateId", "in", affiliateIds)
          .execute(),
        db
          .selectFrom("affiliate_publications")
          .selectAll()
          .where("affiliateId", "in", affiliateIds)
          .execute(),
        db
          .selectFrom("campaign_collaborator")
          .selectAll()
          .where("affiliate_id", "in", affiliateIds)
          .execute(),
      ]);

    // Step 4: Group related data by affiliateId for efficient lookup
    const experienceMap = new Map<number, typeof experience>();
    const awardsMap = new Map<number, typeof awards>();
    const educationMap = new Map<number, typeof education>();
    const certificatesMap = new Map<number, typeof certificates>();
    const publicationsMap = new Map<number, typeof publications>();
    const collaboratorsMap = new Map<number, typeof collaborators>();

    experience.forEach((item) => {
      if (!experienceMap.has(item.affiliateId)) {
        experienceMap.set(item.affiliateId, []);
      }
      experienceMap.get(item.affiliateId)!.push(item);
    });

    awards.forEach((item) => {
      if (!awardsMap.has(item.affiliateId)) {
        awardsMap.set(item.affiliateId, []);
      }
      awardsMap.get(item.affiliateId)!.push(item);
    });

    education.forEach((item) => {
      if (!educationMap.has(item.affiliateId)) {
        educationMap.set(item.affiliateId, []);
      }
      educationMap.get(item.affiliateId)!.push(item);
    });

    certificates.forEach((item) => {
      if (!certificatesMap.has(item.affiliateId)) {
        certificatesMap.set(item.affiliateId, []);
      }
      certificatesMap.get(item.affiliateId)!.push(item);
    });

    publications.forEach((item) => {
      if (!publicationsMap.has(item.affiliateId)) {
        publicationsMap.set(item.affiliateId, []);
      }
      publicationsMap.get(item.affiliateId)!.push(item);
    });

    collaborators.forEach((item) => {
      if (!collaboratorsMap.has(item.affiliate_id)) {
        collaboratorsMap.set(item.affiliate_id, []);
      }
      collaboratorsMap.get(item.affiliate_id)!.push(item);
    });

    // Step 5: Enrich registrations with affiliate details
    return registrations.map((registration) => ({
      ...registration,
      affiliateExperience: experienceMap.get(registration.affiliate_id) || [],
      affiliateEducation: educationMap.get(registration.affiliate_id) || [],
      affiliateCollborators: collaboratorsMap.get(registration.affiliate_id) || [],
      affiliatePublications: publicationsMap.get(registration.affiliate_id) || [],
      affiliateCertificates: certificatesMap.get(registration.affiliate_id) || [],
      affiliateAwardss: awardsMap.get(registration.affiliate_id) || [],
    }));
  }

  /**
   * Get total registrations count (supports filtering by organizationId)
   */
  async getTotalRegistrationsCount(
    campaignId: number,
    filters: {
      status?: CampaignRegistrationStatus;
      affiliate_id?: number;
      organizationId?: number;
    }
  ): Promise<number> {
    let query = db
      .selectFrom("campaign_affiliate_registrations")
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef(
              "affiliate_organizations.affiliateId",
              "=",
              "campaign_affiliate_registrations.affiliate_id"
            )
            .on("affiliate_organizations.deleted", "=", false)
      )
      .select(db.fn.count<number>("campaign_affiliate_registrations.id").as("count"))
      .where("campaign_affiliate_registrations.campaign_id", "=", campaignId)
      .where("campaign_affiliate_registrations.deleted", "=", false);

    if (filters.status) {
      query = query.where(
        "campaign_affiliate_registrations.status",
        "=",
        filters.status
      );
    }

    if (filters.affiliate_id) {
      query = query.where(
        "campaign_affiliate_registrations.affiliate_id",
        "=",
        filters.affiliate_id
      );
    }

    if (filters.organizationId) {
      query = query.where(
        "affiliate_organizations.organizationId",
        "=",
        filters.organizationId
      );
    }

    const result = await query.executeTakeFirst();
    return Number(result?.count || 0);
  }

  /**
   * Update registration
   */
  async updateRegistration(
    registrationId: number,
    updateData: CampaignAffiliateRegistrationUpdate
  ): Promise<CampaignAffiliateRegistration> {
    const updated = await db
      .updateTable("campaign_affiliate_registrations")
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where("id", "=", registrationId)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new Error("UPDATE_FAILED");
    }

    return updated;
  }

  /**
   * Get eligible unregistered affiliates (includes organizationId from join table, supports filtering by organizationId)
   */
  async getEligibleUnregisteredAffiliates(
    campaignId: number,
    limit: number,
    offset: number,
    organizationId?: number
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
      .where("affiliates.deleted", "=", false)
      .where("affiliates.status", "=", "VERIFIED")
      .where(
        "affiliates.id",
        "not in",
        db
          .selectFrom("campaign_affiliate_registrations")
          .select("affiliate_id")
          .where("campaign_id", "=", campaignId)
          .where("deleted", "=", false)
      );

    if (organizationId) {
      query = query.where(
        "affiliate_organizations.organizationId",
        "=",
        organizationId
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
        "affiliates.createdAt",
        "affiliates.profile_slug",
        "affiliate_organizations.organizationId as organizationId",
      ])
      .orderBy("affiliates.createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Get total eligible affiliates count (supports filtering by organizationId)
   */
  async getTotalEligibleAffiliatesCount(
    campaignId: number,
    organizationId?: number
  ): Promise<number> {
    let query = db
      .selectFrom("affiliates")
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef("affiliate_organizations.affiliateId", "=", "affiliates.id")
            .on("affiliate_organizations.deleted", "=", false)
      )
      .select(db.fn.countAll<string>().as("count"))
      .where("affiliates.deleted", "=", false)
      .where("affiliates.status", "=", "VERIFIED")
      .where(
        "affiliates.id",
        "not in",
        db
          .selectFrom("campaign_affiliate_registrations")
          .select("affiliate_id")
          .where("campaign_id", "=", campaignId)
          .where("deleted", "=", false)
      );

    if (organizationId) {
      query = query.where(
        "affiliate_organizations.organizationId",
        "=",
        organizationId
      );
    }

    const countResult = await query.executeTakeFirst();

    return Number(countResult?.count || 0);
  }

  /**
   * Get affiliate campaigns by status (includes organizationId from join table)
   */
  async getAffiliateCampaignsByStatus(
    affiliateId: number,
    status: CampaignRegistrationStatus
  ): Promise<any[]> {
    return await db
      .selectFrom("campaign_affiliate_registrations as car")
      .innerJoin("campaigns as c", "c.id", "car.campaign_id")
      .leftJoin(
        "affiliate_organizations",
        (join) =>
          join
            .onRef("affiliate_organizations.affiliateId", "=", "car.affiliate_id")
            .on("affiliate_organizations.deleted", "=", false)
      )
      .leftJoin(
        "campaign_sports_categories as csc",
        "csc.campaignId",
        "car.campaign_id"
      )
      .leftJoin("sports_category as sc", "sc.id", "csc.sportsCategoryId")
      .leftJoin("brands as b", "b.id", "c.brandId")
      .select([
        "car.id as registrationId",
        "car.status",
        "car.registrationDate",
        "car.additionalData",
        "car.campaign_id",
        "c.id as campaignId",
        "c.description",
        "c.brandId",
        "c.name",
        "c.product",
        "c.ageRange",
        "c.gender",
        "c.geography",
        "c.followersRange",
        "c.dealType",
        "c.deliverables",
        "c.budget",
        "c.active",
        "c.createdAt as campaignCreatedAt",
        "affiliate_organizations.organizationId as organizationId",
        "sc.title as sportsCategoryTitle",
        "b.name as brandName",
        "b.logo_url as logo",
      ])
      .where("car.deleted", "=", false)
      .where("car.affiliate_id", "=", affiliateId)
      .where("car.status", "=", status)
      .execute();
  }

  /**
   * Update affiliate registration status
   */
  async updateAffiliateRegistrationStatus(
    campaignId: number,
    affiliateId: number,
    status: CampaignRegistrationStatus
  ): Promise<CampaignAffiliateRegistration[]> {
    return await db
      .updateTable("campaign_affiliate_registrations")
      .set({ status })
      .where("campaign_id", "=", campaignId)
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .returningAll()
      .execute();
  }

  /**
   * Update multiple affiliate registration statuses
   */
  async updateMultipleAffiliateRegistrations(
    campaignId: number,
    affiliateIds: number[],
    status: CampaignRegistrationStatus
  ): Promise<{ updatedCount: number; existingIds: number[] }> {
    // First, find existing registrations
    const existingRegistrations = await db
      .selectFrom("campaign_affiliate_registrations")
      .select("affiliate_id")
      .where("campaign_id", "=", campaignId)
      .where("deleted", "=", false)
      .where("affiliate_id", "in", affiliateIds)
      .execute();

    const existingIds = existingRegistrations.map((r) => r.affiliate_id);

    if (existingIds.length === 0) {
      return { updatedCount: 0, existingIds: [] };
    }

    // Update registrations
    const updateResult = await db
      .updateTable("campaign_affiliate_registrations")
      .set({ status })
      .where("campaign_id", "=", campaignId)
      .where("deleted", "=", false)
      .where("affiliate_id", "in", existingIds)
      .executeTakeFirst();

    const updatedCount = Number(updateResult?.numUpdatedRows ?? 0);

    return { updatedCount, existingIds };
  }

  /**
   * Find registration by campaign and affiliate
   */
  async findRegistrationByCampaignAndAffiliate(
    campaignId: number,
    affiliateId: number
  ): Promise<CampaignAffiliateRegistration | undefined> {
    return await db
      .selectFrom("campaign_affiliate_registrations")
      .selectAll()
      .where("campaign_id", "=", campaignId)
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Find registration by ID
   */
  async findRegistrationById(
    registrationId: number
  ): Promise<CampaignAffiliateRegistration | undefined> {
    return await db
      .selectFrom("campaign_affiliate_registrations")
      .selectAll()
      .where("id", "=", registrationId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }
}

