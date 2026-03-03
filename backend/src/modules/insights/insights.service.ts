import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateInsightDto, InsightCategoryDto, InsightIconDto, InsightVisibilityDto } from './dto/create-insight.dto';
import { UpdateInsightDto } from './dto/update-insight.dto';
import { UpsertTeamDto } from './dto/upsert-team.dto';
import { UpsertAiTeamDto } from './dto/upsert-ai-team.dto';
import { UpsertTasksDto } from './dto/upsert-tasks.dto';
import { UpsertDirectionsDto } from './dto/upsert-directions.dto';
import { UpsertReportDto } from './dto/upsert-report.dto';
import { UpsertReferencesDto } from './dto/upsert-references.dto';
import { UpsertCredibilityDto } from './dto/upsert-credibility.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any;

// ─── Enum helpers ─────────────────────────────────────────────────────────────

const CATEGORY_TO_DB: Record<string, string> = {
  '宏观洞察': 'MACRO',
  '技术趋势': 'TECH',
  '企业追踪': 'CORP',
};
const CATEGORY_FROM_DB: Record<string, string> = {
  MACRO: '宏观洞察',
  TECH: '技术趋势',
  CORP: '企业追踪',
};
const VISIBILITY_TO_DB: Record<string, string> = { '公开': 'PUBLIC', '私有': 'PRIVATE' };
const VISIBILITY_FROM_DB: Record<string, string> = { PUBLIC: '公开', PRIVATE: '私有' };
const ICON_TO_DB: Record<string, string> = { globe: 'GLOBE', chip: 'CHIP', building: 'BUILDING', network: 'NETWORK' };
const ICON_FROM_DB: Record<string, string> = { GLOBE: 'globe', CHIP: 'chip', BUILDING: 'building', NETWORK: 'network' };
const TASK_STATUS_TO_DB: Record<string, string> = { '已完成': 'DONE', '进行中': 'IN_PROGRESS', '待开始': 'PENDING' };
const TASK_STATUS_FROM_DB: Record<string, string> = { DONE: '已完成', IN_PROGRESS: '进行中', PENDING: '待开始' };
const DIR_STATUS_TO_DB: Record<string, string> = { '完成': 'DONE', '进行中': 'IN_PROGRESS', '待研究': 'PENDING' };
const DIR_STATUS_FROM_DB: Record<string, string> = { DONE: '完成', IN_PROGRESS: '进行中', PENDING: '待研究' };
const AGENT_STATUS_TO_DB: Record<string, string> = { '空闲': 'IDLE', '工作中': 'WORKING', '离线': 'OFFLINE' };
const AGENT_STATUS_FROM_DB: Record<string, string> = { IDLE: '空闲', WORKING: '工作中', OFFLINE: '离线' };

// ─── Accent color map ─────────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, object> = {
  GLOBE: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', tagBg: 'bg-blue-50', tagText: 'text-blue-700', progress: 'bg-blue-500' },
  CHIP: { iconBg: 'bg-purple-100', iconText: 'text-purple-600', tagBg: 'bg-purple-50', tagText: 'text-purple-700', progress: 'bg-purple-500' },
  BUILDING: { iconBg: 'bg-amber-100', iconText: 'text-amber-600', tagBg: 'bg-amber-50', tagText: 'text-amber-700', progress: 'bg-amber-500' },
  NETWORK: { iconBg: 'bg-teal-100', iconText: 'text-teal-600', tagBg: 'bg-teal-50', tagText: 'text-teal-700', progress: 'bg-teal-500' },
};

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_TEAM = [
  { name: 'Dr. Wei Chen', role: '研究负责人', status: 'leader', taskCount: 0 },
  { name: 'Sarah Johnson', role: '政策分析师', status: 'active', taskCount: 0 },
  { name: 'Marcus Lee', role: '技术研究员', status: 'active', taskCount: 0 },
  { name: 'Priya Sharma', role: '数据科学家', status: 'active', taskCount: 0 },
  { name: 'Tom Baker', role: '行业专家', status: 'pending', taskCount: 0 },
  { name: 'Emily Zhang', role: '审阅专家', status: 'pending', taskCount: 0 },
  { name: 'Alex Rivera', role: '报告撰写', status: 'pending', taskCount: 0 },
];

const DEFAULT_AI_TEAM = [
  { name: 'PolicyBot', role: '政策专家', model: 'gpt-4o', status: 'IDLE', isLeader: false, focus: '政策法规' },
  { name: 'TechVision', role: '技术远见者', model: 'gpt-4o', status: 'IDLE', isLeader: false, focus: '前沿技术' },
  { name: 'MarketMind', role: '市场分析师', model: 'gpt-4o', status: 'IDLE', isLeader: false, focus: '宏观经济' },
  { name: 'EthicsGuard', role: '社会伦理师', model: 'gpt-4o', status: 'IDLE', isLeader: false, focus: '安全对齐' },
  { name: 'Reviewer', role: '质量审核', model: 'gpt-4o', status: 'IDLE', isLeader: false, focus: '质量审核' },
  { name: 'WriterAI', role: '报告撰写', model: 'gpt-4o', status: 'IDLE', isLeader: true, focus: '报告撰写' },
];

const DEFAULT_DIRECTIONS = [
  '政策法规', '前沿技术', '宏观经济', '安全对齐',
  '算力基础', '地缘政治', '行业应用', 'AI人才',
  '质量审核', '报告撰写',
];

const DEFAULT_TASKS = [
  { taskId: 'T-001', title: '政策框架分析', subtitle: '分析相关政策法规体系', owner: 'PolicyBot', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-002', title: '前沿技术调研', subtitle: '追踪最新技术进展', owner: 'TechVision', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-003', title: '宏观经济分析', subtitle: '评估经济影响与趋势', owner: 'MarketMind', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-004', title: '安全对齐研究', subtitle: '分析AI安全与对齐挑战', owner: 'EthicsGuard', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-005', title: '算力基础调研', subtitle: '评估算力基础设施现状', owner: 'TechVision', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-006', title: '地缘政治分析', subtitle: '分析地缘政治格局影响', owner: 'PolicyBot', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-007', title: '行业应用研究', subtitle: '梳理主要行业应用场景', owner: 'MarketMind', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-008', title: 'AI人才分析', subtitle: '评估人才供需与培养', owner: 'EthicsGuard', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-009', title: '质量审核', subtitle: '对研究内容进行质量审核', owner: 'Reviewer', model: 'gpt-4o', status: 'PENDING' },
  { taskId: 'T-010', title: '报告撰写', subtitle: '整合成果形成最终报告', owner: 'WriterAI', model: 'gpt-4o', status: 'PENDING' },
];

const DEFAULT_STAGES = [
  { id: 'stage-1', title: '问题定义与框架', owner: 'System', status: '待开始', progress: 0, summary: '' },
  { id: 'stage-2', title: '证据搜集', owner: 'AI Team', status: '待开始', progress: 0, summary: '' },
  { id: 'stage-3', title: '多模型对齐', owner: 'AI Team', status: '待开始', progress: 0, summary: '' },
  { id: 'stage-4', title: '结构化成稿', owner: 'WriterAI', status: '待开始', progress: 0, summary: '' },
];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async listTopics(userId: string) {
    const p = this.prisma as P;
    const topics = await p.insightTopic.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { report: true, references: true, directions: true } },
        directions: { select: { status: true } },
      },
    });

    return topics.map((t: P) => this.toSummary(t));
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createTopic(userId: string, dto: CreateInsightDto) {
    const p = this.prisma as P;
    const category = CATEGORY_TO_DB[dto.category ?? InsightCategoryDto.MACRO] ?? 'MACRO';
    const visibility = VISIBILITY_TO_DB[dto.visibility ?? InsightVisibilityDto.PRIVATE] ?? 'PRIVATE';
    const icon = ICON_TO_DB[dto.icon ?? InsightIconDto.GLOBE] ?? 'GLOBE';

    const topic = await p.insightTopic.create({
      data: { userId, title: dto.title, subtitle: dto.subtitle ?? dto.title, category, visibility, icon },
    });

    // Seed sub-tables with defaults
    await Promise.all([
      p.insightResearchMember.createMany({ data: DEFAULT_TEAM.map((m) => ({ ...m, topicId: topic.id })) }),
      p.insightAiAgent.createMany({ data: DEFAULT_AI_TEAM.map((a) => ({ ...a, topicId: topic.id })) }),
      p.insightDirection.createMany({
        data: DEFAULT_DIRECTIONS.map((label) => ({ topicId: topic.id, label, status: 'PENDING' })),
      }),
      p.insightTask.createMany({ data: DEFAULT_TASKS.map((t) => ({ ...t, topicId: topic.id })) }),
      p.insightResearchSession.create({
        data: { topicId: topic.id, status: 'PENDING', stages: DEFAULT_STAGES, discussions: [] },
      }),
    ]);

    await this.logEvent(topic.id, 'System', 'success', `洞察「${topic.title}」已创建`);

    return this.toSummary({ ...topic, _count: { report: 0, references: 0, directions: DEFAULT_DIRECTIONS.length }, directions: [] });
  }

  // ── Get detail ────────────────────────────────────────────────────────────

  async getDetail(userId: string, id: string) {
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({
      where: { id },
      include: {
        team: true,
        aiTeam: true,
        directions: true,
        tasks: true,
        research: true,
        collab: { orderBy: { timestamp: 'desc' }, take: 50 },
        report: { orderBy: { sortOrder: 'asc' } },
        history: { orderBy: { createdAt: 'desc' } },
        credibility: true,
        references: true,
        claims: { orderBy: { createdAt: 'asc' } },  // Phase D2
      },
    });

    if (!topic) throw new NotFoundException('Insight not found');
    if (topic.userId !== userId) throw new NotFoundException('Insight not found');

    const tasks = topic.tasks ?? [];
    const tasksDone = tasks.filter((t: P) => t.status === 'DONE').length;
    const tasksTotal = tasks.length;
    const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
    const statusLabel = tasksDone === tasksTotal && tasksTotal > 0 ? '已完成' : '进行中';

    const research = topic.research;
    const stages = research?.stages ?? DEFAULT_STAGES;
    const discussions = research?.discussions ?? [];
    const output = research?.output ?? null;

    return {
      id: topic.id,
      title: topic.title,
      subtitle: topic.subtitle,
      category: CATEGORY_FROM_DB[topic.category] ?? '宏观洞察',
      visibility: VISIBILITY_FROM_DB[topic.visibility] ?? '私有',
      icon: ICON_FROM_DB[topic.icon] ?? 'globe',
      accent: ACCENT_MAP[topic.icon] ?? ACCENT_MAP.GLOBE,
      statusLabel,
      progress,
      tasksDone,
      tasksTotal,
      researchStatus: research?.status ?? 'PENDING',
      team: (topic.team ?? []).map((m: P) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        status: m.status,
        tasks: m.taskCount,
      })),
      aiTeam: (topic.aiTeam ?? []).map((a: P) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        model: a.model,
        status: AGENT_STATUS_FROM_DB[a.status] ?? '空闲',
        isLeader: a.isLeader,
        focus: a.focus,
      })),
      directions: (topic.directions ?? []).map((d: P) => ({
        title: d.label,
        status: DIR_STATUS_FROM_DB[d.status] ?? '待研究',
      })),
      tasks: tasks.map((t: P) => ({
        id: t.taskId,
        title: t.title,
        subtitle: t.subtitle,
        owner: t.owner,
        model: t.model,
        status: TASK_STATUS_FROM_DB[t.status] ?? '待开始',
      })),
      deepResearch: {
        stages,
        discussions,
        outputs: output ?? {
          executiveSummary: '',
          keyFindings: [],
          opportunities: [],
          risks: [],
          openQuestions: [],
          actionItems: [],
          consensus: '',
          dissent: [],
          chapters: [],
        },
      },
      collaboration: (topic.collab ?? []).map((e: P) => ({
        id: e.id,
        type: e.type,
        title: e.actor,
        detail: e.detail,
        time: this.formatDate(e.timestamp),
        actor: e.actor,
      })),
      report: {
        generatedAt: topic.updatedAt?.toISOString() ?? new Date().toISOString(),
        executiveSummary: output?.executiveSummary ?? '',
        sections: (topic.report ?? []).map((s: P) => ({
          title: s.title,
          summary: s.summary,
          highlights: s.highlights ?? [],
        })),
      },
      history: (topic.history ?? []).map((h: P) => ({
        id: h.id,
        title: `第 ${h.round} 轮研究`,
        time: h.date,
        summary: h.summary ?? '',
      })),
      credibility: topic.credibility
        ? {
            overall: topic.credibility.overall,
            metrics: topic.credibility.metrics ?? [],
            sources: topic.credibility.sources ?? [],
            timeliness: topic.credibility.timeliness ?? [],
            coverage: topic.credibility.coverage ?? [],
            quality: topic.credibility.quality ?? [],
            limitations: topic.credibility.limitations ?? [],
          }
        : { overall: 0, metrics: [], sources: [], timeliness: [], coverage: [], quality: [], limitations: [] },
      references: (topic.references ?? []).map((r: P, i: number) => ({
        id: i + 1,
        title: r.title,
        domain: r.domain,
        excerpt: r.excerpt ?? '',
        score: r.score,
        tag: r.tag ?? 'web',
      })),
      // Phase D2: Claim-level evidence chain grouped by direction
      claims: (topic.claims ?? []).map((c: P) => ({
        id: c.id,
        directionLabel: c.directionLabel,
        statement: c.statement,
        confidence: c.confidence,
        sourceQuery: c.sourceQuery,
        contestedBy: c.contestedBy ?? null,
        verified: c.verified,
      })),
      // Phase D3: Contradictions extracted from stage2 checkpoint
      contradictions: (() => {
        const checkpoints = (research?.checkpoints ?? {}) as Record<string, P>;
        return (checkpoints?.stage2?.contradictions ?? []).map((c: P) => ({
          direction1: c.direction1,
          direction2: c.direction2,
          claim1: c.claim1,
          claim2: c.claim2,
          description: c.description,
          severity: c.severity,
        }));
      })(),
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateTopic(userId: string, id: string, dto: UpdateInsightDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    const data: P = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle;
    if (dto.category !== undefined) data.category = CATEGORY_TO_DB[dto.category] ?? 'MACRO';
    if (dto.visibility !== undefined) data.visibility = VISIBILITY_TO_DB[dto.visibility] ?? 'PRIVATE';
    if (dto.icon !== undefined) data.icon = ICON_TO_DB[dto.icon] ?? 'GLOBE';

    const updated = await p.insightTopic.update({ where: { id }, data });
    await this.logEvent(id, 'System', 'info', `洞察基本信息已更新`);
    return this.toSummary({ ...updated, _count: { report: 0, references: 0, directions: 0 }, directions: [] });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteTopic(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await (this.prisma as P).insightTopic.delete({ where: { id } });
  }

  // ── Upsert sub-tables ─────────────────────────────────────────────────────

  async upsertTeam(userId: string, id: string, dto: UpsertTeamDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    await p.insightResearchMember.deleteMany({ where: { topicId: id } });
    if (dto.members.length > 0) {
      await p.insightResearchMember.createMany({
        data: dto.members.map((m) => ({
          topicId: id,
          name: m.name,
          role: m.role,
          status: m.status ?? 'active',
          taskCount: m.tasks ?? 0,
        })),
      });
    }
    await this.logEvent(id, 'System', 'info', `研究团队配置已更新（${dto.members.length} 人）`);
  }

  async upsertAiTeam(userId: string, id: string, dto: UpsertAiTeamDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    await p.insightAiAgent.deleteMany({ where: { topicId: id } });
    if (dto.agents.length > 0) {
      await p.insightAiAgent.createMany({
        data: dto.agents.map((a) => ({
          topicId: id,
          name: a.name,
          role: a.role,
          model: a.model,
          status: AGENT_STATUS_TO_DB[a.status ?? '空闲'] ?? 'IDLE',
          isLeader: a.isLeader ?? false,
          focus: a.focus,
        })),
      });
    }
    await this.logEvent(id, 'System', 'info', `AI 团队配置已更新（${dto.agents.length} 个智能体）`);
  }

  async upsertTasks(userId: string, id: string, dto: UpsertTasksDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    await p.insightTask.deleteMany({ where: { topicId: id } });
    if (dto.tasks.length > 0) {
      await p.insightTask.createMany({
        data: dto.tasks.map((t) => ({
          topicId: id,
          taskId: t.taskId,
          title: t.title,
          subtitle: t.subtitle,
          owner: t.owner,
          model: t.model,
          status: TASK_STATUS_TO_DB[t.status ?? '待开始'] ?? 'PENDING',
        })),
      });
    }
  }

  async upsertDirections(userId: string, id: string, dto: UpsertDirectionsDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    await p.insightDirection.deleteMany({ where: { topicId: id } });
    if (dto.directions.length > 0) {
      await p.insightDirection.createMany({
        data: dto.directions.map((d) => ({
          topicId: id,
          label: d.title,
          status: DIR_STATUS_TO_DB[d.status ?? '待研究'] ?? 'PENDING',
        })),
      });
    }
    await this.logEvent(id, 'System', 'info', `研究方向已更新（${dto.directions.length} 个）`);
  }

  async upsertReport(userId: string, id: string, dto: UpsertReportDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    await p.insightReportSection.deleteMany({ where: { topicId: id } });
    if (dto.sections.length > 0) {
      await p.insightReportSection.createMany({
        data: dto.sections.map((s, i) => ({
          topicId: id,
          sortOrder: i,
          title: s.title,
          summary: s.summary,
          highlights: s.highlights ?? [],
        })),
      });
    }
  }

  async upsertReferences(userId: string, id: string, dto: UpsertReferencesDto) {
    await this.assertOwnership(userId, id);
    const p = this.prisma as P;
    await p.insightReference.deleteMany({ where: { topicId: id } });
    if (dto.refs.length > 0) {
      await p.insightReference.createMany({
        data: dto.refs.map((r) => ({
          topicId: id,
          refId: r.refId,
          title: r.title,
          domain: r.domain,
          excerpt: r.excerpt,
          score: r.score ?? 0,
          tag: r.tag ?? 'web',
        })),
      });
    }
  }

  async upsertCredibility(userId: string, id: string, dto: UpsertCredibilityDto) {
    await this.assertOwnership(userId, id);
    await (this.prisma as P).insightCredibility.upsert({
      where: { topicId: id },
      update: {
        overall: dto.overall,
        metrics: dto.metrics ?? [],
        sources: dto.sources ?? [],
        timeliness: dto.timeliness ?? [],
        coverage: dto.coverage ?? [],
        quality: dto.quality ?? [],
        limitations: dto.limitations ?? [],
      },
      create: {
        topicId: id,
        overall: dto.overall,
        metrics: dto.metrics ?? [],
        sources: dto.sources ?? [],
        timeliness: dto.timeliness ?? [],
        coverage: dto.coverage ?? [],
        quality: dto.quality ?? [],
        limitations: dto.limitations ?? [],
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toSummary(t: P) {
    const dirDone = (t.directions ?? []).filter((d: P) => d.status === 'DONE').length;
    const dirTotal = t._count?.directions ?? (t.directions ?? []).length;
    return {
      id: t.id,
      title: t.title,
      subtitle: t.subtitle ?? t.title,
      category: CATEGORY_FROM_DB[t.category] ?? '宏观洞察',
      visibility: VISIBILITY_FROM_DB[t.visibility] ?? '私有',
      reportCount: t._count?.report ?? 0,
      sourceCount: t._count?.references ?? 0,
      dimensionDone: dirDone,
      dimensionTotal: dirTotal,
      lastUpdated: this.formatDate(t.updatedAt ?? t.createdAt),
      icon: ICON_FROM_DB[t.icon] ?? 'globe',
      accent: ACCENT_MAP[t.icon] ?? ACCENT_MAP.GLOBE,
    };
  }

  async logEvent(topicId: string, actor: string, type: string, detail: string) {
    try {
      await (this.prisma as P).insightCollabEvent.create({
        data: { topicId, actor, type, detail },
      });
    } catch {
      // Non-critical: ignore event log failures
    }
  }

  private formatDate(d: Date | string | undefined): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().slice(0, 10);
  }

  async assertOwnership(userId: string, id: string) {
    const t = await (this.prisma as P).insightTopic.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!t || t.userId !== userId) throw new NotFoundException('Insight not found');
  }

  // ── A1: Health check ──────────────────────────────────────────────────────

  async getHealthCheck() {
    const tavilyConfigured = !!process.env.TAVILY_API_KEY;
    const defaultModel = this.aiService.getDefaultModel();
    let kbEnabled = false;
    try {
      // Test KB availability by checking if the knowledge module's prisma table is accessible
      await (this.prisma as P).knowledgeNote.count({ take: 1 });
      kbEnabled = true;
    } catch {
      kbEnabled = false;
    }
    return {
      tavilyConfigured,
      kbEnabled,
      defaultModel: defaultModel?.name ?? 'none',
      defaultModelId: defaultModel?.id ?? '',
    };
  }

  // ── A2: AI direction suggestions ──────────────────────────────────────────

  async suggestDirections(userId: string, topicId: string) {
    await this.assertOwnership(userId, topicId);
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({ where: { id: topicId }, select: { title: true, subtitle: true, category: true } });
    if (!topic) throw new NotFoundException('Topic not found');

    const model = this.aiService.getDefaultModel();
    if (!model) return { suggestions: [] };

    const prompt = `你是一位专业研究规划师。请为以下研究课题提出 6-8 个具体、可执行的研究方向，每个方向需聚焦一个具体问题，避免笼统表述。

课题：${topic.title}
副标题：${topic.subtitle ?? ''}
类别：${topic.category}

请返回纯 JSON 数组（无 markdown）：
[
  {"title": "方向名称（4-8字）", "reason": "为什么选择这个方向（30字以内）"},
  ...
]`;

    try {
      const raw = await this.aiService.chat(model, [
        { role: 'system', content: '你是研究规划专家，以简洁中文回答，返回纯 JSON 数组，不含 markdown 标记。' },
        { role: 'user', content: prompt },
      ]);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const suggestions = JSON.parse(cleaned) as Array<{ title: string; reason: string }>;
      return { suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 8) : [] };
    } catch {
      return { suggestions: [] };
    }
  }

  // ── B3: Follow-up streaming chat ──────────────────────────────────────────

  async followupStream(userId: string, topicId: string, question: string, res: import('express').Response) {
    await this.assertOwnership(userId, topicId);
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({ where: { id: topicId }, select: { title: true } });
    const session = await p.insightResearchSession.findUnique({
      where: { topicId },
      select: { output: true },
    });
    const output = session?.output as P;
    const systemPrompt = `你是一位洞察分析师。以下是关于「${topic?.title ?? ''}」的研究报告：
${output?.executiveSummary ?? '（暂无摘要）'}
关键发现：
${(output?.keyFindings ?? []).join('\n')}
请基于以上研究内容，简洁、专业地回答用户追问（中文，300字以内）。`;

    const model = this.aiService.getDefaultModel();
    if (!model) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.end('data: {"error":"No AI model configured"}\n\ndata: [DONE]\n\n');
      return;
    }

    try {
      await this.aiService.chatStream(model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ], res);
    } catch (err) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  // ── D3: Share token ───────────────────────────────────────────────────────

  async getOrCreateShareToken(userId: string, topicId: string) {
    await this.assertOwnership(userId, topicId);
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({ where: { id: topicId }, select: { shareToken: true } });
    if (!topic) throw new NotFoundException('Topic not found');

    if (topic.shareToken) {
      return { shareToken: topic.shareToken };
    }

    // Generate a short random token
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) token += chars[Math.floor(Math.random() * chars.length)];

    await p.insightTopic.update({ where: { id: topicId }, data: { shareToken: token } });
    return { shareToken: token };
  }

  async getSharedInsight(token: string) {
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({
      where: { shareToken: token },
      include: {
        research: { select: { output: true, status: true } },
        report: { orderBy: { sortOrder: 'asc' } },
        references: { take: 20, orderBy: { score: 'desc' } },
      },
    });
    if (!topic) throw new NotFoundException('Shared insight not found');

    const output = topic.research?.output as P;
    return {
      title: topic.title,
      subtitle: topic.subtitle,
      category: CATEGORY_FROM_DB[topic.category] ?? topic.category,
      icon: ICON_FROM_DB[topic.icon] ?? 'globe',
      executiveSummary: output?.executiveSummary ?? topic.report?.[0]?.summary ?? '',
      keyFindings: output?.keyFindings ?? [],
      opportunities: output?.opportunities ?? [],
      risks: output?.risks ?? [],
      actionItems: output?.actionItems ?? [],
      references: (topic.references ?? []).map((r: P) => ({ title: r.title, domain: r.domain, score: r.score })),
      researchStatus: topic.research?.status ?? 'PENDING',
    };
  }

  // ── Planning Discussion ───────────────────────────────────────────────────

  async runPlanningDiscussion(userId: string, topicId: string, modelIds: string[]) {
    await this.assertOwnership(userId, topicId);
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({
      where: { id: topicId },
      select: { title: true, subtitle: true, category: true },
    });
    if (!topic) throw new NotFoundException('Topic not found');

    const roleMap = ['首席研究员', '专题分析师', '批判评审师', '综合总结师'];
    const nameForModel = (modelId: string, idx: number) => {
      if (modelId.includes('deepseek')) return idx === 0 ? 'DeepSeek 领袖' : 'DeepSeek 研究员';
      if (modelId.includes('gpt')) return idx === 0 ? 'GPT 规划师' : 'GPT 分析师';
      if (modelId.includes('gemini')) return idx === 0 ? 'Gemini 远见师' : 'Gemini 思维师';
      if (modelId.includes('claude')) return idx === 0 ? 'Claude 策略师' : 'Claude 评审师';
      if (modelId.includes('qwen')) return idx === 0 ? 'Qwen 研究员' : 'Qwen 分析师';
      if (modelId.includes('llama')) return idx === 0 ? 'Llama 探索者' : 'Llama 研究员';
      return `AI ${idx === 0 ? '领袖' : '研究员'} ${idx + 1}`;
    };

    const teamSetup = (modelIds.length > 0 ? modelIds : ['default']).slice(0, 4).map((modelId, i) => ({
      name: nameForModel(modelId, i),
      role: roleMap[i] || '研究员',
      model: modelId,
      isLeader: i === 0,
      focus: roleMap[i] || '综合研究',
      status: 'IDLE',
    }));

    const leaderModelId = modelIds[0];
    const leaderModel = this.aiService.getModelById(leaderModelId) ?? this.aiService.getDefaultModel();

    if (!leaderModel) {
      return {
        directions: ['政策与监管', '技术发展', '市场与经济', '社会影响', '未来展望'],
        summary: '团队已就绪，使用默认研究方向',
        teamSetup,
      };
    }

    const teamList = teamSetup.map((m) => `- ${m.name}（${m.role}）`).join('\n');
    const categoryHint = topic.category ? `（${topic.category}类）` : '';
    const prompt = `你是研究规划专家。请为以下课题规划5个最重要且具体可执行的研究方向。
课题：${topic.title}${categoryHint}${topic.subtitle ? `\n副标题：${topic.subtitle}` : ''}

AI研究团队：
${teamList}

规划要求：
1. 每个方向对应课题的一个核心维度（政策、技术、市场、社会、风险等）
2. 方向名称简洁（4-10字），具体可操作，不笼统
3. 各方向相互补充，覆盖完整研究视角

请返回纯JSON（不含任何markdown）：
{
  "summary": "一句话说明研究思路和团队分工，50字以内",
  "directions": ["方向1", "方向2", "方向3", "方向4", "方向5"]
}`;

    try {
      const raw = await this.aiService.chat(leaderModel, [
        { role: 'system', content: '你是研究规划专家，输出纯JSON，不含markdown。' },
        { role: 'user', content: prompt },
      ]);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as { summary: string; directions: string[] };
      return {
        directions: Array.isArray(parsed.directions) ? parsed.directions.slice(0, 6) : [],
        summary: parsed.summary ?? '',
        teamSetup,
      };
    } catch {
      return {
        directions: ['政策与监管', '技术发展', '市场与经济', '社会影响', '未来展望'],
        summary: '规划已完成，使用建议研究方向',
        teamSetup,
      };
    }
  }

  // ── D1: Compare topics ────────────────────────────────────────────────────

  async compareTopics(userId: string, topicIdA: string, topicIdB: string) {
    await Promise.all([
      this.assertOwnership(userId, topicIdA),
      this.assertOwnership(userId, topicIdB),
    ]);
    const p = this.prisma as P;

    const [sessionA, sessionB, topicA, topicB] = await Promise.all([
      p.insightResearchSession.findUnique({ where: { topicId: topicIdA }, select: { output: true } }),
      p.insightResearchSession.findUnique({ where: { topicId: topicIdB }, select: { output: true } }),
      p.insightTopic.findUnique({ where: { id: topicIdA }, select: { title: true, subtitle: true } }),
      p.insightTopic.findUnique({ where: { id: topicIdB }, select: { title: true, subtitle: true } }),
    ]);

    const outputA = sessionA?.output as P;
    const outputB = sessionB?.output as P;

    const model = this.aiService.getDefaultModel();
    if (!model || !outputA || !outputB) {
      return {
        similarities: ['两个课题尚无完整研究数据，无法进行AI对比'],
        differences: [],
        recommendation: '请先完成两个课题的研究后再进行对比',
        topicA: { title: topicA?.title, summary: outputA?.executiveSummary ?? '' },
        topicB: { title: topicB?.title, summary: outputB?.executiveSummary ?? '' },
      };
    }

    const prompt = `请对比以下两份研究报告，返回纯 JSON（无 markdown）：

【课题A：${topicA?.title}】
摘要：${outputA.executiveSummary ?? ''}
关键结论：${(outputA.keyFindings ?? []).join('；')}

【课题B：${topicB?.title}】
摘要：${outputB.executiveSummary ?? ''}
关键结论：${(outputB.keyFindings ?? []).join('；')}

{
  "similarities": ["相似点1", "相似点2"],
  "differences": ["差异点1（课题A vs 课题B）", "差异点2"],
  "recommendation": "综合建议，150字以内",
  "confidenceA": 数值0-100,
  "confidenceB": 数值0-100
}`;

    try {
      const raw = await this.aiService.chat(model, [
        { role: 'system', content: '你是洞察比较分析专家，返回纯 JSON。' },
        { role: 'user', content: prompt },
      ]);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleaned) as P;
      return {
        ...result,
        topicA: { title: topicA?.title, summary: outputA.executiveSummary ?? '' },
        topicB: { title: topicB?.title, summary: outputB.executiveSummary ?? '' },
      };
    } catch {
      return {
        similarities: [],
        differences: ['AI对比分析暂时不可用'],
        recommendation: '请稍后重试',
        topicA: { title: topicA?.title, summary: outputA.executiveSummary ?? '' },
        topicB: { title: topicB?.title, summary: outputB.executiveSummary ?? '' },
      };
    }
  }
}
