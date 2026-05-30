import { Hono } from "hono";

import { deleteUser, getUserById, listUsers, updateUser } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router = new Hono();

router.use("/*", authenticate, authorize("ADMIN"));

router.get("/", listUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
