import { Generated, Insertable, Selectable, Updateable } from "kysely";

// Event table - adapted from new-kibi-backend-v2-main with minimal changes
export interface EventTable {
  id: Generated<number>;
  organizationId: number;
  name: string;
  description: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  eventFee: number;
  participationFee: number;
  address: string;
  venue: string;
  organizerEmail: string;
  mapLink: string;
  organizerPhoneNumber: string;
  organizationName: string;
  imageUrl: string;
  isApprovedByAdmin: boolean;
  sportsCategoryId: number[];
  brochure: string | null;
  age_limit: number | null;
  eventType: "International" | "National" | "State" | "League" | "District";
  latitude: number | null;
  longitude: number | null;
  type: "individual" | "team";
  teamSize: number | null;
  displayName: string | null;
}

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

// Affiliate Event Responses table (renamed from athlete_event_responses)
export interface AffiliateEventResponsesTable {
  affiliate_id: number;
  event_id: number;
  form_id: number;
  response_data: Record<string, any>;
  status: string;
  submitted_at: Generated<Date>;
  deleted: boolean;
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
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isVerified: Generated<boolean>;
  onboardedBy: number;
  deleted: boolean;
  isFirstLogin: boolean;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// Affiliates table - unified with OnBoarding service (includes all sports professionals)
export interface AffiliatesTable {
  id: Generated<number>;
  organizationId: number | null;
  name: string;
  role:
    | "ATHLETE"
    | "COACH"
    | "SPORTS STAFF"
    | "NUTRITIONIST"
    | "PHYSIOTHERAPIST"
    | "PSYCHOLOGIST"
    | "SPORTS JOURNALIST"
    | "SPORTS MANAGEMENT PROFESSIONAL";
  email: string | null;
  phone: string;
  password: string | null;
  dateOfBirth: Date | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  sportsCategoryId: Number;
  position: string | null;
  profilePicture: string | null;
  bio: string | null;
  achievements: string | null;
  invitationCode: string | null;
  invitationStatus: "PENDING" | "SENT" | "ACCEPTED" | "EXPIRED";
  status: "PENDING" | "VERIFIED" | "BANNED" | "FLAGGED";
  addedBy: number;
  deleted: Generated<boolean>;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  geography?: string | null;
  fcm_token?: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_slug?: string | null;
}

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

export interface SportsCategoryTable {
  id: Generated<number>;
  title: string;
  icon?: string | null; // If you store icon
  deleted: boolean;
}

export interface EventSportsCategoryTable {
  id: Generated<number>;
  event_id: number;
  sports_category_id: number;
  deleted?: boolean;
  created_at: Generated<Date | null>;
  updated_at: Generated<Date | null>;
}

// ============================================================
// Missing table interfaces (from init.sql schema)
// ============================================================

export interface EventResultsTable {
  id: Generated<number>;
  event_id: number | null;
  affiliate_id: number | null;
  position: number | null;
  award: string | null;
  stats: any | null;
  certificate_url: string | null;
  created_at: Generated<Date>;
}

export interface EventFixturesTable {
  id: Generated<number>;
  event_id: number | null;
  round: string | null;
  match_number: number | null;
  participant_a: string | null;
  participant_b: string | null;
  scheduled_at: Date | null;
  venue_detail: string | null;
  score_a: string | null;
  score_b: string | null;
  winner: string | null;
  status: string | null;
  created_at: Generated<Date>;
}

export interface EventCheckInsTable {
  id: Generated<number>;
  event_id: number | null;
  code: string;
  valid_from: Date | null;
  valid_until: Date | null;
  created_at: Generated<Date>;
}

export interface EventAttendanceLogTable {
  id: Generated<number>;
  event_id: number | null;
  affiliate_id: number | null;
  check_in_code: string | null;
  check_in_method: string | null;
  checked_in_at: Generated<Date>;
}

export interface EventSurveysTable {
  id: Generated<string>;
  event_id: string | null;
  title: string | null;
  questions: any;
  is_active: boolean | null;
  created_at: Generated<Date>;
}

export interface EventSurveyResponsesTable {
  id: Generated<string>;
  survey_id: string | null;
  affiliate_id: string | null;
  answers: any;
  submitted_at: Generated<Date>;
}

export interface EventNotificationPrefsTable {
  id: Generated<string>;
  event_id: string | null;
  affiliate_id: string | null;
  remind_before_hours: number | null;
  notify_updates: boolean | null;
  notify_results: boolean | null;
  notify_photos: boolean | null;
  created_at: Generated<Date>;
}

export interface EventNotificationsTable {
  id: Generated<string>;
  event_id: string | null;
  title: string | null;
  message: string | null;
  sent_by: string | null;
  sent_at: Generated<Date>;
}

export interface EventWaitlistTable {
  id: Generated<string>;
  event_id: string;
  affiliate_id: number;
  position: number;
  status: string | null;
  promoted_at: Date | null;
  created_at: Generated<Date>;
}

export interface EventCertificatesTable {
  id: Generated<string>;
  event_id: number;
  affiliate_id: number;
  certificate_type: string;
  certificate_number: string;
  template_url: string | null;
  issued_by: number | null;
  issued_at: Generated<Date>;
  status: string | null;
  metadata: any | null;
}

export interface EventCategoriesTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  icon_url: string | null;
  parent_category_id: number | null;
  created_at: Generated<Date>;
}

export interface EventTagsTable {
  id: Generated<number>;
  event_id: number | null;
  tag_name: string;
  created_at: Generated<Date>;
}

export interface EventReviewsTable {
  id: Generated<number>;
  event_id: number | null;
  affiliate_id: number | null;
  rating: number | null;
  review_text: string | null;
  created_at: Generated<Date>;
}

export interface EventTemplatesTable {
  id: Generated<number>;
  organization_id: number | null;
  template_name: string;
  event_data: any;
  created_at: Generated<Date>;
}

export interface EventLiveScoresTable {
  id: Generated<number>;
  event_id: number | null;
  match_label: string;
  team_a_name: string | null;
  team_a_score: string | null;
  team_b_name: string | null;
  team_b_score: string | null;
  current_period: string | null;
  time_elapsed: string | null;
  commentary: string | null;
  status: string | null;
  updated_at: Generated<Date>;
  created_at: Generated<Date>;
}

export interface EventLiveScoreHistoryTable {
  id: Generated<number>;
  live_score_id: number | null;
  team_a_score: string | null;
  team_b_score: string | null;
  current_period: string | null;
  time_elapsed: string | null;
  commentary: string | null;
  recorded_at: Generated<Date>;
}

export interface EventMediaRequestsTable {
  id: Generated<number>;
  event_id: number | null;
  title: string;
  description: string | null;
  media_type: string | null;
  deadline: Date | null;
  created_by: number | null;
  created_at: Generated<Date>;
}

export interface EventMediaResponsesTable {
  id: Generated<number>;
  request_id: number | null;
  affiliate_id: number | null;
  media_url: string;
  caption: string | null;
  status: string | null;
  created_at: Generated<Date>;
}

export interface EventSponsorshipTiersTable {
  id: Generated<number>;
  event_id: number | null;
  tier_name: string;
  price: number | null;
  benefits: any | null;
  max_sponsors: number | null;
  current_sponsors: number | null;
  created_at: Generated<Date>;
}

export interface EventSponsorsTable {
  id: Generated<number>;
  event_id: number | null;
  tier_id: number | null;
  organization_id: number | null;
  organization_name: string | null;
  logo_url: string | null;
  status: string | null;
  created_at: Generated<Date>;
}

export interface VenuesTable {
  id: Generated<number>;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  facilities: any | null;
  map_coordinates: string | null;
  images: any | null;
  organization_id: number | null;
  created_at: Generated<Date>;
}

export interface EventBracketsTable {
  id: Generated<number>;
  event_id: number | null;
  round_number: number;
  match_number: number;
  participant_a_id: number | null;
  participant_a_name: string | null;
  participant_b_id: number | null;
  participant_b_name: string | null;
  score_a: string | null;
  score_b: string | null;
  winner_id: number | null;
  next_match_id: number | null;
  status: string | null;
  created_at: Generated<Date>;
}

export interface EventMerchandiseTable {
  id: Generated<string>;
  event_id: string | null;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number | null;
  image_url: string | null;
  sizes: any | null;
  is_active: boolean | null;
  created_at: Generated<Date>;
}

export interface MerchandiseOrdersTable {
  id: Generated<string>;
  merchandise_id: string | null;
  event_id: string | null;
  affiliate_id: string | null;
  quantity: number | null;
  size: string | null;
  total_amount: number | null;
  status: string | null;
  created_at: Generated<Date>;
}

export interface OrganizationStaffRolesTable {
  id: Generated<number>;
  organization_id: number | null;
  role_name: string;
  permissions: any | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface BadgeDefinitionsTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria_type: string;
  criteria_value: number;
  category: string | null;
  created_at: Generated<Date>;
}

export interface AffiliateBadgesTable {
  id: Generated<string>;
  affiliate_id: string | null;
  badge_id: string | null;
  earned_at: Generated<Date>;
}

export interface AffiliateProfileStatsTable {
  affiliate_id: number;
  profile_views: number | null;
  last_viewed_at: Date | null;
  updated_at: Generated<Date>;
}

export interface CampaignMilestonesTable {
  id: Generated<number>;
  campaign_id: number | null;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  metric_type: string | null;
  deadline: Date | null;
  status: string | null;
  created_at: Generated<Date>;
}

export interface OrgCalendarEntriesTable {
  id: Generated<string>;
  organization_id: string | null;
  entry_date: Date;
  title: string;
  description: string | null;
  entry_type: string | null;
  color: string | null;
  created_at: Generated<Date>;
}

export interface NotificationHistoryTable {
  id: Generated<string>;
  affiliate_id: string | null;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  data: any | null;
  created_at: Generated<Date>;
}

// Database interface
export interface Database {
  events: EventTable;
  forms: FormsTable;
  events_forms: EventFormsTable;
  affiliate_event_responses: AffiliateEventResponsesTable;
  sports_organizations: SportsOrganizationsTable;
  affiliates: AffiliatesTable;
  sports_category: SportsCategoryTable;
  events_sports_category: EventSportsCategoryTable;
  event_teams: EventTeamsTable;
  event_team_members: EventTeamMembersTable;
  event_results: EventResultsTable;
  event_fixtures: EventFixturesTable;
  event_check_ins: EventCheckInsTable;
  event_attendance_log: EventAttendanceLogTable;
  event_surveys: EventSurveysTable;
  event_survey_responses: EventSurveyResponsesTable;
  event_notification_prefs: EventNotificationPrefsTable;
  event_notifications: EventNotificationsTable;
  event_waitlist: EventWaitlistTable;
  event_certificates: EventCertificatesTable;
  event_categories: EventCategoriesTable;
  event_tags: EventTagsTable;
  event_reviews: EventReviewsTable;
  event_templates: EventTemplatesTable;
  event_live_scores: EventLiveScoresTable;
  event_live_score_history: EventLiveScoreHistoryTable;
  event_media_requests: EventMediaRequestsTable;
  event_media_responses: EventMediaResponsesTable;
  event_sponsorship_tiers: EventSponsorshipTiersTable;
  event_sponsors: EventSponsorsTable;
  venues: VenuesTable;
  event_brackets: EventBracketsTable;
  event_merchandise: EventMerchandiseTable;
  merchandise_orders: MerchandiseOrdersTable;
  organization_staff_roles: OrganizationStaffRolesTable;
  badge_definitions: BadgeDefinitionsTable;
  affiliate_badges: AffiliateBadgesTable;
  affiliate_profile_stats: AffiliateProfileStatsTable;
  campaign_milestones: CampaignMilestonesTable;
  org_calendar_entries: OrgCalendarEntriesTable;
  notification_history: NotificationHistoryTable;
}

// Type helpers
export type Event = Selectable<EventTable>;
export type NewEvent = Insertable<EventTable>;
export type EventUpdate = Updateable<EventTable>;

export type Form = Selectable<FormsTable>;
export type NewForm = Insertable<FormsTable>;
export type FormUpdate = Updateable<FormsTable>;

export type EventForm = Selectable<EventFormsTable>;
export type NewEventForm = Insertable<EventFormsTable>;
export type EventFormUpdate = Updateable<EventFormsTable>;

export type AffiliateEventResponse = Selectable<AffiliateEventResponsesTable>;
export type NewAffiliateEventResponse =
  Insertable<AffiliateEventResponsesTable>;
export type AffiliateEventResponseUpdate =
  Updateable<AffiliateEventResponsesTable>;

export type SportsOrganization = Selectable<SportsOrganizationsTable>;
export type NewSportsOrganization = Insertable<SportsOrganizationsTable>;
export type SportsOrganizationUpdate = Updateable<SportsOrganizationsTable>;

export type Affiliate = Selectable<AffiliatesTable>;
export type NewAffiliate = Insertable<AffiliatesTable>;
export type AffiliateUpdate = Updateable<AffiliatesTable>;

export type EventTeam = Selectable<EventTeamsTable>;
export type NewEventTeam = Insertable<EventTeamsTable>;
export type EventTeamUpdate = Updateable<EventTeamsTable>;

export type EventTeamMember = Selectable<EventTeamMembersTable>;
export type NewEventTeamMember = Insertable<EventTeamMembersTable>;
export type EventTeamMemberUpdate = Updateable<EventTeamMembersTable>;
