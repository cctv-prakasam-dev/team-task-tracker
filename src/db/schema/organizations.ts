import { index, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
}, t => [
  uniqueIndex("organizations_slug_idx").on(t.slug),
  index("organizations_name_idx").on(t.name),
]);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationsTable = typeof organizations;
