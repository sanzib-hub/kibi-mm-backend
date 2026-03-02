import axios, { AxiosInstance } from "axios";
import { InstagramRepository } from "../repositories/InstagramRepository";
import {
  ConnectInstagramDto,
  InstagramAccountResponseDto,
  InstagramConnectResponseDto,
} from "../dtos/instagram.dto";
import { BadRequestError } from "../utils/errors/AppError";

/**
 * Service class for Instagram business logic
 */
export class InstagramService {
  private graphApi: AxiosInstance;

  constructor(private instagramRepository: InstagramRepository) {
    this.graphApi = axios.create({
      baseURL: "https://graph.facebook.com",
      timeout: 12000,
    });
  }

  /**
   * Connect Instagram account
   */
  async connectInstagram(
    userId: number,
    dto: ConnectInstagramDto
  ): Promise<InstagramConnectResponseDto> {
    // Step 1: Fetch Facebook pages
    const pagesResp = await this.graphApi.get("/v18.0/me/accounts", {
      params: {
        access_token: dto.fbAccessToken,
        fields: "instagram_business_account,name,id",
      },
    });

    const pages = pagesResp.data?.data || [];
    if (!pages.length) {
      throw new BadRequestError(
        "No Facebook Pages with Instagram Business Account linked. Convert IG to Business/Creator & link it."
      );
    }

    const page = pages.find((p: any) => p.instagram_business_account);
    if (!page) {
      throw new BadRequestError(
        "This Facebook Page does not have a linked IG Business account."
      );
    }

    const igId = page.instagram_business_account.id;

    // Step 2: Fetch Instagram account fields
    const igResp = await this.graphApi.get(`/v20.0/${igId}`, {
      params: {
        access_token: dto.fbAccessToken,
        fields: "id,username,followers_count,name",
      },
    });

    const ig = igResp.data;
    const username = ig.username;
    const followersCount = ig.followers_count;
    const accountId = ig.id;

    // Step 3: Upsert Instagram Account in DB
    await this.instagramRepository.upsertInstagramAccount({
      affiliateId: userId,
      igId: accountId,
      username,
      followersCount,
      pageId: page.id,
      pageName: page.name,
    });

    const payload: InstagramAccountResponseDto = {
      id: accountId,
      username,
      followers_count: followersCount,
      name: ig.name,
      pageId: page.id,
      pageName: page.name,
    };

    return {
      success: true,
      message: "Instagram account connected successfully",
      result: payload,
    };
  }

  /**
   * Get Instagram account details
   */
  async getInstagramDetails(
    userId: number
  ): Promise<InstagramAccountResponseDto | null> {
    const record = await this.instagramRepository.findAccountByAffiliateId(
      userId
    );

    if (!record) {
      return null;
    }

    return {
      id: record.igId,
      username: record.username,
      followers_count: record.followersCount,
      pageId: record.pageId,
      pageName: record.pageName,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Delete Instagram account data for an affiliate
   */
  async deleteInstagramAccount(userId: number): Promise<{ success: boolean; message: string }> {
    const deleted = await this.instagramRepository.deleteInstagramAccount(userId);

    if (!deleted) {
      throw new BadRequestError("No Instagram account found to delete");
    }

    return {
      success: true,
      message: "Instagram account data deleted successfully",
    };
  }
}

