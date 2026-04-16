import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title!: string;
}
