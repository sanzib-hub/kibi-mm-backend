import { Generated, Insertable, Selectable, Updateable } from "kysely";

// Event table - adapted from new-kibi-backend-v2-main with minimal changes
export interface EventTable {
  id: Generated<number>;
  organizationId: number;
  name: string;
  description: string | null;
  created_at: Generated<Date>;
  deleted: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  participationFee: number;
  address: string;
  venue: string;
  organizerEmail: string;
  mapLink: string;
  organizerPhoneNumber: string;
  organizationName: string;
  imageUrl: string;
  isApprovedByAdmin: boolean;
  eventType: "International" | "National" | "State" | "League" | "District";
  type: "individual" | "team";
  teamSize: number | null;
}

// Forms table - for event registration forms
export interface FormsTable {
  id: Generated<number>;
  formName: string;
  header: string;
  organizationId: number;
  form_values: any;
  type: "Team Sports" | "Individual Play";
  minPlayers: number | null;
  maxPlayers: number | null;
  deleted: boolean;
  createdAt: Generated<Date>;
}

// Event Forms mapping table
export interface EventFormsTable {
  id: Generated<number>;
  eventId: number;
  formId: number;
  deleted: boolean;
}

export interface SuperAdminTable {
  id: Generated<number>;
  name: string;
  email: string;
  password: string;
  role: "SUPER_ADMIN";
  active: boolean;
  deleted: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}


// Affiliate Event Responses table (renamed from athlete_event_responses)
export interface AffiliateEventResponsesTable {
  affiliate_id: number;
  event_id: number;
  form_id?: number | null;
  response_data: Record<string, any>;
  status?: string; 
  submitted_at?: Generated<Date>; 
  deleted?: boolean; 
  payment_id?: string;
  order_id?: string;
  amount_paid?: number;
  payment_status?: string;
  payment_time?: Date;
}

// Sports Organizations table - unified with OnBoarding service
export interface SportsOrganizationsTable {
  id: Generated<number>;
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string | null;
  displayName: string | null;
  organizationType: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  district: string | null;
  pincode: string | null;
  logo: string | null;
  description: string | null;
  website: string | null;
  registrationNumber: string | null;
  establishedYear: number | null;
  sportsCategories: string | null; // JSON array
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isVerified: Generated<boolean>;
  onboardedBy: number;
  deleted: boolean;
  isFirstLogin: boolean;
  createdAt: Generated<Date>;
  edAt: Generated<Date>;
  account_id?: string | null;
  account_type?: "SAVING" | "CURRENT" | null;
}

export interface PayoutTable{
  id: Generated<number>;
  organizationId: number;
  reference_id: string;
  amount: number;
  currency: string;
  mode: string;
  purpose: string;
  status: string;
  narration?: string;
  created_at: Date;
}

// Affiliates table - unified with OnBoarding service (includes all sports professionals)
export interface AffiliatesTable {
  id: Generated<number>;
  organizationId: number | null;
  name: string;
  role: 'ATHLETE' | 'COACH' | 'SPORTS STAFF' | 'NUTRITIONIST' | 'PHYSIOTHERAPIST' | 'PSYCHOLOGIST' | 'SPORTS JOURNALIST' | 'SPORTS MANAGEMENT PROFESSIONAL';
  email: string | null;
  phone: string;
  password: string | null;
  dateOfBirth: Date | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  sportsCategory: string | null;
  position: string | null;
  profilePicture: string | null;
  bio: string | null;
  achievements: string | null;
  invitationCode: string | null;
  invitationStatus: 'PENDING' | 'SENT' | 'ACCEPTED' | 'EXPIRED';
  status: 'PENDING' | 'VERIFIED' | 'BANNED' | 'FLAGGED';
  addedBy: number;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  experience?: string | null;
  followersRange?: string | null;
  geography?: string | null;
  height?: string | null;
  weight?: string | null;
  city?: string | null;

  /** ⭐ NEW FIELDS **/
  latitude?: number | null;
  longitude?: number | null;
  profile_slug: string | null;
}

export interface MediaTable {
  id: string; // UUID
  affiliate_id: number;

  file_type: "image" | "video";
  mime_type: string;
  file_name: string;
  storage_key: string;

  file_size: number;

  status: "INITIATED" | "UPLOADED" | "FAILED";

  deleted: Generated<boolean>;

  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Event Teams table
export interface EventTeamsTable {
  id: Generated<number>;
  eventId: number;
  captainId: number;
  teamName: string;
  status: "PENDING" | "COMPLETED";
  createdAt: Generated<Date>;
  deleted: boolean;
  teamCode: string;
  payment_mode: "all" | "split" | null;
}

export interface EventTeamMembersTable {
  id: Generated<number>;
  teamId: number;
  affiliateId: number;
  isCaptain: boolean;
  status: "PENDING" | "ACTIVE";
  joinedAt: Generated<Date>;
  deleted: boolean;
}


// Subscription Plans table
export interface SubscriptionPlansTable {
  id: Generated<number>;
  razorpayPlanId: string | null;
  organizationId: number;
  period: "daily" | "weekly" | "monthly" | "quarterly"|"yearly";
  interval: number;
  itemName: string;
  itemAmount: number;
  itemCurrency: string;
  itemDescription: string | null;
  notes: Record<string, any> | null;
  active: boolean;
  deleted: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface SubscriptionsTable {
  id: Generated<number>;
  razorpay_subscription_id: string;
  razorpay_plan_id: string;
  organization_id: number;
  affiliate_id: number | null;
  status: string;
  total_count: number;
  paid_count: Generated<number>;
  remaining_count: number | null;
  short_url: string | null;
  notes: Record<string, any> | null;
  expire_by: number | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Affiliate Organizations mapping table
export interface AffiliateOrganizationsTable {
  id: Generated<number>;
  affiliateId: number;
  organizationId: number;
  createdAt: Generated<Date>;
  deleted: boolean;
}

/**
 * Type helpers
 */

// Enums for filters
export enum AgeFilterCondition {
  EQUAL = "=",
  LESS_THAN = "<",
  GREATER_THAN = ">",
}

export enum GenderFilter {
  MALE = "MALE",
  FEMALE = "FEMALE",
  ANY = "ANY",
}

export enum WeightFilterCondition {
  EQUAL = "=",
  LESS_THAN = "<",
  GREATER_THAN = ">",
}

// Database interface
export interface Database {
  super_admin: SuperAdminTable;
  events: EventTable;
  forms: FormsTable;
  events_forms: EventFormsTable;
  affiliate_event_responses: AffiliateEventResponsesTable;
  sports_organizations: SportsOrganizationsTable;
  affiliates: AffiliatesTable;
  payouts :PayoutTable;
  media: MediaTable;
  event_teams: EventTeamsTable;
  event_team_members: EventTeamMembersTable;
  subscription_plans: SubscriptionPlansTable;
  subscriptions:SubscriptionsTable
  affiliate_organizations: AffiliateOrganizationsTable;
}

// Type helpers
export type Event = Selectable<EventTable>;
export type NewEvent = Insertable<EventTable>;
export type EventUpdate = Updateable<EventTable>;
export type SuperAdmin = Selectable<SuperAdminTable>;
export type NewSuperAdmin = Insertable<SuperAdminTable>;
export type SuperAdminUpdate = Updateable<SuperAdminTable>;

export type Form = Selectable<FormsTable>;
export type NewForm = Insertable<FormsTable>;
export type FormUpdate = Updateable<FormsTable>;

export type EventForm = Selectable<EventFormsTable>;
export type NewEventForm = Insertable<EventFormsTable>;
export type EventFormUpdate = Updateable<EventFormsTable>;

export type AffiliateEventResponse = Selectable<AffiliateEventResponsesTable>;
export type NewAffiliateEventResponse = Insertable<AffiliateEventResponsesTable>;
export type AffiliateEventResponseUpdate = Updateable<AffiliateEventResponsesTable>;

export type SportsOrganization = Selectable<SportsOrganizationsTable>;
export type NewSportsOrganization = Insertable<SportsOrganizationsTable>;
export type SportsOrganizationUpdate = Updateable<SportsOrganizationsTable>;

export type Affiliate = Selectable<AffiliatesTable>;
export type NewAffiliate = Insertable<AffiliatesTable>;
export type AffiliateUpdate = Updateable<AffiliatesTable>;

export type Payout = Selectable<PayoutTable>;
export type NewPayout = Insertable<PayoutTable>;
export type PayoutUpdate = Updateable<PayoutTable>;

export type Media = Selectable<MediaTable>;
export type NewMedia = Insertable<MediaTable>;
export type MediaUpdate = Updateable<MediaTable>;

export type EventTeam = Selectable<EventTeamsTable>;
export type NewEventTeam = Insertable<EventTeamsTable>;
export type EventTeamUpdate = Updateable<EventTeamsTable>;

export type SubscriptionPlan = Selectable<SubscriptionPlansTable>;
export type NewSubscriptionPlan = Insertable<SubscriptionPlansTable>;
export type SubscriptionPlanUpdate = Updateable<SubscriptionPlansTable>;

export type AffiliateOrganization = Selectable<AffiliateOrganizationsTable>;
export type NewAffiliateOrganization = Insertable<AffiliateOrganizationsTable>;
export type AffiliateOrganizationUpdate = Updateable<AffiliateOrganizationsTable>;

export type Subscription = Selectable<SubscriptionsTable>;
export type NewSubscription = Insertable<SubscriptionsTable>;
export type SubscriptionUpdate = Updateable<SubscriptionsTable>;
