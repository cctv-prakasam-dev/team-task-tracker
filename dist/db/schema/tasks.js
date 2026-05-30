import { date, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";
export const priorityEnum = pgEnum("priority", ["LOW", "MEDIUM", "HIGH"]);
export const statusEnum = pgEnum("status", ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]);
export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: priorityEnum("priority").notNull().default("MEDIUM"),
    status: statusEnum("status").notNull().default("TODO"),
    assignee_id: integer("assignee_id").references(() => users.id),
    project_id: integer("project_id").references(() => projects.id).notNull(),
    due_date: date("due_date"),
    created_by: integer("created_by").references(() => users.id).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_tasks_status").on(table.status),
    index("idx_tasks_assignee_id").on(table.assignee_id),
    index("idx_tasks_due_date").on(table.due_date),
]);
