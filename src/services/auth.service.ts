import bcrypt from "bcrypt";

import type { LoginInput, RefreshTokenInput, RegisterInput } from "../validations/schema/auth.schema.js";

import { db } from "../db/configuration.js";
import { organizations } from "../db/schema/organizations.js";
import type { Organization } from "../db/schema/organizations.js";
import { refresh_tokens } from "../db/schema/refresh_tokens.js";
import type { RefreshToken } from "../db/schema/refresh_tokens.js";
import { users } from "../db/schema/users.js";
import type { User } from "../db/schema/users.js";
import BadRequestException from "../exceptions/badRequestException.js";
import ConflictException from "../exceptions/conflictException.js";
import UnauthorizedException from "../exceptions/unauthorizedException.js";
import {
  getMultipleRecordsByMultipleColumnValues,
  getSingleRecordByAColumnValue,
  saveSingleRecord,
  updateRecordByMultipleColumnValues,
} from "./db/baseDbService.js";
import { generateJwtTokensForUser, verifyJwtToken } from "../utils/jwtUtils.js";
import { hashPassword, verifyPassword } from "../utils/passwordUtils.js";

function makeSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function register(input: RegisterInput) {
  const existing = await getSingleRecordByAColumnValue<User>(users, "email", input.email, "eq");
  if (existing) throw new ConflictException("A user with this email already exists");

  return await db.transaction(async (trx) => {
    const slug = makeSlug(input.org_name);
    let org = await getSingleRecordByAColumnValue<Organization>(organizations, "slug", slug, "eq");

    if (!org) {
      org = await saveSingleRecord<Organization>(organizations, { name: input.org_name, slug }, trx);
    }

    const password_hash = await hashPassword(input.password);
    const newUser = await saveSingleRecord<User>(users, {
      name: input.name,
      email: input.email,
      password_hash,
      role: input.role,
      org_id: org.id,
    }, trx);

    const { password_hash: _, ...safeUser } = newUser;
    return safeUser;
  });
}

async function login(input: LoginInput) {
  const user = await getSingleRecordByAColumnValue<User>(users, "email", input.email, "eq");
  if (!user) throw new BadRequestException("Invalid email or password");
  if (!user.is_active) throw new UnauthorizedException("Your account has been deactivated");

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) throw new BadRequestException("Invalid email or password");

  const tokens = await generateJwtTokensForUser(user.id);
  const tokenHash = await bcrypt.hash(tokens.refresh_token, 10);

  await saveSingleRecord<RefreshToken>(refresh_tokens, {
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: new Date(tokens.refresh_token_expires_at * 1000),
  });

  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}

async function refreshToken(input: RefreshTokenInput) {
  const payload = await verifyJwtToken(input.refresh_token);
  const userId = payload.sub as number;

  const activeTokens = await getMultipleRecordsByMultipleColumnValues<RefreshToken>(
    refresh_tokens,
    ["user_id", "is_revoked"],
    [userId, false],
    ["eq", "eq"],
  );

  let matched: RefreshToken | null = null;
  for (const t of activeTokens) {
    if (await bcrypt.compare(input.refresh_token, t.token_hash)) {
      matched = t;
      break;
    }
  }

  if (!matched) throw new UnauthorizedException("Invalid or expired refresh token");
  if (new Date(matched.expires_at) < new Date()) throw new UnauthorizedException("Refresh token has expired");

  await updateRecordByMultipleColumnValues<RefreshToken>(
    refresh_tokens,
    ["id"],
    [matched.id],
    ["eq"],
    { is_revoked: true },
  );

  const tokens = await generateJwtTokensForUser(userId);
  const tokenHash = await bcrypt.hash(tokens.refresh_token, 10);

  await saveSingleRecord<RefreshToken>(refresh_tokens, {
    user_id: userId,
    token_hash: tokenHash,
    expires_at: new Date(tokens.refresh_token_expires_at * 1000),
  });

  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}

async function logout(userId: number, refreshTokenValue?: string) {
  if (refreshTokenValue) {
    const activeTokens = await getMultipleRecordsByMultipleColumnValues<RefreshToken>(
      refresh_tokens,
      ["user_id", "is_revoked"],
      [userId, false],
      ["eq", "eq"],
    );

    for (const t of activeTokens) {
      if (await bcrypt.compare(refreshTokenValue, t.token_hash)) {
        await updateRecordByMultipleColumnValues<RefreshToken>(
          refresh_tokens,
          ["id"],
          [t.id],
          ["eq"],
          { is_revoked: true },
        );
        break;
      }
    }
  } else {
    await updateRecordByMultipleColumnValues<RefreshToken>(
      refresh_tokens,
      ["user_id"],
      [userId],
      ["eq"],
      { is_revoked: true },
    );
  }
}

export const authService = { register, login, refreshToken, logout };
