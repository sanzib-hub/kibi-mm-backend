import { SponsorshipRepository } from "../repositories/SponsorshipRepository";
import { CampaignRepository } from "../repositories/CampaignRepository";
import { BrandRepository } from "../repositories/BrandRepository";
import {
  LoginDto,
  LoginResponseDto,
  AffiliateQueryDto,
  AffiliateListResponseDto,
  AffiliateResponseDto,
  CreateBrandDto,
  UpdateBrandDto,
  BrandResponseDto,
  BrandListResponseDto,
} from "../dtos/sponsorship.dto";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CampaignResponseDto,
  CampaignListResponseDto,
} from "../dtos/campaign.dto";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from "../utils/errors/AppError";
import { compare } from "bcrypt";
import { sign } from "../utils/jwt/jwt";
import { UserTypes } from "../interfaces/jwtPayloads";
import { AffiliatesTable } from "../database/kysely/types";

/**
 * Service class for Sponsorship Team business logic
 * Handles all business rules and orchestrates repository calls
 */
export class SponsorshipService {
  constructor(
    private repository: SponsorshipRepository,
    private campaignRepository: CampaignRepository,
    private brandRepository: BrandRepository
  ) {}

  /**
   * Sponsorship Team Login
   */
  async login(email: string, password: string): Promise<LoginResponseDto> {
    const sponsorshipTeam = await this.repository.findByEmail(email);

    if (!sponsorshipTeam) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isValidPassword = await compare(password, sponsorshipTeam.password);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!sponsorshipTeam.active) {
      throw new UnauthorizedError("Account is inactive");
    }

    const token = sign({
      id: sponsorshipTeam.id,
      type: UserTypes.SPONSORSHIP_TEAM,
    });

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        type: "sponsorship",
        sponsorshipTeam: {
          id: sponsorshipTeam.id,
          name: sponsorshipTeam.name,
          email: sponsorshipTeam.email,
          active: sponsorshipTeam.active,
        },
      },
    };
  }

  // ==================== Campaign CRUD Methods ====================

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    // Validate brand exists
    const brandExists = await this.campaignRepository.findBrandById(dto.brandId);
    if (!brandExists) {
      throw new NotFoundError("Brand does not exist with this id.");
    }

    // Check if campaign already exists
    const existingCampaign = await this.campaignRepository.findExistingCampaign(
      dto.brandId,
      dto.product
    );
    if (existingCampaign) {
      throw new ConflictError("Campaign already exists.");
    }

    // Validate at least one targeting field
    const { ageRange, gender, geography, followersRange } = dto;
    if (!ageRange && !gender && !geography && !followersRange) {
      throw new ValidationError("At least one targeting field must be provided");
    }

    // Validate sports categories
    const sportsIds = Array.isArray(dto.sportsCategoryId)
      ? dto.sportsCategoryId.map(Number)
      : [];

    if (sportsIds.length > 0) {
      const isValid = await this.campaignRepository.validateSportsCategoryIds(
        sportsIds
      );
      if (!isValid) {
        throw new ValidationError(
          "One or more sports categories do not exist"
        );
      }
    }

    // Create campaign
    const { sportsCategoryId, ...campaignData } = dto;
    const newCampaign = await this.campaignRepository.createCampaign(
      campaignData as any,
      sportsIds
    );

    // Get campaign with details
    const campaignDetails = await this.campaignRepository.getCampaignByIdWithDetails(
      newCampaign.id
    );

    return this.groupCampaignRows(campaignDetails);
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(
    campaignId: number,
    dto: UpdateCampaignDto
  ): Promise<CampaignResponseDto> {
    // Check if campaign exists
    const existingCampaign = await this.campaignRepository.findCampaignById(
      campaignId
    );
    if (!existingCampaign) {
      throw new NotFoundError("Campaign not found");
    }

    // Validate brand if provided
    if (dto.brandId) {
      const brandExists = await this.campaignRepository.findBrandById(
        dto.brandId
      );
      if (!brandExists) {
        throw new NotFoundError("Brand does not exist with this id.");
      }
    }

    // Validate sports categories if provided
    if (dto.sportsCategoryId) {
      const sportsIds = Array.isArray(dto.sportsCategoryId)
        ? dto.sportsCategoryId.map(Number)
        : [];

      if (sportsIds.length > 0) {
        const isValid =
          await this.campaignRepository.validateSportsCategoryIds(sportsIds);
        if (!isValid) {
          throw new ValidationError(
            "One or more sports categories do not exist"
          );
        }
      }
    }

    // Update campaign
    const { sportsCategoryId, ...updateData } = dto;
    const campaignUpdateData = {
      ...updateData,
      ...(updateData.start_date !== undefined && { start_date: updateData.start_date ? new Date(updateData.start_date) : null }),
      ...(updateData.end_date !== undefined && { end_date: updateData.end_date ? new Date(updateData.end_date) : null }),
      ...(updateData.application_deadline !== undefined && { application_deadline: updateData.application_deadline ? new Date(updateData.application_deadline) : null }),
    };
    await this.campaignRepository.updateCampaign(
      campaignId,
      campaignUpdateData as any,
      dto.sportsCategoryId
    );

    // Get campaign with details
    const campaignDetails = await this.campaignRepository.getCampaignByIdWithDetails(
      campaignId
    );

    return this.groupCampaignRows(campaignDetails);
  }

  /**
   * Delete a campaign (soft delete)
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    const existingCampaign = await this.campaignRepository.findCampaignById(
      campaignId
    );
    if (!existingCampaign) {
      throw new NotFoundError("Campaign not found");
    }

    await this.campaignRepository.deleteCampaign(campaignId);
  }

  /**
   * Get all campaigns with filtering and pagination
   */
  async getAllCampaigns(
    query: CampaignQueryDto
  ): Promise<CampaignListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Extract filters (exclude pagination params)
    const filters: CampaignQueryDto = {
      ...(query.sportsCategoryId && { sportsCategoryId: query.sportsCategoryId }),
      ...(query.gender && { gender: query.gender }),
      ...(query.dealType && { dealType: query.dealType }),
      ...(query.active !== undefined && { active: query.active }),
      ...(query.geography && { geography: query.geography }),
      ...(query.followersRange && { followersRange: query.followersRange }),
      ...(query.ageRange && { ageRange: query.ageRange }),
    };

    // Get total count with filters applied
    const total = await this.campaignRepository.getTotalCampaignsCount(filters);
    const totalPages = Math.ceil(total / limit);

    // Get paginated IDs with filters applied
    const ids = await this.campaignRepository.getPaginatedCampaignIds(
      limit,
      offset,
      filters
    );

    if (ids.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: false,
          hasPrev: page > 1,
        },
      };
    }

    // Get campaigns with details
    const rows = await this.campaignRepository.getCampaignsWithDetails(ids);

    // Group by campaign
    const campaigns = this.groupCampaigns(rows);

    return {
      success: true,
      count: campaigns.length,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: number): Promise<CampaignResponseDto> {
    const rows = await this.campaignRepository.getCampaignByIdWithDetails(
      campaignId
    );

    if (rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    return this.groupCampaignRows(rows);
  }

  // ==================== Affiliate Methods ====================

  /**
   * Get all affiliates with filtering and pagination
   */
  async getAllAffiliates(
    query: AffiliateQueryDto
  ): Promise<AffiliateListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Extract filters (exclude pagination params)
    const filters = {
      ...(query.status && { status: query.status }),
      ...(query.role && { role: query.role as AffiliatesTable["role"] }),
      ...(query.sportsCategoryId && { sportsCategoryId: query.sportsCategoryId }),
      ...(query.gender && { gender: query.gender }),
      ...(query.search && { search: query.search }),
    };

    // Get total count with filters applied
    const total = await this.repository.getAffiliatesCount(filters);
    const totalPages = Math.ceil(total / limit);

    // Get paginated affiliates with filters applied
    const rows = await this.repository.getAffiliates(limit, offset, filters);

    // Map rows to response DTOs
    const affiliates: AffiliateResponseDto[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      phone: row.phone,
      gender: row.gender,
      dateOfBirth: row.dateOfBirth,
      sportsCategoryId: row.sportsCategoryId,
      sportsCategoryTitle: row.sportsCategoryTitle,
      position: row.position,
      profilePicture: row.profilePicture,
      bio: row.bio,
      achievements: row.achievements,
      status: row.status,
      geography: row.geography,
      followersRange: row.followersRange,
      profile_slug: row.profile_slug,
      organizationId: row.organizationId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      success: true,
      count: affiliates.length,
      data: affiliates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // ==================== Brand CRUD Methods ====================

  /**
   * Create a new brand
   */
  async createBrand(dto: CreateBrandDto): Promise<BrandResponseDto> {
    // Check if brand with same name already exists
    const existingBrand = await this.brandRepository.findBrandByName(dto.name);
    if (existingBrand) {
      throw new ConflictError("Brand with this name already exists");
    }

    // Create brand
    const newBrand = await this.brandRepository.createBrand({
      name: dto.name,
      logo_url: dto.logo,
    });

    return {
      id: newBrand.id,
      name: newBrand.name,
      logo: newBrand.logo_url,
      createdAt: newBrand.created_at,
      updatedAt: newBrand.updated_at,
    };
  }

  /**
   * Update an existing brand
   */
  async updateBrand(brandId: number, dto: UpdateBrandDto): Promise<BrandResponseDto> {
    // Check if brand exists
    const existingBrand = await this.brandRepository.findBrandById(brandId);
    if (!existingBrand) {
      throw new NotFoundError("Brand not found");
    }

    // Check if name is being updated and if it conflicts with another brand
    if (dto.name && dto.name !== existingBrand.name) {
      const brandWithSameName = await this.brandRepository.findBrandByName(dto.name);
      if (brandWithSameName) {
        throw new ConflictError("Brand with this name already exists");
      }
    }

    // Update brand
    const updateData: { name?: string; logo_url?: string | null } = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.logo !== undefined) {
      updateData.logo_url = dto.logo;
    }

    const updatedBrand = await this.brandRepository.updateBrand(brandId, updateData);

    return {
      id: updatedBrand.id,
      name: updatedBrand.name,
      logo: updatedBrand.logo_url,
      createdAt: updatedBrand.created_at,
      updatedAt: updatedBrand.updated_at,
    };
  }

  /**
   * Delete a brand (soft delete)
   */
  async deleteBrand(brandId: number): Promise<void> {
    const existingBrand = await this.brandRepository.findBrandById(brandId);
    if (!existingBrand) {
      throw new NotFoundError("Brand not found");
    }

    await this.brandRepository.deleteBrand(brandId);
  }

  /**
   * Get all brands
   */
  async getAllBrands(): Promise<BrandListResponseDto> {
    const brands = await this.brandRepository.getAllBrands();

    const brandDtos: BrandResponseDto[] = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      logo: brand.logo_url,
      createdAt: brand.created_at,
      updatedAt: brand.updated_at,
    }));

    return {
      success: true,
      count: brandDtos.length,
      data: brandDtos,
    };
  }

  /**
   * Get brand by ID
   */
  async getBrandById(brandId: number): Promise<BrandResponseDto> {
    const brand = await this.brandRepository.findBrandById(brandId);
    if (!brand) {
      throw new NotFoundError("Brand not found");
    }

    return {
      id: brand.id,
      name: brand.name,
      logo: brand.logo_url,
      createdAt: brand.created_at,
      updatedAt: brand.updated_at,
    };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Group campaign rows by campaign ID
   */
  private groupCampaigns(rows: any[]): CampaignResponseDto[] {
    const campaignsMap: Record<number, CampaignResponseDto> = {};

    for (const row of rows) {
      if (!campaignsMap[row.id]) {
        campaignsMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          brandId: row.brandId,
          product: row.product,
          ageRange: row.ageRange,
          gender: row.gender,
          geography: row.geography,
          followersRange: row.followersRange,
          deliverables: row.deliverables,
          budget: row.budget,
          active: row.active,
          dealType: row.dealType,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          sportsCategories: [],
          brandName: row.brandName,
          logo: row.logo,
        };
      }

      if (row.categoryId) {
        const campaign = campaignsMap[row.id];
        if (campaign) {
          campaign.sportsCategories.push({
            id: row.categoryId,
            title: row.categoryTitle,
          });
        }
      }
    }

    return Object.values(campaignsMap);
  }

  /**
   * Group single campaign rows
   */
  private groupCampaignRows(rows: any[]): CampaignResponseDto {
    if (rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const base = rows[0];

    return {
      id: base.id,
      name: base.name,
      description: base.description,
      brandId: base.brandId,
      product: base.product,
      ageRange: base.ageRange,
      gender: base.gender,
      geography: base.geography,
      followersRange: base.followersRange,
      deliverables: base.deliverables,
      budget: base.budget,
      active: base.active,
      dealType: base.dealType,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      brandName: base.brandName,
      logo: base.logo,
      sportsCategories: rows
        .filter((r) => r.categoryId)
        .map((r) => ({
          id: r.categoryId,
          title: r.categoryTitle,
        })),
    };
  }
}

