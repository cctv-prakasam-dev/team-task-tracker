import * as dotenv from "dotenv";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { organizations } from "./src/db/schema/organizations.js";
import { projects } from "./src/db/schema/projects.js";
import { tasks } from "./src/db/schema/tasks.js";
import { users } from "./src/db/schema/users.js";
import { hashPassword } from "./src/utils/passwordUtils.js";

dotenv.config();

const { Pool } = pg;

// ─── Realistic data pools ────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Barbara", "David", "Susan", "Richard", "Jessica", "Joseph", "Sarah",
  "Thomas", "Karen", "Charles", "Lisa", "Christopher", "Nancy", "Daniel", "Betty",
  "Matthew", "Margaret", "Anthony", "Sandra", "Donald", "Ashley", "Mark", "Emily",
  "Paul", "Donna", "Steven", "Michelle", "Andrew", "Carol", "Kenneth", "Amanda",
  "Kevin", "Melissa", "Brian", "Deborah", "George", "Stephanie", "Edward", "Rebecca",
  "Ronald", "Sharon",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts",
];

const COMPANY_NAMES = [
  "Apex Tech", "Nova Labs", "Peak Systems", "Vibe Solutions", "Core Digital",
  "Edge Works", "Flux Group", "Grid Ventures", "Hive Studio", "Iris Corp",
  "Jolt Technologies", "Keen Analytics", "Luma Software", "Mint Platforms",
  "Nest Innovations", "Orion Networks", "Pixel Dynamics", "Quest Enterprises",
  "Ridge Computing", "Spark Creations",
];

const PROJECT_PREFIXES = [
  "Customer", "Internal", "Mobile", "Web", "Analytics", "Security",
  "Payment", "Auth", "Dashboard", "Reporting", "Data", "Cloud",
  "Backend", "Frontend", "DevOps", "AI", "Integration", "Admin", "User", "API",
];

const PROJECT_SUFFIXES = [
  "Platform", "Portal", "System", "Service", "API", "App",
  "Module", "Tool", "Engine", "Pipeline", "Migration", "Refactor",
  "Dashboard", "Automation", "Optimization", "Gateway", "Layer", "Hub", "Suite", "Framework",
];

const TASK_VERBS = [
  "Implement", "Build", "Design", "Refactor", "Fix", "Optimize",
  "Test", "Deploy", "Review", "Migrate", "Document", "Investigate",
  "Update", "Create", "Remove", "Configure", "Integrate", "Debug", "Analyze", "Setup",
];

const TASK_SUBJECTS = [
  "authentication module", "dashboard UI", "REST API endpoints", "database schema",
  "unit tests", "CI/CD pipeline", "login page", "user profile page",
  "notification system", "search feature", "payment gateway", "email service",
  "cache layer", "error handling", "rate limiting logic", "admin panel",
  "reporting module", "data migration script", "API documentation", "deployment script",
  "background job queue", "webhook handler", "OAuth integration", "file upload service",
  "audit logging", "session management", "role-based access", "data export feature",
  "CSV import parser", "PDF generator",
];

const TASK_DESCRIPTIONS = [
  "This task involves implementing the core functionality with proper error handling and tests.",
  "Needs careful consideration of edge cases and performance implications.",
  "Coordinate with the backend team for API contract agreement before starting.",
  "Ensure backwards compatibility and write migration rollback scripts.",
  "Follow the existing code patterns and update relevant documentation.",
  "Blocked by upstream dependency — check with the infrastructure team.",
  "Performance benchmark required before and after implementation.",
  "Covered by acceptance criteria in the linked ticket — no scope creep.",
  "Security review required before merging to main branch.",
  "Add monitoring and alerting after deployment is complete.",
];

const PRIORITIES = ["LOW", "MEDIUM", "MEDIUM", "MEDIUM", "HIGH", "HIGH"] as const;
const STATUSES  = ["TODO", "TODO", "TODO", "IN_PROGRESS", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] as const;
const ROLES     = ["MEMBER", "MEMBER", "MEMBER", "MEMBER", "MEMBER", "MANAGER", "ADMIN"] as const;

const ORG_COUNT     = 20;
const USER_COUNT    = 10_000;
const PROJECT_COUNT = 10_000;
const TASK_COUNT    = 10_000;
const BATCH_SIZE    = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + randomInt(1, 365));
  return d.toISOString().split("T")[0]!;
}

function pastDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(1, 180));
  return d.toISOString().split("T")[0]!;
}

async function insertBatches<T extends object>(
  db: ReturnType<typeof drizzle>,
  table: any,
  records: T[],
  label: string,
): Promise<{ id: number }[]> {
  const all: { id: number }[] = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const inserted = await db.insert(table).values(batch).returning({ id: table.id });
    all.push(...(inserted as { id: number }[]));
    process.stdout.write(`\r  ${label}: ${Math.min(i + BATCH_SIZE, records.length).toLocaleString()} / ${records.length.toLocaleString()}`);
  }
  console.log();
  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  let ssl: pg.PoolConfig["ssl"] = false;
  try {
    const ca = fs.readFileSync("./ca.pem").toString();
    ssl = { rejectUnauthorized: true, ca };
  } catch {
    // no ca.pem — local dev without SSL
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  });

  const db = drizzle(pool);

  // ── Guard: skip if already seeded ────────────────────────────────────────
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM organizations");
  if (rows[0].count > 0) {
    console.log("Database already seeded — skipping.");
    await pool.end();
    return;
  }

  console.log("Seeding database with 10,000 records per table...\n");
  const startTime = Date.now();

  // ── 1. Organizations ─────────────────────────────────────────────────────
  console.log("1/4  Organizations...");
  const orgRows = COMPANY_NAMES.map((name) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  }));
  const insertedOrgs = await db.insert(organizations).values(orgRows).returning({ id: organizations.id });
  const orgIds = insertedOrgs.map((o) => o.id);
  console.log(`     ✓ ${orgIds.length} organizations`);

  // ── 2. Users ─────────────────────────────────────────────────────────────
  console.log("2/4  Users...");
  const commonHash = await hashPassword("Demo@1234");

  // Known demo users in org[0]
  const demoOrgId = orgIds[0]!;
  const demoInserted = await db.insert(users).values([
    { name: "Admin User",   email: "admin@demo.com",   password_hash: commonHash, role: "ADMIN",   org_id: demoOrgId },
    { name: "Manager User", email: "manager@demo.com", password_hash: commonHash, role: "MANAGER", org_id: demoOrgId },
    { name: "Member User",  email: "member@demo.com",  password_hash: commonHash, role: "MEMBER",  org_id: demoOrgId },
  ]).returning({ id: users.id, org_id: users.org_id });

  // Build usersByOrg map
  const usersByOrg = new Map<number, number[]>();
  orgIds.forEach((id) => usersByOrg.set(id, []));
  demoInserted.forEach((u) => usersByOrg.get(u.org_id)!.push(u.id));

  // Bulk users
  const bulkUsers = Array.from({ length: USER_COUNT - 3 }, (_, i) => {
    const orgId    = orgIds[i % ORG_COUNT]!;
    const firstName = pick(FIRST_NAMES);
    const lastName  = pick(LAST_NAMES);
    return {
      name:          `${firstName} ${lastName}`,
      email:         `user${i + 4}@org${orgId}.example.com`,
      password_hash: commonHash,
      role:          pick(ROLES),
      org_id:        orgId,
    };
  });

  for (let i = 0; i < bulkUsers.length; i += BATCH_SIZE) {
    const batch    = bulkUsers.slice(i, i + BATCH_SIZE);
    const inserted = await db.insert(users).values(batch).returning({ id: users.id, org_id: users.org_id });
    inserted.forEach((u) => usersByOrg.get(u.org_id)!.push(u.id));
    process.stdout.write(`\r  Users: ${Math.min(i + BATCH_SIZE + 3, USER_COUNT).toLocaleString()} / ${USER_COUNT.toLocaleString()}`);
  }
  console.log(`\n     ✓ ${USER_COUNT.toLocaleString()} users`);

  // ── 3. Projects ──────────────────────────────────────────────────────────
  console.log("3/4  Projects...");
  const projectsByOrg = new Map<number, number[]>();
  orgIds.forEach((id) => projectsByOrg.set(id, []));

  const bulkProjects = Array.from({ length: PROJECT_COUNT }, (_, i) => {
    const orgId    = orgIds[i % ORG_COUNT]!;
    const orgUsers = usersByOrg.get(orgId)!;
    return {
      name:        `${pick(PROJECT_PREFIXES)} ${pick(PROJECT_SUFFIXES)} ${i + 1}`,
      description: `Scope: deliver the ${pick(PROJECT_SUFFIXES).toLowerCase()} for ${pick(PROJECT_PREFIXES).toLowerCase()} use cases.`,
      org_id:      orgId,
      created_by:  orgUsers[0]!,
    };
  });

  for (let i = 0; i < bulkProjects.length; i += BATCH_SIZE) {
    const batch    = bulkProjects.slice(i, i + BATCH_SIZE);
    const inserted = await db.insert(projects).values(batch).returning({ id: projects.id, org_id: projects.org_id });
    inserted.forEach((p) => projectsByOrg.get(p.org_id)!.push(p.id));
    process.stdout.write(`\r  Projects: ${Math.min(i + BATCH_SIZE, PROJECT_COUNT).toLocaleString()} / ${PROJECT_COUNT.toLocaleString()}`);
  }
  console.log(`\n     ✓ ${PROJECT_COUNT.toLocaleString()} projects`);

  // ── 4. Tasks ─────────────────────────────────────────────────────────────
  console.log("4/4  Tasks...");
  const bulkTasks = Array.from({ length: TASK_COUNT }, (_, i) => {
    const orgId      = orgIds[i % ORG_COUNT]!;
    const orgUsers   = usersByOrg.get(orgId)!;
    const orgProjects = projectsByOrg.get(orgId)!;
    const status     = pick(STATUSES);
    const isActive   = status === "TODO" || status === "IN_PROGRESS" || status === "IN_REVIEW";

    return {
      title:       `${pick(TASK_VERBS)} ${pick(TASK_SUBJECTS)}`,
      description: pick(TASK_DESCRIPTIONS),
      priority:    pick(PRIORITIES),
      status,
      assignee_id: orgUsers.length > 1 ? orgUsers[randomInt(0, orgUsers.length - 1)]! : null,
      project_id:  orgProjects[i % orgProjects.length]!,
      due_date:    isActive ? futureDateStr() : pastDateStr(),
      created_by:  orgUsers[0]!,
    };
  });

  for (let i = 0; i < bulkTasks.length; i += BATCH_SIZE) {
    const batch = bulkTasks.slice(i, i + BATCH_SIZE);
    await db.insert(tasks).values(batch);
    process.stdout.write(`\r  Tasks: ${Math.min(i + BATCH_SIZE, TASK_COUNT).toLocaleString()} / ${TASK_COUNT.toLocaleString()}`);
  }
  console.log(`\n     ✓ ${TASK_COUNT.toLocaleString()} tasks`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅  Seeding complete in ${elapsed}s`);
  console.log("─".repeat(40));
  console.log("Demo login credentials  (password: Demo@1234)");
  console.log("  ADMIN   →  admin@demo.com");
  console.log("  MANAGER →  manager@demo.com");
  console.log("  MEMBER  →  member@demo.com");
  console.log("─".repeat(40));

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
