import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponse } from './interfaces/task-response.interface';
import { TaskStatus, TaskPriority } from '@prisma/client';

interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(dto: CreateTaskDto, userId: string): Promise<TaskResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isOwner = project.ownerId === userId;
    const isMember = project.members?.some((m: any) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('Access denied to this project');
    }

    let assigneeId = dto.assigneeId;
    if (assigneeId) {
      const membership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: dto.projectId, userId: assigneeId },
        },
      });
      if (!membership && project.ownerId !== assigneeId) {
        throw new BadRequestException('Assignee must be a project member');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        projectId: dto.projectId,
        assigneeId: assigneeId ?? null,
        creatorId: userId,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate ?? null,
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        creator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: userId,
        taskId: task.id,
        projectId: task.projectId,
        action: 'TASK_CREATED',
        metadata: { title: task.title },
      },
    });

    return this.mapToResponse(task);
  }

  async findAll(
    userId: string,
    filter: TaskFilter = {},
  ): Promise<{ data: TaskResponse[]; meta: any }> {
    const accessibleProjects = await this.prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });

    const projectIds = accessibleProjects.map((p) => p.id);

    const where: any = {
      projectId: { in: projectIds },
      isArchived: false,
    };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.priority) {
      where.priority = filter.priority;
    }
    if (filter.assigneeId) {
      where.assigneeId = filter.assigneeId;
    }
    if (filter.projectId) {
      if (!projectIds.includes(filter.projectId)) {
        throw new ForbiddenException('Access denied to this project');
      }
      where.projectId = filter.projectId;
    }

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          creator: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          project: {
            select: { id: true, name: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks.map((t) => this.mapToResponse(t)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<TaskResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        creator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensureProjectAccess(task.projectId, userId);

    return this.mapToResponse(task);
  }

  async update(id: string, userId: string, dto: UpdateTaskDto): Promise<TaskResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensureProjectAccess(task.projectId, userId);

    const isOwner = task.project.ownerId === userId;
    const isAssignee = task.assigneeId === userId;
    const isCreator = task.creatorId === userId;

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId },
      },
    });
    const isAdmin = isOwner || (membership && membership.role === 'ADMIN');

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      if (!isAdmin) {
        throw new ForbiddenException('Only project admins can change assignee');
      }
      if (dto.assigneeId !== task.assigneeId) {
        const targetMembership = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: task.projectId, userId: dto.assigneeId },
          },
        });
        if (!targetMembership && task.project.ownerId !== dto.assigneeId) {
          throw new BadRequestException('Assignee must be a project member');
        }
      }
    }

    if (dto.status !== undefined && !isAdmin && !isAssignee && !isCreator) {
      throw new ForbiddenException('Insufficient permissions to change status');
    }

    if ((dto.title !== undefined || dto.description !== undefined || dto.dueDate !== undefined || dto.priority !== undefined) && !isAdmin && !isAssignee && !isCreator) {
      throw new ForbiddenException('Insufficient permissions to update this task');
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        assigneeId: dto.assigneeId ?? undefined,
        status: dto.status ?? undefined,
        priority: dto.priority ?? undefined,
        dueDate: dto.dueDate ?? undefined,
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        creator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: userId,
        taskId: id,
        projectId: task.projectId,
        action: 'TASK_UPDATED',
        metadata: { changes: Object.keys(dto) },
      },
    });

    return this.mapToResponse(updated);
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensureProjectAccess(task.projectId, userId);

    const isOwner = task.project.ownerId === userId;
    const isCreator = task.creatorId === userId;
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId },
      },
    });
    const isAdmin = isOwner || (membership && membership.role === 'ADMIN');

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Insufficient permissions to delete this task');
    }

    await this.prisma.task.delete({ where: { id } });

    return { message: 'Task deleted successfully' };
  }

  private async ensureProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        members: {
          select: { userId: true },
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isOwner = project.ownerId === userId;
    const isMember = project.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  private mapToResponse(task: any): TaskResponse {
    return {
      id: task.id,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      isArchived: task.isArchived,
      assignee: task.assignee,
      creator: task.creator,
      project: task.project,
      commentCount: task._count?.comments ?? 0,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
