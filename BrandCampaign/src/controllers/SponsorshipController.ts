import { Request, Response, NextFunction } from "express";
import { SponsorshipService } from "../services/SponsorshipService";
import { loginSchema, createCampaignSchema, updateCampaignSchema, campaignQuerySchema, affiliateQuerySchema, createBrandSchema, updateBrandSchema } from "../utils/sponsorshipSchema";
import { LoginDto, AffiliateQueryDto, CreateBrandDto, UpdateBrandDto } from "../dtos/sponsorship.dto";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
} from "../dtos/campaign.dto";
import { UnauthorizedError } from "../utils/errors/AppError";

/**
 * Controller class for Sponsorship Team endpoints
 * Handles HTTP requests and responses, delegates business logic to Service layer
 */
export class SponsorshipController {
  constructor(private sponsorshipService: SponsorshipService) {}

  /**
   * Login endpoint for sponsorship team
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
        return;
      }

      const { email, password }: LoginDto = value;
      const result = await this.sponsorshipService.login(email, password);

      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  // ==================== Campaign CRUD Methods ====================

  /**
   * Create a new campaign
   */
  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createCampaignSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
        return;
      }

      const dto: CreateCampaignDto = value;
      const result = await this.sponsorshipService.createCampaign(dto);

      res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing campaign
   */
  updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const campaignId = Number(id);

      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      // Validate request body
      const { error, value } = updateCampaignSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
        return;
      }

      const dto: UpdateCampaignDto = value;
      const result = await this.sponsorshipService.updateCampaign(campaignId, dto);

      res.status(200).json({
        success: true,
        message: "Campaign updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a campaign (soft delete)
   */
  deleteCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: "Campaign ID is required",
        });
        return;
      }

      const campaignId = parseInt(id);
      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      await this.sponsorshipService.deleteCampaign(campaignId);

      res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all campaigns with filtering and pagination
   */
  getAllCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: CampaignQueryDto = {
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 10),
        ...(req.query.sportsCategoryId && {
          sportsCategoryId: Number(req.query.sportsCategoryId),
        }),
        ...(req.query.gender && { gender: req.query.gender as "MALE" | "FEMALE" | "ANY" }),
        ...(req.query.dealType && { dealType: req.query.dealType as string }),
        ...(req.query.active !== undefined && {
          active: req.query.active === "true",
        }),
        ...(req.query.geography && { geography: req.query.geography as string }),
        ...(req.query.followersRange && {
          followersRange: req.query.followersRange as string,
        }),
        ...(req.query.ageRange && { ageRange: req.query.ageRange as string }),
      };

      const result = await this.sponsorshipService.getAllCampaigns(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get campaign by ID
   */
  getCampaignById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaignId = Number(req.params.id);

      if (isNaN(campaignId)) {
        res.status(400).json({
          success: false,
          message: "Invalid campaign ID",
        });
        return;
      }

      const result = await this.sponsorshipService.getCampaignById(campaignId);

      res.status(200).json({
        success: true,
        message: "Campaign fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== Affiliate Methods ====================

  /**
   * Get all affiliates with filtering and pagination
   */
  getAllAffiliates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters
      const { error, value } = affiliateQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
        return;
      }

      const query: AffiliateQueryDto = {
        page: Number(value.page ?? 1),
        limit: Number(value.limit ?? 10),
        ...(value.status && { status: value.status }),
        ...(value.role && { role: value.role }),
        ...(value.sportsCategoryId && { sportsCategoryId: Number(value.sportsCategoryId) }),
        ...(value.gender && { gender: value.gender }),
        ...(value.search && { search: value.search }),
      };

      const result = await this.sponsorshipService.getAllAffiliates(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ==================== Brand CRUD Methods ====================

  /**
   * Create a new brand
   */
  createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createBrandSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((d) => d.message),
        });
        return;
      }

      const dto: CreateBrandDto = value;
      const result = await this.sponsorshipService.createBrand(dto);

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing brand
   */
  updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const brandId = Number(id);

      if (isNaN(brandId)) {
        res.status(400).json({
          success: false,
          message: "Invalid brand ID",
        });
        return;
      }

      // Validate request body
      const { error, value } = updateBrandSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
        return;
      }

      const dto: UpdateBrandDto = value;
      const result = await this.sponsorshipService.updateBrand(brandId, dto);

      res.status(200).json({
        success: true,
        message: "Brand updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a brand (soft delete)
   */
  deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: "Brand ID is required",
        });
        return;
      }

      const brandId = parseInt(id);
      if (isNaN(brandId)) {
        res.status(400).json({
          success: false,
          message: "Invalid brand ID",
        });
        return;
      }

      await this.sponsorshipService.deleteBrand(brandId);

      res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all brands
   */
  getAllBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.sponsorshipService.getAllBrands();

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get brand by ID
   */
  getBrandById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandId = Number(req.params.id);

      if (isNaN(brandId)) {
        res.status(400).json({
          success: false,
          message: "Invalid brand ID",
        });
        return;
      }

      const result = await this.sponsorshipService.getBrandById(brandId);

      res.status(200).json({
        success: true,
        message: "Brand fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

