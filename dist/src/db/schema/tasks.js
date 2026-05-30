import { relations } from "drizzle-orm";
import { date, index, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";
export const tasks = pgTable("tasks", {
    id: serial().primaryKey(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    priority: varchar({ length: 20 }).notNull().default("MEDIUM"), // LOW | MEDIUM | HIGH
    status: varchar({ length: 20 }).notNull().default("TODO"), // TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED
    assignee_id: integer().references(() => users.id),
    project_id: integer().references(() => projects.id).notNull(),
    due_date: date(),
    created_by: integer().references(() => users.id).notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
}, t => [
    index("tasks_status_idx").on(t.status),
    index("tasks_assignee_id_idx").on(t.assignee_id),
    index("tasks_due_date_idx").on(t.due_date),
    index("tasks_project_id_idx").on(t.project_id),
    index("tasks_priority_idx").on(t.priority),
]);
export const tasksRelations = relations(tasks, ({ one }) => ({
    assignee: one(users, {
        fields: [tasks.assignee_id],
        references: [users.id],
        relationName: "task_assignee",
    }),
    creator: one(users, {
        fields: [tasks.created_by],
        references: [users.id],
        relationName: "task_creator",
    }),
    project: one(projects, {
        fields: [tasks.project_id],
        references: [projects.id],
    }),
}));
