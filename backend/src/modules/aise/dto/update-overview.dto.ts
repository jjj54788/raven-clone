import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';

const STAGE_IDS = ['requirements', 'design', 'implementation', 'testing', 'acceptance'] as const;
const STAGE_STATUSES = ['done', 'active', 'review', 'pending'] as const;
const REQUIREMENT_STATUSES = ['done', 'active', 'review', 'blocked'] as const;
const METRIC_IDS = ['lead_time', 'deploy_frequency', 'change_failure_rate', 'mttr'] as const;
const GATE_IDS = ['unit_tests', 'code_review', 'security_scan', 'deployment_check'] as const;
const GATE_STATUSES = ['pass', 'pending', 'running', 'queued'] as const;
const ACCEPTANCE_IDS = ['coverage', 'defect_closure', 'signoff'] as const;

export class AiseMetricDto {
  @IsIn(METRIC_IDS)
  id!: (typeof METRIC_IDS)[number];

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  hint?: string;
}

export class AisePipelineStageDto {
  @IsIn(STAGE_IDS)
  id!: (typeof STAGE_IDS)[number];

  @IsIn(STAGE_STATUSES)
  status!: (typeof STAGE_STATUSES)[number];

  @IsInt()
  @Min(0)
  @Type(() => Number)
  wipCurrent!: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  wipLimit!: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  itemsCount!: number;

  @IsOptional()
  @IsString()
  desc?: string;
}

export class AiseQualityGateDto {
  @IsIn(GATE_IDS)
  id!: (typeof GATE_IDS)[number];

  @IsIn(GATE_STATUSES)
  status!: (typeof GATE_STATUSES)[number];

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class AiseAcceptanceItemDto {
  @IsIn(ACCEPTANCE_IDS)
  id!: (typeof ACCEPTANCE_IDS)[number];

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class AiseRequirementDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  owner!: string;

  @IsIn(STAGE_IDS)
  stageId!: (typeof STAGE_IDS)[number];

  @IsIn(REQUIREMENT_STATUSES)
  status!: (typeof REQUIREMENT_STATUSES)[number];

  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  progress!: number;

  @IsOptional()
  @IsISO8601()
  updatedAt?: string;
}

export class AiseFocusTraceDto {
  @IsIn(STAGE_IDS)
  stageId!: (typeof STAGE_IDS)[number];

  @IsIn(STAGE_STATUSES)
  status!: (typeof STAGE_STATUSES)[number];
}

export class AiseFocusDto {
  @IsString()
  @IsNotEmpty()
  requirementId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(STAGE_IDS)
  stageId!: (typeof STAGE_IDS)[number];

  @IsIn(REQUIREMENT_STATUSES)
  status!: (typeof REQUIREMENT_STATUSES)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiseFocusTraceDto)
  trace?: AiseFocusTraceDto[];
}

export class UpdateAiseOverviewDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiseMetricDto)
  metrics?: AiseMetricDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AisePipelineStageDto)
  pipeline?: AisePipelineStageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiseQualityGateDto)
  qualityGates?: AiseQualityGateDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiseAcceptanceItemDto)
  acceptance?: AiseAcceptanceItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiseRequirementDto)
  requirements?: AiseRequirementDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AiseFocusDto)
  focus?: AiseFocusDto | null;
}
