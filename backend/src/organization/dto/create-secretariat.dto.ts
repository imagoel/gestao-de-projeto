import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSecretariatDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;
}
