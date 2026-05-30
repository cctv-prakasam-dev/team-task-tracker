import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const refresh_tokens = pgTable("refresh_tokens", {
  id: serial().primaryKey(),
  user_id: integer().references(() => users.id).notNull(),
  token_hash: varchar({ length: 512 }).notNull(),
  expires_at: timestamp().notNull(),
  is_revoked: boolean().notNull().default(false),
  created_at: timestamp().defaultNow().notNull(),
}, t => [
  index("refresh_tokens_user_id_idx").on(t.user_id),
  index("refresh_tokens_is_revoked_idx").on(t.is_revoked),
]);

export type RefreshToken = typeof refresh_tokens.$inferSelect;
export type NewRefreshToken = typeof refresh_tokens.$inferInsert;
export type RefreshTokensTable = typeof refresh_tokens;

export const refreshTokensRelations = relations(refresh_tokens, ({ one }) => ({
  user: one(users, {
    fields: [refresh_tokens.user_id],
    references: [users.id],
  }),
}));
