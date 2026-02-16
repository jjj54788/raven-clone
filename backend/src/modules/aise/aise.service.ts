import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AiseAcceptanceItem,
  AiseFocus,
  AiseMetric,
  AiseOverview,
  AisePipelineStage,
  AiseQualityGate,
  AiseRequirement,
} from './aise.types';
import { UpdateAiseOverviewDto } from './dto/update-overview.dto';

const STAGE_ORDER: Record<string, number> = {
  requirements: 1,
  design: 2,
  implementation: 3,
  testing: 4,
  acceptance: 5,
};

const METRIC_ORDER: Record<string, number> = {
  lead_time: 1,
  deploy_frequency: 2,
  change_failure_rate: 3,
  mttr: 4,
};

const GATE_ORDER: Record<string, number> = {
  unit_tests: 1,
  code_review: 2,
  security_scan: 3,
  deployment_check: 4,
};

const ACCEPTANCE_ORDER: Record<string, number> = {
  coverage: 1,
  defect_closure: 2,
  signoff: 3,
};

@Injectable()
export class AiseService {
  constructor(private readonly prisma: PrismaService) {}

  private formatRelativeTime(date: Date | null): string {
    if (!date) return '';
    const diffMs = Date.now() - date.getTime();
    if (Number.isNaN(diffMs)) return '';
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  }

  private parseUpdatedAt(value?: string): Date {
    if (!value) return new Date();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid updatedAt timestamp');
    }
    return parsed;
  }

  async getOverview(userId: string): Promise<AiseOverview> {
    const [metricsRaw, pipelineRaw, gatesRaw, acceptanceRaw, requirementsRaw, focusRaw] =
      await this.prisma.$transaction([
        this.prisma.aiseMetric.findMany({ where: { userId } }),
        this.prisma.aisePipelineStage.findMany({ where: { userId } }),
        this.prisma.aiseQualityGate.findMany({ where: { userId } }),
        this.prisma.aiseAcceptanceItem.findMany({ where: { userId } }),
        this.prisma.aiseRequirement.findMany({
          where: { userId },
          orderBy: { sourceUpdatedAt: 'desc' },
        }),
        this.prisma.aiseFocus.findFirst({
          where: { userId },
          orderBy: { savedAt: 'desc' },
          include: { trace: { orderBy: { sortOrder: 'asc' } } },
        }),
      ]);

    const metrics: AiseMetric[] = metricsRaw
      .sort((a, b) => (METRIC_ORDER[a.metricId] ?? 99) - (METRIC_ORDER[b.metricId] ?? 99))
      .map((metric) => ({
        id: metric.metricId,
        value: metric.value,
        hint: metric.hint || '',
      }));

    const pipeline: AisePipelineStage[] = pipelineRaw
      .sort((a, b) => (STAGE_ORDER[a.stageId] ?? 99) - (STAGE_ORDER[b.stageId] ?? 99))
      .map((stage) => ({
        id: stage.stageId,
        status: stage.status,
        wip: `${stage.wipCurrent}/${stage.wipLimit}`,
        wipCurrent: stage.wipCurrent,
        wipLimit: stage.wipLimit,
        count: `${stage.itemsCount} items`,
        itemsCount: stage.itemsCount,
        desc: stage.desc || '',
      }));

    const qualityGates: AiseQualityGate[] = gatesRaw
      .sort((a, b) => (GATE_ORDER[a.gateId] ?? 99) - (GATE_ORDER[b.gateId] ?? 99))
      .map((gate) => ({
        id: gate.gateId,
        status: gate.status,
        value: gate.value,
      }));

    const acceptance: AiseAcceptanceItem[] = acceptanceRaw
      .sort((a, b) => (ACCEPTANCE_ORDER[a.acceptanceId] ?? 99) - (ACCEPTANCE_ORDER[b.acceptanceId] ?? 99))
      .map((item) => ({
        id: item.acceptanceId,
        value: item.value,
      }));

    const requirements: AiseRequirement[] = requirementsRaw.map((req) => ({
      id: req.key,
      title: req.title,
      owner: req.owner,
      stageId: req.stageId,
      status: req.status,
      progress: req.progress,
      updatedAt: this.formatRelativeTime(req.sourceUpdatedAt),
    }));

    const ownersCount = new Set(requirementsRaw.map((req) => req.owner)).size;

    let focus: AiseFocus | null = null;
    if (focusRaw) {
      focus = {
        requirementId: focusRaw.requirementKey,
        title: focusRaw.title,
        description: focusRaw.description,
        stageId: focusRaw.stageId,
        status: focusRaw.status,
        trace: focusRaw.trace.map((trace) => ({
          stageId: trace.stageId,
          status: trace.status,
        })),
      };
    }

    if (!focus && requirements.length > 0) {
      const candidate = requirements[0];
      focus = {
        requirementId: candidate.id,
        title: candidate.title,
        description: '',
        stageId: candidate.stageId,
        status: candidate.status,
        trace: pipeline.map((stage) => ({
          stageId: stage.id,
          status: stage.status,
        })),
      };
    }

    if (!focus) {
      focus = {
        requirementId: '',
        title: '',
        description: '',
        stageId: 'requirements',
        status: 'active',
        trace: pipeline.map((stage) => ({
          stageId: stage.id,
          status: stage.status,
        })),
      };
    }

    return {
      asOf: new Date().toISOString(),
      metrics,
      pipeline,
      qualityGates,
      acceptance,
      requirements,
      focus,
      ownersCount,
    };
  }

  async updateOverview(userId: string, dto: UpdateAiseOverviewDto): Promise<AiseOverview> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (Array.isArray(dto.metrics)) {
        await tx.aiseMetric.deleteMany({ where: { userId } });
        if (dto.metrics.length > 0) {
          await tx.aiseMetric.createMany({
            data: dto.metrics.map((metric) => ({
              userId,
              metricId: metric.id,
              value: metric.value,
              hint: metric.hint ?? null,
              capturedAt: now,
              savedAt: now,
            })),
          });
        }
      }

      if (Array.isArray(dto.pipeline)) {
        await tx.aisePipelineStage.deleteMany({ where: { userId } });
        if (dto.pipeline.length > 0) {
          await tx.aisePipelineStage.createMany({
            data: dto.pipeline.map((stage) => ({
              userId,
              stageId: stage.id,
              status: stage.status,
              wipCurrent: stage.wipCurrent,
              wipLimit: stage.wipLimit,
              itemsCount: stage.itemsCount,
              desc: stage.desc ?? null,
              savedAt: now,
            })),
          });
        }
      }

      if (Array.isArray(dto.qualityGates)) {
        await tx.aiseQualityGate.deleteMany({ where: { userId } });
        if (dto.qualityGates.length > 0) {
          await tx.aiseQualityGate.createMany({
            data: dto.qualityGates.map((gate) => ({
              userId,
              gateId: gate.id,
              status: gate.status,
              value: gate.value,
              savedAt: now,
            })),
          });
        }
      }

      if (Array.isArray(dto.acceptance)) {
        await tx.aiseAcceptanceItem.deleteMany({ where: { userId } });
        if (dto.acceptance.length > 0) {
          await tx.aiseAcceptanceItem.createMany({
            data: dto.acceptance.map((item) => ({
              userId,
              acceptanceId: item.id,
              value: item.value,
              savedAt: now,
            })),
          });
        }
      }

      if (Array.isArray(dto.requirements)) {
        await tx.aiseRequirement.deleteMany({ where: { userId } });
        if (dto.requirements.length > 0) {
          await tx.aiseRequirement.createMany({
            data: dto.requirements.map((req) => ({
              userId,
              key: req.id,
              title: req.title,
              owner: req.owner,
              stageId: req.stageId,
              status: req.status,
              progress: req.progress,
              sourceUpdatedAt: this.parseUpdatedAt(req.updatedAt),
              createdAt: now,
              savedAt: now,
            })),
          });
        }
      }

      if (dto.focus !== undefined) {
        await tx.aiseFocusTrace.deleteMany({
          where: {
            focus: { userId },
          },
        });
        await tx.aiseFocus.deleteMany({ where: { userId } });

        if (dto.focus) {
          const focus = await tx.aiseFocus.create({
            data: {
              userId,
              requirementKey: dto.focus.requirementId,
              title: dto.focus.title,
              description: dto.focus.description,
              stageId: dto.focus.stageId,
              status: dto.focus.status,
              savedAt: now,
            },
          });

          if (dto.focus.trace && dto.focus.trace.length > 0) {
            await tx.aiseFocusTrace.createMany({
              data: dto.focus.trace.map((trace, idx) => ({
                focusId: focus.id,
                stageId: trace.stageId,
                status: trace.status,
                sortOrder: idx,
              })),
            });
          }
        }
      }
    });

    return this.getOverview(userId);
  }

  async listRequirements(userId: string): Promise<AiseRequirement[]> {
    const requirements = await this.prisma.aiseRequirement.findMany({
      where: { userId },
      orderBy: { sourceUpdatedAt: 'desc' },
    });

    return requirements.map((req) => ({
      id: req.key,
      title: req.title,
      owner: req.owner,
      stageId: req.stageId,
      status: req.status,
      progress: req.progress,
      updatedAt: this.formatRelativeTime(req.sourceUpdatedAt),
    }));
  }

  async getRequirement(userId: string, id: string): Promise<AiseRequirement> {
    const requirement = await this.prisma.aiseRequirement.findFirst({
      where: { userId, key: id },
    });
    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    return {
      id: requirement.key,
      title: requirement.title,
      owner: requirement.owner,
      stageId: requirement.stageId,
      status: requirement.status,
      progress: requirement.progress,
      updatedAt: this.formatRelativeTime(requirement.sourceUpdatedAt),
    };
  }
}
