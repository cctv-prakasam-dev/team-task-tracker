import type { Context, Next } from "hono";

import type { Role } from "../types/app.types.js";

import ForbiddenException from "../exceptions/forbiddenException.js";

export function authorize(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }
    await next();
  };
}
