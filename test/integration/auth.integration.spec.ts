/**
 * Authentication integration tests.
 *
 * These tests run against a real PostgreSQL database (DATABASE_URL must point
 * to a test database). They are executed in CI where a postgres service
 * container is available.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { cleanDatabase, createTestApp, teardownTestApp } from './test-setup';

const BASE_URL = '/api/v1';

const uniqueEmail = () => `integration_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

describe('Auth Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  it('should register a new user', async () => {
    const newUser = {
      email: uniqueEmail(),
      password: 'SecurePass123!',
      firstName: 'Integration',
      lastName: 'User',
    };

    const response = await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser).expect(201);

    expect(response.body.email).toBe(newUser.email);
    expect(response.body.id).toBeDefined();
  });

  it('should not register with an existing email', async () => {
    const newUser = {
      email: uniqueEmail(),
      password: 'SecurePass123!',
      firstName: 'Integration',
      lastName: 'User',
    };

    await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser).expect(201);

    await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser).expect(409);
  });

  it('should login and return access + refresh tokens', async () => {
    const newUser = {
      email: uniqueEmail(),
      password: 'SecurePass123!',
      firstName: 'Integration',
      lastName: 'User',
    };

    await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser);

    const response = await request(app.getHttpServer())
      .post(`${BASE_URL}/auth/login`)
      .send({
        email: newUser.email,
        password: newUser.password,
      })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const newUser = {
      email: uniqueEmail(),
      password: 'SecurePass123!',
      firstName: 'Integration',
      lastName: 'User',
    };

    await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser);

    await request(app.getHttpServer())
      .post(`${BASE_URL}/auth/login`)
      .send({
        email: newUser.email,
        password: 'WrongPass123!',
      })
      .expect(401);
  });

  it('should refresh an access token', async () => {
    const newUser = {
      email: uniqueEmail(),
      password: 'SecurePass123!',
      firstName: 'Integration',
      lastName: 'User',
    };

    await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser);

    const login = await request(app.getHttpServer()).post(`${BASE_URL}/auth/login`).send({
      email: newUser.email,
      password: newUser.password,
    });

    // Small delay so JWT iat claim differs between tokens
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const refresh = await request(app.getHttpServer())
      .post(`${BASE_URL}/auth/refresh`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    expect(refresh.body.accessToken).toBeDefined();
    expect(refresh.body.accessToken).not.toBe(login.body.accessToken);
  });

  it('should reject expired/invalid refresh token', async () => {
    await request(app.getHttpServer())
      .post(`${BASE_URL}/auth/refresh`)
      .send({ refreshToken: 'invalid-refresh-token' })
      .expect(401);
  });

  it('should logout and revoke the refresh token', async () => {
    const newUser = {
      email: uniqueEmail(),
      password: 'SecurePass123!',
      firstName: 'Integration',
      lastName: 'User',
    };

    await request(app.getHttpServer()).post(`${BASE_URL}/auth/register`).send(newUser);

    const login = await request(app.getHttpServer()).post(`${BASE_URL}/auth/login`).send({
      email: newUser.email,
      password: newUser.password,
    });

    await request(app.getHttpServer())
      .post(`${BASE_URL}/auth/logout`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    // The refresh token should now be revoked
    await request(app.getHttpServer())
      .post(`${BASE_URL}/auth/refresh`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });
});
