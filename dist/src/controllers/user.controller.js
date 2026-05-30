import { updateUserSchema } from "../validations/schema/user.schema.js";
import { userService } from "../services/user.service.js";
import { sendSuccessResp } from "../utils/respUtils.js";
export async function listUsers(c) {
    const user = c.get("user");
    const users = await userService.listUsers(user.org_id);
    return sendSuccessResp(c, 200, "Users retrieved", { users });
}
export async function getUserById(c) {
    const user = c.get("user");
    const id = Number(c.req.param("id"));
    const found = await userService.getUserById(id, user.org_id);
    return sendSuccessResp(c, 200, "User retrieved", { user: found });
}
export async function updateUser(c) {
    const user = c.get("user");
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const input = updateUserSchema.parse(body);
    const updated = await userService.updateUser(id, user.org_id, input);
    return sendSuccessResp(c, 200, "User updated", { user: updated });
}
export async function deleteUser(c) {
    const user = c.get("user");
    const id = Number(c.req.param("id"));
    await userService.deleteUser(id, user.org_id);
    return sendSuccessResp(c, 200, "User deleted");
}
