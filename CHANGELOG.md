# Changelog

All notable changes to the Task Manager API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-28

### Added

- **Authentication**: JWT access + refresh tokens, secure bcrypt password hashing, session revocation, logout-all
- **Users**: Profile management (GET/PATCH `/users/me`), roles (ADMIN/MEMBER)
- **Projects**: CRUD, membership management, role-based access control, project listing with pagination
- **Tasks**: CRUD with filtering (status, priority, assignee, project), pagination, assignment to project members
- **Comments**: Task comments with full CRUD and activity tracking
- **Notifications**: User notifications with read/unread status
- **Health**: API health endpoint (`/health`) with database connectivity check
- **Documentation**: OpenAPI/Swagger UI at `/api/v1/docs`
- **Database**: PostgreSQL with Prisma ORM, UUIDs, foreign keys, indexes, cascading deletes, seed script
- **Containerization**: Multi-stage Dockerfile, Docker Compose for local development
- **Testing**: Jest + Supertest, unit tests, integration tests (auth, projects, tasks, authorization)
- **CI/CD**: GitHub Actions workflow (lint, type-check, unit tests, integration tests, build)
- **Code quality**: ESLint + Prettier, structured logging with Winston
- **Docs**: README, LICENSE (MIT), CONTRIBUTING.md, SECURITY.md, DEPLOYMENT.md

### Security

- Resource-level authorization enforced on all endpoints
- Input validation via class-validator
- Rate limiting support
- No secrets committed; `.env.example` uses safe placeholders
