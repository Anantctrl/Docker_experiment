# Docker Baseline Audit

## 1. Environment

- Docker Desktop: 4.84.0

- Docker Engine: 29.6.2

- Docker Compose: 5.3.1

- Docker context: desktop-linux

- Architecture: linux/amd64

- Image storage: containerd snapshotter

## 2. Repository

- Dockerfile: Present

- compose.yaml: Present

- .dockerignore: Present

- .gitignore: Present

- package-lock.json: Present

- Git working tree: Clean at initial inspection

## 3. Compose Configuration

- Configuration validation: PASS

- Services: db, api

- Database image: postgres:16-alpine

- API image: dockertests-api

## 4. Dockerfile Architecture

- Multi-stage build: Yes

- Base image: node:24-alpine

- Working directory: /app

- Dependency installation: npm ci

- Prisma generation: Successful

- NestJS compilation: Successful

## 5. Build Results

- Build result: SUCCESS

- Image: dockertests-api:latest

- Image ID: 033135d252ef

- Build context: 49.36 KB

- Content size: 195471164 bytes

- Local disk usage reported: 965 MB

## 6. Image Inspection

- Storage driver: containerd snapshotter

- Runtime user: root (UID 0)

- Working directory: /app

- Runtime command: node dist/main

- NODE_ENV: production

- Exposed port: 3000/tcp

## 7. Layer Analysis

- node_modules COPY layer: 587 MB

- dist COPY layer: 1.1 MB

- prisma COPY layer: 45.1 KB

- package.json COPY layer: 12.3 KB

## 8. Identified Improvements

- Runtime image contains development dependencies.

- Application runs as root.

- Runtime image needs dependency optimization.

- logs directory needs exclusion review.

- Database credentials need improved secret management.

- JWT fallback secrets are unsuitable for production.

- API healthcheck needs implementation.

- Dependency vulnerabilities need investigation.

- Prisma migration execution needs a better deployment strategy.

## 9. Baseline Conclusion

The existing Docker image builds successfully.

Prisma Client generation and NestJS compilation both succeed.

However, the image is not yet production-hardened.

The identified issues will be addressed progressively in the

subsequent Docker engineering phases.

## 10. Evidence

- Docker version and info commands

- Compose configuration validation

- Docker image build output

- Docker image inspection output

- Docker image history

- Runtime user verification
