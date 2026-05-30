import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
dotenv.config();
export default defineConfig({
    schema: [
        "./src/db/schema/organizations.ts",
        "./src/db/schema/users.ts",
        "./src/db/schema/refresh_tokens.ts",
        "./src/db/schema/projects.ts",
        "./src/db/schema/tasks.ts",
    ],
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
