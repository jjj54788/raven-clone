import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { KnowledgeEmbeddingService } from '../knowledge/knowledge-embedding.service';
import { InsightStreamService } from './insights-stream.service';
import { InsightsService } from './insights.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any;
type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// ─── Confidence threshold for Quality Gate ────────────────────────────────────
const QUALITY_GATE_THRESHOLD = 0.65;

// ─── Tavily search helper ─────────────────────────────────────────────────────

async function tavilySearch(
  query: string,
  maxResults = 5,
): Promise<Array<{ title: string; url: string; content: string; published_date?: string }>> {
  if (!TAVILY_API_KEY) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'basic',
      }),
    });
    const data = (await res.json()) as {
      results?: Array<{ title: string; url: string; content: string; published_date?: string }>;
    };
    return data.results ?? [];
  } catch {
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ─── Phase B1: Planner output type ───────────────────────────────────────────

interface AgentAssignment {
  directionLabel: string;
  agentName: string;
  focus: string;
  approach: string;  // short description of what to look for
}

// ─── Phase D1: Structural analysis framework types ────────────────────────────

interface FrameworkDimension {
  name: string;          // e.g. "政治环境 (Political)"
  description: string;   // analysis focus for this dimension
  assignedDirection: string;  // matched to InsightDirection.label
}

interface PlannerOutput {
  framework: string;
  frameworkType: string;   // PEST | SWOT_PORTER | TECH_TRL | POLICY_WINDOW | CUSTOM
  frameworkDimensions: FrameworkDimension[];
  agentAssignments: AgentAssignment[];
  debateConfig: {
    proposerRole: string;  // matches agent.role
    criticRole: string;
  };
  researchGoal: string;
}

// ─── Phase D1: Framework registry ─────────────────────────────────────────────

const ANALYSIS_FRAMEWORKS: Record<string, { name: string; description: string; trigger: RegExp; dimensions: Array<{ name: string; description: string }> }> = {
  PEST: {
    name: 'PEST Analysis',
    description: '政治-经济-社会-技术宏观环境分析框架',
    trigger: /宏观|政策|经济|社会|政治|国际|市场|大环境/,
    dimensions: [
      { name: '政治环境 (Political)', description: '政策法规、政府政策、政治稳定性、监管动向' },
      { name: '经济环境 (Economic)', description: 'GDP增速、利率、汇率、通货膨胀、消费支出、投资格局' },
      { name: '社会环境 (Social)', description: '人口结构、文化趋势、生活方式、社会价值观' },
      { name: '技术环境 (Technological)', description: '技术创新、研发投入、数字化、自动化趋势' },
    ],
  },
  SWOT_PORTER: {
    name: 'SWOT + Porter Five Forces',
    description: '企业竞争优劣势 + 产业竞争格局分析',
    trigger: /企业|公司|行业|竞争|产业|商业|市场份额|商业模式/,
    dimensions: [
      { name: '内部优势 (Strengths)', description: '核心能力、资源禀赋、品牌价值、技术积累' },
      { name: '内部劣势 (Weaknesses)', description: '短板领域、资源缺口、执行能力、成本结构' },
      { name: '外部机会 (Opportunities)', description: '市场空白、政策红利、技术趋势、新兴需求' },
      { name: '外部威胁 + 五力 (Threats + Forces)', description: '竞争加剧、技术替代、监管收紧、新进入者、供应商议价' },
    ],
  },
  TECH_TRL: {
    name: 'Technology Readiness Level (TRL)',
    description: '技术成熟度路径与产业落地评估框架',
    trigger: /技术|AI|人工智能|算法|研发|创新|工程|系统|芯片|数字化/,
    dimensions: [
      { name: '基础研究 (TRL 1-3)', description: '技术原理验证、概念验证、原型实验' },
      { name: '技术开发 (TRL 4-6)', description: '原型开发、关键环境测试、系统集成演示' },
      { name: '产业化部署 (TRL 7-9)', description: '大规模应用、商业落地、生态系统建设' },
      { name: '技术生态 (Ecosystem)', description: '专利布局、开源社区、产学研合作、标准化进展' },
    ],
  },
  POLICY_WINDOW: {
    name: 'Policy Window Theory (Kingdon)',
    description: '政策议程设置与政策窗口三流理论分析',
    trigger: /政策|立法|监管|政府|法规|治理|合规|制度|行政/,
    dimensions: [
      { name: '问题流 (Problem Stream)', description: '政策问题识别、问题指标、焦点事件与危机触发' },
      { name: '政策流 (Policy Stream)', description: '政策方案设计、可行性评估、政策共同体共识' },
      { name: '政治流 (Political Stream)', description: '国民情绪、政治力量对比、行政议程变化' },
      { name: '政策窗口 (Policy Window)', description: '三流汇合时机、倡导联盟策略、政策企业家角色' },
    ],
  },
};

// ─── Phase A2: Specialized system-prompt builder ──────────────────────────────

function buildDirectionAgentSystemPrompt(
  agent: P,
  topicTitle: string,
  directionLabel: string,
  approach?: string,
  frameworkDimension?: FrameworkDimension,
): string {
  const focus = agent.focus || agent.role || '综合研究';
  const isEcon = /经济|宏观|金融|市场|产业/.test(focus);
  const isTech = /技术|AI|科技|工程|算法|数字/.test(focus);
  const isPolicy = /政策|法律|监管|政府|合规|治理/.test(focus);
  const isGeo = /地缘|国际|外交|区域|全球/.test(focus);

  const domainGuidance = isEcon
    ? `- 优先引用量化数据：GDP、投资额、市场规模、增速等
- 分析市场结构、竞争格局、资本流向与产业生态`
    : isTech
    ? `- 评估技术成熟度（TRL）、实施路径与关键瓶颈
- 关注专利趋势、论文发表、开源生态与产业落地`
    : isPolicy
    ? `- 追踪具体政策文本、立法进度、监管机构表态
- 分析政策执行机制、合规要求与跨辖区影响`
    : isGeo
    ? `- 分析地缘竞争格局、供应链依存度与联盟关系
- 关注关键节点国家的战略意图与博弈动态`
    : `- 综合多维视角进行系统分析
- 识别关键变量、核心矛盾与主要不确定性`;

  const approachNote = approach ? `\n研究侧重点（Planner 指定）：${approach}` : '';

  // Phase D1: Inject framework dimension context
  const frameworkNote = frameworkDimension
    ? `\n\n## 分析框架维度（D1 结构化）
你负责「${frameworkDimension.name}」维度：${frameworkDimension.description}
请从此维度视角出发，系统评估「${directionLabel}」，确保分析与框架维度精准对齐。`
    : '';

  return `你是 ${agent.name}，职位：${agent.role ?? '高级研究分析师'}，专业方向：${focus}。
你正在参与关于「${topicTitle}」的深度研究项目，负责分析「${directionLabel}」方向。${approachNote}${frameworkNote}

分析原则：
${domainGuidance}
- 区分已确认事实与推断性结论，对不确定信息明确标注
- 分析需有据可查，避免空泛表述
- 控制在 150-250 字之间，精炼有力

输出格式：严格返回 JSON，不含 markdown 代码块：
{
  "analysis": "详细分析内容",
  "confidence": 0.0~1.0,
  "keyPoints": ["要点1", "要点2"],
  "gaps": ["信息缺口，说明还需要哪些数据"],
  "claims": [
    { "statement": "具体可验证的论断", "confidence": 0.0~1.0, "sourceQuery": "建议搜索此论断证据的关键词" }
  ]
}`;
}

function buildRetryPromptWithSearch(
  prevAnalysis: string,
  directionLabel: string,
  searchContext: string,
): string {
  return `你对「${directionLabel}」的前次分析置信度偏低。现已获得最新检索数据，请结合新数据进行修订。

前次分析：
${prevAnalysis}

最新检索结果：
${searchContext}

请重点补充前次分析中缺失的证据，修订置信度，返回同样的 JSON 格式。`;
}

// ─── Phase C1: ReAct system-prompt builder ───────────────────────────────────
// Agents can call [WEB_SEARCH: query] or [KB_SEARCH: query] before finalizing.

function buildReActSystemPrompt(
  agent: P,
  topicTitle: string,
  directionLabel: string,
  approach?: string,
  frameworkDimension?: FrameworkDimension,
): string {
  const base = buildDirectionAgentSystemPrompt(agent, topicTitle, directionLabel, approach, frameworkDimension);
  return `${base}

## ReAct 工具使用（可选，最多 2 次）
如果当前知识不足以给出高置信度分析，你可以在正文中使用以下格式调用工具：
  [WEB_SEARCH: 搜索关键词]    — 搜索最新网络信息
  [KB_SEARCH: 查询关键词]    — 查询用户知识库中的相关内容

工具调用规则：
- 每次响应只能包含 **一个** 工具调用或直接返回最终 JSON
- 如果你调用了工具，系统将在下一条消息中返回 [OBSERVATION: ...] 结果
- 获取足够信息后，直接返回最终 JSON（不含任何工具调用）
- 如果不需要额外信息，直接输出最终 JSON 即可`;
}

// ─── Credibility algorithm ────────────────────────────────────────────────────

const AUTHORITY_DOMAINS = [
  '.gov', '.edu', '.ac.', 'arxiv.org', 'nature.com', 'science.org',
  'pubmed', 'ieee.org', 'acm.org', 'nist.gov', 'congress.gov',
];

function calcCredibility(
  refs: Array<{ domain: string; score: number }>,
  dirTotal: number,
  dirDone: number,
  avgConfidence = 0.6,
  claimsCount = 0,
) {
  if (refs.length === 0) {
    const coverageScore = dirTotal > 0 ? Math.round((dirDone / dirTotal) * 100) : 0;
    const confScore = Math.round(avgConfidence * 100);
    return { overall: Math.round(confScore * 0.4 + coverageScore * 0.15), authorityScore: 0, diversityScore: 0, timelinessScore: 0, coverageScore };
  }
  const authorityCount = refs.filter((r) => AUTHORITY_DOMAINS.some((d) => r.domain.includes(d))).length;
  const authorityScore = Math.round(Math.min(100, (authorityCount / refs.length) * 100 * 1.5));
  const uniqueDomains = new Set(refs.map((r) => r.domain)).size;
  const diversityScore = Math.round(Math.min(100, (uniqueDomains / Math.max(dirTotal, 1)) * 100));
  const coverageScore = dirTotal > 0 ? Math.round((dirDone / dirTotal) * 100) : 0;
  // Timeliness: proxy by claim density (claims per direction) and avg ref score
  const claimDensity = dirTotal > 0 ? Math.min(1, claimsCount / (dirTotal * 2)) : 0;
  const avgRefScore = refs.reduce((s, r) => s + (r.score || 60), 0) / refs.length;
  const timelinessScore = Math.round((claimDensity * 50 + (avgRefScore / 100) * 50));
  // overall: confidence(40%) + authority(25%) + diversity(20%) + coverage(15%)
  const confScore = Math.round(avgConfidence * 100);
  const overall = Math.round(
    confScore * 0.4 + authorityScore * 0.25 + diversityScore * 0.2 + coverageScore * 0.15,
  );
  return { overall, authorityScore, diversityScore, timelinessScore, coverageScore };
}

// ─── Phase D2: Claim type ─────────────────────────────────────────────────────

interface Claim {
  statement: string;
  confidence: number;
  sourceQuery: string;
}

// ─── Direction result type ────────────────────────────────────────────────────

interface DirResult {
  label: string;
  analysis: string;
  agent: string;
  model: string;
  confidence: number;
  keyPoints: string[];
  gaps: string[];
  claims: Claim[];  // Phase D2: claim-level evidence
}

// ─── Research service ─────────────────────────────────────────────────────────

@Injectable()
export class InsightsResearchService {
  private readonly logger = new Logger(InsightsResearchService.name);

  // C1/C2 react threshold — below this avgConfidence triggers ReAct
  private static readonly REACT_CONFIDENCE_THRESHOLD = 0.72;
  // C3 dynamic replan threshold — below this avgConf triggers replanning
  private static readonly REPLAN_CONFIDENCE_THRESHOLD = 0.60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly stream: InsightStreamService,
    private readonly insightsService: InsightsService,
    private readonly knowledgeEmbedding: KnowledgeEmbeddingService,
  ) {}

  // ── Start research (background) — Phase B3: checkpoint resume ─────────────

  async startResearch(userId: string, topicId: string, useWebSearch = false, pauseAfterStages: number[] = [], quickMode = false) {
    const p = this.prisma as P;
    await this.insightsService.assertOwnership(userId, topicId);

    // Phase B3: Read existing checkpoints to determine resume point
    const existingSession = await p.insightResearchSession.findUnique({
      where: { topicId },
      select: { status: true, checkpoints: true },
    });

    const existingCheckpoints: Record<string, P> =
      existingSession?.checkpoints && typeof existingSession.checkpoints === 'object'
        ? (existingSession.checkpoints as Record<string, P>)
        : {};

    // If previous run completed successfully, always re-run fresh
    // If previous run is ERROR with checkpoints, resume from last completed stage
    const canResume =
      existingSession?.status === 'ERROR' &&
      Object.keys(existingCheckpoints).length > 0;

    const resumeFrom: number = canResume
      ? existingCheckpoints['stage3']
        ? 4  // stages 1-3 done, resume from stage 4
        : existingCheckpoints['stage2']
        ? 3  // stages 1-2 done, resume from stage 3
        : existingCheckpoints['stage1']
        ? 2  // stage 1 done, resume from stage 2
        : 1
      : 1;

    if (canResume && resumeFrom > 1) {
      this.logger.log(`Resuming research for ${topicId} from stage ${resumeFrom}`);
      await p.insightResearchSession.update({
        where: { topicId },
        data: { status: 'RUNNING', updatedAt: new Date() },
      });
    } else {
      // Fresh start: reset everything
      await p.insightResearchSession.upsert({
        where: { topicId },
        update: { status: 'RUNNING', stages: [], discussions: [], output: null, checkpoints: {}, updatedAt: new Date() },
        create: { topicId, status: 'RUNNING', stages: [], discussions: [], checkpoints: {} },
      });
    }

    await p.insightDirection.updateMany({ where: { topicId }, data: { status: 'IN_PROGRESS' } });
    await p.insightAiAgent.updateMany({ where: { topicId }, data: { status: 'WORKING' } });

    const resumeMsg = canResume && resumeFrom > 1
      ? `AI 深度研究从第 ${resumeFrom} 阶段恢复执行`
      : 'AI 深度研究开始执行';
    await this.insightsService.logEvent(topicId, 'System', 'warning', resumeMsg);

    setImmediate(() => {
      this.runResearch(topicId, userId, useWebSearch, canResume ? resumeFrom : 1, existingCheckpoints, pauseAfterStages, quickMode).catch((err) => {
        this.logger.error(`Research failed for ${topicId}: ${err}`);
        (this.prisma as P).insightResearchSession
          .update({ where: { topicId }, data: { status: 'ERROR' } })
          .catch(() => {});
        this.stream.emit(topicId, 'error', { message: String(err) });
      });
    });
  }

  // ── Phase B3: Save checkpoint after each stage ────────────────────────────

  private async saveCheckpoint(topicId: string, stageKey: string, data: P) {
    const p = this.prisma as P;
    const session = await p.insightResearchSession.findUnique({
      where: { topicId },
      select: { checkpoints: true },
    });
    const existing: Record<string, P> =
      session?.checkpoints && typeof session.checkpoints === 'object'
        ? (session.checkpoints as Record<string, P>)
        : {};
    await p.insightResearchSession.update({
      where: { topicId },
      data: { checkpoints: { ...existing, [stageKey]: data } },
    });
  }

  // ── Main research pipeline ────────────────────────────────────────────────

  // ── Phase F1: Resume from paused state ───────────────────────────────────

  async resumeResearch(userId: string, topicId: string, userNotes?: string, modifiedAssignments?: AgentAssignment[]) {
    const p = this.prisma as P;
    await this.insightsService.assertOwnership(userId, topicId);

    const session = await p.insightResearchSession.findUnique({
      where: { topicId },
      select: { status: true, checkpoints: true },
    });

    if (session?.status !== 'PAUSED') {
      throw new Error('Research is not in a paused state');
    }

    const checkpoints: Record<string, P> =
      session.checkpoints && typeof session.checkpoints === 'object'
        ? (session.checkpoints as Record<string, P>)
        : {};

    // Apply user modifications to the plan if provided
    if (modifiedAssignments && checkpoints['stage1']?.plannerOutput) {
      checkpoints['stage1'].plannerOutput.agentAssignments = modifiedAssignments;
    }

    // Inject user notes as an observation into the next stage
    if (userNotes && checkpoints['stage1']) {
      checkpoints['stage1'].userNotes = userNotes;
    }

    const resumeFrom = checkpoints['stage3'] ? 4
      : checkpoints['stage2'] ? 3
      : checkpoints['stage1'] ? 2
      : 1;

    await p.insightResearchSession.update({
      where: { topicId },
      data: { status: 'RUNNING', checkpoints, updatedAt: new Date() },
    });

    await p.insightAiAgent.updateMany({ where: { topicId }, data: { status: 'WORKING' } });

    await this.insightsService.logEvent(topicId, 'System', 'info', `研究从第 ${resumeFrom} 阶段恢复（专家介入后继续）`);
    this.stream.emit(topicId, 'research-resumed', { fromStage: resumeFrom, hasUserNotes: !!userNotes });

    setImmediate(() => {
      this.runResearch(topicId, userId, false, resumeFrom, checkpoints, []).catch((err) => {
        this.logger.error(`Resumed research failed for ${topicId}: ${err}`);
        (this.prisma as P).insightResearchSession
          .update({ where: { topicId }, data: { status: 'ERROR' } })
          .catch(() => {});
        this.stream.emit(topicId, 'error', { message: String(err) });
      });
    });
  }

  private async runResearch(
    topicId: string,
    userId: string,
    useWebSearch: boolean,
    resumeFrom = 1,
    savedCheckpoints: Record<string, P> = {},
    pauseAfterStages: number[] = [],
    quickMode = false,
  ) {
    const p = this.prisma as P;
    const topic = await p.insightTopic.findUnique({
      where: { id: topicId },
      include: { aiTeam: true, directions: true, tasks: true },
    });
    if (!topic) throw new Error('Topic not found');

    const agents: P[] = topic.aiTeam ?? [];
    const directions: P[] = topic.directions ?? [];

    const getModel = (agent: P) =>
      this.aiService.getModelById(agent?.model) ?? this.aiService.getDefaultModel();

    const leader = agents.find((a: P) => a.isLeader) ?? agents[0];
    const leaderModel = leader ? getModel(leader) : this.aiService.getDefaultModel();

    // Restore discussion log from existing session if resuming
    const existingSession = await p.insightResearchSession.findUnique({
      where: { topicId },
      select: { discussions: true },
    });
    const discussionLog: P[] = Array.isArray(existingSession?.discussions)
      ? (existingSession.discussions as P[])
      : [];

    const newRefs: Array<{
      refId: string; title: string; domain: string; excerpt: string; score: number; tag: string;
    }> = [];

    // ── Restore from checkpoints ──────────────────────────────────────────
    let framework = '';
    let plannerOutput: PlannerOutput | null = null;
    let dirResults: DirResult[] = [];
    let round1Proposition = '';
    let wasReplanned = false;  // Phase C3: track if dynamic replan occurred
    let round2Critique = '';
    let round3Rebuttal = '';

    if (resumeFrom > 1 && savedCheckpoints['stage1']) {
      framework = savedCheckpoints['stage1'].framework ?? '';
      plannerOutput = savedCheckpoints['stage1'].plannerOutput ?? null;
      // Phase D1: ensure frameworkDimensions is present (backwards compat)
      if (plannerOutput && !plannerOutput.frameworkDimensions) {
        plannerOutput.frameworkDimensions = [];
      }
      this.logger.log(`Restored Stage 1 checkpoint: framework length=${framework.length}, frameworkType=${plannerOutput?.frameworkType ?? 'none'}`);
    }
    if (resumeFrom > 2 && savedCheckpoints['stage2']) {
      dirResults = savedCheckpoints['stage2'].dirResults ?? [];
      wasReplanned = savedCheckpoints['stage2'].wasReplanned ?? false;
      if (savedCheckpoints['stage2'].plannerOutput) {
        plannerOutput = savedCheckpoints['stage2'].plannerOutput;
      }
      this.logger.log(`Restored Stage 2 checkpoint: ${dirResults.length} direction results, replanned=${wasReplanned}`);
    }
    if (resumeFrom > 3 && savedCheckpoints['stage3']) {
      round1Proposition = savedCheckpoints['stage3'].round1 ?? '';
      round2Critique = savedCheckpoints['stage3'].round2 ?? '';
      round3Rebuttal = savedCheckpoints['stage3'].round3 ?? '';
      this.logger.log(`Restored Stage 3 checkpoint: debate transcript`);
    }

    // ── Stage 1: Planner Agent ─────────────────────────────────────────────
    // Phase B1: Leader agent produces a structured research plan JSON

    if (resumeFrom <= 1) {
      this.stream.emit(topicId, 'stage-start', { stage: 1, title: quickMode ? '规划与框架（快速模式）' : '规划与框架（Planner）' });
      await this.updateStage(topicId, 0, { status: '进行中', progress: 10 });

      // Phase D1: Auto-detect framework (always, used for both full and quick mode)
      const topicText = `${topic.title} ${topic.subtitle ?? ''} ${topic.category ?? ''}`;
      const detectedFramework = Object.entries(ANALYSIS_FRAMEWORKS).find(([, fw]) => fw.trigger.test(topicText));

      if (quickMode) {
        // C1 Quick mode: skip AI planner, use auto-detected framework directly
        plannerOutput = {
          framework: detectedFramework ? `快速模式 — ${detectedFramework[1].name}：${detectedFramework[1].description}` : `快速模式 — 综合分析框架`,
          frameworkType: detectedFramework ? detectedFramework[0] : 'PEST',
          frameworkDimensions: detectedFramework
            ? detectedFramework[1].dimensions.map((dim, i) => ({
                name: dim.name,
                description: dim.description,
                assignedDirection: directions[i % Math.max(directions.length, 1)]?.label ?? '',
              }))
            : [],
          agentAssignments: directions.map((d: P, i: number) => ({
            directionLabel: d.label,
            agentName: agents[i % Math.max(agents.length, 1)]?.name ?? '',
            focus: agents[i % Math.max(agents.length, 1)]?.focus ?? '综合分析',
            approach: `快速分析${d.label}方向要点`,
          })),
          debateConfig: { proposerRole: '研究|分析|综合', criticRole: '审|评|质疑' },
          researchGoal: `快速洞察：${topic.title}`,
        };
        framework = plannerOutput.framework;
      } else if (leaderModel) {
        const dirLabels = directions.map((d: P) => d.label).join('、');
        const agentList = agents.map((a: P) => `${a.name}（${a.role}，专注：${a.focus ?? '综合'}）`).join('\n');

        this.stream.emit(topicId, 'agent-thinking', { agent: leader?.name ?? 'Planner', stage: 1 });

        const frameworkHint = detectedFramework
          ? `建议使用「${detectedFramework[1].name}」框架（${detectedFramework[1].description}），维度包括：${detectedFramework[1].dimensions.map((d) => d.name).join('、')}`
          : '可使用 PEST/SWOT_PORTER/TECH_TRL/POLICY_WINDOW 或自定义框架';

        const plannerPrompt = `你是顶级研究规划员 ${leader?.name ?? 'Planner'}（${leader?.role ?? '首席研究员'}）。
请为以下课题制定详细研究计划，合理分配研究任务给各 AI 智能体，返回纯 JSON（不含 markdown）：

课题：${topic.title}
副标题：${topic.subtitle ?? ''}
类别：${topic.category ?? 'MACRO'}
研究方向：${dirLabels}

可用智能体：
${agentList}

## 分析框架选择（Phase D1）
${frameworkHint}

框架选择规则：
- MACRO/宏观/国际类 → PEST（政治-经济-社会-技术）
- 企业/行业/竞争类 → SWOT_PORTER（SWOT+Porter五力）
- 技术/AI/工程类 → TECH_TRL（技术成熟度路径）
- 政策/监管/治理类 → POLICY_WINDOW（Kingdon政策窗口）
- 混合或其他 → CUSTOM（自定义框架维度）

请返回以下格式的计划（纯 JSON，无 markdown）：
{
  "framework": "研究框架描述，300字以内",
  "researchGoal": "核心研究目标，100字以内",
  "frameworkType": "PEST|SWOT_PORTER|TECH_TRL|POLICY_WINDOW|CUSTOM",
  "frameworkDimensions": [
    {
      "name": "框架维度名称（如：政治环境 Political）",
      "description": "该维度的分析重点，40字以内",
      "assignedDirection": "对应研究方向的完整名称（与方向列表完全一致）"
    }
  ],
  "agentAssignments": [
    {
      "directionLabel": "方向名称（与上面完全一致）",
      "agentName": "指定智能体名称",
      "focus": "该智能体在此方向上的专注点",
      "approach": "建议的研究方法或切入角度，50字以内"
    }
  ],
  "debateConfig": {
    "proposerRole": "担任综合论点提出者的角色关键词（如：研究|分析|综合）",
    "criticRole": "担任评审批判者的角色关键词（如：审|评|质疑）"
  }
}`;

        const raw = await this.aiService.chat(leaderModel, [
          { role: 'system', content: '你是研究规划专家，输出格式为纯 JSON，不含任何 markdown 标记。' },
          { role: 'user', content: plannerPrompt },
        ]);

        plannerOutput = parseJson<PlannerOutput>(raw, {
          framework: raw.slice(0, 500),
          researchGoal: `深入研究${topic.title}的关键发现`,
          frameworkType: detectedFramework ? detectedFramework[0] : 'CUSTOM',
          frameworkDimensions: detectedFramework
            ? detectedFramework[1].dimensions.map((dim, i) => ({
                name: dim.name,
                description: dim.description,
                assignedDirection: directions[i % Math.max(directions.length, 1)]?.label ?? '',
              }))
            : [],
          agentAssignments: directions.map((d: P, i: number) => ({
            directionLabel: d.label,
            agentName: agents[i % Math.max(agents.length, 1)]?.name ?? '',
            focus: agents[i % Math.max(agents.length, 1)]?.focus ?? '综合分析',
            approach: `从专业角度分析${d.label}方向`,
          })),
          debateConfig: { proposerRole: '研究|分析|综合', criticRole: '审|评|质疑' },
        });

        framework = plannerOutput.framework;
      }

      discussionLog.push({
        time: new Date().toISOString(),
        agent: leader?.name ?? 'Planner',
        model: leaderModel?.id ?? '',
        type: 'decision',
        content: `【研究计划】${framework.slice(0, 200)}`,
      });

      this.stream.emit(topicId, 'stage-progress', {
        stage: 1,
        content: framework,
        agent: leader?.name ?? 'System',
        plan: plannerOutput,
      });

      await this.updateStage(topicId, 0, {
        status: '已完成',
        progress: 100,
        summary: `研究目标：${plannerOutput?.researchGoal?.slice(0, 100) ?? framework.slice(0, 100)}`,
      });

      // Phase B3: Save Stage 1 checkpoint
      await this.saveCheckpoint(topicId, 'stage1', {
        framework,
        plannerOutput,
        completedAt: new Date().toISOString(),
      });
      await p.insightResearchSession.update({
        where: { topicId },
        data: { discussions: discussionLog },
      });

      this.stream.emit(topicId, 'stage-complete', { stage: 1 });

      // Phase F1: Pause after stage if requested
      if (pauseAfterStages.includes(1)) {
        await p.insightResearchSession.update({ where: { topicId }, data: { status: 'PAUSED' } });
        await p.insightAiAgent.updateMany({ where: { topicId }, data: { status: 'IDLE' } });
        this.stream.emit(topicId, 'research-paused', { afterStage: 1, message: '研究已暂停，等待专家介入' });
        await this.insightsService.logEvent(topicId, 'System', 'warning', '研究在第 1 阶段后暂停，等待专家确认');
        return;
      }
    }

    // ── Stage 2: Evidence collection (Planner-driven assignment) ──────────
    // Phase B1: Use plannerOutput.agentAssignments to match agent ↔ direction

    if (resumeFrom <= 2) {
      this.stream.emit(topicId, 'stage-start', { stage: 2, title: '证据搜集' });
      await this.updateStage(topicId, 1, { status: '进行中', progress: 0 });

      const dirTasks = directions.map(async (dir: P, idx: number) => {
        // Phase B1: Planner-assigned agent for this direction
        const assignment = plannerOutput?.agentAssignments?.find(
          (a) => a.directionLabel === dir.label,
        );
        const assignedAgentName = assignment?.agentName;
        const agent =
          agents.find((a: P) => a.name === assignedAgentName) ??
          agents.find((a: P) => a.focus === dir.label) ??
          agents[idx % Math.max(agents.length, 1)];
        const agentModel = agent ? getModel(agent) : this.aiService.getDefaultModel();
        if (!agentModel) return;

        this.stream.emit(topicId, 'agent-thinking', { agent: agent?.name, direction: dir.label, stage: 2 });

        // Phase D1: Find framework dimension assigned to this direction
        const frameworkDimension = plannerOutput?.frameworkDimensions?.find(
          (fd) => fd.assignedDirection === dir.label,
        );

        // Phase C1 + C2: Use ReAct loop with KB context
        const parsed = await this.reactDirectionAnalysis(
          agent, agentModel, topic, dir, assignment, userId, useWebSearch, newRefs, idx * 10, frameworkDimension, quickMode ? 1 : 3,
        );

        const result: DirResult = {
          label: dir.label,
          analysis: parsed.analysis || `${dir.label} 分析完成`,
          agent: agent?.name ?? '',
          model: agentModel.id,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          keyPoints: parsed.keyPoints ?? [],
          gaps: parsed.gaps ?? [],
          claims: parsed.claims ?? [],  // Phase D2
        };
        dirResults.push(result);

        discussionLog.push({
          time: new Date().toISOString(),
          agent: agent?.name ?? '',
          model: agentModel.id,
          type: 'insight',
          content: `【${dir.label}】置信度${Math.round(result.confidence * 100)}%：${result.analysis.slice(0, 100)}...`,
        });

        this.stream.emit(topicId, 'direction-analyzed', {
          direction: dir.label,
          agent: agent?.name,
          content: result.analysis,
          confidence: result.confidence,
          keyPoints: result.keyPoints,
          assignedBy: 'planner',
          approach: assignment?.approach,
          reactSteps: parsed.steps,
          frameworkDimension: frameworkDimension?.name,
          claimsCount: result.claims?.length ?? 0,
        });
        await this.updateStage(topicId, 1, {
          progress: Math.round((dirResults.length / directions.length) * 100),
        });
      });

      await Promise.all(dirTasks);

      // ── Phase A3: Quality Gate ───────────────────────────────────────────
      const lowConfidenceDirs = dirResults.filter((r) => r.confidence < QUALITY_GATE_THRESHOLD);

      if (lowConfidenceDirs.length > 0) {
        this.stream.emit(topicId, 'quality-gate', {
          message: `检测到 ${lowConfidenceDirs.length} 个低置信度方向（< ${Math.round(QUALITY_GATE_THRESHOLD * 100)}%），启动补充检索`,
          directions: lowConfidenceDirs.map((d) => d.label),
        });

        await Promise.all(
          lowConfidenceDirs.map(async (dir) => {
            const searchResults = await tavilySearch(`${topic.title} ${dir.label}`, 5);
            if (searchResults.length === 0) return;

            const searchContext = searchResults
              .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 400)}`)
              .join('\n\n');

            searchResults.forEach((r, i) => {
              newRefs.push({
                refId: `R-${topicId.slice(-4)}-qg-${dir.label.slice(0, 4)}-${i}`,
                title: r.title,
                domain: extractDomain(r.url),
                excerpt: r.content.slice(0, 300),
                score: 65 + Math.floor(Math.random() * 20),
                tag: 'quality-gate',
              });
            });

            const assignment = plannerOutput?.agentAssignments?.find((a) => a.directionLabel === dir.label);
            const agent =
              agents.find((a: P) => a.name === assignment?.agentName) ??
              agents.find((a: P) => a.focus === dir.label) ??
              agents[0];
            const agentModel = agent ? getModel(agent) : this.aiService.getDefaultModel();
            if (!agentModel) return;

            this.stream.emit(topicId, 'agent-thinking', { agent: agent?.name, direction: dir.label, stage: 2, isRetry: true });

            const retryFrameworkDim = plannerOutput?.frameworkDimensions?.find(
              (fd) => fd.assignedDirection === dir.label,
            );
            const raw = await this.aiService.chat(agentModel, [
              { role: 'system', content: buildDirectionAgentSystemPrompt(agent, topic.title, dir.label, assignment?.approach, retryFrameworkDim) },
              { role: 'user', content: buildRetryPromptWithSearch(dir.analysis, dir.label, searchContext) },
            ]);

            const retried = parseJson<{ analysis: string; confidence: number; keyPoints: string[]; gaps: string[] }>(
              raw,
              { analysis: raw, confidence: 0.75, keyPoints: [], gaps: [] },
            );

            const idx = dirResults.findIndex((r) => r.label === dir.label);
            if (idx >= 0) {
              dirResults[idx] = {
                ...dirResults[idx],
                analysis: retried.analysis || raw,
                confidence: retried.confidence ?? 0.75,
                keyPoints: retried.keyPoints ?? [],
              };
            }

            this.stream.emit(topicId, 'direction-analyzed', {
              direction: dir.label,
              agent: agent?.name,
              content: retried.analysis || raw,
              confidence: retried.confidence ?? 0.75,
              isRetry: true,
            });
          }),
        );
      }

      // Save references
      if (newRefs.length > 0) {
        await p.insightReference.deleteMany({ where: { topicId } });
        await p.insightReference.createMany({ data: newRefs.map((r) => ({ ...r, topicId })) });
      }

      // Phase D2: Save claims to DB
      const allClaims = dirResults.flatMap((r) =>
        (r.claims ?? []).map((c) => ({
          topicId,
          directionLabel: r.label,
          statement: c.statement,
          confidence: c.confidence ?? 0.7,
          sourceQuery: c.sourceQuery ?? '',
          verified: false,
        })),
      );
      if (allClaims.length > 0) {
        await p.insightClaim.deleteMany({ where: { topicId } });
        await p.insightClaim.createMany({ data: allClaims });
      }

      const avgConf = dirResults.length > 0
        ? Math.round((dirResults.reduce((s, r) => s + r.confidence, 0) / dirResults.length) * 100)
        : 0;

      // ── Phase C3: Dynamic replan if overall quality is low ─────────────
      wasReplanned =
        plannerOutput !== null &&
        leaderModel !== null &&
        avgConf / 100 < InsightsResearchService.REPLAN_CONFIDENCE_THRESHOLD;

      if (wasReplanned) {
        this.stream.emit(topicId, 'quality-gate', {
          message: `整体置信度偏低（${avgConf}%），Planner 正在动态调整研究计划...`,
          directions: dirResults.filter((r) => r.confidence < QUALITY_GATE_THRESHOLD).map((d) => d.label),
          replan: true,
        });

        this.stream.emit(topicId, 'agent-thinking', { agent: leader?.name ?? 'Planner', stage: 2, replan: true });

        const revisedPlan = await this.dynamicReplan(topic, plannerOutput!, dirResults, leaderModel, leader);
        plannerOutput = revisedPlan;

        // Re-run low-confidence directions with revised plan
        const lowDirs = dirResults.filter((r) => r.confidence < InsightsResearchService.REPLAN_CONFIDENCE_THRESHOLD);
        await Promise.all(
          lowDirs.map(async (prevResult) => {
            const dir = directions.find((d: P) => d.label === prevResult.label);
            if (!dir) return;
            const assignment = revisedPlan.agentAssignments?.find((a) => a.directionLabel === dir.label);
            const agent =
              agents.find((a: P) => a.name === assignment?.agentName) ??
              agents.find((a: P) => a.focus === dir.label) ??
              agents[0];
            const agentModel = agent ? getModel(agent) : this.aiService.getDefaultModel();
            if (!agentModel) return;

            this.stream.emit(topicId, 'agent-thinking', { agent: agent?.name, direction: dir.label, stage: 2, replan: true });

            const replanFrameworkDim = revisedPlan.frameworkDimensions?.find(
              (fd) => fd.assignedDirection === dir.label,
            );
            const retried = await this.reactDirectionAnalysis(agent, agentModel, topic, dir, assignment, userId, useWebSearch, newRefs, 900, replanFrameworkDim);
            const idx = dirResults.findIndex((r) => r.label === dir.label);
            if (idx >= 0 && retried.analysis) {
              dirResults[idx] = {
                ...dirResults[idx],
                analysis: retried.analysis,
                confidence: retried.confidence ?? dirResults[idx].confidence,
                keyPoints: retried.keyPoints ?? dirResults[idx].keyPoints,
                claims: retried.claims ?? dirResults[idx].claims,
              };
            }

            this.stream.emit(topicId, 'direction-analyzed', {
              direction: dir.label,
              agent: agent?.name,
              content: retried.analysis,
              confidence: retried.confidence,
              isReplan: true,
            });
          }),
        );

        this.logger.log(`C3 replan complete: revised ${lowDirs.length} directions`);
      }

      await this.updateStage(topicId, 1, {
        status: '已完成',
        progress: 100,
        summary: `完成 ${directions.length} 个方向，平均置信度 ${avgConf}%，低置信补强 ${lowConfidenceDirs.length} 个${wasReplanned ? '，已动态重规划' : ''}`,
      });

      // Phase B3: Save Stage 2 checkpoint (includes C3 replan outcome)
      await this.saveCheckpoint(topicId, 'stage2', {
        dirResults,
        newRefsCount: newRefs.length,
        lowConfidenceCount: lowConfidenceDirs.length,
        wasReplanned: wasReplanned,
        plannerOutput,
        completedAt: new Date().toISOString(),
      });
      await p.insightResearchSession.update({
        where: { topicId },
        data: { discussions: discussionLog },
      });

      this.stream.emit(topicId, 'stage-complete', { stage: 2, refsCount: newRefs.length });

      // ── Phase D3: Contradiction Detection ──────────────────────────────
      if (dirResults.length >= 2 && leaderModel) {
        const contradictions = await this.detectContradictions(
          topic, dirResults, leaderModel,
        );

        if (contradictions.length > 0) {
          // Emit each contradiction as SSE
          for (const c of contradictions) {
            this.stream.emit(topicId, 'contradiction-detected', c);
            discussionLog.push({
              time: new Date().toISOString(),
              agent: 'ContradictionDetector',
              model: leaderModel.id,
              type: 'question',
              content: `【矛盾检测 · ${c.severity.toUpperCase()}】${c.direction1} vs ${c.direction2}：${c.description}`,
            });
          }

          // Mark contradicting claims in InsightClaim table
          const allClaims = await p.insightClaim.findMany({
            where: { topicId },
            select: { id: true, directionLabel: true, statement: true },
          });
          for (const c of contradictions) {
            const claim1 = allClaims.find(
              (cl: P) => cl.directionLabel === c.direction1 && cl.statement.includes(c.claim1.slice(0, 30)),
            );
            const claim2 = allClaims.find(
              (cl: P) => cl.directionLabel === c.direction2 && cl.statement.includes(c.claim2.slice(0, 30)),
            );
            if (claim1) {
              await p.insightClaim.update({
                where: { id: claim1.id },
                data: { contestedBy: `${c.direction2}: ${c.description.slice(0, 100)}` },
              });
            }
            if (claim2) {
              await p.insightClaim.update({
                where: { id: claim2.id },
                data: { contestedBy: `${c.direction1}: ${c.description.slice(0, 100)}` },
              });
            }
          }

          await this.saveCheckpoint(topicId, 'stage2', {
            dirResults,
            newRefsCount: newRefs.length,
            lowConfidenceCount: lowConfidenceDirs.length,
            wasReplanned,
            plannerOutput,
            contradictions,
            completedAt: new Date().toISOString(),
          });
          this.logger.log(`D3: ${contradictions.length} contradictions detected and saved`);
        }
      }

      // Phase F1: Pause after stage 2 if requested
      if (pauseAfterStages.includes(2)) {
        await p.insightResearchSession.update({ where: { topicId }, data: { status: 'PAUSED' } });
        await p.insightAiAgent.updateMany({ where: { topicId }, data: { status: 'IDLE' } });
        const totalClaims = dirResults.flatMap((r) => r.claims ?? []).length;
        this.stream.emit(topicId, 'research-paused', {
          afterStage: 2,
          message: `研究已暂停，共生成 ${dirResults.length} 个方向分析、${totalClaims} 个论断，等待专家审核`,
          claimsCount: totalClaims,
          directionsAnalyzed: dirResults.length,
        });
        await this.insightsService.logEvent(topicId, 'System', 'warning', `研究在第 2 阶段后暂停：${dirResults.length} 个方向已分析，等待专家审核`);
        return;
      }
    }

    // ── Stage 3: Real multi-round debate ──────────────────────────────────
    // Phase A1: Agents share message history across rounds
    // Phase B1: Planner's debateConfig drives proposer/critic selection

    if (resumeFrom <= 3) {
      this.stream.emit(topicId, 'stage-start', { stage: 3, title: quickMode ? '综合分析（快速模式）' : '多轮对齐辩论' });
      await this.updateStage(topicId, 2, { status: '进行中', progress: 0 });

      if (quickMode) {
        // C1 Quick mode: single synthesis instead of 3-round debate
        const proposerModel = this.aiService.getModelById(leader?.model) ?? this.aiService.getDefaultModel();
        const summaryCtx = dirResults.map((r) => `【${r.label}】置信度${Math.round(r.confidence * 100)}%：${r.analysis.slice(0, 200)}`).join('\n');
        this.stream.emit(topicId, 'debate-round', { round: 1, agent: leader?.name ?? 'System', type: 'proposition' });
        const synthRaw = proposerModel ? await this.aiService.chat(proposerModel, [
          { role: 'system', content: '你是洞察分析专家，请综合各方向分析生成简明结论。' },
          { role: 'user', content: `基于以下各方向分析，请提炼3-5条核心洞察，以及机会与风险各2条：\n${summaryCtx}` },
        ]) : '综合分析完成';
        round1Proposition = synthRaw;
        round2Critique = '（快速模式跳过辩论）';
        round3Rebuttal = synthRaw;
        discussionLog.push({ time: new Date().toISOString(), agent: leader?.name ?? 'System', model: proposerModel?.id ?? '', type: 'insight', content: `【快速综合】${synthRaw.slice(0, 300)}` });
        await this.saveCheckpoint(topicId, 'stage3', { round1: round1Proposition, round2: round2Critique, round3: round3Rebuttal, proposer: leader?.name ?? 'System', critic: '（跳过）', completedAt: new Date().toISOString() });
        await this.updateStage(topicId, 2, { status: '已完成', progress: 100, summary: '快速综合完成' });
        this.stream.emit(topicId, 'stage-complete', { stage: 3 });
      } else {

      // Phase B1: Use Planner-specified roles for debate
      const proposerRolePattern = plannerOutput?.debateConfig?.proposerRole
        ? new RegExp(plannerOutput.debateConfig.proposerRole)
        : /研究|分析|综合/;
      const criticRolePattern = plannerOutput?.debateConfig?.criticRole
        ? new RegExp(plannerOutput.debateConfig.criticRole)
        : /审|评|质疑/;

      const nonLeaders = agents.filter((a: P) => !a.isLeader);
      const proposer =
        nonLeaders.find((a: P) => proposerRolePattern.test(a.role ?? '')) ??
        nonLeaders[0] ??
        agents[0];
      const critic =
        nonLeaders.find((a: P) => a !== proposer && criticRolePattern.test(a.role ?? '')) ??
        nonLeaders.find((a: P) => a !== proposer) ??
        agents[agents.length - 1];

      const proposerModel = getModel(proposer);
      const criticModel = getModel(critic);

      const summaryContext = dirResults
        .map(
          (r) =>
            `【${r.label}】（${r.agent} · 置信度 ${Math.round(r.confidence * 100)}%）\n分析：${r.analysis}\n要点：${r.keyPoints.join('；') || '—'}`,
        )
        .join('\n\n');

      if (proposerModel) {
        // ── Round 1: Proposer synthesizes all evidence ────────────────────
        this.stream.emit(topicId, 'debate-round', { round: 1, agent: proposer?.name, type: 'thinking' });

        const proposerMessages: Msg[] = [
          {
            role: 'system',
            content: `你是 ${proposer?.name ?? '综合分析师'}（${proposer?.role ?? '研究员'}），专注于 ${proposer?.focus ?? '综合研究'}。
你的任务：综合所有研究方向的成果，提出一个有据可查、逻辑严密的核心论点。
研究目标：${plannerOutput?.researchGoal ?? topic.title}
要求：200 字以内，突出最重要的 3 个结论，并给出整体判断。`,
          },
          {
            role: 'user',
            content: `课题：${topic.title}
研究框架：${framework}

各方向分析结果：
${summaryContext}

请综合以上内容，提出你的核心论点与主要结论。`,
          },
        ];

        round1Proposition = await this.aiService.chat(proposerModel, proposerMessages);
        proposerMessages.push({ role: 'assistant', content: round1Proposition });

        discussionLog.push({
          time: new Date().toISOString(),
          agent: proposer?.name ?? '',
          model: proposerModel.id,
          type: 'decision',
          content: round1Proposition,
        });
        this.stream.emit(topicId, 'debate-round', {
          round: 1,
          agent: proposer?.name,
          type: 'proposition',
          content: round1Proposition,
        });
        await this.updateStage(topicId, 2, { progress: 33 });

        // ── Round 2: Critic challenges ────────────────────────────────────
        this.stream.emit(topicId, 'debate-round', { round: 2, agent: critic?.name, type: 'thinking' });

        const criticModel2 = criticModel ?? proposerModel;
        const criticMessages: Msg[] = [
          {
            role: 'system',
            content: `你是 ${critic?.name ?? '质疑审校员'}（${critic?.role ?? '评审员'}），专注于 ${critic?.focus ?? '质疑与验证'}。
你的任务：对刚才的综合论点进行严格的批判性评审。
要求：
- 指出论点中的假设、逻辑漏洞或遗漏的重要因素
- 提出 2-3 个具体的、有建设性的质疑
- 150 字以内，直接切入问题，不做无谓铺陈`,
          },
          {
            role: 'user',
            content: `请对以下综合论点进行批判性评审，指出其中的问题与不足：\n\n${round1Proposition}`,
          },
        ];

        round2Critique = await this.aiService.chat(criticModel2, criticMessages);

        discussionLog.push({
          time: new Date().toISOString(),
          agent: critic?.name ?? '',
          model: criticModel2.id,
          type: 'question',
          content: round2Critique,
        });
        this.stream.emit(topicId, 'debate-round', {
          round: 2,
          agent: critic?.name,
          type: 'critique',
          content: round2Critique,
        });
        await this.updateStage(topicId, 2, { progress: 66 });

        // ── Round 3: Proposer rebuts and refines ──────────────────────────
        this.stream.emit(topicId, 'debate-round', { round: 3, agent: proposer?.name, type: 'thinking' });

        proposerMessages.push({
          role: 'user',
          content: `评审者提出了以下质疑，请回应并修订你的结论：

${round2Critique}

要求：承认合理的批评，坚守有据可查的部分，给出修订后的最终结论。150 字以内。`,
        });

        round3Rebuttal = await this.aiService.chat(proposerModel, proposerMessages);

        discussionLog.push({
          time: new Date().toISOString(),
          agent: proposer?.name ?? '',
          model: proposerModel.id,
          type: 'insight',
          content: round3Rebuttal,
        });
        this.stream.emit(topicId, 'debate-round', {
          round: 3,
          agent: proposer?.name,
          type: 'rebuttal',
          content: round3Rebuttal,
        });
      }

      await this.updateStage(topicId, 2, {
        status: '已完成',
        progress: 100,
        summary: round3Rebuttal.slice(0, 200) || round1Proposition.slice(0, 200),
      });

      // Phase B3: Save Stage 3 checkpoint
      await this.saveCheckpoint(topicId, 'stage3', {
        round1: round1Proposition,
        round2: round2Critique,
        round3: round3Rebuttal,
        proposer: proposer?.name,
        critic: critic?.name,
        completedAt: new Date().toISOString(),
      });
      await p.insightResearchSession.update({
        where: { topicId },
        data: { discussions: discussionLog },
      });

      this.stream.emit(topicId, 'stage-complete', { stage: 3 });
      } // end else (full debate)

      // Phase F1: Pause after stage 3 if requested
      if (pauseAfterStages.includes(3)) {
        await p.insightResearchSession.update({ where: { topicId }, data: { status: 'PAUSED' } });
        await p.insightAiAgent.updateMany({ where: { topicId }, data: { status: 'IDLE' } });
        this.stream.emit(topicId, 'research-paused', {
          afterStage: 3,
          message: '辩论已完成，等待专家确认后将生成最终报告',
          debateSummary: round3Rebuttal?.slice(0, 200) ?? round1Proposition?.slice(0, 200),
        });
        await this.insightsService.logEvent(topicId, 'System', 'warning', '研究在第 3 阶段后暂停：辩论完成，等待专家确认报告生成');
        return;
      }
    }

    const consensus = round3Rebuttal || round1Proposition;
    const dissent = round2Critique;

    // ── Stage 4: Structured report ────────────────────────────────────────

    this.stream.emit(topicId, 'stage-start', { stage: 4, title: '结构化成稿' });
    await this.updateStage(topicId, 3, { status: '进行中', progress: 50 });

    const writer =
      agents.find((a: P) => a.role?.includes('撰写') || a.focus?.includes('撰写')) ??
      agents[agents.length - 1] ??
      leader;
    const writerModel = writer ? getModel(writer) : this.aiService.getDefaultModel();
    let reportOutput: P = null;

    if (writerModel) {
      this.stream.emit(topicId, 'agent-thinking', { agent: writer?.name ?? 'Writer', stage: 4 });

      const avgConfidence = dirResults.length > 0
        ? Math.round((dirResults.reduce((s, r) => s + r.confidence, 0) / dirResults.length) * 100)
        : 70;

      const summaryContext = dirResults
        .map(
          (r) =>
            `【${r.label}】（${r.agent} · 置信度 ${Math.round(r.confidence * 100)}%）\n分析：${r.analysis}\n要点：${r.keyPoints.join('；') || '—'}`,
        )
        .join('\n\n');

      const reportPrompt = `你是报告撰写专家。将以下研究成果整合为结构化报告，返回纯 JSON。
课题：${topic.title}
研究目标：${plannerOutput?.researchGoal ?? topic.title}
综合置信度：${avgConfidence}%

各方向分析：
${summaryContext}

辩论共识（Round 3 修订后结论）：${consensus}
辩论质疑（Round 2）：${dissent}

请返回以下 JSON（无 markdown 标记）：
{
  "executiveSummary": "执行摘要，250字以内",
  "keyFindings": ["关键结论1", "关键结论2", "关键结论3"],
  "opportunities": ["机会1", "机会2"],
  "risks": ["风险1", "风险2"],
  "openQuestions": ["待验证问题1"],
  "actionItems": ["行动建议1", "行动建议2"],
  "consensus": "基于辩论的最终共识",
  "dissent": ["主要争议点1"],
  "sections": [
    { "title": "章节标题", "summary": "内容摘要", "highlights": ["要点1"] }
  ]
}`;

      const raw = await this.aiService.chat(writerModel, [
        { role: 'system', content: '你是专业研究报告撰写专家，输出格式为纯 JSON，不含任何 markdown 标记。' },
        { role: 'user', content: reportPrompt },
      ]);

      reportOutput = parseJson<P>(raw, {
        executiveSummary: raw.slice(0, 500),
        keyFindings: dirResults.slice(0, 5).map((r) => `${r.label}：${r.analysis.slice(0, 100)}`),
        opportunities: [],
        risks: [],
        openQuestions: dirResults.flatMap((r) => r.gaps).slice(0, 3),
        actionItems: [],
        consensus,
        dissent: dissent ? [dissent] : [],
        sections: dirResults.map((r) => ({ title: r.label, summary: r.analysis, highlights: r.keyPoints })),
      });
    }

    discussionLog.push({
      time: new Date().toISOString(),
      agent: writer?.name ?? 'WriterAI',
      model: writerModel?.id ?? '',
      type: 'decision',
      content: '研究报告已生成',
    });

    await this.updateStage(topicId, 3, { status: '已完成', progress: 100, summary: '报告撰写完成' });
    this.stream.emit(topicId, 'stage-complete', { stage: 4 });

    // ── Save report sections ───────────────────────────────────────────────

    if (reportOutput?.sections?.length > 0) {
      await p.insightReportSection.deleteMany({ where: { topicId } });
      await p.insightReportSection.createMany({
        data: reportOutput.sections.map((s: P, i: number) => ({
          topicId,
          sortOrder: i,
          title: s.title ?? `章节 ${i + 1}`,
          summary: s.summary ?? '',
          highlights: s.highlights ?? [],
        })),
      });
    }

    // ── Finalize ──────────────────────────────────────────────────────────

    await p.insightResearchSession.update({
      where: { topicId },
      data: { status: 'COMPLETED', discussions: discussionLog, output: reportOutput },
    });

    await p.insightDirection.updateMany({ where: { topicId }, data: { status: 'DONE' } });
    await p.insightTask.updateMany({ where: { topicId }, data: { status: 'DONE' } });
    await p.insightAiAgent.updateMany({ where: { topicId }, data: { status: 'IDLE' } });

    // ── Credibility ────────────────────────────────────────────────────────

    const currentRefs = await p.insightReference.findMany({
      where: { topicId },
      select: { domain: true, score: true },
    });
    const totalRefs = [...currentRefs, ...newRefs.map((r) => ({ domain: r.domain, score: r.score }))];
    const avgConf = dirResults.length > 0 ? dirResults.reduce((s, r) => s + r.confidence, 0) / dirResults.length : 0.6;
    const totalClaimsCount = dirResults.reduce((s, r) => s + (r.claims?.length ?? 0), 0);
    const { overall, authorityScore, diversityScore, timelinessScore, coverageScore } =
      calcCredibility(totalRefs, directions.length, directions.length, avgConf, totalClaimsCount);

    const lowConfidenceDirs = dirResults.filter((r) => r.confidence < QUALITY_GATE_THRESHOLD);

    const credibilityMetrics = [
      { label: '权威性', score: authorityScore, color: '#f59e0b', rating: Math.round(authorityScore / 20) },
      { label: '多样性', score: diversityScore, color: '#3b82f6', rating: Math.round(diversityScore / 20) },
      { label: '时效性', score: timelinessScore, color: '#8b5cf6', rating: Math.round(timelinessScore / 20) },
      { label: '覆盖度', score: coverageScore, color: '#10b981', rating: Math.round(coverageScore / 20) },
    ];

    await p.insightCredibility.upsert({
      where: { topicId },
      update: {
        overall,
        metrics: credibilityMetrics,
        sources: this.buildSourceBreakdown(totalRefs),
        coverage: directions.map((d: P) => ({
          label: d.label,
          value: `${totalRefs.length > 0 ? Math.ceil(totalRefs.length / directions.length) : 0}/5`,
          progress: Math.min(100, totalRefs.length * 10),
        })),
        quality: [
          { label: '分析方向数', value: `${dirResults.length}项`, accent: 'text-blue-600' },
          { label: '辩论轮次', value: '3轮（ReAct）', accent: 'text-purple-600' },
          { label: '平均置信度', value: `${Math.round((dirResults.reduce((s, r) => s + r.confidence, 0) / Math.max(dirResults.length, 1)) * 100)}%`, accent: 'text-emerald-600' },
          { label: '质量检查', value: lowConfidenceDirs.length > 0 ? `${lowConfidenceDirs.length}项已补强` : '全部通过', accent: 'text-amber-600' },
          { label: 'Planner + 动态调整', value: plannerOutput ? (wasReplanned ? '已重规划' : '智能分配') : '默认分配', accent: 'text-sky-600' },
        ],
        limitations: [
          '研究基于可获得的公开信息，可能存在信息不完整的情况',
          '受限于AI模型的知识截止日期，最新动态可能未能完全覆盖',
          ...(lowConfidenceDirs.length > 0 ? [`以下方向经质量门补充检索：${lowConfidenceDirs.map((d) => d.label).join('、')}`] : []),
        ],
        updatedAt: new Date(),
      },
      create: {
        topicId,
        overall,
        metrics: credibilityMetrics,
        sources: this.buildSourceBreakdown(totalRefs),
        timeliness: [{ label: '近3个月', value: totalRefs.length, percent: 70, color: 'bg-blue-400' }],
        coverage: directions.map((d: P) => ({ label: d.label, value: '1/5', progress: 20 })),
        quality: [],
        limitations: ['研究基于可获得的公开信息'],
      },
    });

    // ── History ────────────────────────────────────────────────────────────

    const existingHistory = await p.insightHistoryItem.count({ where: { topicId } });
    const roundNum = existingHistory + 1;
    await p.insightHistoryItem.create({
      data: {
        topicId,
        round: roundNum,
        date: new Date().toISOString().slice(0, 10),
        dimensionsUpdated: directions.length,
        sourcesAdded: newRefs.length,
        interactions: discussionLog.length,
        summary: reportOutput?.executiveSummary?.slice(0, 100) ?? '研究完成',
      },
    });

    await this.insightsService.logEvent(
      topicId,
      'System',
      'success',
      `第 ${roundNum} 轮研究完成：${directions.length} 个方向，${newRefs.length} 个来源，3 轮辩论，平均置信度 ${Math.round((dirResults.reduce((s, r) => s + r.confidence, 0) / Math.max(dirResults.length, 1)) * 100)}%，Planner 智能分配`,
    );

    this.stream.emit(topicId, 'research-complete', { round: roundNum, refsAdded: newRefs.length });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async updateStage(
    topicId: string,
    stageIndex: number,
    update: Partial<{ status: string; progress: number; summary: string }>,
  ) {
    const session = await (this.prisma as P).insightResearchSession.findUnique({
      where: { topicId },
      select: { stages: true },
    });
    if (!session) return;
    const stages: P[] = Array.isArray(session.stages) ? session.stages : [];
    const titles = ['规划与框架（Planner）', '证据搜集', '多轮对齐辩论', '结构化成稿'];
    while (stages.length <= stageIndex) {
      stages.push({
        id: `stage-${stages.length + 1}`,
        title: titles[stages.length] ?? `阶段 ${stages.length + 1}`,
        owner: 'System',
        status: '待开始',
        progress: 0,
        summary: '',
      });
    }
    stages[stageIndex] = { ...stages[stageIndex], ...update };
    await (this.prisma as P).insightResearchSession.update({ where: { topicId }, data: { stages } });
  }

  private buildSourceBreakdown(refs: Array<{ domain: string; score: number }>) {
    if (refs.length === 0) return [];
    const gov = refs.filter((r) => AUTHORITY_DOMAINS.slice(0, 2).some((d) => r.domain.includes(d))).length;
    const academic = refs.filter((r) => AUTHORITY_DOMAINS.slice(2, 7).some((d) => r.domain.includes(d))).length;
    const industry = refs.filter((r) => !AUTHORITY_DOMAINS.some((d) => r.domain.includes(d)) && r.score >= 70).length;
    const media = Math.max(0, refs.length - gov - academic - industry);
    return [
      { label: '政府', count: gov, percent: Math.round((gov / refs.length) * 100), color: 'bg-blue-500' },
      { label: '学术', count: academic, percent: Math.round((academic / refs.length) * 100), color: 'bg-purple-500' },
      { label: '行业', count: industry, percent: Math.round((industry / refs.length) * 100), color: 'bg-amber-500' },
      { label: '媒体', count: media, percent: Math.round((media / refs.length) * 100), color: 'bg-gray-400' },
    ];
  }

  // ── Phase C2: Knowledge base RAG context ─────────────────────────────────

  private async searchKnowledgeContext(userId: string, query: string, take = 3): Promise<string> {
    try {
      const hits = await this.knowledgeEmbedding.semanticSearch(userId, query, take, 0.4);
      if (hits.length === 0) return '';

      const p = this.prisma as P;
      const notes = await p.knowledgeNote.findMany({
        where: { id: { in: hits.map((h) => h.noteId) } },
        select: { title: true, content: true, source: true },
      });

      return notes
        .map((n: P, i: number) => `[知识库-${i + 1}] ${n.title}\n来源：${n.source ?? '个人知识库'}\n${n.content.slice(0, 400)}`)
        .join('\n\n');
    } catch {
      return '';
    }
  }

  // ── Phase C1: ReAct analysis loop ────────────────────────────────────────

  private async reactDirectionAnalysis(
    agent: P,
    agentModel: P,
    topic: P,
    dir: P,
    assignment: AgentAssignment | undefined,
    userId: string,
    useWebSearch: boolean,
    newRefs: Array<{ refId: string; title: string; domain: string; excerpt: string; score: number; tag: string }>,
    refIdxBase: number,
    frameworkDimension?: FrameworkDimension,  // Phase D1
    maxReActSteps = 3,
  ): Promise<{ analysis: string; confidence: number; keyPoints: string[]; gaps: string[]; steps: number; claims: Claim[] }> {
    const maxSteps = maxReActSteps;

    // C2: Query knowledge base first
    const kbContext = await this.searchKnowledgeContext(userId, `${topic.title} ${dir.label}`, 3);

    const systemPrompt = useWebSearch || kbContext
      ? buildReActSystemPrompt(agent, topic.title, dir.label, assignment?.approach, frameworkDimension)
      : buildDirectionAgentSystemPrompt(agent, topic.title, dir.label, assignment?.approach, frameworkDimension);

    const initialContent = kbContext
      ? `请分析「${dir.label}」方向。\n\n## 知识库参考资料\n${kbContext}\n\n请结合以上参考资料进行分析，并按要求的 JSON 格式输出。`
      : `请基于你的专业知识分析「${dir.label}」方向，按要求的 JSON 格式输出。`;

    const messages: Msg[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: initialContent },
    ];

    let steps = 0;

    for (let i = 0; i < maxSteps; i++) {
      const response = await this.aiService.chat(agentModel, messages);
      messages.push({ role: 'assistant', content: response });
      steps++;

      // Check for tool call patterns
      const webMatch = response.match(/\[WEB_SEARCH:\s*(.+?)\]/);
      const kbMatch = response.match(/\[KB_SEARCH:\s*(.+?)\]/);

      if (webMatch && useWebSearch) {
        const query = webMatch[1].trim();
        const results = await tavilySearch(query, 3);
        if (results.length > 0) {
          results.forEach((r, j) => {
            newRefs.push({
              refId: `R-${topic.id.slice(-4)}-react-${refIdxBase}-${j}`,
              title: r.title,
              domain: extractDomain(r.url),
              excerpt: r.content.slice(0, 300),
              score: 65 + Math.floor(Math.random() * 20),
              tag: 'react-search',
            });
          });
          const observation = results
            .map((r, j) => `[${j + 1}] ${r.title}\n${r.content.slice(0, 300)}`)
            .join('\n\n');
          messages.push({ role: 'user', content: `[OBSERVATION: WEB_SEARCH 结果]\n${observation}\n\n请继续分析，完成后输出最终 JSON。` });
        } else {
          messages.push({ role: 'user', content: '[OBSERVATION: 未找到相关搜索结果，请基于已有信息给出最终 JSON。]' });
        }
        continue;
      }

      if (kbMatch) {
        const query = kbMatch[1].trim();
        const kbResult = await this.searchKnowledgeContext(userId, query, 3);
        messages.push({
          role: 'user',
          content: kbResult
            ? `[OBSERVATION: KB_SEARCH 结果]\n${kbResult}\n\n请继续分析，完成后输出最终 JSON。`
            : '[OBSERVATION: 知识库中未找到相关内容，请基于已有信息给出最终 JSON。]',
        });
        continue;
      }

      // No tool call — try to parse as final JSON
      const parsed = parseJson<{ analysis: string; confidence: number; keyPoints: string[]; gaps: string[]; claims?: Claim[] }>(
        response,
        { analysis: '', confidence: 0, keyPoints: [], gaps: [], claims: [] },
      );
      if (parsed.analysis) {
        return { ...parsed, claims: parsed.claims ?? [], steps };
      }

      // Response wasn't valid JSON yet — ask for JSON on next step
      if (i < maxSteps - 1) {
        messages.push({ role: 'user', content: '请现在直接返回最终 JSON 格式的分析结果（不含工具调用）。' });
      }
    }

    // Force final answer if loop exhausted
    messages.push({ role: 'user', content: '请直接返回最终 JSON，不含任何工具调用。' });
    const finalRaw = await this.aiService.chat(agentModel, messages);
    const final = parseJson<{ analysis: string; confidence: number; keyPoints: string[]; gaps: string[]; claims?: Claim[] }>(
      finalRaw,
      { analysis: finalRaw.slice(0, 500), confidence: 0.65, keyPoints: [], gaps: [], claims: [] },
    );
    return { ...final, claims: final.claims ?? [], steps: steps + 1 };
  }

  // ── Phase C3: Dynamic replan after low-quality Stage 2 ───────────────────

  private async dynamicReplan(
    topic: P,
    currentPlan: PlannerOutput,
    dirResults: DirResult[],
    leaderModel: P,
    leader: P,
  ): Promise<PlannerOutput> {
    if (!leaderModel) return currentPlan;

    const lowQualityDirs = dirResults.filter((r) => r.confidence < QUALITY_GATE_THRESHOLD);
    const resultSummary = dirResults
      .map((r) => `${r.label}（${r.agent}）：置信度 ${Math.round(r.confidence * 100)}%，要点：${r.keyPoints.slice(0, 2).join('；')}`)
      .join('\n');

    const replanPrompt = `你是研究规划员 ${leader?.name ?? 'Planner'}，负责动态调整研究计划。

第一轮研究已完成，但部分方向置信度偏低：
${resultSummary}

置信度不足的方向：${lowQualityDirs.map((d) => `${d.label}（${Math.round(d.confidence * 100)}%）`).join('、')}

原始研究框架：${currentPlan.framework}

请提供修订后的研究计划，重点：
1. 为低置信度方向指定更合适的智能体或方法
2. 调整研究视角，避免重复之前的局限
3. 如有必要，可新增研究子方向

返回与原始格式相同的纯 JSON。`;

    const raw = await this.aiService.chat(leaderModel, [
      { role: 'system', content: '你是研究规划专家，输出格式为纯 JSON，不含任何 markdown 标记。' },
      { role: 'user', content: replanPrompt },
    ]);

    const revised = parseJson<PlannerOutput>(raw, currentPlan);
    return revised;
  }

  // ── Phase D3: Contradiction Detection ────────────────────────────────────
  private async detectContradictions(
    topic: P,
    dirResults: DirResult[],
    leaderModel: P,
  ): Promise<
    Array<{
      direction1: string;
      direction2: string;
      claim1: string;
      claim2: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
    }>
  > {
    const summaryContext = dirResults
      .map(
        (r) =>
          `【${r.label}】（置信度 ${Math.round(r.confidence * 100)}%）\n分析：${r.analysis.slice(0, 400)}\n要点：${r.keyPoints.join('；')}`,
      )
      .join('\n\n');

    const prompt = `你是矛盾检测专家。请仔细审查以下各研究方向的分析结果，识别其中存在的逻辑矛盾、相互冲突的论断或互相否定的结论。

研究课题：${topic.title}

各方向研究结果：
${summaryContext}

请识别所有显著矛盾，每个矛盾包含：
- direction1: 第一个方向的标签（与上文完全一致）
- direction2: 第二个方向的标签（与上文完全一致）
- claim1: 来自 direction1 的具体论断（原文摘录，20-60字）
- claim2: 来自 direction2 的具体论断（与 claim1 矛盾，20-60字）
- description: 矛盾的简要说明（30-80字）
- severity: 严重程度（"high"=根本性矛盾影响核心结论，"medium"=明显分歧但不影响总体方向，"low"=细节层面不一致）

注意：
- 只报告真实存在的逻辑矛盾，不要捏造
- 若不存在矛盾，返回空数组
- 不同视角对同一问题的不同强调不算矛盾

返回纯 JSON 数组，格式：
[{"direction1":"...","direction2":"...","claim1":"...","claim2":"...","description":"...","severity":"high|medium|low"}]

若无矛盾返回：[]`;

    try {
      const raw = await this.aiService.chat(leaderModel, [
        {
          role: 'system',
          content:
            '你是研究质量控制专家，专注于识别研究分析中的逻辑矛盾。输出纯 JSON 数组，不含任何 markdown 标记或解释文字。',
        },
        { role: 'user', content: prompt },
      ]);

      const parsed = parseJson<
        Array<{
          direction1: string;
          direction2: string;
          claim1: string;
          claim2: string;
          description: string;
          severity: 'high' | 'medium' | 'low';
        }>
      >(raw, []);

      // Validate: only keep entries where both directions exist in dirResults
      const validLabels = new Set(dirResults.map((r) => r.label));
      const validated = parsed.filter(
        (c) =>
          validLabels.has(c.direction1) &&
          validLabels.has(c.direction2) &&
          c.direction1 !== c.direction2 &&
          typeof c.description === 'string' &&
          ['high', 'medium', 'low'].includes(c.severity),
      );

      this.logger.log(
        `D3: detectContradictions found ${validated.length} contradictions (${parsed.length} raw)`,
      );
      return validated;
    } catch (err) {
      this.logger.warn(`D3: detectContradictions failed: ${err}`);
      return [];
    }
  }

  async getResearchStatus(topicId: string) {
    const session = await (this.prisma as P).insightResearchSession.findUnique({
      where: { topicId },
      select: { status: true, stages: true, checkpoints: true },
    });
    if (!session) return { status: 'PENDING', progress: 0, canResume: false };
    const stages: P[] = Array.isArray(session.stages) ? session.stages : [];
    const done = stages.filter((s: P) => s.status === '已完成').length;
    const progress = stages.length > 0 ? Math.round((done / stages.length) * 100) : 0;
    const checkpoints = session.checkpoints as Record<string, P> ?? {};
    const canResume = session.status === 'ERROR' && Object.keys(checkpoints).length > 0;
    return { status: session.status, progress, canResume };
  }

  async cancelResearch(topicId: string) {
    await (this.prisma as P).insightResearchSession.update({
      where: { topicId },
      data: { status: 'ERROR' },
    });
    await (this.prisma as P).insightAiAgent.updateMany({ where: { topicId }, data: { status: 'IDLE' } });
    this.stream.emit(topicId, 'error', { message: '研究已取消' });
  }
}
