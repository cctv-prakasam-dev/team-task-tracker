import { ZodError } from "zod";
import BaseException from "../exceptions/baseException.js";
export async function errorHandler(err, c) {
    if (err instanceof BaseException) {
        return c.json({
            status: err.status,
            code: err.name,
            message: err.message,
            ...(err.errData ? { errors: err.errData } : {}),
        }, err.status);
    }
    if (err instanceof ZodError) {
        const issues = err.issues ?? err.errors ?? [];
        const message = issues[0]?.message ?? "Validation error";
        return c.json({
            status: 422,
            code: "VALIDATION_ERROR",
            message,
            errors: issues.map((e) => ({ field: e.path?.join(".") ?? "", message: e.message })),
        }, 422);
    }
    console.error("Unhandled error:", err);
    return c.json({
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
    }, 500);
}
