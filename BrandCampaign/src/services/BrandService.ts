import { BrandRepository } from "../repositories/BrandRepository";
import {
  CreateBrandDto,
  UpdateBrandDto,
  BrandResponseDto,
} from "../dtos/brand.dto";
import { ConflictError, NotFoundError } from "../utils/errors/AppError";

/**
 * Service class for Brand business logic
 */
export class BrandService {
  constructor(private brandRepository: BrandRepository) {}

  /**
   * Create a new brand
   */
  async createBrand(dto: CreateBrandDto): Promise<BrandResponseDto> {
    // Check if brand already exists
    const existingBrand = await this.brandRepository.findBrandByName(dto.name);
    if (existingBrand) {
      throw new ConflictError("Brand Already exists.");
    }

    // Create brand
    const brand = await this.brandRepository.createBrand({
      name: dto.name,
      logo_url: dto.logo_url,
    });

    return this.transformToResponseDto(brand);
  }

  /**
   * Get all brands
   */
  async getAllBrands(): Promise<BrandResponseDto[]> {
    const brands = await this.brandRepository.getAllBrands();
    return brands.map((brand) => this.transformToResponseDto(brand));
  }

  /**
   * Update brand
   */
  async updateBrand(
    brandId: number,
    dto: UpdateBrandDto
  ): Promise<BrandResponseDto> {
    // Check if brand exists
    const existingBrand = await this.brandRepository.findBrandById(brandId);
    if (!existingBrand) {
      throw new NotFoundError("Brand not found");
    }

    // Update brand
    const updated = await this.brandRepository.updateBrand(brandId, {
      ...(dto.name && { name: dto.name }),
      ...(dto.logo_url !== undefined && { logo_url: dto.logo_url }),
    });

    return this.transformToResponseDto(updated);
  }

  /**
   * Delete brand
   */
  async deleteBrand(brandId: number): Promise<void> {
    const existingBrand = await this.brandRepository.findBrandById(brandId);
    if (!existingBrand) {
      throw new NotFoundError("Brand not found");
    }

    await this.brandRepository.deleteBrand(brandId);
  }

  /**
   * Transform brand to response DTO
   */
  private transformToResponseDto(brand: any): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      logo_url: brand.logo_url,
      created_at: brand.created_at,
      updated_at: brand.updated_at,
      deleted: brand.deleted,
    };
  }
}

