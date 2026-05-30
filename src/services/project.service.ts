import type { CreateProjectInput, UpdateProjectInput } from "../validations/schema/project.schema.js";

import { projects } from "../db/schema/projects.js";
import NotFoundException from "../exceptions/notFoundException.js";
import {
  deleteRecordById,
  getMultipleRecordsByAColumnValue,
  getSingleRecordByMultipleColumnValues,
  saveSingleRecord,
  updateRecordById,
} from "./db/baseDbService.js";
import type { Project } from "../db/schema/projects.js";

async function createProject(input: CreateProjectInput, orgId: number, userId: number) {
  return saveSingleRecord<Project>(projects, { ...input, org_id: orgId, created_by: userId });
}

async function listProjects(orgId: number) {
  return getMultipleRecordsByAColumnValue<Project>(projects, "org_id", orgId, "eq");
}

async function getProjectById(id: number, orgId: number) {
  const project = await getSingleRecordByMultipleColumnValues<Project>(
    projects,
    ["id", "org_id"],
    [id, orgId],
    ["eq", "eq"],
  );
  if (!project) throw new NotFoundException("Project not found");
  return project;
}

async function updateProject(id: number, orgId: number, input: UpdateProjectInput) {
  await getProjectById(id, orgId);
  return updateRecordById<Project>(projects, id, input as any);
}

async function deleteProject(id: number, orgId: number) {
  await getProjectById(id, orgId);
  return deleteRecordById<Project>(projects, id);
}

export const projectService = { createProject, listProjects, getProjectById, updateProject, deleteProject };
