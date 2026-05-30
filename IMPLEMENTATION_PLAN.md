# Team Task Tracker — Implementation Plan

## Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Hono 4.x |
| Language | TypeScript (strict) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Cache | Redis (ioredis) |
| Auth | JWT (access + refresh rotation) |
| Validation | Zod |
| Password | bcryptjs |
| Container | Docker + docker-compose |

---

## Directory Structure (Final)
```
src/
├── config/
│   ├── appConfig.ts          # existing
│   ├── dbConfig.ts           # existing
│   ├── jwtConfig.ts          # existing
│   └── redisConfig.ts        # NEW
├── constants/
│   ├── appMessages.ts        # existing (updated)
│   └── errorMetadata.ts      # existing
├── db/
│   ├── configuration.ts      # updated with schema
│   └── schema/
│       ├── index.ts          # exports all tables
│       ├── organizations.ts
│       ├── users.ts
│       ├── refresh_tokens.ts
│       ├── projects.ts
│       └── tasks.ts
├── exceptions/               # existing — all 9 classes
├── middlewares/
│   ├── errorHandler.ts       # global error handler → {status,code,message}
│   ├── authenticate.ts       # JWT verify → attach user to context
│   └── authorize.ts          # authorize(...roles) factory
├── services/
│   ├── db/baseDbService.ts   # existing
│   ├── cache.service.ts      # Redis get/set/del/invalidate
│   ├── auth.service.ts       # register, login, refresh, logout
│   ├── user.service.ts       # list, getById, update, deactivate
│   ├── project.service.ts    # CRUD scoped to org
│   └── task.service.ts       # CRUD + status transitions + cache
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── project.controller.ts
│   └── task.controller.ts
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── project.routes.ts
│   ├── task.routes.ts
│   └── index.route.ts        # mounts all under /api/v1
├── types/
│   ├── app.types.ts          # updated
│   └── db.types.ts           # existing
├── utils/                    # existing
└── validations/
    ├── validateRequest.ts    # existing
    └── schema/
        ├── auth.schema.ts
        ├── user.schema.ts
        ├── project.schema.ts
        └── task.schema.ts
index.ts                      # updated — mounts routes + error handler
Dockerfile
docker-compose.yml
drizzle.config.ts
migrate.ts                    # run on startup
.env.example
README.md
```

---

## Database Schema

### organizations
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PK |
| name | varchar(255) | NOT NULL |
| slug | varchar(255) | UNIQUE NOT NULL |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

### users
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PK |
| name | varchar(255) | NOT NULL |
| email | varchar(255) | UNIQUE NOT NULL |
| password_hash | varchar(255) | NOT NULL |
| role | enum(ADMIN,MANAGER,MEMBER) | NOT NULL DEFAULT MEMBER |
| org_id | integer | FK organizations.id |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

### refresh_tokens
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PK |
| user_id | integer | FK users.id |
| token_hash | varchar(512) | NOT NULL |
| expires_at | timestamp | NOT NULL |
| is_revoked | boolean | DEFAULT false |
| created_at | timestamp | DEFAULT now() |

### projects
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PK |
| name | varchar(255) | NOT NULL |
| description | text | nullable |
| org_id | integer | FK organizations.id |
| created_by | integer | FK users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

### tasks
| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PK |
| title | varchar(255) | NOT NULL |
| description | text | nullable |
| priority | enum(LOW,MEDIUM,HIGH) | DEFAULT MEDIUM |
| status | enum(TODO,IN_PROGRESS,IN_REVIEW,DONE,BLOCKED) | DEFAULT TODO |
| assignee_id | integer | FK users.id, nullable, **INDEXED** |
| project_id | integer | FK projects.id |
| due_date | date | nullable, **INDEXED** |
| created_by | integer | FK users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**Indexes:** `tasks.status`, `tasks.assignee_id`, `tasks.due_date`

---

## API Endpoints

### Auth — `/api/v1/auth`
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | /register | No | — |
| POST | /login | No | — |
| POST | /refresh-token | No | — |
| POST | /logout | Yes | All |

### Users — `/api/v1/users`
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | / | Yes | ADMIN |
| GET | /:id | Yes | ADMIN |
| PUT | /:id | Yes | ADMIN |
| DELETE | /:id | Yes | ADMIN |

### Projects — `/api/v1/projects`
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | / | Yes | ADMIN, MANAGER |
| GET | / | Yes | All |
| GET | /:id | Yes | All |
| PUT | /:id | Yes | ADMIN, MANAGER |
| DELETE | /:id | Yes | ADMIN |

### Tasks — `/api/v1/tasks`
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | / | Yes | ADMIN, MANAGER |
| GET | / | Yes | All (MEMBER sees own only) |
| GET | /:id | Yes | All (MEMBER sees own only) |
| PUT | /:id | Yes | ADMIN, MANAGER |
| PATCH | /:id/status | Yes | Assignee or MANAGER/ADMIN |
| DELETE | /:id | Yes | ADMIN, MANAGER |

---

## Status Transition Rules
```
TODO        → IN_PROGRESS, BLOCKED
IN_PROGRESS → IN_REVIEW, BLOCKED
IN_REVIEW   → DONE, BLOCKED
DONE        → (terminal — no transitions)
BLOCKED     → TODO, IN_PROGRESS, IN_REVIEW
```
Only the **assignee** or **MANAGER/ADMIN** can change a task's status.

---

## Caching Strategy
- **Engine:** Redis via ioredis
- **Cache key:** `tasks:assignee:{userId}` → JSON array of all tasks for that assignee
- **TTL:** 300 seconds (5 minutes)
- **Read:** On `GET /tasks` with `assignee_id` filter → check cache first, if hit return cached data (apply in-memory pagination/filtering)
- **Invalidation triggers:**
  - Task created with an assignee → delete `tasks:assignee:{assigneeId}`
  - Task updated (assignee/status/priority changed) → delete old and new assignee cache keys
  - Task deleted → delete `tasks:assignee:{assigneeId}`
- **Why per-assignee:** Surgical invalidation — only the affected user's cache is cleared, not the entire task cache

---

## Error Response Format (all endpoints)
```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date"
}
```

---

## Implementation Order
1. Install deps (zod, ioredis, drizzle-kit, bcryptjs)
2. DB schema files + drizzle.config.ts + migrate.ts
3. Update db/configuration.ts with full schema
4. Redis config + cache service
5. Update app.types.ts (SuccessResp, AuthUser, enums)
6. Zod validation schemas
7. Middlewares: errorHandler → authenticate → authorize
8. Services: auth → user → project → task
9. Controllers: auth → user → project → task
10. Routes + index.ts wiring
11. Dockerfile + docker-compose.yml
12. .env.example + README.md
