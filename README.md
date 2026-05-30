# Team Task Tracker API

A REST API for managing tasks within a team, with authentication, role-based access control, Redis caching, and containerized deployment.

## Quick Start

```bash
docker compose up
```

The API will be available at `http://localhost:3000`. No manual setup required — migrations run automatically on startup.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Hono (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Cache | Redis |
| Auth | JWT (access + refresh token rotation) |
| Validation | Zod |
| Container | Docker + docker-compose |

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register user + create org |
| POST | /auth/login | No | Login, returns tokens |
| POST | /auth/refresh-token | No | Rotate refresh token |
| POST | /auth/logout | Yes | Revoke refresh token |

### Users (ADMIN only)
| Method | Path | Description |
|--------|------|-------------|
| GET | /users | List all users in org |
| GET | /users/:id | Get user by ID |
| PUT | /users/:id | Update user |
| DELETE | /users/:id | Delete user |

### Projects
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /projects | ADMIN, MANAGER | Create project |
| GET | /projects | All | List projects in org |
| GET | /projects/:id | All | Get project |
| PUT | /projects/:id | ADMIN, MANAGER | Update project |
| DELETE | /projects/:id | ADMIN | Delete project |

### Tasks
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /tasks | ADMIN, MANAGER | Create task |
| GET | /tasks | All | List tasks (MEMBER sees own only) |
| GET | /tasks/:id | All | Get task |
| PUT | /tasks/:id | ADMIN, MANAGER | Update task |
| PATCH | /tasks/:id/status | Assignee or MANAGER/ADMIN | Update status |
| DELETE | /tasks/:id | ADMIN, MANAGER | Delete task |

---

## Roles & Permissions

| Permission | ADMIN | MANAGER | MEMBER |
|-----------|-------|---------|--------|
| Manage users | Yes | No | No |
| Manage projects | Yes | Yes | No |
| Create/delete tasks | Yes | Yes | No |
| View all tasks | Yes | Yes | No |
| View assigned tasks | Yes | Yes | Yes |
| Update task status | Yes | Yes | Yes (own tasks only) |

---

## Task Status Transitions

```
TODO  -->  IN_PROGRESS  -->  IN_REVIEW  -->  DONE
  \              \                \
   \             \                \
    +-----------> BLOCKED <--------+
                    |
          TODO / IN_PROGRESS / IN_REVIEW
```

Only the **task assignee** or a **MANAGER/ADMIN** can change a task's status.

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date"
}
```

---

## Caching Strategy

**Engine:** Redis
**Cache key:** `tasks:assignee:{userId}`
**TTL:** 300 seconds (5 minutes)

**How it works:**
- When `GET /tasks` is called with an `assignee_id` filter (and no additional filters), the service checks Redis first
- On a cache hit, the full task list is returned from Redis and paginated in memory — no DB query
- On a cache miss, tasks are fetched from PostgreSQL and the result is stored in Redis

**Invalidation triggers:**
- Task **created** with an assignee → delete `tasks:assignee:{assigneeId}`
- Task **updated** → delete cache for old assignee AND new assignee (if changed)
- Task **deleted** → delete `tasks:assignee:{assigneeId}`
- Status change → delete `tasks:assignee:{assigneeId}`

**Why per-assignee keys?**
Surgical invalidation — only the affected user's cache is cleared. A global task cache would require invalidating on every write. Per-assignee keys ensure that a change to User A's task never invalidates User B's cache.

---

## Database Design

### Schema

```
organizations   (id, name, slug)
users           (id, name, email, password_hash, role, org_id, is_active)
refresh_tokens  (id, user_id, token_hash, expires_at, is_revoked)
projects        (id, name, description, org_id, created_by)
tasks           (id, title, description, priority, status, assignee_id, project_id, due_date, created_by)
```

### Indexes

Three indexes on the `tasks` table cover the most common filter columns:

```sql
CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date    ON tasks(due_date);
```

### Design Decision: Why a separate `organizations` table?

Users belong to an organization. Rather than storing `org_name` on every user row, a normalized `organizations` table keeps org metadata in one place and makes it easy to:
- Add org-level settings later (e.g., plan, billing)
- Query all users or projects in an org with a single JOIN
- Enforce uniqueness via `slug` without scanning the users table

All queries are scoped to `org_id` at the service layer, ensuring one org cannot access another's data.

---

## Local Development (without Docker)

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env with your local DB/Redis credentials

# 2. Install dependencies
npm install

# 3. Generate and run migrations
npm run db:generate
npm run migrate

# 4. Start dev server
npm run dev
```

---

## What I Would Improve Given More Time

1. **Tests** — Integration tests for auth flow and task status transitions using a test DB
2. **Analytics endpoint** — Overdue task count per user + average completion time using SQL window functions
3. **Real-time notifications** — SSE or WebSocket events when a task's status changes
4. **Rate limiting** — Per-IP and per-user rate limiting on auth endpoints
5. **Soft deletes** — Add `deleted_at` to tasks/projects instead of hard deletes to preserve history
6. **Pagination cursor** — Replace offset pagination with cursor-based for large datasets
7. **OpenAPI spec** — Auto-generate from Zod schemas using `@hono/zod-openapi`
