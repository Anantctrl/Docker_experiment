import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserResponse } from './interfaces/user-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/interfaces/user-payload.interface';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser() user: UserPayload): Promise<UserResponse> {
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateMe(@CurrentUser() user: UserPayload, @Body() dto: UpdateUserDto): Promise<UserResponse> {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get('me/projects')
  @ApiOperation({ summary: 'List projects accessible by current user' })
  @ApiResponse({ status: 200, description: 'User projects' })
  async getMyProjects(@CurrentUser() user: UserPayload) {
    return this.usersService.getUserProjects(user.sub);
  }
}
