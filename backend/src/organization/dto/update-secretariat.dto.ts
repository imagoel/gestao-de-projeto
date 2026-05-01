import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateSecretariatDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;
}
