import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class DecomposeTodoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  goal!: string;

  @IsOptional()
  @IsUUID()
  listId?: string;
}
