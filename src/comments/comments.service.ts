import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentResponse } from './interfaces/comment-response.interface';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService
  ) {}

  async create(dto: CreateCommentDto, userId: string): Promise<CommentResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isOwner = task.project.ownerId === userId;
    const isAssignee = task.assigneeId === userId;
    const isCreator = task.creatorId === userId;

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId },
      },
    });
    const isAdmin = isOwner || (membership && membership.role === 'ADMIN');

    if (!isOwner && !isAssignee && !isCreator && !isAdmin) {
      throw new ForbiddenException('Access denied to this task');
    }

    const comment = await this.prisma.comment.create({
      data: {
        taskId: dto.taskId,
        authorId: userId,
        body: dto.body,
      },
      include: {
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: userId,
        taskId: task.id,
        projectId: task.projectId,
        action: 'COMMENT_ADDED',
        metadata: { commentId: comment.id },
      },
    });

    return this.mapToResponse(comment);
  }

  async findByTask(
    taskId: string,
    userId: string,
    page = 1,
    limit = 50
  ): Promise<{ data: CommentResponse[]; meta: any }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isOwner = task.project.ownerId === userId;
    const isAssignee = task.assigneeId === userId;
    const isCreator = task.creatorId === userId;

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId },
      },
    });
    const isAdmin = isOwner || (membership && membership.role === 'ADMIN');

    if (!isOwner && !isAssignee && !isCreator && !isAdmin) {
      throw new ForbiddenException('Access denied to this task');
    }

    const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { taskId },
        include: {
          author: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: Math.min(100, Math.max(1, limit)),
      }),
      this.prisma.comment.count({ where: { taskId } }),
    ]);

    return {
      data: comments.map((c) => this.mapToResponse(c)),
      meta: {
        total,
        page: Math.max(1, page),
        limit: Math.min(100, Math.max(1, limit)),
        totalPages: Math.ceil(total / Math.min(100, Math.max(1, limit))),
      },
    };
  }

  async update(id: string, userId: string, body: string): Promise<CommentResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { body },
      include: {
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.authorId === userId;
    const isOwner = comment.task.project.ownerId === userId;
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: comment.task.projectId, userId },
      },
    });
    const isAdmin = isOwner || (membership && membership.role === 'ADMIN');

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions to delete this comment');
    }

    await this.prisma.comment.delete({ where: { id } });

    return { message: 'Comment deleted successfully' };
  }

  private mapToResponse(comment: any): CommentResponse {
    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      body: comment.body,
      author: comment.author,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
