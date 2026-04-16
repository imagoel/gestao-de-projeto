import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;
}
