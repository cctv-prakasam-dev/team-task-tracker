import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { dbConfig } from "../config/dbConfig.js";
import { organizations } from "./schema/organizations.js";
import { projects, projectsRelations } from "./schema/projects.js";
import { refresh_tokens, refreshTokensRelations } from "./schema/refresh_tokens.js";
import { tasks, tasksRelations } from "./schema/tasks.js";
import { users, usersRelations } from "./schema/users.js";
const { Pool } = pg;
const dbClient = new Pool({
    connectionString: dbConfig.DATABASE_URL,
});
export const db = drizzle(dbClient, {
    schema: {
        organizations,
        users,
        usersRelations,
        refresh_tokens,
        refreshTokensRelations,
        projects,
        projectsRelations,
        tasks,
        tasksRelations,
    },
});
