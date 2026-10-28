# Contributing to Task Manager API

Thank you for considering contributing to Task Manager API! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How to Contribute

### 1. Fork and Clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/task-manager-api.git
cd task-manager-api
```

### 2. Create a Branch

Create a feature branch from `main`:

```bash
git checkout -b feature/your-feature-name
```

### 3. Set Up Development Environment

Follow the setup instructions in [README.md](README.md).

### 4. Make Your Changes

- Implement one module at a time
- Write tests for new functionality
- Follow the existing code style (Prettier + ESLint)
- Update documentation as needed

### 5. Test Your Changes

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format

# Run tests
npm test
```

### 6. Commit and Push

```bash
git add .
git commit -m "feat: describe your changes"
git push origin feature/your-feature-name
```

### 7. Open a Pull Request

Open a pull request against the `main` branch. Describe your changes and reference any related issues.

## Development Guidelines

### Module Structure

Each feature module follows this structure:

```
src/<module>/
├── <module>.module.ts
├── <module>.service.ts
├── <module>.controller.ts
├── dto/
│   ├── create-<entity>.dto.ts
│   └── update-<entity>.dto.ts
└── interfaces/
    └── <entity>-response.interface.ts
```

### Engineering Rules

- Implement one module at a time
- Produce real, executable source code (no pseudocode or placeholders)
- Do not mark a feature complete until its tests pass
- Never commit secrets or use insecure default credentials
- Enforce authorization at the resource level
- Use database transactions for atomic operations
- Keep the API backward-compatible within v1
- Document setup commands and verify them against actual project scripts

### Database Changes

All schema changes must go through Prisma migrations:

```bash
npx prisma migrate dev --name <migration-name>
```

Never edit the database directly or modify existing migration files.

## Release Process

Releases follow semantic versioning. Maintainers will:

1. Create a release branch
2. Update version in `package.json`
3. Create a GitHub release with changelog
4. Tag the release

## Questions?

Open an issue if you have questions or need help getting started.
