import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsUUID } from 'class-validator';

export class BatchTasksDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids!: string[];

  @IsIn(['done', 'todo', 'delete'])
  action!: 'done' | 'todo' | 'delete';
}
