import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.js";
export const refresh_tokens = pgTable("refresh_tokens", {
    id: serial("id").primaryKey(),
    user_id: integer("user_id").references(() => users.id).notNull(),
    token_hash: varchar("token_hash", { length: 512 }).notNull(),
    expires_at: timestamp("expires_at").notNull(),
    is_revoked: boolean("is_revoked").default(false).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});
