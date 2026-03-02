export interface JwtPayload {
  id: number;
  type: UserTypes;
  organizationId?: number;
  iat?: number;
  exp?: number;
}

export enum UserTypes {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORGANIZATION = "ORGANIZATION",
  AFFILIATE = "AFFILIATE",
  ATHLETE = "ATHLETE",
  SPONSORSHIP_TEAM = "SPONSORSHIP_TEAM",
}

export interface SuperAdminPayload extends JwtPayload {
  type: UserTypes.SUPER_ADMIN;
  name: string;
}

export interface OrganizationPayload extends JwtPayload {
  type: UserTypes.ORGANIZATION;
  name: string;
  organizationId: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
}

export interface AffiliatePayload extends JwtPayload {
  type: UserTypes.AFFILIATE;
  name: string;
  organizationId: number;
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
}

export interface AthletePayload extends JwtPayload {
  type: UserTypes.ATHLETE;
  name: string;
  organizationId?: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface SponsorshipTeamPayload extends JwtPayload {
  type: UserTypes.SPONSORSHIP_TEAM;
  name: string;
}
