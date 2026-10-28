import { PrismaClient, Role, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 12;

  // Create demo users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      passwordHash: await bcrypt.hash('Password123!', saltRounds),
      firstName: 'Alice',
      lastName: 'Owner',
      role: Role.ADMIN,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      passwordHash: await bcrypt.hash('Password123!', saltRounds),
      firstName: 'Bob',
      lastName: 'Member',
      role: Role.MEMBER,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      email: 'carol@example.com',
      passwordHash: await bcrypt.hash('Password123!', saltRounds),
      firstName: 'Carol',
      lastName: 'Viewer',
      role: Role.MEMBER,
    },
  });

  // Create demo projects
  const projectA = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Redesign company website with new branding',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: Role.ADMIN },
          { userId: bob.id, role: Role.MEMBER },
          { userId: carol.id, role: Role.MEMBER },
        ],
      },
    },
  });

  const projectB = await prisma.project.create({
    data: {
      name: 'Mobile App Launch',
      description: 'Launch the new mobile application',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: Role.ADMIN },
          { userId: bob.id, role: Role.MEMBER },
        ],
      },
    },
  });

  // Create demo tasks
  await prisma.task.create({
    data: {
      title: 'Design homepage mockups',
      description: 'Create high-fidelity mockups for the homepage',
      projectId: projectA.id,
      assigneeId: bob.id,
      creatorId: alice.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2025-12-15T00:00:00Z'),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing',
      projectId: projectA.id,
      assigneeId: alice.id,
      creatorId: alice.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2025-12-20T00:00:00Z'),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Write API documentation',
      description: 'Document all REST endpoints with examples',
      projectId: projectB.id,
      assigneeId: carol.id,
      creatorId: alice.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: new Date('2026-01-10T00:00:00Z'),
    },
  });

  console.log('Seed completed successfully');
  console.log(`Users: alice (${alice.id}), bob (${bob.id}), carol (${carol.id})`);
  console.log(`Projects: Website Redesign (${projectA.id}), Mobile App Launch (${projectB.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
