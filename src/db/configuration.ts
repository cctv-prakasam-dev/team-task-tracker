import fs from "node:fs";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { dbConfig } from "../config/dbConfig.js";
import { organizations } from "./schema/organizations.js";
import { projects, projectsRelations } from "./schema/projects.js";
import { refresh_tokens, refreshTokensRelations } from "./schema/refresh_tokens.js";
import { tasks, tasksRelations } from "./schema/tasks.js";
import { users, usersRelations } from "./schema/users.js";

const { Pool } = pg;

let sslConfig: pg.PoolConfig["ssl"] = false;
try {
  const ca = fs.readFileSync("./ca.pem").toString();
  sslConfig = { rejectUnauthorized: true, ca };
} catch {
  // no ca.pem — SSL disabled (local dev without certificate)
}

const dbClient = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  ssl: sslConfig,
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
