import { IsInt, IsUUID, Min } from 'class-validator';

export class MoveCardDto {
  @IsUUID()
  targetColumnId!: string;

  @IsInt()
  @Min(0)
  targetPosition!: number;
}
