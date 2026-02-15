export type InsightTopicSummary = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  visibility: '公开' | '私有';
  reportCount: number;
  sourceCount: number;
  dimensionDone: number;
  dimensionTotal: number;
  lastUpdated: string;
  icon: string;
  accent: {
    iconBg: string;
    iconText: string;
    tagBg: string;
    tagText: string;
    progress: string;
  };
};

export type ResearchMember = {
  id: string;
  name: string;
  role: string;
  status: 'leader' | 'active' | 'done' | 'pending';
  tasks: number;
};

export type ResearchDirection = {
  title: string;
  status: '完成' | '进行中' | '待研究';
};

export type ResearchTask = {
  id: string;
  title: string;
  subtitle?: string;
  owner: string;
  model: string;
  status: '已完成' | '进行中' | '待开始';
};

export type AiTeamMember = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: '空闲' | '工作中' | '离线';
  isLeader?: boolean;
  focus?: string;
};

export type DeepResearchStage = {
  id: string;
  title: string;
  owner: string;
  status: '待开始' | '进行中' | '已完成';
  progress: number;
  summary: string;
};

export type DeepResearchDiscussion = {
  id: string;
  time: string;
  agent: string;
  model: string;
  type: 'insight' | 'question' | 'decision';
  content: string;
};

export type DeepResearchChapterOutput = {
  title: string;
  owner: string;
  model: string;
  summary: string;
  highlights: string[];
};

export type DeepResearchOutput = {
  executiveSummary: string;
  keyFindings: string[];
  opportunities: string[];
  risks: string[];
  openQuestions: string[];
  actionItems: string[];
  consensus: string;
  dissent: string[];
  chapters: DeepResearchChapterOutput[];
};

export type DeepResearchData = {
  stages: DeepResearchStage[];
  discussions: DeepResearchDiscussion[];
  outputs: DeepResearchOutput;
};

export type CollaborationEvent = {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  detail: string;
  time: string;
  actor: string;
};

export type ReportSection = {
  title: string;
  summary: string;
  highlights: string[];
};

export type HistoryItem = {
  id: string;
  title: string;
  time: string;
  summary: string;
};

export type CredibilityMetric = {
  label: string;
  score: number;
  color: string;
  rating?: number;
};

export type SourceBreakdown = {
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type TimelinessItem = {
  label: string;
  value: number;
  percent: number;
  color: string;
};

export type CoverageItem = {
  label: string;
  value: string;
  progress: number;
};

export type QualityMetric = {
  label: string;
  value: string;
  accent: string;
};

export type CredibilityData = {
  overall: number;
  metrics: CredibilityMetric[];
  sources: SourceBreakdown[];
  timeliness: TimelinessItem[];
  coverage: CoverageItem[];
  quality: QualityMetric[];
  limitations: string[];
};

export type ReferenceItem = {
  id: number;
  title: string;
  domain: string;
  excerpt: string;
  score: number;
  tag?: string;
};

export type InsightTopicDetail = {
  id: string;
  statusLabel: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  team: ResearchMember[];
  aiTeam: AiTeamMember[];
  directions: ResearchDirection[];
  tasks: ResearchTask[];
  deepResearch: DeepResearchData;
  collaboration: CollaborationEvent[];
  report: {
    generatedAt: string;
    executiveSummary: string;
    sections: ReportSection[];
  };
  history: HistoryItem[];
  credibility: CredibilityData;
  references: ReferenceItem[];
};

export type NewInsightPayload = {
  title: string;
  subtitle?: string;
  category: string;
  visibility: '公开' | '私有';
  icon: string;
};

export const insightTopics: InsightTopicSummary[] = [
  {
    id: 'us-ai-macro',
    title: '美国AI宏观洞察',
    subtitle: '美国AI宏观洞察',
    category: '宏观洞察',
    visibility: '公开',
    reportCount: 1,
    sourceCount: 170,
    dimensionDone: 10,
    dimensionTotal: 10,
    lastUpdated: '1周前',
    icon: 'globe',
    accent: {
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-sky-500',
    },
  },
  {
    id: 'chip-cycle',
    title: '主流芯片公司研发上市周期洞察',
    subtitle: '主流芯片公司研发上市周期洞察',
    category: '技术趋势',
    visibility: '公开',
    reportCount: 4,
    sourceCount: 128,
    dimensionDone: 8,
    dimensionTotal: 8,
    lastUpdated: '1周前',
    icon: 'chip',
    accent: {
      iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-fuchsia-500',
    },
  },
  {
    id: 'global-ai-macro',
    title: '全球AI宏观洞察',
    subtitle: '全球AI宏观洞察',
    category: '宏观洞察',
    visibility: '公开',
    reportCount: 1,
    sourceCount: 167,
    dimensionDone: 10,
    dimensionTotal: 10,
    lastUpdated: '1周前',
    icon: 'globe',
    accent: {
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-sky-500',
    },
  },
  {
    id: 'us-ai-policy',
    title: '美国AI宏观洞察',
    subtitle: '美国AI宏观洞察',
    category: '宏观洞察',
    visibility: '公开',
    reportCount: 1,
    sourceCount: 220,
    dimensionDone: 11,
    dimensionTotal: 11,
    lastUpdated: '1周前',
    icon: 'globe',
    accent: {
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-sky-500',
    },
  },
  {
    id: 'cisco-6',
    title: 'Cisco在AI时代的竞争力6.0',
    subtitle: 'Cisco在AI时代的竞争力6.0',
    category: '企业追踪',
    visibility: '公开',
    reportCount: 1,
    sourceCount: 70,
    dimensionDone: 9,
    dimensionTotal: 9,
    lastUpdated: '2周前',
    icon: 'building',
    accent: {
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-emerald-500',
    },
  },
  {
    id: 'autonomous-network',
    title: '自动驾驶网络',
    subtitle: '自动驾驶网络',
    category: '技术趋势',
    visibility: '公开',
    reportCount: 1,
    sourceCount: 71,
    dimensionDone: 11,
    dimensionTotal: 11,
    lastUpdated: '2周前',
    icon: 'network',
    accent: {
      iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-fuchsia-500',
    },
  },
  {
    id: 'cisco-2',
    title: 'Cisco在AI时代的竞争力2.0',
    subtitle: 'Cisco在AI时代的竞争力2.0',
    category: '企业追踪',
    visibility: '公开',
    reportCount: 1,
    sourceCount: 79,
    dimensionDone: 10,
    dimensionTotal: 10,
    lastUpdated: '2周前',
    icon: 'building',
    accent: {
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
      iconText: 'text-white',
      tagBg: 'bg-emerald-50',
      tagText: 'text-emerald-700',
      progress: 'bg-emerald-500',
    },
  },
];

const ACCENT_BY_ICON: Record<string, InsightTopicSummary['accent']> = {
  globe: {
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
    iconText: 'text-white',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
    progress: 'bg-sky-500',
  },
  chip: {
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
    iconText: 'text-white',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
    progress: 'bg-fuchsia-500',
  },
  building: {
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
    iconText: 'text-white',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
    progress: 'bg-emerald-500',
  },
  network: {
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
    iconText: 'text-white',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
    progress: 'bg-fuchsia-500',
  },
};

const STORAGE_TOPICS_KEY = 'raven_ai_insights_topics';
const STORAGE_DETAILS_KEY = 'raven_ai_insights_details';

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures (quota / privacy mode)
  }
}

export function getStoredInsightTopics(): InsightTopicSummary[] {
  return readStorage(STORAGE_TOPICS_KEY, []);
}

export function getStoredInsightTopicDetails(): Record<string, InsightTopicDetail> {
  return readStorage(STORAGE_DETAILS_KEY, {});
}

export function saveStoredInsightTopics(topics: InsightTopicSummary[]) {
  writeStorage(STORAGE_TOPICS_KEY, topics);
}

export function saveStoredInsightTopicDetails(details: Record<string, InsightTopicDetail>) {
  writeStorage(STORAGE_DETAILS_KEY, details);
}

const baseDetail: InsightTopicDetail = {
  id: 'base',
  statusLabel: '已完成',
  progress: 100,
  tasksDone: 10,
  tasksTotal: 10,
  team: [
    { id: 'leader', name: 'Leader', role: '负责人', status: 'leader', tasks: 3 },
    { id: 'r1', name: '研究员', role: '政策专家', status: 'done', tasks: 2 },
    { id: 'r2', name: '研究员', role: '技术前沿', status: 'done', tasks: 2 },
    { id: 'r3', name: '研究员', role: '市场分析', status: 'done', tasks: 2 },
    { id: 'r4', name: '研究员', role: '社会伦理', status: 'done', tasks: 2 },
    { id: 'reviewer', name: '审校员', role: '质量审校', status: 'active', tasks: 1 },
    { id: 'writer', name: '撰写员', role: '报告撰写', status: 'done', tasks: 1 },
  ],
  aiTeam: [
    {
      id: 'ai-1',
      name: 'researcher_policy_expert',
      role: '政策专家',
      model: 'gemini-pro-latest',
      status: '空闲',
      isLeader: true,
      focus: '政策框架与监管趋势',
    },
    {
      id: 'ai-2',
      name: 'researcher_tech_visionary',
      role: '技术前沿',
      model: 'gpt-5.1',
      status: '工作中',
      focus: '模型架构与推理效率',
    },
    {
      id: 'ai-3',
      name: 'researcher_market_analyst',
      role: '市场分析',
      model: 'gpt-4o',
      status: '空闲',
      focus: '资本与产业趋势',
    },
    {
      id: 'ai-4',
      name: 'researcher_social_ethicist',
      role: '社会伦理',
      model: 'gemini-2.5-flash',
      status: '空闲',
      focus: '安全对齐与伦理治理',
    },
    {
      id: 'ai-5',
      name: 'reviewer_quality',
      role: '质量审校',
      model: 'gpt-5.1',
      status: '工作中',
      focus: '一致性与证据验证',
    },
    {
      id: 'ai-6',
      name: 'writer_report',
      role: '报告撰写',
      model: 'gpt-5.1',
      status: '空闲',
      focus: '结构化输出与总结',
    },
  ],
  directions: [
    { title: '政策法规与监管框架', status: '完成' },
    { title: '前沿技术研发与大模型演进', status: '完成' },
    { title: '宏观经济与资本市场趋势', status: '完成' },
    { title: '安全对齐与伦理治理', status: '完成' },
    { title: '算力基础与半导体供应链', status: '完成' },
    { title: '地缘政治与国际竞争格局', status: '完成' },
    { title: '行业应用与商业化路径', status: '完成' },
    { title: 'AI人才体系与教育变革', status: '完成' },
    { title: '质量审核', status: '完成' },
    { title: '报告撰写', status: '完成' },
  ],
  tasks: [
    {
      id: '1',
      title: '研究：政策法规与监管框架',
      subtitle: '政策法规与监管框架',
      owner: 'researcher_policy_expert',
      model: 'gemini-pro-latest',
      status: '已完成',
    },
    {
      id: '2',
      title: '研究：前沿技术研发与大模型演进',
      subtitle: '前沿技术研发与大模型演进',
      owner: 'researcher_tech_visionary',
      model: 'gpt-5.1',
      status: '已完成',
    },
    {
      id: '3',
      title: '研究：宏观经济与资本市场趋势',
      subtitle: '宏观经济与资本市场趋势',
      owner: 'researcher_market_analyst',
      model: 'gpt-4o',
      status: '已完成',
    },
    {
      id: '4',
      title: '研究：安全对齐与伦理治理',
      subtitle: '安全对齐与伦理治理',
      owner: 'researcher_social_ethicist',
      model: 'gemini-2.5-flash',
      status: '已完成',
    },
    {
      id: '5',
      title: '研究：算力基础与半导体供应链',
      subtitle: '算力基础与半导体供应链',
      owner: 'researcher_tech_visionary',
      model: 'gpt-5.1',
      status: '已完成',
    },
    {
      id: '6',
      title: '研究：地缘政治与国际竞争格局',
      subtitle: '地缘政治与国际竞争格局',
      owner: 'researcher_policy_expert',
      model: 'gemini-pro-latest',
      status: '已完成',
    },
    {
      id: '7',
      title: '研究：行业应用与商业化路径',
      subtitle: '行业应用与商业化路径',
      owner: 'researcher_market_analyst',
      model: 'gpt-4o',
      status: '已完成',
    },
    {
      id: '8',
      title: '研究：AI人才体系与教育变革',
      subtitle: 'AI人才体系与教育变革',
      owner: 'researcher_social_ethicist',
      model: 'gemini-2.5-flash',
      status: '已完成',
    },
    {
      id: '9',
      title: '质量审核',
      subtitle: '质量审核',
      owner: 'reviewer_quality',
      model: 'gpt-5.1',
      status: '已完成',
    },
    {
      id: '10',
      title: '报告撰写',
      subtitle: '报告撰写',
      owner: 'writer_report',
      model: 'gpt-5.1',
      status: '已完成',
    },
  ],
  deepResearch: {
    stages: [
      {
        id: 'stage-1',
        title: '问题定义与框架',
        owner: 'researcher_policy_expert',
        status: '已完成',
        progress: 100,
        summary: '明确研究边界、关键问题与监管框架。',
      },
      {
        id: 'stage-2',
        title: '证据搜集与交叉验证',
        owner: 'reviewer_quality',
        status: '进行中',
        progress: 80,
        summary: '多来源校验核心结论，补齐高风险与争议证据。',
      },
      {
        id: 'stage-3',
        title: '多模型对齐讨论',
        owner: 'writer_report',
        status: '进行中',
        progress: 60,
        summary: '多模型交叉评估，收敛共识与分歧。',
      },
      {
        id: 'stage-4',
        title: '结构化成稿与质量审校',
        owner: 'reviewer_quality',
        status: '已完成',
        progress: 100,
        summary: '完成结构化输出与一致性检查。',
      },
    ],
    discussions: [
      {
        id: 'd1',
        time: '00:12:08',
        agent: 'researcher_policy_expert',
        model: 'gemini-pro-latest',
        type: 'insight',
        content: '监管侧呈现“立法滞后、行政快跑”的多部门协同格局，需关注FTC与SEC的执法口径。',
      },
      {
        id: 'd2',
        time: '00:13:42',
        agent: 'researcher_tech_visionary',
        model: 'gpt-5.1',
        type: 'insight',
        content: '技术路线由规模竞争转向效率竞争，SSM-Transformer与二代MoE有望降低推理成本。',
      },
      {
        id: 'd3',
        time: '00:14:50',
        agent: 'researcher_market_analyst',
        model: 'gpt-4o',
        type: 'question',
        content: '资本市场对“AI核心资产”溢价是否已透支？建议增加二级市场压力测试。',
      },
      {
        id: 'd4',
        time: '00:16:10',
        agent: 'reviewer_quality',
        model: 'gpt-5.1',
        type: 'decision',
        content: '合并相近结论并保留分歧点，输出共识与争议清单。',
      },
    ],
    outputs: {
      executiveSummary: '多Agent围绕政策、技术、市场、治理、算力与地缘维度形成协同洞察，并在关键争议点上保留分歧。',
      keyFindings: [
        '监管体系趋向多部门协同与高风险模型评估前置。',
        '算力与系统级优化成为大模型成本下降的核心杠杆。',
        '资本市场更关注可量化ROI与行业深耕能力。',
      ],
      opportunities: [
        '面向行业场景的Agent协作与流程自动化产品。',
        '围绕推理效率、数据治理的基础设施与工具链。',
      ],
      risks: [
        '监管口径不一致导致合规成本上升。',
        '高性能算力供应链的不确定性。',
      ],
      openQuestions: [
        '高风险模型的评估标准是否会统一？',
        '企业对生成式AI的ROI评估口径是否稳定？',
      ],
      actionItems: [
        '补充监管案例与执法趋势样本。',
        '对关键行业开展ROI与采纳路径对标分析。',
        '输出可落地的多Agent协作范式模板。',
      ],
      consensus: 'AI产业化需要“监管—算力—应用”三线并进，且需通过多模型交叉验证输出稳定结论。',
      dissent: ['资本市场估值仍存在结构性泡沫，短期波动需谨慎。'],
      chapters: [
        {
          title: '政策法规与监管框架',
          owner: 'researcher_policy_expert',
          model: 'gemini-pro-latest',
          summary: '2026年美国AI政策呈现“立法滞后、行政快跑、司法厘界、部门严管”的复杂格局。',
          highlights: [
            '高风险AI定义逐步成型，关注前沿模型的安全评估与红队测试。',
            'FTC、SEC、EEOC等部门强化执法，形成多部门协同监管体系。',
          ],
        },
        {
          title: '宏观经济与资本市场趋势',
          owner: 'researcher_market_analyst',
          model: 'gpt-4o',
          summary: 'AI正在成为美国宏观经济新的增长引擎，资本市场进一步向“AI核心资产”集中。',
          highlights: [
            '企业资本开支结构向算力与基础设施倾斜，强化长期竞争壁垒。',
            '一级市场更关注商业化落地路径与行业深耕能力。',
          ],
        },
        {
          title: '前沿技术研发与大模型演进',
          owner: 'researcher_tech_visionary',
          model: 'gpt-5.1',
          summary: '大模型技术进入深度竞争期，从参数规模竞争转向效率与推理优化。',
          highlights: [
            'SSM-Transformer等新架构被验证为潜在替代路线。',
            '二代MoE技术通过稀疏化降低推理成本。',
          ],
        },
        {
          title: '算力基础与半导体供应链',
          owner: 'researcher_tech_visionary',
          model: 'gpt-5.1',
          summary: '算力基础正从“芯片驱动”转向“系统级协同驱动”。',
          highlights: [
            'NVIDIA Rubin与AMD MI400平台加速2nm与HBM4落地。',
            '供应链韧性与功耗约束成为关键挑战。',
          ],
        },
        {
          title: '行业应用与商业化路径',
          owner: 'researcher_market_analyst',
          model: 'gpt-4o',
          summary: '行业侧AI从试点走向规模化部署，商业模式更强调可量化ROI。',
          highlights: [
            '金融、制造、政务成为关键突破口。',
            '端到端自动化与Agent协作是主要方向。',
          ],
        },
        {
          title: 'AI人才体系与教育变革',
          owner: 'researcher_social_ethicist',
          model: 'gemini-2.5-flash',
          summary: '人才体系呈现“研究—工程—产品”三层结构，教育体系快速响应。',
          highlights: [
            '高校与企业联合培养，强调工程实践与跨学科能力。',
            '持续学习成为AI岗位的核心竞争力。',
          ],
        },
        {
          title: '安全对齐与伦理治理',
          owner: 'researcher_social_ethicist',
          model: 'gemini-2.5-flash',
          summary: '对齐成为AI产业化前置条件，治理框架与行业标准并行推进。',
          highlights: [
            '模型可解释性与风险评估要求提高。',
            '行业自律组织与监管协同机制逐步形成。',
          ],
        },
        {
          title: '地缘政治与国际竞争格局',
          owner: 'researcher_policy_expert',
          model: 'gemini-pro-latest',
          summary: '全球AI竞争进入“算力—数据—人才”三维博弈。',
          highlights: [
            '出口管制与技术壁垒持续加深，区域性生态加速重构。',
            '开放联盟与区域伙伴关系成为缓冲策略。',
          ],
        },
      ],
    },
  },
  collaboration: [
    {
      id: 'c1',
      type: 'warning',
      title: '质量审核需修订',
      detail: '正在审核维度「地缘政治与国际竞争格局」…',
      time: '00:23:35',
      actor: '质量审校员 [ChatGPT (gpt-5.1)]',
    },
    {
      id: 'c2',
      type: 'warning',
      title: '质量审核需修订',
      detail: '正在审核维度「政策法规与监管框架」…',
      time: '00:23:35',
      actor: '质量审校员 [ChatGPT (gpt-5.1)]',
    },
    {
      id: 'c3',
      type: 'warning',
      title: '质量审核需修订',
      detail: '正在审核维度「算力基础与半导体供应链」…',
      time: '00:23:36',
      actor: '质量审校员 [ChatGPT (gpt-5.1)]',
    },
    {
      id: 'c4',
      type: 'success',
      title: '质量审核完成',
      detail: '质量审校员 [ChatGPT (gpt-5.1)] 研究完成',
      time: '00:23:36',
      actor: '质量审校员',
    },
    {
      id: 'c5',
      type: 'info',
      title: '报告撰写中',
      detail: '撰写员 [gemini-3-pro-latest] 正在生成洞察报告…',
      time: '00:23:43',
      actor: '撰写员',
    },
  ],
  report: {
    generatedAt: '2026/2/6',
    executiveSummary: 'Error: Request blocked by content safety guardrail: prompt-injection-detector',
    sections: [
      {
        title: '政策法规与监管框架',
        summary: '2026年美国AI政策呈现“立法滞后、行政快跑、司法厘界、部门严管”的复杂格局。',
        highlights: [
          '高风险AI定义逐步成型，关注前沿模型的安全评估与红队测试。',
          'FTC、SEC、EEOC等部门强化执法，形成“多部门协同监管”体系。',
        ],
      },
      {
        title: '宏观经济与资本市场趋势',
        summary: 'AI正在成为美国宏观经济新的增长引擎，资本市场进一步向“AI核心资产”集中。',
        highlights: [
          '企业资本开支结构向算力与基础设施倾斜，强化长期竞争壁垒。',
          '一级市场更关注商业化落地路径与行业深耕能力。',
        ],
      },
      {
        title: '前沿技术研发与大模型演进',
        summary: '大模型技术进入深度竞争期，从参数规模竞争转向效率与推理优化。',
        highlights: [
          'SSM-Transformer等新架构被验证为潜在替代路线。',
          '二代MoE技术通过稀疏化降低推理成本。',
        ],
      },
      {
        title: '算力基础与半导体供应链',
        summary: '算力基础正从“芯片驱动”转向“系统级协同驱动”。',
        highlights: [
          'NVIDIA Rubin与AMD MI400平台加速2nm与HBM4落地。',
          '供应链韧性与功耗约束成为关键挑战。',
        ],
      },
      {
        title: '行业应用与商业化路径',
        summary: '行业侧AI从试点走向规模化部署，商业模式更强调可量化ROI。',
        highlights: [
          '金融、制造、政务成为关键突破口。',
          '端到端自动化与Agent协作是主要方向。',
        ],
      },
      {
        title: 'AI人才体系与教育变革',
        summary: '人才体系呈现“研究—工程—产品”三层结构，教育体系快速响应。',
        highlights: [
          '高校与企业联合培养，强调工程实践与跨学科能力。',
          '持续学习成为AI岗位的核心竞争力。',
        ],
      },
      {
        title: '安全对齐与伦理治理',
        summary: '对齐成为AI产业化前置条件，治理框架与行业标准并行推进。',
        highlights: [
          '模型可解释性与风险评估要求提高。',
          '行业自律组织与监管协同机制逐步形成。',
        ],
      },
      {
        title: '地缘政治与国际竞争格局',
        summary: '全球AI竞争进入“算力—数据—人才”三维博弈。',
        highlights: [
          '出口管制与技术壁垒持续加深，区域性生态加速重构。',
          '开放联盟与区域伙伴关系成为缓冲策略。',
        ],
      },
    ],
  },
  history: [
    {
      id: 'h1',
      title: '第1次研究',
      time: '2026/2/6 00:11:06',
      summary: '已完成 · 更新8个维度 · 新增10条来源 · 共19条互动',
    },
  ],
  credibility: {
    overall: 71,
    metrics: [
      { label: '权威性', score: 48, color: '#ef4444', rating: 2 },
      { label: '多样性', score: 79, color: '#f59e0b', rating: 4 },
      { label: '时效性', score: 63, color: '#f59e0b', rating: 3 },
      { label: '覆盖度', score: 100, color: '#22c55e', rating: 5 },
    ],
    sources: [
      { label: '政府/官方', count: 10, percent: 6, color: 'bg-red-500' },
      { label: '学术研究', count: 6, percent: 4, color: 'bg-blue-500' },
      { label: '行业报告', count: 8, percent: 5, color: 'bg-purple-500' },
      { label: '新闻媒体', count: 10, percent: 6, color: 'bg-emerald-500' },
      { label: '博客/其他', count: 136, percent: 80, color: 'bg-gray-300' },
    ],
    timeliness: [
      { label: '1个月内', value: 47, percent: 28, color: 'bg-emerald-500' },
      { label: '1-3个月', value: 39, percent: 23, color: 'bg-blue-500' },
      { label: '3-6个月', value: 5, percent: 3, color: 'bg-amber-500' },
      { label: '6-12个月', value: 1, percent: 1, color: 'bg-orange-400' },
      { label: '1年以上', value: 1, percent: 1, color: 'bg-gray-300' },
      { label: '日期未知', value: 77, percent: 45, color: 'bg-gray-200' },
    ],
    coverage: [
      { label: '算力基础与半导体供应链', value: '21/5', progress: 100 },
      { label: '宏观经济与资本市场趋势', value: '21/5', progress: 100 },
      { label: '安全对齐与伦理治理', value: '21/5', progress: 100 },
      { label: '行业应用与商业化路径', value: '21/5', progress: 100 },
      { label: 'AI人才体系与教育变革', value: '21/5', progress: 100 },
      { label: '前沿技术研发与大模型演进', value: '21/5', progress: 100 },
      { label: '政策法规与监管框架', value: '21/5', progress: 100 },
      { label: '地缘政治与国际竞争格局', value: '21/5', progress: 100 },
    ],
    quality: [
      { label: '规范次数', value: '10', accent: 'text-blue-600' },
      { label: '平均修订次数', value: '1.2', accent: 'text-emerald-600' },
      { label: '审核通过率', value: '36%', accent: 'text-purple-600' },
      { label: 'Agent活动数', value: '261', accent: 'text-orange-500' },
    ],
    limitations: [
      '样本来源高度依赖公开互联网内容，可能存在信息滞后。',
      '部分行业数据因版权限制无法直接引用，结论需二次验证。',
      '模型输出存在上下文漂移风险，需结合专家复核。',
    ],
  },
  references: [
    {
      id: 28,
      title: 'Ethics Is the Defining Issue for the Future of AI. And Time Is Running ...',
      domain: 'news.darden.virginia.edu',
      excerpt: 'AI ethics is the academic and philosophical study of the moral, social and political issues raised by artificial intelligence.',
      score: 78,
      tag: 'web',
    },
    {
      id: 82,
      title: 'Dallas College Lands $3.3M Federal Grant to Expand AI education',
      domain: 'dallascollege.edu',
      excerpt: 'The U.S. Department of Education awarded Dallas College a four-year, $3.3 million grant to launch AI-enabled teaching.',
      score: 78,
      tag: 'web',
    },
    {
      id: 62,
      title: 'AI transformation in financial services: 5 predictors for success in 2026',
      domain: 'microsoft.com',
      excerpt: 'In 2026, success will come from re-architecting core business processes to be human-led and AI-enabled.',
      score: 65,
      tag: 'web',
    },
    {
      id: 121,
      title: '来自微软研究院的2026年前沿观察 - Microsoft Research',
      domain: 'microsoft.com',
      excerpt: 'AI将能够生成新的假设，调用更多可控的科学实验工具与应用。',
      score: 65,
      tag: 'web',
    },
    {
      id: 135,
      title: 'Proposing an amendment to the Constitution of the United States to require that the Supreme Court ...',
      domain: 'congress.gov',
      excerpt: 'HJRES.1 - Proposing an amendment to the Constitution of the United States ...',
      score: 65,
      tag: 'web',
    },
    {
      id: 166,
      title: 'Proposing an amendment to the Constitution of the United States to require that the Supreme Court ...',
      domain: 'congress.gov',
      excerpt: 'HJRES.1 - Proposing an amendment to the Constitution of the United States ...',
      score: 65,
      tag: 'web',
    },
    {
      id: 57,
      title: '4 takeaways for finance teams as they implement AI | MIT Sloan',
      domain: 'mitsloan.mit.edu',
      excerpt: 'Artificial intelligence is front and center in finance, transforming how leaders manage their teams.',
      score: 63,
      tag: 'web',
    },
    {
      id: 76,
      title: '华尔街和科技圈2026年十大预测：AI泡沫破灭，三大超级IPO来袭',
      domain: 'h5t.ai.com',
      excerpt: 'AI泡沫破灭预期引发市场重新估值，超级IPO与新平台竞逐成为关键变量。',
      score: 63,
      tag: 'web',
    },
  ],
};

export const insightTopicDetails: Record<string, InsightTopicDetail> = {
  'us-ai-macro': { ...baseDetail, id: 'us-ai-macro' },
  'chip-cycle': { ...baseDetail, id: 'chip-cycle' },
  'global-ai-macro': { ...baseDetail, id: 'global-ai-macro' },
  'us-ai-policy': { ...baseDetail, id: 'us-ai-policy' },
  'cisco-6': { ...baseDetail, id: 'cisco-6' },
  'autonomous-network': { ...baseDetail, id: 'autonomous-network' },
  'cisco-2': { ...baseDetail, id: 'cisco-2' },
};

export function getAllInsightTopics(): InsightTopicSummary[] {
  const stored = getStoredInsightTopics();
  const map = new Map<string, InsightTopicSummary>();
  for (const item of stored) {
    map.set(item.id, item);
  }
  for (const item of insightTopics) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export function getInsightTopic(id: string): InsightTopicSummary | undefined {
  return getAllInsightTopics().find((item) => item.id === id);
}

export function getInsightTopicDetail(id: string): InsightTopicDetail {
  const stored = getStoredInsightTopicDetails();
  const storedDetail = stored[id];
  if (storedDetail) {
    return {
      ...baseDetail,
      ...storedDetail,
      report: storedDetail.report ?? baseDetail.report,
      credibility: storedDetail.credibility ?? baseDetail.credibility,
      deepResearch: storedDetail.deepResearch ?? baseDetail.deepResearch,
      references: storedDetail.references ?? baseDetail.references,
    };
  }
  return insightTopicDetails[id] ?? { ...baseDetail, id };
}

function formatDateSlash(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function makeInsightId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `insight-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createInsightFromMacro(payload: NewInsightPayload): InsightTopicSummary {
  const templateSummary = insightTopics.find((item) => item.id === 'us-ai-macro') ?? insightTopics[0];
  const templateDetail = insightTopicDetails['us-ai-macro'] ?? baseDetail;
  const id = makeInsightId();
  const accent = ACCENT_BY_ICON[payload.icon] ?? templateSummary.accent;
  const title = payload.title.trim();
  const subtitle = payload.subtitle?.trim() || title;

  const summary: InsightTopicSummary = {
    ...templateSummary,
    id,
    title,
    subtitle,
    category: payload.category,
    visibility: payload.visibility,
    icon: payload.icon,
    accent,
    lastUpdated: '刚刚',
  };

  const detail: InsightTopicDetail = {
    ...templateDetail,
    id,
    report: {
      ...templateDetail.report,
      generatedAt: formatDateSlash(new Date()),
    },
    history: [
      {
        id: `h-${id}`,
        title: '第1次研究',
        time: `${formatDateSlash(new Date())} 00:00:00`,
        summary: '已完成 · 更新8个维度 · 新增10条来源 · 共19条互动',
      },
    ],
  };

  const storedTopics = getStoredInsightTopics();
  saveStoredInsightTopics([summary, ...storedTopics]);

  const storedDetails = getStoredInsightTopicDetails();
  saveStoredInsightTopicDetails({ ...storedDetails, [id]: detail });

  return summary;
}
