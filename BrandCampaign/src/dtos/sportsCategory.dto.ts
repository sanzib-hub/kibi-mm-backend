/**
 * DTOs for Sports Category feature
 */

export interface CreateSportsCategoryDto {
  title: string;
}

export interface UpdateSportsCategoryDto {
  title?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface SportsCategoryQueryDto {
  page?: number;
  limit?: number;
  status?: string;
  title?: string;
  id?: number;
}

export interface SportsCategoryResponseDto {
  id: number;
  title: string;
  status: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SportsCategoryListResponseDto {
  success: boolean;
  message: string;
  count: number;
  data: SportsCategoryResponseDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

