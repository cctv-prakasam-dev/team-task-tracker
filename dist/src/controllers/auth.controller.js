import { loginSchema, refreshTokenSchema, registerSchema } from "../validations/schema/auth.schema.js";
import { authService } from "../services/auth.service.js";
import { sendSuccessResp } from "../utils/respUtils.js";
export async function register(c) {
    const body = await c.req.json();
    const input = registerSchema.parse(body);
    const user = await authService.register(input);
    return sendSuccessResp(c, 201, "Registration successful", { user });
}
export async function login(c) {
    const body = await c.req.json();
    const input = loginSchema.parse(body);
    const data = await authService.login(input);
    return sendSuccessResp(c, 200, "Login successful", data);
}
export async function refreshToken(c) {
    const body = await c.req.json();
    const input = refreshTokenSchema.parse(body);
    const tokens = await authService.refreshToken(input);
    return sendSuccessResp(c, 200, "Token refreshed", tokens);
}
export async function logout(c) {
    const user = c.get("user");
    let refreshTokenValue;
    try {
        const body = await c.req.json();
        refreshTokenValue = body?.refresh_token;
    }
    catch { /* body is optional */ }
    await authService.logout(user.id, refreshTokenValue);
    return sendSuccessResp(c, 200, "Logged out successfully");
}
