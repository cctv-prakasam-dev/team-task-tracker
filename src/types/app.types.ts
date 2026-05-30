

import type { DBTableRow, PaginationInfo } from "./db.types.js";

export type ActionType = string;

export interface PaginatedResp<T extends DBTableRow> {
  pagination_info: PaginationInfo;
  records: T[];
}


export interface emailOptions {
  to: string | null;
  cc?: string[];
  bcc?: string[];
  subject: string;
  user_name?: string;
  login_link?: string;
  view_case_link?: string;
  attachments?: any;
}

export interface JwtUserPayload {
  sub: number;
  iat: number;
  entity_type?: "user" | "organisation";
}

export type AppRespData = 
  | Record<string, unknown>;

export interface ManagerPerformanceData {
  advocates_managed: number;
  cases_assigned: number;
  approvals_done: number;
  comments_added: number;
}


export type SignUpOrSignInActivity = "sign-in-with-phone"

export type UserActivity
  = | "create-advocate"

export type RefreshTokenActivity = "refresh-token";

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export type UserCounts = {
  user_type: string;
  count: number;
}[];

export interface BriefNote {
  id?: number;
  title?: string;
  note: string;
  type?: string;
  case_id?: number;
  case_sub_stage?: string;
  updated_by?: number;
}

export interface ServiceTypeWiseCounts {
  service_type: string | null;
  cases_count: number;
  revenue: number;
}

export interface ServiceTypeWiseCountsForAdvocate {
  service_type: string | null;
  cases_count: number;
}

export interface StatusWiseStats {
  status: string;
  count: number;
}

export interface StageWiseCaseCount {
  stage: string;
  count: number;
}

export interface ServicesStatusWiseCounts {
  service_type: string | null;
  statuses: StatusWiseStats[];
}

export interface OraganisationMonthlyWiseStats {
  month: string;
  service_types: ServiceTypeWiseCountsForAdvocate[];
}

export type AppActivity
  = | SignUpOrSignInActivity
    | UserActivity
    | RefreshTokenActivity

export type ValidatedRequest
  = Record<string, unknown>;
