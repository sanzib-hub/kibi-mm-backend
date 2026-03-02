/**
 * DTOs for Brand feature
 */

export interface CreateBrandDto {
  name: string;
  logo_url: string;
}

export interface UpdateBrandDto {
  name?: string;
  logo_url?: string | null;
}

export interface BrandResponseDto {
  id: number;
  name: string;
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
}

