import { ProjectStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  folderId?: string | null;
}
