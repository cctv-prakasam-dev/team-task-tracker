import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import * as dotenv from "dotenv";
import { Hono } from "hono";
dotenv.config();
import { appConfig } from "./config/appConfig.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { openApiSpec } from "./openapi/spec.js";
import apiRoutes from "./routes/index.route.js";
const app = new Hono();
app.get("/", (c) => c.json({ status: 200, message: "Team Task Tracker API is running" }));
// Swagger UI
app.get("/api-docs", swaggerUI({ url: "/api-docs/spec.json" }));
app.get("/api-docs/spec.json", (c) => c.json(openApiSpec));
app.route("/api/v1", apiRoutes);
app.onError(errorHandler);
serve({ fetch: app.fetch, port: appConfig.port }, (info) => console.log(`Server running on http://localhost:${info.port}`));
