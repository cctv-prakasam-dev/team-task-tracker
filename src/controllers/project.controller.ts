import type { Context } from "hono";

import { createProjectSchema, updateProjectSchema } from "../validations/schema/project.schema.js";
import { projectService } from "../services/project.service.js";
import { sendSuccessResp } from "../utils/respUtils.js";

export async function createProject(c: Context) {
  const user = c.get("user");
  const body = await c.req.json();
  const input = createProjectSchema.parse(body);
  const project = await projectService.createProject(input, user.org_id, user.id);
  return sendSuccessResp(c, 201, "Project created", project);
}

export async function listProjects(c: Context) {
  const user = c.get("user");
  const projects = await projectService.listProjects(user.org_id);
  return sendSuccessResp(c, 200, "Projects retrieved", projects);
}

export async function getProjectById(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const project = await projectService.getProjectById(id, user.org_id);
  return sendSuccessResp(c, 200, "Project retrieved", project);
}

export async function updateProject(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const input = updateProjectSchema.parse(body);
  const project = await projectService.updateProject(id, user.org_id, input);
  return sendSuccessResp(c, 200, "Project updated", project);
}

export async function deleteProject(c: Context) {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  await projectService.deleteProject(id, user.org_id);
  return sendSuccessResp(c, 200, "Project deleted");
}
