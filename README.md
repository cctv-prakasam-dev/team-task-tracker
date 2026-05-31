# Team Task Tracker API

A REST API for managing tasks within a team, with JWT authentication, role-based access control, Redis caching, and containerized deployment.

---

## Quick Start

```bash
docker compose up --build
```

That's it. The following happens automatically:
1. PostgreSQL and Redis start
2. Database migrations run
3. Seed data is loaded (10,000 records per table)
4. API starts at **http://localhost:3000**

### Demo credentials (password: `Demo@1234`)

| Role | Email |
|------|-------|
| ADMIN | admin@demo.com |
| MANAGER | manager@demo.com |
| MEMBER | member@demo.com |

### Swagger UI

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

OpenAPI JSON spec: `http://localhost:3000/api-docs/spec.json`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Hono 4.x (Node.js) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 + ioredis |
| Auth | JWT — access token + refresh token rotation |
| Validation | Zod |
| Password | bcryptjs (12 rounds) |
| Container | Docker + docker-compose |

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth — no authentication required
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register a new user and create an organisation |
| POST | /auth/login | Login — returns access token + refresh token |
| POST | /auth/refresh-token | Rotate refresh token (old one is revoked) |
| POST | /auth/logout | Revoke the current refresh token |

### Users — ADMIN only
| Method | Path | Description |
|--------|------|-------------|
| GET | /users | List all users in the organisation |
| GET | /users/:id | Get a user by ID |
| PUT | /users/:id | Update user name or active status |
| DELETE | /users/:id | Delete a user |

### Projects — authenticated
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /projects | ADMIN, MANAGER | Create a project |
| GET | /projects | All | List all projects in the organisation |
| GET | /projects/:id | All | Get a project |
| PUT | /projects/:id | ADMIN, MANAGER | Update a project |
| DELETE | /projects/:id | ADMIN | Delete a project |

### Tasks — authenticated
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /tasks | ADMIN, MANAGER | Create a task |
| GET | /tasks | All | List tasks with pagination + filters (MEMBER sees only own) |
| GET | /tasks/:id | All | Get a task (MEMBER sees only own) |
| PUT | /tasks/:id | ADMIN, MANAGER | Update task fields |
| PATCH | /tasks/:id/status | Assignee or MANAGER/ADMIN | Advance task status |
| DELETE | /tasks/:id | ADMIN, MANAGER | Delete a task |

#### Task list query parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Records per page (default: 20, max: 100) |
| status | string | Filter by status (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED) |
| priority | string | Filter by priority (LOW, MEDIUM, HIGH) |
| assignee_id | number | Filter by assignee user ID |

---

## Role Permissions

| Permission | ADMIN | MANAGER | MEMBER |
|-----------|:-----:|:-------:|:------:|
| Manage users | ✓ | ✗ | ✗ |
| Manage projects | ✓ | ✓ | ✗ |
| Create / delete tasks | ✓ | ✓ | ✗ |
| View all tasks | ✓ | ✓ | ✗ |
| View own assigned tasks | ✓ | ✓ | ✓ |
| Advance task status | ✓ | ✓ | ✓ (own tasks only) |

RBAC is enforced exclusively at the middleware layer — no role checks exist inside controllers.

---

## Task Status Transitions

Valid transitions are enforced server-side. Free-form status changes are rejected.

```
TODO  ──►  IN_PROGRESS  ──►  IN_REVIEW  ──►  DONE
  │              │                │
  └──────────────┴────────────────┴──►  BLOCKED
                                              │
                              ◄───────────────┘
                     (back to TODO / IN_PROGRESS / IN_REVIEW)
```

Only the **assignee** or a **MANAGER / ADMIN** can change a task's status.

---

## Error Response Format

Every error response — validation, auth, not found, forbidden — uses the same shape:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date"
}
```

| Code | HTTP Status |
|------|------------|
| BAD_REQUEST | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| VALIDATION_ERROR | 422 |

---

## Caching Strategy

**Engine:** Redis via ioredis  
**Cache key pattern:** `tasks:assignee:{userId}`  
**TTL:** 300 seconds (5 minutes)

### How it works

When `GET /tasks` is called with an `assignee_id` filter and no additional filters, the service checks Redis first:
- **Cache hit** → return the stored list, paginate in memory — zero DB queries
- **Cache miss** → query PostgreSQL, store full result in Redis, return page

### Invalidation triggers

| Event | Cache action |
|-------|-------------|
| Task created with assignee | Delete `tasks:assignee:{assigneeId}` |
| Task updated (assignee changed) | Delete cache for old AND new assignee |
| Task updated (status / priority changed) | Delete `tasks:assignee:{assigneeId}` |
| Task deleted | Delete `tasks:assignee:{assigneeId}` |

### Why per-assignee keys?

A global task cache would require invalidation on every single write — defeating the purpose. Per-assignee keys are surgical: a change to User A's task never touches User B's cache. The most common read pattern in a task tracker is "show me my tasks", which maps directly to one cache key per user.

---

## Database Design

### Schema

```
organizations   id · name · slug
users           id · name · email · password_hash · role · org_id · is_active
refresh_tokens  id · user_id · token_hash · expires_at · is_revoked
projects        id · name · description · org_id · created_by
tasks           id · title · description · priority · status · assignee_id · project_id · due_date · created_by
```

### Indexes

Required indexes on the `tasks` table (the heaviest-read table):

```sql
CREATE INDEX tasks_status_idx      ON tasks(status);
CREATE INDEX tasks_assignee_id_idx ON tasks(assignee_id);
CREATE INDEX tasks_due_date_idx    ON tasks(due_date);
```

Additional supporting indexes: `tasks_project_id_idx`, `tasks_priority_idx`, `users_email_idx` (unique), `organizations_slug_idx` (unique).

### Design decision — Why a separate `organizations` table?

Storing `org_name` as a column on the `users` table is simpler but creates redundancy and makes future org-level features (plan tier, billing, settings) impossible without a migration. A dedicated `organizations` table:

- Enforces name uniqueness via a single `slug` unique index — no full-table scan on every register
- Lets all queries be scoped to `org_id` at the service layer so one organisation can never read another's data
- Supports adding org-level configuration columns without touching the `users` schema

---

## Local Development (without Docker)

```bash
# 1. Copy environment variables
cp .env.example .env
# Fill in your local PostgreSQL and Redis credentials

# 2. Install dependencies
npm install

# 3. Run migrations
npm run migrate

# 4. Seed demo data (optional but recommended)
npm run seed

# 5. Start dev server with hot reload
npm run dev
```

---

## What I Would Improve Given More Time

1. **Integration tests** — Auth flow and task status transition tests using a dedicated test database and an isolated test runner (Vitest / Jest)
2. **Analytics endpoint** — Overdue task count per user and average completion time using PostgreSQL window functions (`OVER PARTITION BY`)
3. **Real-time notifications** — SSE stream so the assignee's client is pushed a notification the moment their task status changes
4. **Rate limiting** — Per-IP throttle on `/auth/login` and `/auth/register` to prevent brute-force attacks
5. **Soft deletes** — Add `deleted_at` timestamp to `tasks` and `projects` so history is never permanently lost
6. **Cursor-based pagination** — Replace offset pagination with a keyset cursor for consistent performance on large datasets
7. **Refresh token family tracking** — Detect refresh token reuse attacks (if a revoked token is presented, revoke the entire token family)
