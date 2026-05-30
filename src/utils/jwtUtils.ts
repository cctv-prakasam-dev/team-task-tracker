import type { Context } from "hono";

import { sign, verify } from "hono/jwt";
import { JwtTokenExpired, JwtTokenInvalid, JwtTokenSignatureMismatched } from "hono/utils/jwt/types";

import type { JwtUserPayload } from "../types/app.types.js";

import { jwtConfig } from "../config/jwtConfig.js";
import { DEF_400, TOKEN_EXPIRED, TOKEN_INVALID, TOKEN_MISSING, TOKEN_SIG_MISMATCH, USER_INACTIVE } from "../constants/appMessages.js";
import UnauthorizedException from "../exceptions/unauthorizedException.js";
import { getRecordById } from "../services/db/baseDbService.js";

async function generateJwtTokens(payload: JwtUserPayload) {
  const access_token_expiry = Math.floor(Date.now() / 1000) + jwtConfig.expires_in; // 30 days

  const access_token_payload = {
    ...payload,
    exp: access_token_expiry,
  };
  const refresh_token_payload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (jwtConfig.expires_in * 3), // 90 days
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
  // Create Payload
  const payload: JwtUserPayload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
  };

  // Generate Tokens
  return await generateJwtTokens(payload);
}

async function generateJwtTokensForOrg(orgId: number) {
  const payload: JwtUserPayload = {
    sub: orgId,
    iat: Math.floor(Date.now() / 1000),
    entity_type: "organisation",
  };

  return await generateJwtTokens(payload);
}

async function verifyJwtToken(token: string) {
  try {
    const decodedPayload = await verify(token, jwtConfig.secret, "HS256");

    return decodedPayload;
  }
  catch (error: any) {
    if (error instanceof JwtTokenInvalid) {
      throw new UnauthorizedException(TOKEN_INVALID);
    }

    if (error instanceof JwtTokenExpired) {
      throw new UnauthorizedException(TOKEN_EXPIRED);
    }

    if (error instanceof JwtTokenSignatureMismatched) {
      throw new UnauthorizedException(TOKEN_SIG_MISMATCH);
    }

    throw error;
  }
}

async function getUserDetailsFromToken(c: Context) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.substring(7, authHeader.length);

  if (!token) {
    throw new UnauthorizedException(TOKEN_MISSING);
  }

  const decodedPayload = await verifyJwtToken(token);

  // Check if the user is existing in the system - in case the user is removed from the system the jwt token can still be valid
  const user = await getRecordById<User>(users, decodedPayload.sub as number);

  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedException(USER_INACTIVE);
  }
  const { created_at, updated_at, ...userDetails } = user;

  return userDetails;
}

export {
  generateJwtTokens,
  generateJwtTokensForOrg,
  generateJwtTokensForUser,
  getUserDetailsFromToken,
  verifyJwtToken,
};
