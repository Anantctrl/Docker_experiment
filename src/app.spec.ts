import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { ProjectsController } from './projects/projects.controller';
import { TasksController } from './tasks/tasks.controller';
import { CommentsController } from './comments/comments.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { HealthController } from './health/health.controller';

describe('AppModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should compile the application module', () => {
    expect(module).toBeDefined();
  });

  it('should have all controllers registered', () => {
    const controllers = [
      AppController,
      AuthController,
      UsersController,
      ProjectsController,
      TasksController,
      CommentsController,
      NotificationsController,
      HealthController,
    ];

    for (const controller of controllers) {
      const instance = module.get(controller, { strict: false });
      expect(instance).toBeDefined();
    }
  });
});
