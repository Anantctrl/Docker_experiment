import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { CommentResponse } from './interfaces/comment-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/interfaces/user-payload.interface';

@ApiTags('comments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: UserPayload,
  ): Promise<CommentResponse> {
    return this.commentsService.create(dto, user.sub);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'List comments for a task' })
  @ApiResponse({ status: 200, description: 'Comments list with pagination' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commentsService.findByTask(
      taskId,
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a comment (author only)' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 403, description: 'Only author can edit' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id') id: string,
    @Body('body') body: string,
    @CurrentUser() user: UserPayload,
  ): Promise<CommentResponse> {
    return this.commentsService.update(id, user.sub, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiParam({ name: 'id' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.commentsService.delete(id, user.sub);
  }
}
