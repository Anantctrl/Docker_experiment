import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectMembersService } from './project-members.service';

@Module({
  providers: [ProjectsService, ProjectMembersService],
  controllers: [ProjectsController],
  exports: [ProjectsService, ProjectMembersService],
})
export class ProjectsModule {}
