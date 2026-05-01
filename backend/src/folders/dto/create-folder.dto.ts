import { FolderVisibility } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;

  @IsUUID()
  sectorId!: string;

  @IsOptional()
  @IsEnum(FolderVisibility)
  visibility?: FolderVisibility;
}
