/**
 * DTOs for Sponsorship Team feature
 */

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  success: boolean;
  message: string;
  data: {
    token: string;
    sponsorshipTeam: {
      id: number;
      name: string;
      email: string;
      active: boolean;
    };
    type: string;
  };
}

// ==================== Affiliate DTOs ====================

export interface AffiliateQueryDto {
  page?: number;
  limit?: number;
  status?: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
  role?: string;
  sportsCategoryId?: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
  search?: string;
}

export interface AffiliateResponseDto {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: Date | null;
  sportsCategoryId: number | null;
  sportsCategoryTitle: string | null;
  position: string | null;
  profilePicture: string | null;
  bio: string | null;
  achievements: string | null;
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
  geography: string | null;
  followersRange: string | null;
  profile_slug: string | null;
  organizationId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateListResponseDto {
  success: boolean;
  count: number;
  data: AffiliateResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== Brand DTOs ====================

export interface CreateBrandDto {
  name: string;
  logo: string;
}

export interface UpdateBrandDto {
  name?: string;
  logo?: string;
}

export interface BrandResponseDto {
  id: number;
  name: string;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandListResponseDto {
  success: boolean;
  count: number;
  data: BrandResponseDto[];
}

