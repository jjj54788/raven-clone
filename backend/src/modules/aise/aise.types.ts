export type AiseStageId = 'requirements' | 'design' | 'implementation' | 'testing' | 'acceptance';
export type AiseStageStatus = 'done' | 'active' | 'review' | 'pending';
export type AiseRequirementStatus = 'done' | 'active' | 'review' | 'blocked';
export type AiseGateStatus = 'pass' | 'pending' | 'running' | 'queued';

export type AiseMetricId = 'lead_time' | 'deploy_frequency' | 'change_failure_rate' | 'mttr';
export type AiseGateId = 'unit_tests' | 'code_review' | 'security_scan' | 'deployment_check';
export type AiseAcceptanceId = 'coverage' | 'defect_closure' | 'signoff';

export interface AiseMetric {
  id: AiseMetricId;
  value: string;
  hint: string;
}

export interface AisePipelineStage {
  id: AiseStageId;
  status: AiseStageStatus;
  wip: string;
  wipCurrent?: number;
  wipLimit?: number;
  count: string;
  itemsCount?: number;
  desc: string;
}

export interface AiseQualityGate {
  id: AiseGateId;
  status: AiseGateStatus;
  value: string;
}

export interface AiseAcceptanceItem {
  id: AiseAcceptanceId;
  value: string;
}

export interface AiseRequirement {
  id: string;
  title: string;
  owner: string;
  stageId: AiseStageId;
  status: AiseRequirementStatus;
  progress: number;
  updatedAt: string;
}

export interface AiseFocusTrace {
  stageId: AiseStageId;
  status: AiseStageStatus;
}

export interface AiseFocus {
  requirementId: string;
  title: string;
  description: string;
  stageId: AiseStageId;
  status: AiseRequirementStatus;
  trace: AiseFocusTrace[];
}

export interface AiseOverview {
  asOf: string;
  metrics: AiseMetric[];
  pipeline: AisePipelineStage[];
  qualityGates: AiseQualityGate[];
  acceptance: AiseAcceptanceItem[];
  requirements: AiseRequirement[];
  focus: AiseFocus;
  ownersCount: number;
}
