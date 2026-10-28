import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { ProjectResponse } from './interfaces/project-response.interface';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/interfaces/user-payload.interface';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: UserPayload): Promise<ProjectResponse> {
    return this.projectsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List accessible projects' })
  @ApiResponse({ status: 200, description: 'Projects list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@CurrentUser() user: UserPayload, @Query('page') page?: string, @Query('limit') limit?: string) {
    const projects = await this.projectsService.findAll(user.sub);
    const p = Math.max(1, parseInt(String(page ?? 1), 10));
    const l = Math.min(100, Math.max(1, parseInt(String(limit ?? 20), 10)));
    const offset = (p - 1) * l;

    return {
      data: projects.slice(offset, offset + l),
      meta: {
        total: projects.length,
        page: p,
        limit: l,
        totalPages: Math.ceil(projects.length / l),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload): Promise<ProjectResponse> {
    return this.projectsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: UserPayload
  ): Promise<ProjectResponse> {
    return this.projectsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project (owner only)' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.projectsService.delete(id, user.sub);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a project member' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiParam({ name: 'id' })
  async addMember(@Param('id') projectId: string, @Body() dto: AddMemberDto, @CurrentUser() user: UserPayload) {
    return this.projectsService.addMember(projectId, dto.userId, dto, user.sub);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a project member' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'userId' })
  async removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.projectsService.removeMember(projectId, userId, user.sub);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a project' })
  @ApiResponse({ status: 200, description: 'Left project' })
  @ApiParam({ name: 'id' })
  async leave(@Param('id') projectId: string, @CurrentUser() user: UserPayload) {
    return this.projectsService.leaveProject(projectId, user.sub);
  }
}
