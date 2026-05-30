import { users } from "../db/schema/users.js";
import NotFoundException from "../exceptions/notFoundException.js";
import { deleteRecordById, getMultipleRecordsByAColumnValue, getSingleRecordByMultipleColumnValues, updateRecordById, } from "./db/baseDbService.js";
async function listUsers(orgId) {
    return getMultipleRecordsByAColumnValue(users, "org_id", orgId, "eq");
}
async function getUserById(id, orgId) {
    const user = await getSingleRecordByMultipleColumnValues(users, ["id", "org_id"], [id, orgId], ["eq", "eq"]);
    if (!user)
        throw new NotFoundException("User not found");
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
}
async function updateUser(id, orgId, input) {
    await getUserById(id, orgId);
    const updated = await updateRecordById(users, id, input);
    const { password_hash: _, ...safeUser } = updated;
    return safeUser;
}
async function deleteUser(id, orgId) {
    await getUserById(id, orgId);
    return deleteRecordById(users, id);
}
export const userService = { listUsers, getUserById, updateUser, deleteUser };
