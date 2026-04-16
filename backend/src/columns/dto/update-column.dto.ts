import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateColumnDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title!: string;
}
