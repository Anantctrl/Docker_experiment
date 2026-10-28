import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Task UUID' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ description: 'Comment body', example: 'Looks good to me!' })
  @IsString()
  @MaxLength(2000)
  body: string;
}
