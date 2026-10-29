/**
 * Tasks integration tests.
 *
 * Covers task CRUD, filtering, assignment, and resource-level authorization.
 * Requires a real PostgreSQL test database (DATABASE_URL).
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { cleanDatabase, createTestApp, teardownTestApp } from './test-setup';

const BASE_URL = '/api/v1';

const uniqueEmail = () => `integration_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

async function registerAndLogin(app: INestApplication, email: string, password = 'SecurePass123!'): Promise<string> {
  await request(app.getHttpServer())
    .post(`${BASE_URL}/auth/register`)
    .send({ email, password, firstName: 'Test', lastName: 'User' });

  const res = await request(app.getHttpServer()).post(`${BASE_URL}/auth/login`).send({ email, password }).expect(200);

  return res.body.accessToken;
}

async function createUser(
  app: INestApplication,
  prisma: PrismaService,
  email: string,
  password = 'SecurePass123!'
): Promise<{ id: string; token: string }> {
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash },
    select: { id: true },
  });

  const res = await request(app.getHttpServer()).post(`${BASE_URL}/auth/login`).send({ email, password }).expect(200);

  return { id: user.id, token: res.body.accessToken };
}

async function createProject(app: INestApplication, token: string, name = 'Test Project'): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(`${BASE_URL}/projects`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name, description: 'A test project' })
    .expect(201);

  return res.body.id;
}

async function addMember(app: INestApplication, token: string, projectId: string, userId: string, role = 'MEMBER') {
  await request(app.getHttpServer())
    .post(`${BASE_URL}/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId, role })
    .expect(201);
}

describe('Tasks Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    token = await registerAndLogin(app, uniqueEmail());
    projectId = await createProject(app, token);
  });

  it('should create a task', async () => {
    const response = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        title: 'Design homepage',
        description: 'Create mockups',
        status: 'TODO',
        priority: 'HIGH',
      })
      .expect(201);

    expect(response.body.title).toBe('Design homepage');
    expect(response.body.status).toBe('TODO');
    expect(response.body.priority).toBe('HIGH');
    expect(response.body.projectId).toBe(projectId);
  });

  it('should list tasks with pagination and filters', async () => {
    await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Task 1', status: 'TODO', priority: 'HIGH' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        title: 'Task 2',
        status: 'IN_PROGRESS',
        priority: 'LOW',
      })
      .expect(201);

    // List all
    const all = await request(app.getHttpServer())
      .get(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta.total).toBe(2);

    // Filter by status
    const filtered = await request(app.getHttpServer())
      .get(`${BASE_URL}/tasks?status=TODO`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].title).toBe('Task 1');

    // Filter by priority
    const low = await request(app.getHttpServer())
      .get(`${BASE_URL}/tasks?priority=LOW`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(low.body.data).toHaveLength(1);
    expect(low.body.data[0].title).toBe('Task 2');
  });

  it('should get a task by id', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Single Task' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.id).toBe(create.body.id);
    expect(response.body.title).toBe('Single Task');
  });

  it('should update a task', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Old Title', status: 'TODO' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title', status: 'IN_PROGRESS' })
      .expect(200);

    expect(response.body.title).toBe('New Title');
    expect(response.body.status).toBe('IN_PROGRESS');
  });

  it('should assign a task to a project member', async () => {
    const { id: memberId, token: memberToken } = await createUser(app, prisma, uniqueEmail());
    await addMember(app, token, projectId, memberId, 'MEMBER');

    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Assignable Task' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId: memberId })
      .expect(200);

    expect(response.body.assigneeId).toBe(memberId);
  });

  it('should not assign a task to a non-member', async () => {
    const nonMemberId = await createUser(app, prisma, uniqueEmail());

    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Task' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId: nonMemberId.id })
      .expect(400);
  });

  it('should not allow another user to access a task', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Private Task' })
      .expect(201);

    const { token: otherToken } = await createUser(app, prisma, uniqueEmail());

    await request(app.getHttpServer())
      .get(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('should delete a task (creator or admin)', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'To Delete' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`${BASE_URL}/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
