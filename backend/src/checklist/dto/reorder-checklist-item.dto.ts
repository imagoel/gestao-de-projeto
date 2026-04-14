import { IsInt, Min } from 'class-validator';

export class ReorderChecklistItemDto {
  @IsInt()
  @Min(0)
  targetPosition!: number;
}
