/**
 * Projects integration tests.
 *
 * Covers project CRUD, membership management, and resource-level
 * authorization. Requires a real PostgreSQL test database (DATABASE_URL).
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { cleanDatabase, createTestApp, teardownTestApp } from './test-setup';

const BASE_URL = '/api/v1';

async function registerAndLogin(app: INestApplication, email: string, password = 'SecurePass123!'): Promise<string> {
  await request(app.getHttpServer())
    .post(`${BASE_URL}/auth/register`)
    .send({ email, password, firstName: 'Test', lastName: 'User' });

  const res = await request(app.getHttpServer()).post(`${BASE_URL}/auth/login`).send({ email, password }).expect(200);

  return res.body.accessToken;
}

async function createUser(prisma: PrismaService, email: string, password = 'SecurePass123!'): Promise<string> {
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash },
    select: { id: true },
  });
  return user.id;
}

describe('Projects Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    token = await registerAndLogin(app, 'owner@example.com');
  });

  it('should create a project', async () => {
    const response = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Website Redesign', description: 'New branding' })
      .expect(201);

    expect(response.body.name).toBe('Website Redesign');
    expect(response.body.id).toBeDefined();
    expect(response.body.ownerId).toBeDefined();
    expect(response.body.members).toHaveLength(1);
  });

  it('should list accessible projects', async () => {
    await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project A' });

    await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project B' });

    const response = await request(app.getHttpServer())
      .get(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(2);
  });

  it('should get project details', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project A' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.id).toBe(create.body.id);
    expect(response.body.name).toBe('Project A');
  });

  it('should not allow another user to access a project', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Private Project' })
      .expect(201);

    // Create a second user and log in
    const otherToken = await registerAndLogin(app, 'other@example.com');

    await request(app.getHttpServer())
      .get(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('should update a project (owner only)', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Name' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })
      .expect(200);

    expect(response.body.name).toBe('New Name');
  });

  it('should not allow a non-admin member to update a project', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shared Project' })
      .expect(201);

    // Add another user as a MEMBER (not admin)
    const otherUserId = await createUser(prisma, 'member@example.com');
    await request(app.getHttpServer())
      .post(`${BASE_URL}/projects/${create.body.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: otherUserId, role: 'MEMBER' })
      .expect(201);

    const otherToken = await registerAndLogin(app, 'member@example.com');

    await request(app.getHttpServer())
      .patch(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hacked Name' })
      .expect(403);
  });

  it('should delete a project (owner only)', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Be Deleted' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('should not allow non-owner to delete a project', async () => {
    const create = await request(app.getHttpServer())
      .post(`${BASE_URL}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shared' })
      .expect(201);

    const otherUserId = await createUser(prisma, 'nonowner@example.com');
    await request(app.getHttpServer())
      .post(`${BASE_URL}/projects/${create.body.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: otherUserId, role: 'ADMIN' })
      .expect(201);

    const otherToken = await registerAndLogin(app, 'nonowner@example.com');

    await request(app.getHttpServer())
      .delete(`${BASE_URL}/projects/${create.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });
});
