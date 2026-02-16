import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DebateStreamService } from './debate.stream';
import { CreateDebateDto } from './dto/create-debate.dto';
import { DebateAgent, DebateAgentCategory, DebateSessionStatus } from '@prisma/client';

type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'waiting';

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (value == null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
}

@Injectable()
export class DebateService implements OnModuleInit {
  private readonly logger = new Logger(DebateService.name);
  private readonly maxRoundsLimit = parsePositiveInt(process.env.DEBATE_MAX_ROUNDS, 10);
  private readonly scoringEnabled = parseBoolean(process.env.DEBATE_SCORING_ENABLED, true);
  private readonly summaryEnabled = parseBoolean(process.env.DEBATE_SUMMARY_ENABLED, true);
  private readonly historyLimit = parsePositiveInt(process.env.DEBATE_HISTORY_LIMIT, 8);
  private readonly agentDelayMs = parsePositiveInt(process.env.DEBATE_AGENT_DELAY_MS, 400);

  private scorers = new Map<string, DebateAgent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly stream: DebateStreamService,
  ) {}

  async onModuleInit() {
    await this.seedAgents();
    await this.seedTemplates();
    await this.refreshScorers();
  }

  async listAgents() {
    return this.prisma.debateAgent.findMany({
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async listSessions(userId: string) {
    return this.prisma.debateSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        topic: true,
        maxRounds: true,
        currentRound: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    });
  }

  async createSession(userId: string, dto: CreateDebateDto) {
    const topic = dto.topic.trim();
    if (!topic) {
      throw new BadRequestException('Topic is required');
    }

    const agentIds = Array.from(new Set(dto.agentIds || [])).filter(Boolean);
    if (agentIds.length < 2) {
      throw new BadRequestException('Select at least 2 agents');
    }

    const agents = await this.prisma.debateAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, category: true },
    });
    if (agents.length < 2) {
      throw new BadRequestException('Some selected agents are unavailable');
    }
    const speakerCount = agents.filter((agent) => agent.category !== DebateAgentCategory.EVALUATOR).length;
    if (speakerCount < 2) {
      throw new BadRequestException('Select at least 2 debating agents');
    }

    const maxRounds = this.clampRounds(dto.maxRounds);

    return this.prisma.debateSession.create({
      data: {
        userId,
        topic,
        agentIds,
        maxRounds,
        status: DebateSessionStatus.PENDING,
        keyPoints: [],
        disagreements: [],
        goldenQuotes: [],
      },
    });
  }

  async getSession(sessionId: string, userId: string) {
    return this.getSessionOrThrow(sessionId, userId);
  }

  async getMessages(sessionId: string, userId: string) {
    await this.getSessionOrThrow(sessionId, userId);
    return this.prisma.debateMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  openStream(sessionId: string, userId: string, res: Response) {
    return this.ensureSessionOwnership(sessionId, userId).then(() => {
      this.stream.addStream(sessionId, res);
    });
  }

  async startSession(sessionId: string, userId: string) {
    const session = await this.getSessionOrThrow(sessionId, userId);
    if (session.status === DebateSessionStatus.RUNNING) {
      return { status: session.status };
    }
    if (session.status === DebateSessionStatus.COMPLETED) {
      return { status: session.status };
    }

    await this.prisma.debateSession.update({
      where: { id: session.id },
      data: { status: DebateSessionStatus.RUNNING, currentRound: 0 },
    });

    setImmediate(() => {
      this.runDebateSession(session.id, session.userId).catch((error) => {
        this.logger.error(`Debate session ${session.id} failed`, error instanceof Error ? error.stack : String(error));
      });
    });

    return { status: DebateSessionStatus.RUNNING };
  }

  private clampRounds(value?: number) {
    const rounds = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 5;
    if (rounds < 1) return 1;
    if (rounds > this.maxRoundsLimit) return this.maxRoundsLimit;
    return rounds;
  }

  private async ensureSessionOwnership(sessionId: string, userId: string) {
    const session = await this.prisma.debateSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Debate session not found');
    }
  }

  private async getSessionOrThrow(sessionId: string, userId: string) {
    const session = await this.prisma.debateSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Debate session not found');
    }
    return session;
  }

  private async runDebateSession(sessionId: string, userId: string) {
    try {
      const session = await this.getSessionOrThrow(sessionId, userId);
      const agents = await this.loadSessionAgents(session.agentIds);
      if (agents.length === 0) {
        throw new Error('No agents available for this session');
      }
      const speakerAgents = agents.filter((agent) => agent.category !== DebateAgentCategory.EVALUATOR);
      const evaluatorAgents = agents.filter((agent) => agent.category === DebateAgentCategory.EVALUATOR);
      if (speakerAgents.length < 2) {
        throw new Error('At least two debating agents are required');
      }
      const scorers = await this.resolveScorers(evaluatorAgents);

      for (let round = 1; round <= session.maxRounds; round += 1) {
        await this.prisma.debateSession.update({
          where: { id: session.id },
          data: { currentRound: round },
        });
        this.emit(sessionId, 'round-start', { round });

        const previousMessages = await this.prisma.debateMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
        });

        for (const agent of speakerAgents) {
          this.emitAgentStatus(sessionId, agent.id, 'thinking');
        }

        const responses = await Promise.all(
          speakerAgents.map(async (agent) => {
            try {
              const content = await this.generateAgentResponse(
                agent,
                session.topic,
                round,
                session.maxRounds,
                previousMessages,
                speakerAgents,
              );
              return { agent, content, success: true };
            } catch (error) {
              this.logger.warn(`Agent ${agent.name} failed to respond: ${String(error)}`);
              return { agent, content: '', success: false };
            }
          }),
        );

        for (let i = 0; i < speakerAgents.length; i += 1) {
          const { agent, content, success } = responses[i];
          if (!success) {
            this.emitAgentStatus(sessionId, agent.id, 'idle');
            continue;
          }

          this.emitAgentStatus(sessionId, agent.id, 'speaking');

          const message = await this.prisma.debateMessage.create({
            data: {
              sessionId,
              senderId: agent.id,
              content,
              round,
            },
          });

          const serialized = this.serializeMessage(message);
          this.emit(sessionId, 'new-message', serialized);

          if (this.scoringEnabled) {
            void this.scoreMessage(sessionId, session.topic, message, previousMessages, speakerAgents, scorers);
          }

          this.emitAgentStatus(sessionId, agent.id, 'waiting');
          await this.delay(this.agentDelayMs);
        }

        this.emit(sessionId, 'round-complete', { round });
      }

      const allMessages = await this.prisma.debateMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });

      let summaryData: {
        summary?: string;
        keyPoints?: string[];
        consensus?: string;
        disagreements?: string[];
        bestViewpoint?: string;
        mostInnovative?: string;
        goldenQuotes?: string[];
      } = {};

      if (this.summaryEnabled) {
        summaryData = await this.generateSummary(session.topic, speakerAgents, allMessages);
      }

      const updatedSession = await this.prisma.debateSession.update({
        where: { id: session.id },
        data: {
          status: DebateSessionStatus.COMPLETED,
          summary: summaryData.summary ?? null,
          keyPoints: summaryData.keyPoints ?? [],
          consensus: summaryData.consensus ?? null,
          disagreements: summaryData.disagreements ?? [],
          bestViewpoint: summaryData.bestViewpoint ?? null,
          mostInnovative: summaryData.mostInnovative ?? null,
          goldenQuotes: summaryData.goldenQuotes ?? [],
          completedAt: new Date(),
        },
      });

      this.emit(sessionId, 'debate-complete', this.serializeSession(updatedSession));

      for (const agent of speakerAgents) {
        this.emitAgentStatus(sessionId, agent.id, 'idle');
      }
    } catch (error) {
      this.logger.error(`Debate session ${sessionId} error`, error instanceof Error ? error.stack : String(error));
      await this.prisma.debateSession.update({
        where: { id: sessionId },
        data: { status: DebateSessionStatus.ERROR },
      });
      this.emit(sessionId, 'error', { message: error instanceof Error ? error.message : 'Debate failed' });
    }
  }

  private async generateAgentResponse(
    agent: DebateAgent,
    topic: string,
    round: number,
    maxRounds: number,
    previousMessages: Array<{ senderId: string; content: string }>,
    agents: DebateAgent[],
  ) {
    const model = this.aiService.getDefaultModel();
    if (!model) {
      throw new Error('No AI model configured');
    }

    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const recent = previousMessages.slice(-this.historyLimit);
    const history = recent
      .map((msg) => `${agentMap.get(msg.senderId) ?? msg.senderId}: ${msg.content}`)
      .join('\n\n');

    const prompt = [
      `You are ${agent.name}, ${agent.profile}.`,
      `Debate topic: ${topic}`,
      history ? `Recent discussion:\n${history}` : 'This is the beginning of the debate.',
      `Round ${round} of ${maxRounds}.`,
      previousMessages.length === 0
        ? 'Provide your initial perspective. Be clear and insightful (100-150 words).'
        : [
            'Respond to previous arguments:',
            '1. Acknowledge specific points.',
            '2. Present your reasoning.',
            '3. Add new insights or angles.',
            'Keep it concise (100-150 words).',
          ].join('\n'),
      'Reply in the same language as the topic.',
    ].join('\n\n');

    const response = await this.aiService.chat(model, [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ]);

    return response.trim();
  }

  private async scoreMessage(
    sessionId: string,
    topic: string,
    message: { id: string; senderId: string; content: string },
    previousMessages: Array<{ senderId: string; content: string }>,
    agents: DebateAgent[],
    scorers: Map<string, DebateAgent>,
  ) {
    if (!scorers || scorers.size === 0) {
      return;
    }

    const logic = scorers.get('logic_scorer');
    const innovation = scorers.get('innovation_scorer');
    const expression = scorers.get('expression_scorer');
    if (!logic || !innovation || !expression) {
      return;
    }

    const context = this.buildScoringContext(sessionId, topic, message, previousMessages, agents);
    const [logicResult, innovationResult, expressionResult] = await Promise.all([
      this.scoreWithAgent(logic, context),
      this.scoreWithAgent(innovation, context),
      this.scoreWithAgent(expression, context),
    ]);

    const totalScore = logicResult.score + innovationResult.score + expressionResult.score;

    const updated = await this.prisma.debateMessage.update({
      where: { id: message.id },
      data: {
        logicScore: logicResult.score,
        innovationScore: innovationResult.score,
        expressionScore: expressionResult.score,
        totalScore,
        scoringReasons: {
          logic: logicResult.reason,
          innovation: innovationResult.reason,
          expression: expressionResult.reason,
        },
      },
    });

    this.emit(sessionId, 'score-update', {
      messageId: updated.id,
      logicScore: updated.logicScore,
      innovationScore: updated.innovationScore,
      expressionScore: updated.expressionScore,
      totalScore: updated.totalScore,
      scoringReasons: updated.scoringReasons,
    });
  }

  private buildScoringContext(
    sessionId: string,
    topic: string,
    message: { senderId: string; content: string },
    previousMessages: Array<{ senderId: string; content: string }>,
    agents: DebateAgent[],
  ) {
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const history = previousMessages.slice(-5).map((msg) => `${agentMap.get(msg.senderId) ?? msg.senderId}: ${msg.content}`).join('\n\n');
    const current = `${agentMap.get(message.senderId) ?? message.senderId}: ${message.content}`;

    return [
      `Session: ${sessionId}`,
      `Topic: ${topic}`,
      history ? `Previous discussion:\n${history}` : 'No previous discussion.',
      `Current message:\n${current}`,
      'Return JSON: {"score": number (0-10), "reason": "short explanation"}',
    ].join('\n\n');
  }

  private async scoreWithAgent(agent: DebateAgent, context: string) {
    const model = this.aiService.getDefaultModel();
    if (!model) {
      return { score: 5, reason: 'No model configured' };
    }

    try {
      const response = await this.aiService.chat(model, [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: context },
      ]);
      const parsed = this.parseJson(response);
      const scoreRaw = Number(parsed?.score);
      const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(10, scoreRaw)) : 5;
      const reason = typeof parsed?.reason === 'string' ? parsed.reason : 'No reason';
      return { score, reason };
    } catch (error) {
      return { score: 5, reason: 'Score parsing failed' };
    }
  }

  private async generateSummary(topic: string, agents: DebateAgent[], messages: Array<{ senderId: string; content: string; round: number }>) {
    const model = this.aiService.getDefaultModel();
    if (!model) {
      return {};
    }

    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const conversation = messages
      .map((msg) => `**${agentMap.get(msg.senderId) ?? msg.senderId}** (Round ${msg.round}):\n${msg.content}`)
      .join('\n\n');

    const hasChinese = /[\u4e00-\u9fff]/.test(topic);
    const prompt = hasChinese
      ? `请分析以下讨论并提供完整总结。

## 讨论话题
${topic}

## 参与者
${agents.map((a) => `- ${a.name}: ${a.profile}`).join('\n')}

## 对话内容
${conversation}

请用 JSON 输出：
{
  "summary": "2-3 段总结",
  "keyPoints": ["要点1", "要点2"],
  "consensus": "主要共识",
  "disagreements": ["分歧1", "分歧2"],
  "bestViewpoint": "智能体名称：观点内容",
  "mostInnovative": "智能体名称：创新观点",
  "goldenQuotes": ["智能体名称：金句1", "智能体名称：金句2"]
}

请使用中文输出。`
      : `Please analyze the debate below and provide a complete summary.

## Topic
${topic}

## Participants
${agents.map((a) => `- ${a.name}: ${a.profile}`).join('\n')}

## Conversation
${conversation}

Reply in JSON:
{
  "summary": "2-3 paragraphs",
  "keyPoints": ["Key point 1", "Key point 2"],
  "consensus": "Main consensus",
  "disagreements": ["Disagreement 1", "Disagreement 2"],
  "bestViewpoint": "Agent name: viewpoint",
  "mostInnovative": "Agent name: innovative idea",
  "goldenQuotes": ["Agent name: quote 1", "Agent name: quote 2"]
}

Use the same language as the topic.`;

    try {
      const response = await this.aiService.chat(model, [
        { role: 'system', content: hasChinese ? '你是专业讨论分析专家。' : 'You are a professional debate analyst.' },
        { role: 'user', content: prompt },
      ]);
      return this.parseJson(response);
    } catch (error) {
      this.logger.warn(`Summary generation failed: ${String(error)}`);
      return {};
    }
  }

  private parseJson(text: string) {
    if (!text) return {};
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
    try {
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  private emit(sessionId: string, event: string, data: unknown) {
    this.stream.emit(sessionId, event, data);
  }

  private emitAgentStatus(sessionId: string, agentId: string, status: AgentStatus) {
    this.emit(sessionId, 'agent-status', { agentId, status });
  }

  private delay(ms: number) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private serializeMessage(message: any) {
    return {
      ...message,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    };
  }

  private serializeSession(session: any) {
    return {
      ...session,
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
      updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : session.updatedAt,
      completedAt: session.completedAt instanceof Date ? session.completedAt.toISOString() : session.completedAt,
    };
  }

  private async loadSessionAgents(agentIds: string[]) {
    if (!agentIds || agentIds.length === 0) return [];
    const agents = await this.prisma.debateAgent.findMany({
      where: { id: { in: agentIds } },
    });
    const map = new Map(agents.map((agent) => [agent.id, agent]));
    return agentIds.map((id) => map.get(id)).filter(Boolean) as DebateAgent[];
  }

  private async refreshScorers() {
    const scorers = await this.prisma.debateAgent.findMany({
      where: { category: DebateAgentCategory.EVALUATOR },
    });
    this.scorers = new Map(scorers.map((agent) => [agent.id, agent]));
  }

  private async resolveScorers(evaluators: DebateAgent[]) {
    if (evaluators.length > 0) {
      return new Map(evaluators.map((agent) => [agent.id, agent]));
    }
    if (this.scorers.size === 0) {
      await this.refreshScorers();
    }
    return this.scorers;
  }

  private async seedAgents() {
    const agents: Array<Omit<DebateAgent, 'createdAt'>> = [
      {
        id: 'supporter',
        name: '支持者',
        profile: '积极论证专家',
        systemPrompt:
          '你是一位积极论证专家，擅长发现机会、挖掘价值并构建建设性论述。请提供可行路径并保持理性。',
        color: '#10B981',
        description: '挖掘价值亮点，构建积极论证',
        category: DebateAgentCategory.DEBATER,
        displayOrder: 1,
      },
      {
        id: 'opponent',
        name: '反对者',
        profile: '批判论证专家',
        systemPrompt:
          '你是一位批判论证专家，擅长识别风险、发现漏洞并提出质疑。请理性指出隐含前提与潜在问题。',
        color: '#EF4444',
        description: '识别风险漏洞，提出批判质疑',
        category: DebateAgentCategory.DEBATER,
        displayOrder: 2,
      },
      {
        id: 'moderator',
        name: '中立者',
        profile: '客观综合专家',
        systemPrompt:
          '你是一位客观综合专家，擅长平衡分析、综合观点并提炼共识。请保持中立并给出折中方案。',
        color: '#3B82F6',
        description: '平衡分析观点，综合提炼共识',
        category: DebateAgentCategory.DEBATER,
        displayOrder: 3,
      },
      {
        id: 'innovator',
        name: '创新者',
        profile: '突破思维专家',
        systemPrompt:
          '你是一位突破思维专家，擅长跳出常规框架提出创新视角。请给出新颖方案并说明可行性。',
        color: '#8B5CF6',
        description: '突破常规框架，提出创新方案',
        category: DebateAgentCategory.DEBATER,
        displayOrder: 4,
      },
      {
        id: 'critic',
        name: '逻辑家',
        profile: '逻辑结构专家',
        systemPrompt:
          '你是一位逻辑结构专家，擅长分析论证的严密性与推理有效性。请指出逻辑链条中的问题。',
        color: '#F59E0B',
        description: '分析逻辑结构，检验推理严密性',
        category: DebateAgentCategory.DEBATER,
        displayOrder: 5,
      },
      {
        id: 'logic_scorer',
        name: '逻辑评分者',
        profile: '逻辑严密性评判员',
        systemPrompt:
          '你是中立的逻辑评分者。请评估发言逻辑严密性，并返回 JSON: {"score": 分数, "reason": "原因"}。',
        color: '#6366F1',
        description: '评估论点的逻辑严密性',
        category: DebateAgentCategory.EVALUATOR,
        displayOrder: 6,
      },
      {
        id: 'innovation_scorer',
        name: '创新评分者',
        profile: '创意价值评判员',
        systemPrompt:
          '你是中立的创新评分者。请评估发言创新性，并返回 JSON: {"score": 分数, "reason": "原因"}。',
        color: '#EC4899',
        description: '评估观点的创新性',
        category: DebateAgentCategory.EVALUATOR,
        displayOrder: 7,
      },
      {
        id: 'expression_scorer',
        name: '表达评分者',
        profile: '表达清晰度评判员',
        systemPrompt:
          '你是中立的表达评分者。请评估语言清晰度与说服力，并返回 JSON: {"score": 分数, "reason": "原因"}。',
        color: '#14B8A6',
        description: '评估表达清晰度与说服力',
        category: DebateAgentCategory.EVALUATOR,
        displayOrder: 8,
      },
    ];

    await this.prisma.debateAgent.createMany({
      data: agents,
      skipDuplicates: true,
    });
  }

  private async seedTemplates() {
    await this.prisma.debateTemplate.createMany({
      data: [
        {
          id: 'preset-quick-debate',
          name: '快速讨论',
          description: '支持/反对/中立三角度快速分析。3 位智能体，5 轮讨论。',
          agentIds: ['supporter', 'opponent', 'moderator'],
          rounds: 5,
          isSystem: true,
        },
        {
          id: 'preset-deep-analysis',
          name: '深度分析',
          description: '多角度深入分析话题。6 位智能体，10 轮讨论。',
          agentIds: ['supporter', 'opponent', 'moderator', 'critic', 'innovator', 'logic_scorer'],
          rounds: 10,
          isSystem: true,
        },
        {
          id: 'preset-comprehensive-evaluation',
          name: '全面评估',
          description: '完整观点论证 + 评分系统。8 位智能体，15 轮讨论。',
          agentIds: [
            'supporter',
            'opponent',
            'moderator',
            'logic_scorer',
            'innovation_scorer',
            'expression_scorer',
            'critic',
            'innovator',
          ],
          rounds: 15,
          isSystem: true,
        },
      ],
      skipDuplicates: true,
    });
  }
}
