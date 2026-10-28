import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiPropertyOptional({ description: 'Member role', enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' })
  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'MEMBER'])
  role?: string;

  userId: string;
}
