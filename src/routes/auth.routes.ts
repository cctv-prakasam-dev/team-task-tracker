import { Hono } from "hono";

import { login, logout, refreshToken, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = new Hono();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", authenticate, logout);

export default router;
