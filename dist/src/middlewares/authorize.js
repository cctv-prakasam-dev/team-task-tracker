import ForbiddenException from "../exceptions/forbiddenException.js";
export function authorize(...roles) {
    return async (c, next) => {
        const user = c.get("user");
        if (!user || !roles.includes(user.role)) {
            throw new ForbiddenException("You do not have permission to perform this action");
        }
        await next();
    };
}
