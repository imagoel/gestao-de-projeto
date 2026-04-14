import { CardPriority } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  assigneeId!: string;

  @IsEnum(CardPriority)
  priority!: CardPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
