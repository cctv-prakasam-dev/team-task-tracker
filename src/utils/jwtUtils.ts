import { sign, verify } from "hono/jwt";
import { JwtTokenExpired, JwtTokenInvalid, JwtTokenSignatureMismatched } from "hono/utils/jwt/types";

import type { JwtUserPayload } from "../types/app.types.js";

import { jwtConfig } from "../config/jwtConfig.js";
import { TOKEN_EXPIRED, TOKEN_INVALID, TOKEN_SIG_MISMATCH } from "../constants/appMessages.js";
import UnauthorizedException from "../exceptions/unauthorizedException.js";

async function generateJwtTokens(payload: JwtUserPayload) {
  const access_token_expiry = Math.floor(Date.now() / 1000) + jwtConfig.expires_in;

  const access_token_payload = { ...payload, exp: access_token_expiry };
  const refresh_token_payload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + jwtConfig.expires_in * 3,
  };

  const access_token = await sign(access_token_payload, jwtConfig.secret);
  const refresh_token = await sign(refresh_token_payload, jwtConfig.secret);

  return {
    access_token,
    refresh_token,
    refresh_token_expires_at: refresh_token_payload.exp,
  };
}

async function generateJwtTokensForUser(userId: number) {
  const payload: JwtUserPayload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
  };
  return generateJwtTokens(payload);
}

async function verifyJwtToken(token: string) {
  try {
    return await verify(token, jwtConfig.secret, "HS256");
  } catch (error: any) {
    if (error instanceof JwtTokenInvalid) throw new UnauthorizedException(TOKEN_INVALID);
    if (error instanceof JwtTokenExpired) throw new UnauthorizedException(TOKEN_EXPIRED);
    if (error instanceof JwtTokenSignatureMismatched) throw new UnauthorizedException(TOKEN_SIG_MISMATCH);
    throw error;
  }
}

export { generateJwtTokens, generateJwtTokensForUser, verifyJwtToken };
