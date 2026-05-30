import { z } from "zod";
export const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().max(2000).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
    assignee_id: z.number().int().positive().optional(),
    project_id: z.number().int().positive({ message: "project_id is required" }),
    due_date: z
        .string()
        .refine((d) => !Number.isNaN(Date.parse(d)), { message: "due_date must be a valid date" })
        .refine((d) => new Date(d) > new Date(), { message: "due_date must be a future date" })
        .optional(),
});
export const updateTaskSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    assignee_id: z.number().int().positive().nullable().optional(),
    due_date: z
        .string()
        .refine((d) => !Number.isNaN(Date.parse(d)), { message: "due_date must be a valid date" })
        .refine((d) => new Date(d) > new Date(), { message: "due_date must be a future date" })
        .nullable()
        .optional(),
});
export const updateTaskStatusSchema = z.object({
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"], {
        message: "status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED",
    }),
});
export const listTasksQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    assignee_id: z.coerce.number().int().positive().optional(),
});
