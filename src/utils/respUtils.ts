import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { SuccessResp } from "../types/app.types.js";

export function sendSuccessResp<T = undefined>(
  c: Context,
  status: ContentfulStatusCode,
  message: string,
  data?: T,
) {
  const resp: SuccessResp<T> = { status, success: true, message };
  if (data !== undefined) resp.data = data;
  return c.json(resp, status);
}
