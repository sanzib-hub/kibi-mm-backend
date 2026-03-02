/**
 * DTOs for Instagram feature
 */

export interface ConnectInstagramDto {
  fbAccessToken: string;
}

export interface InstagramAccountResponseDto {
  id: string;
  username: string;
  followers_count: number;
  name?: string;
  pageId?: string;
  pageName?: string;
  updatedAt?: Date;
}

export interface InstagramConnectResponseDto {
  success: boolean;
  message: string;
  result: InstagramAccountResponseDto;
}




