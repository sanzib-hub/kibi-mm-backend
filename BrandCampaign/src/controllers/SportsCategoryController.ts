import { Request, Response, NextFunction } from "express";
import { SportsCategoryService } from "../services/SportsCategoryService";
import {
  CreateSportsCategoryDto,
  UpdateSportsCategoryDto,
  SportsCategoryQueryDto,
} from "../dtos/sportsCategory.dto";

/**
 * Controller class for Sports Category endpoints
 */
export class SportsCategoryController {
  constructor(private sportsCategoryService: SportsCategoryService) {}

  /**
   * Get all active sports categories
   */
  getSportsCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.sportsCategoryService.getSportsCategories();

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get sports categories for admin
   */
  getSportsCategoriesForAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query: SportsCategoryQueryDto = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        ...(req.query.status && { status: req.query.status as string }),
        ...(req.query.title && { title: req.query.title as string }),
        ...(req.query.id && { id: Number(req.query.id) }),
      };

      const result =
        await this.sportsCategoryService.getSportsCategoriesForAdmin(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create sports category
   */
  createSportsCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { title } = req.body;

      const dto: CreateSportsCategoryDto = { title };
      const result = await this.sportsCategoryService.createSportsCategory(dto);

      res.status(200).json({
        success: true,
        message: "Category created successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update sports category
   */
  updateSportsCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, status } = req.body;

      const dto: UpdateSportsCategoryDto = { title, status };
      await this.sportsCategoryService.updateSportsCategory(Number(id), dto);

      res.status(200).json({
        success: true,
        message: "Category updated successfully.",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete sports category
   */
  deleteSportsCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      await this.sportsCategoryService.deleteSportsCategory(Number(id));

      res.status(200).json({
        success: true,
        message: "Category deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  };
}

