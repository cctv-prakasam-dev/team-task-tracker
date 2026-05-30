import { Hono } from "hono";

import authRoutes from "./auth.routes.js";
import projectRoutes from "./project.routes.js";
import taskRoutes from "./task.routes.js";
import userRoutes from "./user.routes.js";

const router = new Hono();

router.route("/auth", authRoutes);
router.route("/users", userRoutes);
router.route("/projects", projectRoutes);
router.route("/tasks", taskRoutes);

export default router;
