import { db } from "../database/kysely/databases.js";
import {
  Affiliate,
  InvitationCode,
  OTPVerification,
  NonAffiliateRequest,
  NewAffiliate,
  NewInvitationCode,
  NewOTPVerification,
  SportsCategory,
  AffiliateTable
} from "../database/kysely/types.js";
import { Updateable } from "kysely";

export class AffiliateRepository {
  /**
   * Find affiliate by phone with specific status requirements
   */
  async findVerifiedAffiliateByPhone(phone: string): Promise<Affiliate | undefined> {
    return await db
      .selectFrom("affiliates")
      .selectAll()
      .where("affiliates.phone", "=", phone)
      .where("affiliates.invitationStatus", "=", "ACCEPTED")
      .where("affiliates.status", "=", "VERIFIED")
      .where("affiliates.deleted", "=", false)
      .executeTakeFirst();
  }
  /**
   * Update affiliate status by phone
   */
  async updateAffiliateStatus(phone: string, updates: any) {
    return db
      .updateTable("affiliates")
      .set(updates)
      .where("phone", "=", phone)
      .execute();
  }

  async upsertInstagramData(data: {
  affiliateId: number;
  followers: number;
  isPrivateAcc: boolean;
}) {
  const existing = await db
    .selectFrom("rapid_ig")
    .select(["id"])
    .where("affiliate_id", "=", data.affiliateId) // ✅ FIX
    .where("deleted", "=", false)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("rapid_ig")
      .set({
        followers: data.followers,
        is_private_acc: data.isPrivateAcc, // ✅ FIX
      })
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("rapid_ig")
      .values({
        affiliate_id: data.affiliateId,     // ✅ FIX
        followers: data.followers,
        is_private_acc: data.isPrivateAcc,  // ✅ FIX
        deleted: false,
      })
      .execute();
  }
}



  async getByAffiliateId(affiliateId: number) {
    return await db
      .selectFrom("rapid_ig")
      .select([
  "rapid_ig.id",
  "rapid_ig.affiliate_id",
  "rapid_ig.followers",
  "rapid_ig.is_private_acc",
])
      .where("affiliate_id", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

 async softDeleteIgByAffiliateId(affiliateId: number) {
  return await db
    .updateTable("rapid_ig")
    .set({
      deleted: true,
    })
    .where("affiliate_id", "=", affiliateId)
    .where("deleted", "=", false)
    .execute();
}

async updateAffiliate(
    id: number,
    data: Updateable<AffiliateTable>
  ) {
    const result = await db
      .updateTable("affiliates")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Affiliate not found");
    }

    return result;
  }






  /**
   * Find invitation code by code
   */
  async findInvitationCodeByCode(code: string): Promise<InvitationCode | undefined> {
    return await db
      .selectFrom("invitation_codes")
      .selectAll()
      .where("code", "=", code)
      .where("status", "=", "ACTIVE")
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  async updateInvitationCodeByPhone(phone: string, updates: {
  code: string;
  expiresAt: Date;
  deleted: boolean;
}): Promise<void> {
  await db
    .updateTable("invitation_codes")
    .set(updates)
    .where("recipientPhone", "=", phone)
    .execute();
}

  /**
   * Update invitation code status
   */
  async updateInvitationCodeStatus(
    id: number,
    status: "USED" | "EXPIRED",
    usedAt?: Date,
    usedBy?: number
  ): Promise<void> {
    await db
      .updateTable("invitation_codes")
      .set({
        status,
        usedAt,
        usedBy,
      })
      .where("id", "=", id)
      .execute();
  }

  /**
   * Get OTP verification record
   */
  async getOTPVerification(
    phone: string,
    type: string,
    invitationCode?: string
  ): Promise<OTPVerification | undefined> {
    let query = db
      .selectFrom("otp_verification")
      .selectAll()
      .where("phone", "=", phone)
      .where("type", "=", type as any);

    if (invitationCode) {
      query = query.where("invitationCode", "=", invitationCode);
    }

    return await query.executeTakeFirst();
  }

  /**
   * Create OTP verification record
   */
  async createOTPVerification(data: NewOTPVerification): Promise<void> {
    await db.insertInto("otp_verification").values(data).execute();
  }

  /**
   * Delete OTP verification records by phone and type
   */
  async deleteOTPVerificationByPhoneAndType(phone: string, type: string): Promise<void> {
    await db
      .deleteFrom("otp_verification")
      .where("phone", "=", phone)
      .where("type", "=", type as any)
      .execute();
  }

  /**
   * Delete all OTP verification records by phone
   */
  async deleteAllOTPVerificationByPhone(phone: string): Promise<void> {
    await db.deleteFrom("otp_verification").where("phone", "=", phone).execute();
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
   * Update OTP verification by phone and type
   */
  async updateOTPVerificationByPhoneAndType(
    phone: string,
    type: string,
    invitationCode: string,
    data: { verified: boolean }
  ): Promise<void> {
    await db
      .updateTable("otp_verification")
      .set(data)
      .where("phone", "=", phone)
      .where("type", "=", type as any)
      .where("invitationCode", "=", invitationCode)
      .execute();
  }

  /**
   * Create affiliate
   */
  async createAffiliate(data: NewAffiliate): Promise<Affiliate> {
    const result = await db
      .insertInto("affiliates")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create affiliate");
    }

    return result;
  }

  /**
   * Find affiliate by ID
   */
  async findById(id: number): Promise<Affiliate | undefined> {
    return await db
      .selectFrom("affiliates")
      .selectAll()
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Update affiliate profile
   */
  async updateProfile(id: number, data: Partial<Affiliate>): Promise<Affiliate> {
    const result = await db
      .updateTable("affiliates")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Affiliate not found");
    }

    return result;
  }

  /**
   * Check if non-affiliate request exists by phone with PENDING status
   */
  async findPendingNonAffiliateRequestByPhone(
    phone: string
  ): Promise<NonAffiliateRequest | undefined> {
    return await db
      .selectFrom("non_affiliate_requests")
      .selectAll()
      .where("phone", "=", phone)
      .where("status", "=", "PENDING")
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Check if affiliate exists by phone
   */
  async findAffiliateByPhone(phone: string): Promise<Affiliate | undefined> {
    return await db
      .selectFrom("affiliates")
      .selectAll()
      .where("affiliates.phone", "=", phone)
      .where("affiliates.deleted", "=", false)
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
   * Create non-affiliate request
   */
  async createNonAffiliateRequest(data: {
    name: string;
    email?: string;
    phone: string;
    sportsCategoryId?: number;
    experience?: string;
    reason?: string;
    role: string;
    documents?: string;
    status: "PENDING";
    deleted: boolean;
  }): Promise<NonAffiliateRequest> {
    const {
      name,
      email,
      phone,
      sportsCategoryId,
      experience,
      reason,
      role,
      documents,
      status,
      deleted,
    } = data;

    const result = await db
      .insertInto("non_affiliate_requests")
      .values({
        name,
        email,
        phone,
        sportsCategoryId,
        experience,
        reason,
        role: role as
          | "ATHLETE"
          | "COACH"
          | "SPORTS STAFF"
          | "NUTRITIONIST"
          | "PHYSIOTHERAPIST"
          | "PSYCHOLOGIST"
          | "SPORTS JOURNALIST"
          | "SPORTS MANAGEMENT PROFESSIONAL",
        documents,
        status,
        deleted,
      })
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create non-affiliate request");
    }

    return result;
  }

  /**
   * Create invitation code
   */
  async createInvitationCode(data: NewInvitationCode): Promise<InvitationCode> {
    const result = await db
      .insertInto("invitation_codes")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create invitation code");
    }

    return result;
  }

  /**
   * Update non-affiliate request (mark as deleted)
   */
  async deleteNonAffiliateRequest(phone: string): Promise<void> {
    await db
      .updateTable("non_affiliate_requests")
      .set({ deleted: true, updatedAt: new Date() })
      .where("phone", "=", phone)
      .execute();
  }

  /**
   * Get organizationId for an affiliate (returns first active mapping)
   */
async getAffiliateOrganizationId(affiliateId: number): Promise<number | null> {
  const mapping = await db
    .selectFrom("affiliate_organizations")
    .select("organizationId")
    .where("affiliateId", "=", affiliateId)
    .where("deleted", "=", false)
    .orderBy("createdAt", "asc")
    .executeTakeFirst();

  return mapping?.organizationId ?? null;
}

  /**
   * Create affiliate organization mapping
   */
  async createAffiliateOrganizationMapping(affiliateId: number, organizationId: number): Promise<void> {
    await db
      .insertInto("affiliate_organizations")
      .values({
        affiliateId: affiliateId,
        organizationId: organizationId,
        deleted: false,
        createdAt: new Date(),
      })
      .execute();
  }

  /**
   * Get affiliate profile with organization and sports category
   */
  async getAffiliateProfile(id: number): Promise<any> {
    const profile = await db
      .selectFrom("affiliates")
      .leftJoin("affiliate_organizations", "affiliates.id", "affiliate_organizations.affiliateId")
      .leftJoin(
        "sports_organizations",
        "affiliate_organizations.organizationId",
        "sports_organizations.id"
      )
      .leftJoin("sports_category", "affiliates.sportsCategoryId", "sports_category.id")
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
        "affiliates.role",
        "affiliates.createdAt",
        "affiliates.followersRange",
        "affiliates.geography",
        "affiliates.height",
        "affiliates.weight",
        "affiliates.city",
        "affiliate_organizations.organizationId",
        eb.ref("sports_organizations.name").as("organizationName"),
        eb.ref("sports_category.title").as("sportsCategoryTitle"),
      ])
      .where("affiliates.id", "=", id)
      .where("affiliate_organizations.deleted", "=", false)
      .where("affiliates.deleted", "=", false)
      .executeTakeFirst();

    if (!profile) {
      return null;
    }

    // Check if Instagram account is connected
    const instagramAccount = await db
      .selectFrom("instagram_accounts")
      .select(["id"])
      .where("affiliateId", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    return {
      ...profile,
      is_connected: !!instagramAccount,
    };
  }

  /**
   * Get experience records for affiliate
   */
  async getExperiences(affiliateId: number): Promise<any[]> {
    return await db
      .selectFrom("experience")
      .selectAll()
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .orderBy("fromDate", "desc")
      .execute();
  }

  /**
   * Create experience
   */
  async createExperience(data: {
    affiliateId: number;
    organizationName: string;
    role: string;
    fromDate: Date;
    toDate?: Date;
    description?: string;
    deleted: boolean;
    active: boolean;
  }): Promise<any> {
    const result = await db
      .insertInto("experience")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create experience");
    }

    return result;
  }

  /**
   * Update experience
   */
  async updateExperience(id: number, data: Partial<any>): Promise<any> {
    const result = await db
      .updateTable("experience")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Experience not found");
    }

    return result;
  }

  /**
   * Delete experience (soft delete)
   */
  async deleteExperience(id: number): Promise<void> {
    await db
      .updateTable("experience")
      .set({ deleted: true })
      .where("id", "=", id)
      .execute();
  }

  /**
   * Get education records for affiliate
   */
  async getEducation(affiliateId: number): Promise<any[]> {
    return await db
      .selectFrom("education")
      .selectAll()
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .execute();
  }

  /**
   * Create education
   */
  async createEducation(data: {
    affiliateId: number;
    schoolName: string;
    course?: string;
    fromYear?: string;
    toYear?: string;
    description?: string;
    certificate?: string;
    deleted: boolean;
    active: boolean;
  }): Promise<any> {
    const result = await db
      .insertInto("education")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create education");
    }

    return result;
  }

  /**
   * Update education
   */
  async updateEducation(id: number, data: Partial<any>): Promise<any> {
    const result = await db
      .updateTable("education")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Education not found");
    }

    return result;
  }

  /**
   * Delete education (soft delete)
   */
  async deleteEducation(id: number): Promise<void> {
    await db
      .updateTable("education")
      .set({ deleted: true })
      .where("id", "=", id)
      .execute();
  }

  /**
   * Get certificates for affiliate
   */
  async getCertificates(affiliateId: number): Promise<any[]> {
    return await db
      .selectFrom("affiliate_certificates")
      .selectAll()
      .where("affiliateId", "=", affiliateId)
      .execute();
  }

  /**
   * Create certificate
   */
  async createCertificate(data: {
    affiliateId: number;
    certificationName: string;
    issuer?: string;
    year?: string;
    url?: string;
    attachment?: string;
  }): Promise<any> {
    const result = await db
      .insertInto("affiliate_certificates")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create certificate");
    }

    return result;
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(id: number): Promise<any | undefined> {
    return await db
      .selectFrom("affiliate_certificates")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  /**
   * Update certificate
   */
  async updateCertificate(id: number, data: Partial<any>): Promise<any> {
    const result = await db
      .updateTable("affiliate_certificates")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Certificate not found");
    }

    return result;
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(id: number): Promise<void> {
    await db.deleteFrom("affiliate_certificates").where("id", "=", id).execute();
  }

  /**
   * Get award recognitions for affiliate
   */
  async getAwardRecognitions(affiliateId: number): Promise<any[]> {
    return await db
      .selectFrom("affiliate_award_recognitions")
      .selectAll()
      .where("affiliateId", "=", affiliateId)
      .execute();
  }

  /**
   * Create award recognition
   */
  async createAwardRecognition(data: {
    affiliateId: number;
    awardName: string;
    organization?: string;
    year?: string;
    url?: string;
    attachment?: string;
  }): Promise<any> {
    const result = await db
      .insertInto("affiliate_award_recognitions")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create award recognition");
    }

    return result;
  }

  /**
   * Get award recognition by ID
   */
  async getAwardRecognitionById(id: number): Promise<any | undefined> {
    return await db
      .selectFrom("affiliate_award_recognitions")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  /**
   * Update award recognition
   */
  async updateAwardRecognition(id: number, data: Partial<any>): Promise<any> {
    const result = await db
      .updateTable("affiliate_award_recognitions")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Award recognition not found");
    }

    return result;
  }

  /**
   * Delete award recognition
   */
  async deleteAwardRecognition(id: number): Promise<void> {
    await db
      .deleteFrom("affiliate_award_recognitions")
      .where("id", "=", id)
      .execute();
  }

  /**
   * Get publications for affiliate
   */
  async getPublications(affiliateId: number): Promise<any[]> {
    return await db
      .selectFrom("affiliate_publications")
      .selectAll()
      .where("affiliateId", "=", affiliateId)
      .execute();
  }

  /**
   * Create publication
   */
  async createPublication(data: {
    affiliateId: number;
    publicationName: string;
    publisher?: string;
    year?: string;
  }): Promise<any> {
    const result = await db
      .insertInto("affiliate_publications")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create publication");
    }

    return result;
  }

  /**
   * Get publication by ID
   */
  async getPublicationById(id: number): Promise<any | undefined> {
    return await db
      .selectFrom("affiliate_publications")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  /**
   * Update publication
   */
  async updatePublication(id: number, data: Partial<any>): Promise<any> {
    const result = await db
      .updateTable("affiliate_publications")
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Publication not found");
    }

    return result;
  }

  /**
   * Delete publication
   */
  async deletePublication(id: number): Promise<void> {
    await db.deleteFrom("affiliate_publications").where("id", "=", id).execute();
  }

  /**
   * Get campaign collaborators for affiliate
   */
  async getCampaignCollaborators(affiliateId: number): Promise<any[]> {
    return await db
      .selectFrom("campaign_collaborator")
      .selectAll()
      .where("affiliate_id", "=", affiliateId)
      .execute();
  }

  /**
   * Create campaign collaborator
   */
  async createCampaignCollaborator(data: {
    brand_name: string;
    position_name: string;
    details?: string | null;
    year: number;
    affiliate_id: number;
  }): Promise<any> {
    const result = await db
      .insertInto("campaign_collaborator")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create campaign collaborator");
    }

    return result;
  }

  /**
   * Get campaign collaborator by ID
   */
  async getCampaignCollaboratorById(id: number): Promise<any | undefined> {
    return await db
      .selectFrom("campaign_collaborator")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  /**
   * Update campaign collaborator
   */
  async updateCampaignCollaborator(id: number, data: Partial<any>): Promise<any> {
    const result = await db
      .updateTable("campaign_collaborator")
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      throw new Error("Campaign collaborator not found");
    }

    return result;
  }

  /**
   * Delete campaign collaborator
   */
  async deleteCampaignCollaborator(id: number): Promise<void> {
    await db.deleteFrom("campaign_collaborator").where("id", "=", id).execute();
  }
}

