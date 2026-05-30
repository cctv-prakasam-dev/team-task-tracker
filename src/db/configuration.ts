import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { dbConfig } from "../config/dbConfig.js";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const dbClient = new Pool({
  connectionString: dbConfig.DATABASE_URL,
});

export const db = drizzle(dbClient, { schema });
