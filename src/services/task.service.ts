import { and, count, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { TaskStatus } from "../types/app.types.js";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "../validations/schema/task.schema.js";

import { db } from "../db/configuration.js";
import { projects } from "../db/schema/projects.js";
import type { Project } from "../db/schema/projects.js";
import { tasks } from "../db/schema/tasks.js";
import type { Task } from "../db/schema/tasks.js";
import { users } from "../db/schema/users.js";
import type { User } from "../db/schema/users.js";
import BadRequestException from "../exceptions/badRequestException.js";
import ForbiddenException from "../exceptions/forbiddenException.js";
import NotFoundException from "../exceptions/notFoundException.js";
import {
  deleteRecordById,
  getMultipleRecordsByAColumnValue,
  getSingleRecordByMultipleColumnValues,
  saveSingleRecord,
  updateRecordById,
} from "./db/baseDbService.js";
import { cacheService } from "./cache.service.js";

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "BLOCKED"],
  DONE: [],
  BLOCKED: ["TODO", "IN_PROGRESS", "IN_REVIEW"],
};

async function getOrgProjectIds(orgId: number): Promise<number[]> {
  const orgProjects = await getMultipleRecordsByAColumnValue<Project>(projects, "org_id", orgId, "eq");
  return orgProjects.map(p => p.id);
}

async function createTask(input: CreateTaskInput, orgId: number, userId: number) {
  const projectIds = await getOrgProjectIds(orgId);
  if (!projectIds.includes(input.project_id)) throw new NotFoundException("Project not found");

  if (input.assignee_id) {
    const assignee = await getSingleRecordByMultipleColumnValues<User>(
      users, ["id", "org_id"], [input.assignee_id, orgId], ["eq", "eq"],
    );
    if (!assignee) throw new NotFoundException("Assignee not found in organization");
  }

  const task = await saveSingleRecord<Task>(tasks, { ...input, created_by: userId });

  if (input.assignee_id) {
    await cacheService.invalidateTasksCache(input.assignee_id);
  }
  return task;
}

async function listTasks(query: ListTasksQuery, orgId: number, requestingUserId: number, requestingUserRole: string) {
  const { page, limit, status, priority, assignee_id } = query;
  const effectiveAssigneeId = requestingUserRole === "MEMBER" ? requestingUserId : assignee_id;

  // serve from cache when querying by single assignee with no extra filters
  if (effectiveAssigneeId && !status && !priority) {
    const cached = await cacheService.getTasksCache(effectiveAssigneeId);
    if (cached) {
      const total = cached.length;
      const offset = (page - 1) * limit;
      return {
        pagination_info: {
          total_records: total,
          total_pages: Math.ceil(total / limit) || 1,
          page_size: limit,
          current_page: page,
          next_page: page * limit < total ? page + 1 : null,
          prev_page: page > 1 ? page - 1 : null,
        },
        records: cached.slice(offset, offset + limit),
        from_cache: true,
      };
    }
  }

  const projectIds = await getOrgProjectIds(orgId);
  if (projectIds.length === 0) {
    return {
      pagination_info: { total_records: 0, total_pages: 1, page_size: limit, current_page: page, next_page: null, prev_page: null },
      records: [],
    };
  }

  // build conditions using proper Drizzle operators (no raw sql templates)
  const conditions: SQL[] = [inArray(tasks.project_id, projectIds)];
  if (effectiveAssigneeId) conditions.push(eq(tasks.assignee_id, effectiveAssigneeId));
  if (status) conditions.push(eq(tasks.status, status));
  if (priority) conditions.push(eq(tasks.priority, priority));

  const whereClause = and(...conditions);
  const offset = (page - 1) * limit;

  const [countResult, records] = await Promise.all([
    db.select({ total: count(tasks.id) }).from(tasks).where(whereClause),
    db.query.tasks.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (t, { desc }) => [desc(t.created_at)],
      with: {
        assignee: { columns: { id: true, name: true, email: true } },
        creator: { columns: { id: true, name: true } },
        project: { columns: { id: true, name: true } },
      },
    }),
  ]);

  const total_records = countResult[0]?.total ?? 0;
  const total_pages = Math.ceil(total_records / limit) || 1;

  // populate cache for assignee-only queries (no extra filters, reasonable size)
  if (effectiveAssigneeId && !status && !priority && total_records <= 500) {
    const allTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.project_id, projectIds), eq(tasks.assignee_id, effectiveAssigneeId)),
      with: {
        assignee: { columns: { id: true, name: true, email: true } },
        creator: { columns: { id: true, name: true } },
        project: { columns: { id: true, name: true } },
      },
    });
    await cacheService.setTasksCache(effectiveAssigneeId, allTasks);
  }

  return {
    pagination_info: {
      total_records,
      total_pages,
      page_size: limit,
      current_page: page,
      next_page: page >= total_pages ? null : page + 1,
      prev_page: page <= 1 ? null : page - 1,
    },
    records,
  };
}

async function getTaskById(id: number, orgId: number, requestingUserId: number, requestingUserRole: string) {
  const projectIds = await getOrgProjectIds(orgId);
  if (projectIds.length === 0) throw new NotFoundException("Task not found");

  const task = await db.query.tasks.findFirst({
    where: (t, { eq, and, inArray }) => and(eq(t.id, id), inArray(t.project_id, projectIds)),
    with: {
      assignee: { columns: { id: true, name: true, email: true } },
      creator: { columns: { id: true, name: true } },
      project: { columns: { id: true, name: true } },
    },
  });

  if (!task) throw new NotFoundException("Task not found");

  if (requestingUserRole === "MEMBER" && task.assignee_id !== requestingUserId) {
    throw new ForbiddenException("You can only view tasks assigned to you");
  }

  return task;
}

async function updateTask(id: number, orgId: number, input: UpdateTaskInput, requestingUserId: number, requestingUserRole: string) {
  const task = await getTaskById(id, orgId, requestingUserId, requestingUserRole);
  const oldAssigneeId = task.assignee_id;

  if (input.assignee_id) {
    const assignee = await getSingleRecordByMultipleColumnValues<User>(
      users, ["id", "org_id"], [input.assignee_id, orgId], ["eq", "eq"],
    );
    if (!assignee) throw new NotFoundException("Assignee not found in organization");
  }

  const updated = await updateRecordById<Task>(tasks, id, input as any);

  if (oldAssigneeId) await cacheService.invalidateTasksCache(oldAssigneeId);
  if (input.assignee_id && input.assignee_id !== oldAssigneeId) {
    await cacheService.invalidateTasksCache(input.assignee_id);
  }
  return updated;
}

async function updateTaskStatus(id: number, orgId: number, newStatus: TaskStatus, requestingUserId: number, requestingUserRole: string) {
  const task = await getTaskById(id, orgId, requestingUserId, requestingUserRole);

  const canChange = requestingUserRole === "ADMIN"
    || requestingUserRole === "MANAGER"
    || task.assignee_id === requestingUserId;

  if (!canChange) throw new ForbiddenException("Only the assignee or a manager can update task status");

  const allowed = VALID_TRANSITIONS[task.status as TaskStatus];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid status transition from ${task.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }

  const updated = await updateRecordById<Task>(tasks, id, { status: newStatus } as any);

  if (task.assignee_id) await cacheService.invalidateTasksCache(task.assignee_id);
  return updated;
}

async function deleteTask(id: number, orgId: number, requestingUserId: number, requestingUserRole: string) {
  const task = await getTaskById(id, orgId, requestingUserId, requestingUserRole);
  await deleteRecordById<Task>(tasks, id);
  if (task.assignee_id) await cacheService.invalidateTasksCache(task.assignee_id);
  return { id };
}

export const taskService = { createTask, listTasks, getTaskById, updateTask, updateTaskStatus, deleteTask };
