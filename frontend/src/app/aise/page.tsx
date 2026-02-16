'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ListTodo,
  Target,
  Monitor,
  Users,
  Shield,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  getAiseOverview,
  type AiseAcceptanceId,
  type AiseGateId,
  type AiseGateStatus,
  type AiseMetricId,
  type AiseOverview,
  type AiseRequirementStatus,
  type AiseStageId,
  type AiseStageStatus,
} from '@/lib/api';

type Metric = {
  label: string;
  value: string;
  hint: string;
};

type Stage = {
  name: string;
  status: AiseStageStatus;
  wip: string;
  count: string;
  desc: string;
};

type Requirement = {
  id: string;
  title: string;
  owner: string;
  stage: string;
  status: AiseRequirementStatus;
  progress: number;
  updated: string;
};

const STATUS_STYLES: Record<Requirement['status'], string> = {
  done: 'bg-emerald-50 text-emerald-700',
  active: 'bg-amber-50 text-amber-700',
  review: 'bg-indigo-50 text-indigo-700',
  blocked: 'bg-rose-50 text-rose-700',
};

const STAGE_STYLES: Record<Stage['status'], string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  active: 'bg-amber-50 text-amber-700 border-amber-100',
  review: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  pending: 'bg-gray-50 text-gray-500 border-gray-100',
};

function formatApiError(data: any): string {
  const msg = data?.message;
  if (!msg) return 'Request failed';
  if (Array.isArray(msg)) return msg.join('; ');
  return String(msg);
}

export default function AiseWorkflowPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const [overview, setOverview] = useState<AiseOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAiseOverview();
      if ((data as any)?.statusCode) {
        throw new Error(formatApiError(data));
      }
      setOverview(data);
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const uiText = useMemo(() => {
    const zh = {
      title: 'AISE 工作流总览',
      subtitle: '端到端需求流转、研发进度与验收状态可视化',
      newReq: '新建需求',
      refresh: '刷新',
      loading: '加载中...',
      errorTitle: '数据加载失败',
      errorHint: '请确认服务已启动，稍后重试。',
      metricsTitle: '交付健康度',
      metricLead: '交付周期',
      metricLeadHint: '中位数流转时间',
      metricDeploy: '发布频率',
      metricDeployHint: '最近 7 天',
      metricFailure: '变更失败率',
      metricFailureHint: '最近 30 天',
      metricMttr: '故障恢复',
      metricMttrHint: '平均恢复时间',
      pipelineTitle: '端到端流程',
      gatesTitle: '质量关卡',
      acceptanceTitle: '验收进度',
      reqTitle: '需求清单',
      reqHint: '需求会在需求分析、设计、开发、测试与验收阶段持续流转。',
      focusTitle: '需求端到端视图',
      focusSubtitle: 'REQ-104 AISE 工作流可视化',
      focusDesc: '当前处于实现阶段，已完成核心模块拆分，等待回归测试。',
      stageLabel: '阶段',
      ownerLabel: '负责人',
      ownersCount: '{count} 位负责人',
      statusLabel: '状态',
      progressLabel: '进度',
      updatedLabel: '更新',
      itemsCount: '{count} 项',
      gateUnit: '单元测试',
      gateReview: '代码评审',
      gateSecurity: '安全扫描',
      gateDeploy: '部署验证',
      gateStatusPass: '通过',
      gateStatusPending: '待处理',
      gateStatusRunning: '扫描中',
      gateStatusQueued: '排队中',
      acceptanceCoverage: '覆盖率',
      acceptanceBugs: '缺陷关闭',
      acceptanceSignoff: '验收签署',
      statusDone: '已完成',
      statusActive: '进行中',
      statusReview: '待评审',
      statusBlocked: '阻塞',
      statusQueued: '未开始',
      stageRequirements: '需求',
      stageDesign: '设计',
      stageImplementation: '实现',
      stageTesting: '测试',
      stageAcceptance: '验收',
      stageDescRequirements: '优先级与范围确认',
      stageDescDesign: '架构评审',
      stageDescImplementation: '功能开发进行中',
      stageDescTesting: 'QA + 自动化',
      stageDescAcceptance: '干系人验收',
    };
    const en = {
      title: 'AISE Workflow Overview',
      subtitle: 'End-to-end visibility for requirements, delivery, and acceptance',
      newReq: 'New Requirement',
      refresh: 'Refresh',
      loading: 'Loading...',
      errorTitle: 'Unable to load AISE data',
      errorHint: 'Check the service and retry.',
      metricsTitle: 'Delivery Health',
      metricLead: 'Lead time',
      metricLeadHint: 'Median flow time',
      metricDeploy: 'Deployment frequency',
      metricDeployHint: 'Last 7 days',
      metricFailure: 'Change failure rate',
      metricFailureHint: 'Rolling 30 days',
      metricMttr: 'MTTR',
      metricMttrHint: 'Mean time to recover',
      pipelineTitle: 'End-to-End Pipeline',
      gatesTitle: 'Quality Gates',
      acceptanceTitle: 'Acceptance Progress',
      reqTitle: 'Requirement Backlog',
      reqHint: 'Requirements flow through analysis, design, build, test, and acceptance.',
      focusTitle: 'Requirement Trace',
      focusSubtitle: 'REQ-104 AISE Workflow Visualization',
      focusDesc: 'Currently in implementation, core modules split and queued for regression.',
      stageLabel: 'Stage',
      ownerLabel: 'Owner',
      ownersCount: '{count} owners',
      statusLabel: 'Status',
      progressLabel: 'Progress',
      updatedLabel: 'Updated',
      itemsCount: '{count} items',
      gateUnit: 'Unit tests',
      gateReview: 'Code review',
      gateSecurity: 'Security scan',
      gateDeploy: 'Deployment check',
      gateStatusPass: 'Passed',
      gateStatusPending: 'Pending',
      gateStatusRunning: 'Running',
      gateStatusQueued: 'Queued',
      acceptanceCoverage: 'Coverage',
      acceptanceBugs: 'Defect closure',
      acceptanceSignoff: 'Stakeholder sign-off',
      statusDone: 'Done',
      statusActive: 'In progress',
      statusReview: 'In review',
      statusBlocked: 'Blocked',
      statusQueued: 'Queued',
      stageRequirements: 'Requirements',
      stageDesign: 'Design',
      stageImplementation: 'Implementation',
      stageTesting: 'Testing',
      stageAcceptance: 'Acceptance',
      stageDescRequirements: 'Prioritized & scoped',
      stageDescDesign: 'Architecture review',
      stageDescImplementation: 'Feature build in progress',
      stageDescTesting: 'QA + automation',
      stageDescAcceptance: 'Stakeholder sign-off',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  const stageLabels = useMemo<Record<AiseStageId, string>>(
    () => ({
      requirements: uiText.stageRequirements,
      design: uiText.stageDesign,
      implementation: uiText.stageImplementation,
      testing: uiText.stageTesting,
      acceptance: uiText.stageAcceptance,
    }),
    [uiText],
  );

  const stageDescriptions = useMemo<Record<AiseStageId, string>>(
    () => ({
      requirements: uiText.stageDescRequirements,
      design: uiText.stageDescDesign,
      implementation: uiText.stageDescImplementation,
      testing: uiText.stageDescTesting,
      acceptance: uiText.stageDescAcceptance,
    }),
    [uiText],
  );

  const metricLabels = useMemo<Record<AiseMetricId, { label: string; hint: string }>>(
    () => ({
      lead_time: { label: uiText.metricLead, hint: uiText.metricLeadHint },
      deploy_frequency: { label: uiText.metricDeploy, hint: uiText.metricDeployHint },
      change_failure_rate: { label: uiText.metricFailure, hint: uiText.metricFailureHint },
      mttr: { label: uiText.metricMttr, hint: uiText.metricMttrHint },
    }),
    [uiText],
  );

  const gateLabels = useMemo<Record<AiseGateId, string>>(
    () => ({
      unit_tests: uiText.gateUnit,
      code_review: uiText.gateReview,
      security_scan: uiText.gateSecurity,
      deployment_check: uiText.gateDeploy,
    }),
    [uiText],
  );

  const acceptanceLabels = useMemo<Record<AiseAcceptanceId, string>>(
    () => ({
      coverage: uiText.acceptanceCoverage,
      defect_closure: uiText.acceptanceBugs,
      signoff: uiText.acceptanceSignoff,
    }),
    [uiText],
  );

  const gateStatusText = useMemo<Record<AiseGateStatus, string>>(
    () => ({
      pass: uiText.gateStatusPass,
      pending: uiText.gateStatusPending,
      running: uiText.gateStatusRunning,
      queued: uiText.gateStatusQueued,
    }),
    [uiText],
  );

  const stageStatusText = useMemo<Record<AiseStageStatus, string>>(
    () => ({
      done: uiText.statusDone,
      active: uiText.statusActive,
      review: uiText.statusReview,
      pending: uiText.statusQueued,
    }),
    [uiText],
  );

  const requirementStatusText = useMemo<Record<AiseRequirementStatus, string>>(
    () => ({
      done: uiText.statusDone,
      active: uiText.statusActive,
      review: uiText.statusReview,
      blocked: uiText.statusBlocked,
    }),
    [uiText],
  );

  const gateStatusStyles: Record<AiseGateStatus, string> = {
    pass: 'text-emerald-600',
    pending: 'text-indigo-600',
    running: 'text-amber-600',
    queued: 'text-gray-500',
  };

  const metrics: Metric[] = useMemo(() => {
    if (!overview) return [];
    return overview.metrics.map((metric) => {
      const info = metricLabels[metric.id];
      return {
        label: info?.label ?? metric.id,
        value: metric.value,
        hint: info?.hint ?? metric.hint,
      };
    });
  }, [overview, metricLabels]);

  const pipeline: Stage[] = useMemo(() => {
    if (!overview) return [];
    return overview.pipeline.map((stage) => ({
      name: stageLabels[stage.id] ?? stage.id,
      status: stage.status,
      wip:
        stage.wipCurrent !== undefined && stage.wipLimit !== undefined
          ? `${stage.wipCurrent}/${stage.wipLimit}`
          : stage.wip,
      count:
        stage.itemsCount !== undefined
          ? uiText.itemsCount.replace('{count}', String(stage.itemsCount))
          : stage.count,
      desc: stageDescriptions[stage.id] ?? stage.desc,
    }));
  }, [overview, stageLabels, stageDescriptions, uiText.itemsCount]);

  const requirements: Requirement[] = useMemo(() => {
    if (!overview) return [];
    return overview.requirements.map((req) => ({
      id: req.id,
      title: req.title,
      owner: req.owner,
      stage: stageLabels[req.stageId] ?? req.stageId,
      status: req.status,
      progress: req.progress,
      updated: req.updatedAt,
    }));
  }, [overview, stageLabels]);

  const focus = overview?.focus;
  const hasFocus =
    Boolean(focus?.requirementId?.trim()) ||
    Boolean(focus?.title?.trim()) ||
    Boolean(focus?.description?.trim());
  const focusSubtitle = hasFocus ? `${focus?.requirementId ?? ''} ${focus?.title ?? ''}`.trim() : uiText.focusSubtitle;
  const focusDesc = hasFocus && focus?.description ? focus.description : uiText.focusDesc;

  const focusTrace = useMemo(() => {
    if (hasFocus && focus?.trace?.length) return focus.trace;
    if (overview?.pipeline?.length) {
      return overview.pipeline.map((stage) => ({ stageId: stage.id, status: stage.status }));
    }
    return [];
  }, [focus, hasFocus, overview]);

  const qualityGates = overview?.qualityGates ?? [];
  const acceptanceItems = overview?.acceptance ?? [];
  const ownersCount = overview?.ownersCount ?? 0;
  const hasOverview = Boolean(overview);

  const acceptanceIcons: Record<AiseAcceptanceId, ReactNode> = {
    coverage: <Shield size={14} />,
    defect_closure: <Target size={14} />,
    signoff: <CheckCircle2 size={14} />,
  };

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">{uiText.loading}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => {}}
        userName={userName}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                    <Monitor size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {loading && <span className="text-xs text-gray-400">{uiText.loading}</span>}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
                >
                  <ListTodo size={16} />
                  {uiText.newReq}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-red-700">{uiText.errorTitle}</p>
                    <p className="mt-1 text-xs text-red-500">{uiText.errorHint}</p>
                    <p className="mt-1 text-[11px] text-red-400">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadOverview}
                    disabled={loading}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                  >
                    {uiText.refresh}
                  </button>
                </div>
              </div>
            )}

            {!hasOverview && loading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                {uiText.loading}
              </div>
            )}

            {hasOverview && (
              <>
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-gray-900">{metric.value}</p>
                      <p className="mt-1 text-xs text-gray-500">{metric.hint}</p>
                    </div>
                  ))}
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-900">{uiText.pipelineTitle}</h2>
                      <span className="text-xs text-gray-400">WIP / Capacity</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {pipeline.map((stage) => (
                        <div
                          key={stage.name}
                          className={`rounded-xl border px-3 py-3 ${STAGE_STYLES[stage.status]}`}
                        >
                          <div className="text-xs font-semibold">{stage.name}</div>
                          <div className="mt-2 text-lg font-semibold">{stage.wip}</div>
                          <div className="text-[11px] text-gray-500">{stage.count}</div>
                          <div className="mt-1 text-[11px] text-gray-500">{stage.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-900">{uiText.gatesTitle}</h2>
                    <div className="mt-4 space-y-3 text-sm">
                      {qualityGates.map((gate) => {
                        const label = gateLabels[gate.id] ?? gate.id;
                        const statusText = gateStatusText[gate.status];
                        const primaryValue = gate.status === 'pass' ? gate.value : statusText;
                        const secondaryValue = gate.status === 'pass' ? statusText : gate.value;
                        const showSecondary = secondaryValue && secondaryValue !== primaryValue;

                        return (
                          <div key={gate.id} className="rounded-xl bg-gray-50 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">{label}</span>
                              <span
                                className={`inline-flex items-center gap-1 ${gateStatusStyles[gate.status]}`}
                              >
                                {gate.status === 'pass' && <CheckCircle2 size={14} />}
                                {primaryValue}
                              </span>
                            </div>
                            {showSecondary && (
                              <div className="mt-1 text-right text-[11px] text-gray-400">{secondaryValue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">{uiText.reqTitle}</h2>
                        <p className="mt-1 text-xs text-gray-500">{uiText.reqHint}</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                        <Users size={12} />
                        {uiText.ownersCount.replace('{count}', String(ownersCount))}
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                      <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500">
                        <div className="col-span-3">{uiText.stageLabel}</div>
                        <div className="col-span-4">{uiText.ownerLabel}</div>
                        <div className="col-span-2">{uiText.statusLabel}</div>
                        <div className="col-span-2">{uiText.progressLabel}</div>
                        <div className="col-span-1 text-right">{uiText.updatedLabel}</div>
                      </div>
                      {requirements.map((req) => (
                        <div
                          key={req.id}
                          className="grid grid-cols-12 items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm"
                        >
                          <div className="col-span-3">
                            <p className="text-xs font-semibold text-gray-900">{req.id}</p>
                            <p className="text-xs text-gray-500">{req.title}</p>
                          </div>
                          <div className="col-span-4 text-xs text-gray-600">{req.owner}</div>
                          <div className="col-span-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[req.status]}`}>
                              {requirementStatusText[req.status]}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <div className="h-1.5 w-full rounded-full bg-gray-100">
                              <div
                                className="h-1.5 rounded-full bg-purple-500"
                                style={{ width: `${req.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-400">{req.progress}%</span>
                          </div>
                          <div className="col-span-1 text-right text-xs text-gray-400">{req.updated}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <h2 className="text-sm font-semibold text-gray-900">{uiText.focusTitle}</h2>
                      <p className="mt-1 text-xs text-gray-500">{focusSubtitle}</p>
                      <p className="mt-3 text-sm text-gray-600">{focusDesc}</p>
                      <div className="mt-4 space-y-2 text-xs text-gray-500">
                        {focusTrace.map((trace) => (
                          <div key={trace.stageId} className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${
                                trace.status === 'done'
                                  ? 'bg-emerald-500'
                                  : trace.status === 'active'
                                  ? 'bg-amber-400'
                                  : trace.status === 'review'
                                  ? 'bg-indigo-400'
                                  : 'bg-gray-300'
                              }`} />
                              {stageLabels[trace.stageId] ?? trace.stageId}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {stageStatusText[trace.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <h2 className="text-sm font-semibold text-gray-900">{uiText.acceptanceTitle}</h2>
                      <div className="mt-4 space-y-3 text-sm">
                        {acceptanceItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                            <span className="flex items-center gap-2 text-gray-600">
                              {acceptanceIcons[item.id]}
                              {acceptanceLabels[item.id] ?? item.id}
                            </span>
                            <span className="font-semibold text-gray-800">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
