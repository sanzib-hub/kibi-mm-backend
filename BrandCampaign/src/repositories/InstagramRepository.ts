import { db } from "../database/kysely/databases";
import { InstagramAccountsTable } from "../database/kysely/types";
import { Selectable } from "kysely";

export type InstagramAccount = Selectable<InstagramAccountsTable>;

/**
 * Repository class for Instagram database operations
 */
export class InstagramRepository {
  /**
   * Find Instagram account by affiliate ID (excludes soft-deleted records)
   */
  async findAccountByAffiliateId(
    affiliateId: number
  ): Promise<InstagramAccount | undefined> {
    return await db
      .selectFrom("instagram_accounts")
      .selectAll()
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Upsert Instagram account
   */
  async upsertInstagramAccount(data: {
    affiliateId: number;
    igId: string;
    username: string;
    followersCount: number;
    pageId: string;
    pageName: string;
  }): Promise<InstagramAccount> {
    return await db
      .insertInto("instagram_accounts")
      .values({
        affiliateId: data.affiliateId,
        igId: data.igId,
        username: data.username,
        followersCount: data.followersCount,
        pageId: data.pageId,
        pageName: data.pageName,
        connectedAt: new Date(),
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflict((oc) =>
  oc.columns(["affiliateId"])
    .where("deleted", "=", false)
    .doUpdateSet({
      igId: data.igId,
      username: data.username,
      followersCount: data.followersCount,
      pageId: data.pageId,
      pageName: data.pageName,
      deleted: false,
      updatedAt: new Date(),
    })
)

      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Soft delete Instagram account by affiliate ID
   */
  async deleteInstagramAccount(
    affiliateId: number
  ): Promise<InstagramAccount | undefined> {
    return await db
      .updateTable("instagram_accounts")
      .set({
        deleted: true,
        updatedAt: new Date(),
      })
      .where("affiliateId", "=", affiliateId)
      .where("deleted", "=", false)
      .returningAll()
      .executeTakeFirst();
  }
}
