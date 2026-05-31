import * as dotenv from "dotenv";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
dotenv.config();
const { Pool } = pg;
async function runMigrations() {
    let ssl = false;
    try {
        const ca = fs.readFileSync("./ca.pem").toString();
        ssl = { rejectUnauthorized: true, ca };
    }
    catch {
        // no ca.pem — SSL disabled (local dev)
    }
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl,
    });
    const db = drizzle(pool);
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("Migrations complete.");
    await pool.end();
}
runMigrations().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
