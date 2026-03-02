import { Request, Response, NextFunction } from "express";
import { BrandService } from "../services/BrandService";
import { CreateBrandDto, UpdateBrandDto } from "../dtos/brand.dto";




export class BrandController {
  constructor(private brandService: BrandService) {}

  /**
   * Create a new brand
   */
  createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, logo_url } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: "Brand Name required.",
        });
        return;
      }

      if (!logo_url) {
        res.status(400).json({
          success: false,
          message: "Logo is required.",
        });
        return;
      }

      const dto: CreateBrandDto = { name, logo_url };
      const result = await this.brandService.createBrand(dto);

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
   * Get all brands
   */
  getAllBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brands = await this.brandService.getAllBrands();

      res.status(200).json({
        success: true,
        message:
          brands.length > 0 ? "Brands fetched successfully" : "No brands found",
        data: brands.length > 0 ? brands : [],
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update brand
   */
  updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandId = Number(req.params.id);
      const { name, logo_url } = req.body;

      const dto: UpdateBrandDto = { name, logo_url };
      const result = await this.brandService.updateBrand(brandId, dto);

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
   * Delete brand
   */
  deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandId = Number(req.params.id);

      await this.brandService.deleteBrand(brandId);

      res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

