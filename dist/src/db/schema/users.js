import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
export const users = pgTable("users", {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    password_hash: varchar({ length: 255 }).notNull(),
    role: varchar({ length: 20 }).notNull().default("MEMBER").$type(),
    org_id: integer().references(() => organizations.id).notNull(),
    is_active: boolean().notNull().default(true),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
}, t => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_org_id_idx").on(t.org_id),
    index("users_role_idx").on(t.role),
]);
export const usersRelations = relations(users, ({ one }) => ({
    organization: one(organizations, {
        fields: [users.org_id],
        references: [organizations.id],
    }),
}));
