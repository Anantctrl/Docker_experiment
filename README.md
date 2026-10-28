# Task Manager API

Open-source REST API for task and project management. Built with NestJS, TypeScript, PostgreSQL, Prisma, and Docker.

## Features

- **Authentication**: JWT access + refresh tokens, secure password hashing, session revocation
- **Users**: Profile management, roles and permissions
- **Projects**: CRUD, membership, role-based access control
- **Tasks**: CRUD, assignment, status, priority, due dates, filtering, pagination
- **Comments**: Task comments with activity tracking
- **Notifications**: User notifications with read/unread status
- **Health**: API health endpoint with database connectivity check
- **Documentation**: OpenAPI/Swagger UI at `/api/v1/docs`

## Technology Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose
- **CI**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js v24+
- Docker & Docker Compose
- npm

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-org/task-manager-api.git
cd task-manager-api

# 2. Configure local environment
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the database
docker compose up -d db

# 5. Generate Prisma client
npx prisma generate

# 6. Apply database migrations
npx prisma migrate deploy

# 7. (Optional) Seed sample data
npm run prisma:seed

# 8. Start the API
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.
Swagger documentation at `http://localhost:3000/api/v1/docs`.

### Docker Compose (Full Stack)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f api

# Stop all services
docker compose down
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/login` | Authenticate and get tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/logout-all` | Revoke all sessions |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update current user profile |
| GET | `/users/me/projects` | List accessible projects |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List accessible projects |
| POST | `/projects` | Create a project |
| GET | `/projects/:id` | Get project details |
| PATCH | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project (owner only) |
| POST | `/projects/:id/members` | Add a project member |
| DELETE | `/projects/:id/members/:userId` | Remove a project member |
| POST | `/projects/:id/leave` | Leave a project |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Search and list tasks (with filters) |
| POST | `/tasks` | Create a task |
| GET | `/tasks/:id` | Get task details |
| PATCH | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/comments` | Add a comment to a task |
| GET | `/comments/task/:taskId` | List comments for a task |
| PATCH | `/comments/:id` | Update a comment (author only) |
| DELETE | `/comments/:id` | Delete a comment |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| PATCH | `/notifications/read-all` | Mark all notifications as read |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check API health |

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e
```

## Project Structure

```
task-manager-api/
├── src/
│   ├── auth/           # Authentication module
│   ├── users/          # User management
│   ├── projects/       # Projects & memberships
│   ├── tasks/          # Task CRUD
│   ├── comments/       # Task comments
│   ├── notifications/  # User notifications
│   ├── health/         # Health checks
│   ├── database/       # Prisma service
│   ├── common/         # Common utilities (logging, exceptions, interceptors)
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma   # Database schema
│   ├── seed.ts         # Seed script
│   └── migrations/     # Database migrations
├── test/
│   ├── integration/
│   └── e2e/
├── docs/
├── .github/
│   └── workflows/
│       └── ci.yml
├── Dockerfile
├── compose.yaml
├── .env.example
├── .gitignore
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

## Database Schema

The API uses UUIDs for all entity identifiers with `created_at` and `updated_at` timestamps. Key entities:

- **User**: Accounts with email, password hash, role (ADMIN/MEMBER)
- **Project**: Owned by a user, with members and tasks
- **ProjectMember**: Join table linking users to projects with roles
- **Task**: Belongs to a project, with assignee, status, priority, due date
- **Comment**: Belongs to a task, with author
- **Notification**: Belongs to a user, with type and read status
- **Session**: Refresh token storage for JWT rotation
- **ActivityLog**: Audit trail for task and project changes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## Security

See [SECURITY.md](SECURITY.md) for security policies and vulnerability reporting.

## License

MIT License - see [LICENSE](LICENSE) for details.
