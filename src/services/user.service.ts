import type { UpdateUserInput } from "../validations/schema/user.schema.js";

import { users } from "../db/schema/users.js";
import NotFoundException from "../exceptions/notFoundException.js";
import {
  deleteRecordById,
  getMultipleRecordsByAColumnValue,
  getRecordById,
  getSingleRecordByMultipleColumnValues,
  updateRecordById,
} from "./db/baseDbService.js";
import type { User } from "../db/schema/users.js";

async function listUsers(orgId: number) {
  return getMultipleRecordsByAColumnValue<User>(users, "org_id", orgId, "eq");
}

async function getUserById(id: number, orgId: number) {
  const user = await getSingleRecordByMultipleColumnValues<User>(
    users,
    ["id", "org_id"],
    [id, orgId],
    ["eq", "eq"],
  );
  if (!user) throw new NotFoundException("User not found");
  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

async function updateUser(id: number, orgId: number, input: UpdateUserInput) {
  await getUserById(id, orgId);
  const updated = await updateRecordById<User>(users, id, input as any);
  const { password_hash: _, ...safeUser } = updated;
  return safeUser;
}

async function deleteUser(id: number, orgId: number) {
  await getUserById(id, orgId);
  return deleteRecordById<User>(users, id);
}

export const userService = { listUsers, getUserById, updateUser, deleteUser };
