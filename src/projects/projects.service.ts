import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponse } from './interfaces/project-response.interface';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, ownerId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    return this.mapToResponse(project);
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        isArchived: false,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.ensureAccess(project, userId);

    return this.mapToResponse(project);
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<ProjectResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.ensureAdminAccess(project, userId);

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        isArchived: dto.isArchived ?? undefined,
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can delete it');
    }

    await this.prisma.project.delete({ where: { id } });

    return { message: 'Project deleted successfully' };
  }

  async addMember(projectId: string, userId: string, dto: AddMemberDto, actingUserId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.ensureAdminAccess(project, actingUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this project');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role: (dto.role ?? 'MEMBER') as Role,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return member;
  }

  async removeMember(projectId: string, userId: string, actingUserId: string): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === userId) {
      throw new BadRequestException('Cannot remove the project owner');
    }

    if (userId === actingUserId) {
      throw new BadRequestException('Use leave-project instead');
    }

    await this.ensureAdminAccess(project, actingUserId);

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new NotFoundException('User is not a member of this project');
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    return { message: 'Member removed successfully' };
  }

  async leaveProject(projectId: string, userId: string): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === userId) {
      throw new BadRequestException('Owner cannot leave; transfer ownership or delete the project');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this project');
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    return { message: 'Left project successfully' };
  }

  private async ensureAccess(project: any, userId: string) {
    const isOwner = project.ownerId === userId;
    const isMember = project.members?.some((m: any) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  private async ensureAdminAccess(project: any, userId: string) {
    if (project.ownerId !== userId) {
      const member = project.members?.find((m: any) => m.userId === userId);
      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException('Admin access required');
      }
    }
  }

  private mapToResponse(project: any): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      owner: project.owner,
      members:
        project.members?.map((m: any) => ({
          id: m.id,
          projectId: m.projectId,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: m.user,
        })) ?? [],
      taskCount: project._count?.tasks ?? 0,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
