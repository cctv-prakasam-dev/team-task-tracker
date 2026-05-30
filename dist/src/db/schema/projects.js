import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
export const projects = pgTable("projects", {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    org_id: integer().references(() => organizations.id).notNull(),
    created_by: integer().references(() => users.id).notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
}, t => [
    index("projects_org_id_idx").on(t.org_id),
    index("projects_created_by_idx").on(t.created_by),
]);
export const projectsRelations = relations(projects, ({ one }) => ({
    organization: one(organizations, {
        fields: [projects.org_id],
        references: [organizations.id],
    }),
    creator: one(users, {
        fields: [projects.created_by],
        references: [users.id],
    }),
}));
