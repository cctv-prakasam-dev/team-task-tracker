import type { Context, Next } from "hono";

import { eq } from "drizzle-orm";

import type { AuthUser } from "../types/app.types.js";

import { TOKEN_MISSING, USER_INACTIVE } from "../constants/appMessages.js";
import { db } from "../db/configuration.js";
import { users } from "../db/schema/users.js";
import UnauthorizedException from "../exceptions/unauthorizedException.js";
import { verifyJwtToken } from "../utils/jwtUtils.js";

export async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new UnauthorizedException(TOKEN_MISSING);
  }

  const payload = await verifyJwtToken(token);

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub as number))
    .limit(1);

  const user = result[0];

  if (!user || !user.is_active) {
    throw new UnauthorizedException(USER_INACTIVE);
  }

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    org_id: user.org_id,
    is_active: user.is_active,
  };

  c.set("user", authUser);
  await next();
}
