import { SportsCategoryRepository } from "../repositories/SportsCategoryRepository";
import {
  CreateSportsCategoryDto,
  UpdateSportsCategoryDto,
  SportsCategoryQueryDto,
  SportsCategoryResponseDto,
  SportsCategoryListResponseDto,
} from "../dtos/sportsCategory.dto";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors/AppError";

/**
 * Service class for Sports Category business logic
 */
export class SportsCategoryService {
  constructor(
    private sportsCategoryRepository: SportsCategoryRepository
  ) {}

  /**
   * Get all active sports categories
   */
  async getSportsCategories(): Promise<SportsCategoryListResponseDto> {
    const categories =
      await this.sportsCategoryRepository.getAllActiveCategories();

    return {
      success: true,
      message:
        categories.length > 0
          ? "Sports categories retrieved successfully"
          : "No sports categories found",
      count: categories.length,
      data: categories.map((cat) => this.transformToResponseDto(cat)),
    };
  }

  /**
   * Get sports categories for admin with filters and pagination
   */
  async getSportsCategoriesForAdmin(
    query: SportsCategoryQueryDto
  ): Promise<SportsCategoryListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Extract filters
    const filters = {
      ...(query.status && { status: query.status }),
      ...(query.title && { title: query.title }),
      ...(query.id && { id: query.id }),
    };

    // Get total count with filters applied
    const total = await this.sportsCategoryRepository.getTotalCategoriesCount(filters);
    const totalPages = Math.ceil(total / limit);

    // Get categories with filters
    const categories = await this.sportsCategoryRepository.getCategoriesWithFilters(
      filters,
      limit,
      offset
    );

    if (categories.length === 0) {
      return {
        message: "No categories found.",
        success: true,
        count: 0,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    return {
      message: "Sports Categories fetched successfully",
      success: true,
      count: categories.length,
      data: categories.map((cat) => this.transformToResponseDto(cat)),
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
   * Create sports category
   */
  async createSportsCategory(
    dto: CreateSportsCategoryDto
  ): Promise<SportsCategoryResponseDto> {
    if (!dto.title) {
      throw new ValidationError("Title is required");
    }

    // Check if category already exists
    const existing = await this.sportsCategoryRepository.findCategoryByTitle(
      dto.title
    );

    if (existing.length > 0) {
      throw new ConflictError("Category already exists.");
    }

    // Create category
    const category = await this.sportsCategoryRepository.createCategory({
      title: dto.title,
      deleted: false,
      status: "ACTIVE",
    });

    return this.transformToResponseDto(category);
  }

  /**
   * Update sports category
   */
  async updateSportsCategory(
    id: number,
    dto: UpdateSportsCategoryDto
  ): Promise<void> {
    if (!id) {
      throw new ValidationError("Category Id required");
    }

    if (!dto.title && !dto.status) {
      throw new ValidationError(
        "Atleast one field is required among title and status"
      );
    }

    // Check if category exists
    const existing = await this.sportsCategoryRepository.findCategoryById(id);
    if (!existing) {
      throw new NotFoundError("Category does not exists.");
    }

    // Build update data
    const updateData: any = {};
    if (dto.title) {
      updateData.title = dto.title;
    }
    if (dto.status) {
      updateData.status = dto.status;
    }

    // Update category
    await this.sportsCategoryRepository.updateCategory(id, updateData);
  }

  /**
   * Delete sports category
   */
  async deleteSportsCategory(id: number): Promise<void> {
    if (!id) {
      throw new ValidationError("ID is required");
    }

    // Check if category exists
    const existing = await this.sportsCategoryRepository.findCategoryById(id);
    if (!existing || existing.status !== "ACTIVE") {
      throw new NotFoundError("Category not found.");
    }

    // Delete category
    await this.sportsCategoryRepository.deleteCategory(id);
  }

  /**
   * Transform to response DTO
   */
  private transformToResponseDto(category: any): SportsCategoryResponseDto {
    return {
      id: category.id,
      title: category.title,
      status: category.status,
      deleted: category.deleted,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}

