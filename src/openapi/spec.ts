export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Team Task Tracker API",
    description: "REST API for managing tasks within a team. Supports JWT auth, role-based access control, and Redis caching.",
    version: "1.0.0",
  },
  servers: [{ url: "/api/v1", description: "API v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "integer", example: 400 },
          code: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string", example: "due_date must be a future date" },
        },
      },
      PaginationInfo: {
        type: "object",
        properties: {
          total_records: { type: "integer" },
          total_pages: { type: "integer" },
          page_size: { type: "integer" },
          current_page: { type: "integer" },
          next_page: { type: "integer", nullable: true },
          prev_page: { type: "integer", nullable: true },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "MANAGER", "MEMBER"] },
          org_id: { type: "integer" },
          is_active: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          org_id: { type: "integer" },
          created_by: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] },
          assignee_id: { type: "integer", nullable: true },
          project_id: { type: "integer" },
          due_date: { type: "string", format: "date", nullable: true },
          created_by: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user and organization",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "org_name"],
                properties: {
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", format: "email", example: "john@acme.com" },
                  password: { type: "string", minLength: 8, example: "password123" },
                  role: { type: "string", enum: ["ADMIN", "MANAGER", "MEMBER"], default: "MEMBER" },
                  org_name: { type: "string", example: "Acme Corp" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          409: { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and get JWT tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "john@acme.com" },
                  password: { type: "string", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    access_token: { type: "string" },
                    refresh_token: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refresh_token"],
                properties: { refresh_token: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Tokens refreshed" },
          401: { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout and revoke refresh token",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { refresh_token: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Logged out successfully" } },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List all users in organization (ADMIN only)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Users list" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user by ID (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "User details" }, 404: { description: "User not found" } },
      },
      put: {
        tags: ["Users"],
        summary: "Update user (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  is_active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "User updated" }, 404: { description: "User not found" } },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "User deleted" }, 404: { description: "User not found" } },
      },
    },
    "/projects": {
      post: {
        tags: ["Projects"],
        summary: "Create project (ADMIN, MANAGER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Website Redesign" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Project created" } },
      },
      get: {
        tags: ["Projects"],
        summary: "List all projects in organization",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Projects list" } },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Project details" }, 404: { description: "Not found" } },
      },
      put: {
        tags: ["Projects"],
        summary: "Update project (ADMIN, MANAGER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, description: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Project updated" } },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete project (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Project deleted" } },
      },
    },
    "/tasks": {
      post: {
        tags: ["Tasks"],
        summary: "Create task (ADMIN, MANAGER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "project_id"],
                properties: {
                  title: { type: "string", example: "Design homepage" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
                  assignee_id: { type: "integer" },
                  project_id: { type: "integer" },
                  due_date: { type: "string", format: "date", example: "2026-12-31" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Task created" } },
      },
      get: {
        tags: ["Tasks"],
        summary: "List tasks with pagination and filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] } },
          { name: "assignee_id", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Paginated task list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pagination_info: { $ref: "#/components/schemas/PaginationInfo" },
                    records: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get task by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Task details" }, 404: { description: "Not found" } },
      },
      put: {
        tags: ["Tasks"],
        summary: "Update task (ADMIN, MANAGER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                  assignee_id: { type: "integer", nullable: true },
                  due_date: { type: "string", format: "date", nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Task updated" } },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete task (ADMIN, MANAGER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Task deleted" } },
      },
    },
    "/tasks/{id}/status": {
      patch: {
        tags: ["Tasks"],
        summary: "Update task status (assignee or MANAGER/ADMIN). Enforces valid transitions.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Status updated" },
          400: { description: "Invalid status transition" },
          403: { description: "Not the assignee or manager" },
        },
      },
    },
  },
};
