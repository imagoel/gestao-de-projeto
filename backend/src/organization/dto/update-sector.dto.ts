import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsUUID()
  secretariatId?: string;
}
