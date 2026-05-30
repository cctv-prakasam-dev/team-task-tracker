import { projects } from "../db/schema/projects.js";
import NotFoundException from "../exceptions/notFoundException.js";
import { deleteRecordById, getMultipleRecordsByAColumnValue, getSingleRecordByMultipleColumnValues, saveSingleRecord, updateRecordById, } from "./db/baseDbService.js";
async function createProject(input, orgId, userId) {
    return saveSingleRecord(projects, { ...input, org_id: orgId, created_by: userId });
}
async function listProjects(orgId) {
    return getMultipleRecordsByAColumnValue(projects, "org_id", orgId, "eq");
}
async function getProjectById(id, orgId) {
    const project = await getSingleRecordByMultipleColumnValues(projects, ["id", "org_id"], [id, orgId], ["eq", "eq"]);
    if (!project)
        throw new NotFoundException("Project not found");
    return project;
}
async function updateProject(id, orgId, input) {
    await getProjectById(id, orgId);
    return updateRecordById(projects, id, input);
}
async function deleteProject(id, orgId) {
    await getProjectById(id, orgId);
    return deleteRecordById(projects, id);
}
export const projectService = { createProject, listProjects, getProjectById, updateProject, deleteProject };
