import { ProjectRole } from '@prisma/client';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsIn([ProjectRole.MEMBER, ProjectRole.VIEWER])
  role?: ProjectRole;
}
