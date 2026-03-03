import { IsBoolean, IsOptional, IsArray, IsNumber } from 'class-validator';

export class StartResearchDto {
  @IsOptional()
  @IsBoolean()
  useWebSearch?: boolean;

  // Phase F1: Expert-in-the-Loop — pause after these stage numbers (1, 2, or 3)
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pauseAfterStages?: number[];

  // C1: Quick mode — skip planner, single ReAct step, no 3-round debate
  @IsOptional()
  @IsBoolean()
  quickMode?: boolean;
}
