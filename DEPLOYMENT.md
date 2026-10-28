# Deployment Guide

This guide covers deploying the Task Manager API to production using Docker.

## Prerequisites

- Docker and Docker Compose installed
- A domain name (optional, for TLS)
- A PostgreSQL database (or use the one provided by Docker Compose)

## Quick Start (Docker Compose)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/task-manager-api.git
cd task-manager-api

# 2. Copy the environment example
cp .env.example .env

# 3. Edit .env with production values
#    - Replace JWT_ACCESS_SECRET and JWT_REFRESH_SECRET with strong random values
#    - Set DATABASE_URL to your production database
#    - Set NODE_ENV=production

# 4. Build and start
docker compose up -d --build

# 5. Run database migrations
docker compose exec api npx prisma migrate deploy

# 6. (Optional) Seed the database
docker compose exec api npm run prisma:seed

# 7. Verify the API is running
curl http://localhost:3000/api/v1/health
```

## Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `NODE_ENV` | Environment (development/production) | No | `development` |
| `PORT` | Port the API listens on | No | `3000` |
| `API_PREFIX` | API route prefix | No | `/api/v1` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | Yes | — |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Yes | — |
| `JWT_ACCESS_EXPIRATION` | Access token expiry | No | `15m` |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry | No | `7d` |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds | No | `12` |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) | No | `60` |
| `RATE_LIMIT_MAX` | Max requests per window | No | `100` |
| `LOG_LEVEL` | Logging level | No | `info` |

### Generating Strong Secrets

```bash
# Generate a 64-character hex secret
openssl rand -hex 32
```

Use the output for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production.

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are strong, unique, and not committed
- [ ] `DATABASE_URL` points to a production PostgreSQL instance
- [ ] Database migrations have been run (`npx prisma migrate deploy`)
- [ ] HTTPS is enabled (via reverse proxy or load balancer)
- [ ] Database backups are configured
- [ ] Log rotation is configured (winston-daily-rotate-file handles this)
- [ ] Container has resource limits set

## Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Backups

```bash
# Create a backup
docker exec task-manager-db pg_dump -U taskuser taskdb > backup.sql

# Restore a backup
docker exec -i task-manager-db psql -U taskuser taskdb < backup.sql
```

## Monitoring

The API exposes a health endpoint at `/api/v1/health` that reports the status of the API and its database connection. Use this endpoint for load balancer health checks and uptime monitoring.

## Security

- Never commit `.env` files containing real credentials
- Rotate JWT secrets periodically
- Keep dependencies updated: `npm audit` and `npm audit fix`
- The API enforces resource-level authorization on all endpoints
- Rate limiting is configurable via `RATE_LIMIT_TTL` and `RATE_LIMIT_MAX`
