import type { DBTableRow, PaginationInfo } from "./db.types.js";
import type { UserRole } from "../db/schema/users.js";

export type ActionType = string;
export type Role = UserRole;
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  org_id: number;
  is_active: boolean;
}

export interface PaginatedResp<T extends DBTableRow> {
  pagination_info: PaginationInfo;
  records: T[];
}

export interface JwtUserPayload {
  sub: number;
  iat: number;
  entity_type?: "user" | "organisation";
}

export interface SuccessResp<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
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

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export type AppActivity = string;
export type ValidatedRequest = Record<string, unknown>;

export interface OtpEntity {
  phone?: string | null;
  email?: string | null;
}

export interface OtpData {
  action: string;
  otp: string;
  expires_at: Date;
  phone?: string | null;
  email?: string | null;
}
