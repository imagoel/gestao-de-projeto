import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;
}
