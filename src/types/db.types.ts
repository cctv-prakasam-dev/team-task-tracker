import type { Organization, NewOrganization, OrganizationsTable } from "../db/schema/organizations.js";
import type { Project, NewProject, ProjectsTable } from "../db/schema/projects.js";
import type { RefreshToken, NewRefreshToken, RefreshTokensTable } from "../db/schema/refresh_tokens.js";
import type { Task, NewTask, TasksTable } from "../db/schema/tasks.js";
import type { User, NewUser, UsersTable } from "../db/schema/users.js";
import { db } from "../db/configuration.js";

export type DBTable
  = | OrganizationsTable
    | UsersTable
    | RefreshTokensTable
    | ProjectsTable
    | TasksTable;

export type DBTableRow
  = | Organization
    | User
    | RefreshToken
    | Project
    | Task;

export type DBNewRecord
  = | NewOrganization
    | NewUser
    | NewRefreshToken
    | NewProject
    | NewTask;

export type DBNewRecords = DBNewRecord[];

export type SortDirection = "asc" | "desc";

export type DBTableColumns<T extends DBTableRow> = keyof T;

export interface WhereQueryData<T extends DBTableRow> {
  columns: Array<keyof T>;
  values: any[];
  operators: RelationalOperator[];
}

export interface OrderByQueryData<T extends DBTableRow> {
  columns: Array<DBTableColumns<T>>;
  values: SortDirection[];
}

export interface InQueryData<T extends DBTableRow> {
  key: keyof T;
  values: any[];
}

export type UpdateRecordData<R extends DBTableRow> = Partial<
  Omit<R, "id" | "created_at" | "updated_at">
>;

export interface PaginationInfo {
  total_records: number;
  total_pages: number;
  page_size: number;
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
}

export interface PaginatedRecords<T extends DBTableRow> {
  pagination_info: PaginationInfo;
  records: T[];
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RelationalOperator
  = | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "notIn"
  | "isNull"
  | "isNotNull"
  | "between"
  | "jsonb_contains"
  | "jsonb_ilike"
  | "any";
