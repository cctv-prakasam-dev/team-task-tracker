import type { Context } from "hono";

import type { TaskStatus } from "../types/app.types.js";

import { createTaskSchema, listTasksQuerySchema, updateTaskSchema, updateTaskStatusSchema } from "../validations/schema/task.schema.js";
import { taskService } from "../services/task.service.js";
import { sendSuccessResp } from "../utils/respUtils.js";

export async function createTask(c: Context) {
  const user = c.get("user");
  const body = await c.req.json();
  const input = createTaskSchema.parse(body);
  const task = await taskService.createTask(input, user.org_id, user.id);
  return sendSuccessResp(c, 201, "Task created", { task });
}

export async function listTasks(c: Context) {
  const user = c.get("user");
  const raw = c.req.query();
  const query = listTasksQuerySchema.parse(raw);
  const result = await taskService.listTasks(query, user.org_id, user.id, user.role);
  return sendSuccessResp(c, 200, "Tasks retrieved", result);
}

export async function getTaskById(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const task = await taskService.getTaskById(id, user.org_id, user.id, user.role);
  return sendSuccessResp(c, 200, "Task retrieved", { task });
}

export async function updateTask(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const input = updateTaskSchema.parse(body);
  const task = await taskService.updateTask(id, user.org_id, input, user.id, user.role);
  return sendSuccessResp(c, 200, "Task updated", { task });
}

export async function updateTaskStatus(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const { status } = updateTaskStatusSchema.parse(body);
  const task = await taskService.updateTaskStatus(id, user.org_id, status as TaskStatus, user.id, user.role);
  return sendSuccessResp(c, 200, "Task status updated", { task });
}

export async function deleteTask(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  await taskService.deleteTask(id, user.org_id, user.id, user.role);
  return sendSuccessResp(c, 200, "Task deleted");
}
