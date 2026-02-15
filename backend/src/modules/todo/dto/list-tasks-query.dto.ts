import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListTodoTasksQueryDto {
  @IsOptional()
  @IsUUID()
  listId?: string;

  @IsOptional()
  @IsIn(['open', 'done', 'all', 'archived'])
  status?: 'open' | 'done' | 'all' | 'archived';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;
}

