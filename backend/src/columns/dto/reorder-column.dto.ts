import { IsInt, Min } from 'class-validator';

export class ReorderColumnDto {
  @IsInt()
  @Min(0)
  targetPosition!: number;
}
