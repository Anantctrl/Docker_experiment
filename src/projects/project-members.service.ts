import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembers(projectId: string, requestingUserId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isOwner = project.ownerId === requestingUserId;
    const isMember = project.members.some((m: any) => m.userId === requestingUserId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('Access denied to this project');
    }

    return project.members;
  }
}
