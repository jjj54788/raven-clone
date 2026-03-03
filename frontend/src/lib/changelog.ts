export type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking';

export interface ReleaseChange {
  type: ChangeType;
  en: string;
  zh: string;
}

export interface ReleaseNote {
  version: string; // e.g. "v0.4.3"
  date: string; // e.g. "2026-02-14"
  latest?: boolean;
  changes: ReleaseChange[];
}

// Keep newest first. This is a lightweight, editable data source.
export const RELEASES: ReleaseNote[] = [
  {
    version: 'v1.4.9',
    date: '2026-03-03',
    latest: true,
    changes: [
      {
        type: 'fix',
        en: 'AI Ask: fixed Claude Haiku 4.5 model ID mismatch — user-provided keys now correctly use the dated model ID (claude-haiku-4-5-20251001) required by Anthropic\'s API',
        zh: 'AI 对话：修复 Claude Haiku 4.5 模型 ID 不匹配问题 — 用户自定义密钥现在正确使用 Anthropic API 所需的带日期模型 ID（claude-haiku-4-5-20251001）',
      },
      {
        type: 'improvement',
        en: 'AI Ask: invalid API key errors now show clear actionable guidance ("Claude: Invalid API key. Please check your key in Profile → API Keys") instead of raw JSON',
        zh: 'AI 对话：API 密钥错误现在显示清晰的操作指引（"Claude: 无效的 API 密钥，请在个人资料 → API 密钥中检查"），而不是原始 JSON',
      },
    ],
  },
  {
    version: 'v1.4.8',
    date: '2026-03-03',
    latest: false,
    changes: [
      {
        type: 'fix',
        en: 'Claude API: support both standard API keys (sk-ant-...) and Claude Code OAuth tokens (from `claude setup-token`) for Anthropic authentication',
        zh: 'Claude API：同时支持标准 API 密钥（sk-ant-...）和 Claude Code OAuth Token（通过 `claude setup-token` 生成）进行 Anthropic 认证',
      },
    ],
  },
  {
    version: 'v1.4.7',
    date: '2026-03-03',
    changes: [
      {
        type: 'fix',
        en: 'Todos: calendar overview now shows prominent task count badges per day',
        zh: 'AI 待办：日历总览现在以醒目的紫色徽章显示每日任务数量',
      },
      {
        type: 'fix',
        en: 'AI Insights: fix route ordering bug — GET /health-check was shadowed by GET /:id wildcard, causing 404 on health checks',
        zh: 'AI 洞察：修复路由顺序 Bug — GET /health-check 被 GET /:id 通配符遮蔽导致 404',
      },
      {
        type: 'feature',
        en: 'AI Insights: Cancel Research button — stop a running research job at any time from the Research tab',
        zh: 'AI 洞察：新增「终止」按钮 — 研究进行中可随时终止当前任务',
      },
      {
        type: 'improvement',
        en: 'AI Insights: Markdown export now calls the backend endpoint for consistent server-side generation',
        zh: 'AI 洞察：Markdown 导出改为调用后端接口，与服务端数据保持一致',
      },
    ],
  },
  {
    version: 'v1.4.6',
    date: '2026-02-28',
    changes: [
      {
        type: 'feature',
        en: 'AI Insights: interactive 3-step research wizard — choose models, AI team plans directions via discussion, user confirms before running research',
        zh: 'AI 洞察：全新3步研究向导 — 选择模型组建团队 → AI 团队讨论规划方向 → 用户确认后启动深度研究，告别硬编码配置',
      },
      {
        type: 'feature',
        en: 'AI Insights: auto-save selected AI team and confirmed directions to DB before research starts',
        zh: 'AI 洞察：启动研究前自动保存选定的 AI 团队配置和确认的研究方向到数据库',
      },
      {
        type: 'improvement',
        en: 'AI Insights: backend planning discussion endpoint generates model-specific agent names and roles',
        zh: 'AI 洞察：新增规划讨论接口，根据选定模型自动生成专属角色名称与职责分工',
      },
    ],
  },
  {
    version: 'v1.4.5',
    date: '2026-03-03',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Store: add multi-dimensional AI capability evaluation (context, creativity, quality, multimodal, safety) with grade badge for all store items',
        zh: 'AI 商店：商品详情页新增 5 维 AI 能力评估（上下文理解/创意表现/输出质量/多模态/安全可靠）+ 综合等级徽章',
      },
    ],
  },
  {
    version: 'v1.4.4',
    date: '2026-03-03',
    changes: [
      {
        type: 'improvement',
        en: 'AI Store: fix dark-mode readability in trial-notes section; add typical usage examples to store item detail page',
        zh: 'AI 商店：修复暗色模式下使用体验区域文字不可读问题；商品详情页新增「典型使用」示例板块',
      },
    ],
  },
  {
    version: 'v1.4.3',
    date: '2026-03-03',
    changes: [
      {
        type: 'feature',
        en: 'Expanded AI model catalog with 20+ mainstream Chinese & American models — new providers: xAI (Grok), Zhipu (GLM), Moonshot (Kimi), Yi, Stepfun, Doubao; expanded OpenAI, Anthropic, Google, Qwen lineups',
        zh: 'AI 模型目录大幅扩充至 20+ 款中美主流模型——新增 xAI (Grok)、智谱 (GLM)、月之暗面 (Kimi)、零一万物、阶跃星辰、豆包；扩充 OpenAI、Anthropic、Google、通义千问系列',
      },
    ],
  },
  {
    version: 'v1.4.2',
    date: '2026-03-03',
    changes: [
      {
        type: 'improvement',
        en: 'Removed AI Writing placeholder from sidebar — feature deprioritized to reduce navigation clutter',
        zh: '移除侧边栏 AI 写作占位入口——功能暂缓，精简导航',
      },
    ],
  },
  {
    version: 'v1.4.1',
    date: '2026-03-03',
    changes: [
      {
        type: 'improvement',
        en: 'Chat UI: AI messages now render directly on the background without a card bubble — cleaner reading experience matching Claude / ChatGPT style',
        zh: 'Chat UI：AI 回复去掉气泡卡片，直接渲染在背景上——对标 Claude / ChatGPT 的阅读体验',
      },
      {
        type: 'improvement',
        en: 'Chat input: removed hard separator line between textarea and toolbar; unified container with elevated shadow and purple focus glow',
        zh: '输入框：去掉工具栏分隔线，统一容器；增强阴影 + 紫色焦点光晕',
      },
      {
        type: 'improvement',
        en: 'Welcome screen: added 4 suggested prompt chips (Analyze / Write / Research / Brainstorm) below the input, adapts to UI language',
        zh: '欢迎界面：输入框下方新增 4 个快捷提示卡（分析/写作/研究/头脑风暴），随界面语言切换',
      },
      {
        type: 'improvement',
        en: 'Background color warmed from #FAFAFA to #FAF9F7 — subtle warmth consistent with premium AI product aesthetics',
        zh: '背景色从 #FAFAFA 调暖至 #FAF9F7——与主流 AI 产品审美一致的米白底色',
      },
      {
        type: 'improvement',
        en: 'Model selector dropdown in chat input now uses frosted glass surface with spring animation on open',
        zh: '聊天输入框模型选择下拉菜单改为毛玻璃表面，打开时带弹性动画',
      },
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'Frostland — survival game: build a settlement, manage resources, and survive the endless winter',
        zh: '无尽冬日 — 生存游戏：建设定居点、管理资源，在无尽严寒中求生',
      },
      {
        type: 'feature',
        en: 'Frostland: 10 building types, temperature system, population & morale management',
        zh: '无尽冬日：10种建筑类型、温度系统、人口与士气管理',
      },
      {
        type: 'feature',
        en: 'Frostland: 10 random events with meaningful choices, 3 difficulty levels',
        zh: '无尽冬日：10个随机事件与抉择、3个难度等级',
      },
      {
        type: 'feature',
        en: 'Frostland: Cloud save/load, autosave every 5 days, global leaderboard',
        zh: '无尽冬日：云存档/读档、每5天自动存档、全球排行榜',
      },
    ],
  },
  {
    version: 'v1.3.4',
    date: '2026-02-28',
    changes: [
      {
        type: 'feature',
        en: 'AI Insights: Quick Mode — skip AI planner and 3-round debate, get insights in ~90s vs 5min',
        zh: 'AI 洞察：快速洞察模式 — 跳过规划和辩论阶段，约90秒即可获得洞察（深度研究约5分钟）',
      },
      {
        type: 'feature',
        en: 'AI Insights: Conclusion card — key findings and executive summary highlighted above research tabs',
        zh: 'AI 洞察：结论卡片 — 关键发现与执行摘要在研究标签上方突出显示',
      },
      {
        type: 'feature',
        en: 'AI Insights: Debate visualization — toggle between timeline and side-by-side proposer/critic views',
        zh: 'AI 洞察：辩论可视化 — 切换时间线视图与立论方/驳论方双列视图',
      },
      {
        type: 'feature',
        en: 'AI Insights: Follow-up chat — ask questions about research results directly in the Report tab',
        zh: 'AI 洞察：追问功能 — 在报告标签直接对研究结论进行追问',
      },
      {
        type: 'feature',
        en: 'AI Insights: AI direction suggestions — AI proposes 6-8 focused research directions when editing',
        zh: 'AI 洞察：AI 方向建议 — 编辑研究方向时，AI 自动提出6-8个具体可执行方向',
      },
      {
        type: 'feature',
        en: 'AI Insights: Public share links — generate shareable URLs for completed research reports',
        zh: 'AI 洞察：公开分享链接 — 为已完成的研究报告生成可分享的公开链接',
      },
      {
        type: 'feature',
        en: 'AI Insights: Topic comparison — select two topics to get an AI-generated similarities/differences analysis',
        zh: 'AI 洞察：课题对比 — 选择两个课题，AI 自动分析相似点、差异点并给出综合建议',
      },
      {
        type: 'improvement',
        en: 'AI Insights: Tab layout simplified from 7 → 4 (Research, Collaboration, Report, Sources)',
        zh: 'AI 洞察：标签布局精简为4个（研究、协作、报告、来源）',
      },
      {
        type: 'improvement',
        en: 'AI Insights: Auto-reconnect SSE stream on page refresh when research is in progress',
        zh: 'AI 洞察：研究进行中刷新页面时自动重连 SSE 流，进度不再丢失',
      },
      {
        type: 'fix',
        en: 'AI Insights: Credibility scores now use real data (confidence, authority, coverage) instead of hardcoded values',
        zh: 'AI 洞察：可信度评分使用真实数据（置信度、权威度、覆盖率）计算，不再使用固定值',
      },
    ],
  },
  {
    version: 'v1.3.3',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Ask: Expanded model support — Groq (Llama 3.3 70B, Llama 3.1 8B), Qwen (Plus, Turbo), and Anthropic Claude (Sonnet 4.6, Haiku 4.5) now available',
        zh: 'AI 问答：新增模型支持 — Groq（Llama 3.3 70B、Llama 3.1 8B）、通义千问（Plus、Turbo）、Anthropic Claude（Sonnet 4.6、Haiku 4.5）',
      },
      {
        type: 'feature',
        en: 'AI Ask: Mix Mode — toggle "Mix" to query all available models in parallel, view side-by-side answers, and get an AI-synthesized comparison with consensus, disagreements, and final recommendation',
        zh: 'AI 问答：Mix 模式 — 开启「Mix」可同时询问所有模型，并排查看回答，AI 自动综合分析共识、分歧和最终建议',
      },
      {
        type: 'feature',
        en: 'AI Ask: Mix synthesis powered by Meta-Judge pattern — strongest model analyzes all answers to find agreements, unique insights, and conflicts',
        zh: 'AI 问答：Mix 综合分析采用 Meta-Judge 模式 — 最强模型分析所有回答，提取共识、独特见解和冲突点',
      },
      {
        type: 'improvement',
        en: 'Chat input now shows provider-specific icons for all 6 providers (OpenAI, DeepSeek, Google, Groq, Qwen, Anthropic)',
        zh: '聊天输入框为 6 个 AI 提供商显示专属图标（OpenAI、DeepSeek、Google、Groq、通义千问、Anthropic）',
      },
    ],
  },
  {
    version: 'v1.3.2',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Research — Evidence Check tab now shows per-agent logic rankings and argument breakdowns derived from debate messages',
        zh: 'AI 研究 — 观点分析标签页现显示每位 Agent 的逻辑论证排名与论点细节',
      },
      {
        type: 'feature',
        en: 'AI Research — Research Ideas tab groups contributions by innovation score (high / moderate / standard tiers)',
        zh: 'AI 研究 — 创意研究标签页按创新得分分级展示各 Agent 的创意贡献',
      },
    ],
  },
  {
    version: 'v1.3.1',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'UI polish: frosted glass sidebar + user menu (backdrop-blur), spring easing curves across all animations',
        zh: 'UI 精细化：侧边栏及用户菜单毛玻璃效果（backdrop-blur）、全局弹性动画曲线',
      },
      {
        type: 'improvement',
        en: 'Skeleton loaders replace plain "Loading..." text on AI Research page — content-shaped placeholders with shimmer animation',
        zh: 'AI 研究页面以骨架屏取代纯文字加载态，内容形状占位符配合闪光动画',
      },
      {
        type: 'improvement',
        en: 'Chat message action buttons (Copy / Quote / Save) now fade in on hover with a subtle upward float — no longer always visible',
        zh: '对话消息操作按钮（复制/引用/保存）改为悬停时淡入上浮，不再常驻显示',
      },
      {
        type: 'improvement',
        en: 'Create Research modal now opens with a spring scale animation and frosted glass surface; overlay fades in independently',
        zh: '新建研究弹窗采用弹性缩放动画入场、毛玻璃表面；遮罩层独立淡入',
      },
      {
        type: 'improvement',
        en: 'Global button press feedback: all buttons scale to 0.97 on active state for tactile feel',
        zh: '全局按钮点击反馈：按下时缩放至 0.97，模拟实体按键质感',
      },
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Insights D3: Contradiction Detection — research pipeline automatically identifies logical contradictions between analysis directions after Stage 2, marks contested claims, and surfaces conflicts in the References tab with severity ratings (high/medium/low)',
        zh: 'AI 洞察 D3：矛盾检测 — 研究流程在阶段 2 完成后自动识别各方向间的逻辑矛盾，标记存疑论断，并在参考文献标签页展示冲突详情（高/中/低严重级别）',
      },
      {
        type: 'feature',
        en: 'AI Insights D3: Live SSE streaming — contradiction cards appear in real time during research and persist to DB via InsightClaim.contestedBy field',
        zh: 'AI 洞察 D3：实时 SSE 流式更新 — 研究中矛盾卡片实时呈现，研究完成后持久化至 InsightClaim.contestedBy 字段',
      },
      {
        type: 'improvement',
        en: 'AI Insights: Claim cards now highlight contested status (amber border + ⚡ label) when cross-direction contradictions are detected',
        zh: 'AI 洞察：论断卡片在被跨方向矛盾标记时，以琥珀色边框 + ⚡ 标签突出显示争议状态',
      },
    ],
  },
  {
    version: 'v1.2.5',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'Calendar overview: each day cell now shows condensed task title chips with colored dots, replacing the plain rose bar',
        zh: '日历总览：每天格子内略缩显示任务名称与彩色标记，替代原有粗线条指示',
      },
    ],
  },
  {
    version: 'v1.2.4',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'Teams: new "Tasks" tab on team detail page — shared team task list backed by a dedicated todo list',
        zh: '团队详情页新增「任务」标签页 — 团队共享任务列表，自动创建专属待办列表',
      },
      {
        type: 'feature',
        en: 'Teams Tasks: quick-add task input with Enter key support and one-click completion toggle',
        zh: '团队任务：快速新建任务（支持回车）及一键切换完成状态',
      },
      {
        type: 'feature',
        en: 'Teams Tasks: AI Decompose — describe a team goal and AI breaks it into actionable tasks assigned to the team list',
        zh: '团队任务：AI 拆解目标 — 输入团队目标，AI 自动分解并添加到团队任务列表',
      },
    ],
  },
  {
    version: 'v1.2.3',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Store: GitHub Trending tab — auto-tracks the most active AI open-source repos daily with stars, weekly growth, and activity indicators',
        zh: 'AI Store 新增「GitHub 热门」标签页 — 每日自动追踪最活跃的 AI 开源项目，含 Star 数、本周增长和活跃度指标',
      },
      {
        type: 'feature',
        en: 'GitHub trending repo detail page with AI-generated Chinese summary, key features, use cases, and multi-dimension evaluation score (A/B/C/D grade)',
        zh: 'GitHub 热门项目详情页：AI 生成中文介绍、核心功能、适用场景，以及活跃度/社区/成长性/文档四维评估分',
      },
      {
        type: 'improvement',
        en: 'AI Store curated items now show live GitHub star counts and weekly growth badges when available',
        zh: 'AI Store 精选工具卡片新增实时 GitHub Star 数和本周增长 Badge',
      },
      {
        type: 'improvement',
        en: 'AI Store item detail page now shows a GitHub stats sidebar (stars, forks, last commit date) when the item has a linked repo',
        zh: 'AI Store 工具详情页在有关联 GitHub 仓库时，侧栏展示 Star/Fork/最近提交等数据',
      },
    ],
  },
  {
    version: 'v1.2.2',
    date: '2026-02-28',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'AI Todo: due date picker added to task drawer — set, change, or clear due dates directly',
        zh: 'AI 待办：任务详情栏新增截止日期选择器，可直接设置、修改或清除日期',
      },
      {
        type: 'improvement',
        en: 'AI Todo: task cards now show due date badges — red for overdue, amber for today, subtle for future dates',
        zh: 'AI 待办：任务卡片新增截止日期 Badge — 逾期红色、今日琥珀、未来低调灰',
      },
      {
        type: 'improvement',
        en: 'AI Todo: recurring task indicator moved to meta badge row for cleaner task card layout',
        zh: 'AI 待办：重复任务标识移至 Badge 行，任务卡片布局更整洁',
      },
      {
        type: 'feature',
        en: 'AI Todo: new "✨ AI Decompose" button — describe a goal and AI automatically breaks it into tasks with subtasks and suggested due dates',
        zh: 'AI 待办：新增「✨ AI 任务拆解」功能 — 输入目标，AI 自动拆解为带子任务和截止日期的执行计划',
      },
      {
        type: 'feature',
        en: 'Knowledge ↔ Todo integration: link any knowledge note to a task in the task drawer; create tasks directly from My Library with one click',
        zh: '知识库 ↔ 待办联动：任务详情栏可关联知识笔记；我的知识库一键生成关联待办任务',
      },
      {
        type: 'feature',
        en: 'AI Smart Scheduling: "✨ AI Focus" button AI-ranks today\'s tasks by urgency and importance with one-line rationale for each',
        zh: 'AI 智能调度：「✨ AI 专注」按钮 — AI 按紧迫度和重要性智能排序今日任务，每条附带简短理由',
      },
      {
        type: 'improvement',
        en: 'Pomodoro timer now supports binding a specific task — select which task you\'re focusing on before starting the timer',
        zh: 'Pomodoro 专注计时器支持绑定任务 — 开始前选择当前专注的任务',
      },
    ],
  },
  {
    version: 'v1.2.1',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'Brand rename: the platform is now officially named 格物 (Gewu) — reflecting its mission of deep investigation and knowledge synthesis',
        zh: '品牌更名：平台正式命名为「格物」，寓意格物致知，深度探索与知识融合',
      },
      {
        type: 'improvement',
        en: 'New logo: geometric grid mark (representing 格) with amber knowledge focus cell, replacing the previous placeholder icon',
        zh: '全新 Logo：以几何格网为标志（象征「格」字），右上格以金色高亮代表知识聚焦',
      },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'D1: Structural Analysis Frameworks — Planner Agent auto-selects PEST / SWOT+Porter / TRL / Policy Window based on topic type; each direction agent receives a specific framework dimension for targeted analysis',
        zh: 'D1：结构化分析框架 — Planner Agent 根据课题类型自动选择 PEST / SWOT+Porter / TRL / 政策窗口框架；每个方向智能体获得精准的框架维度指令',
      },
      {
        type: 'feature',
        en: 'D2: Claim-Level Evidence Chain — direction agents now output structured claims (statement + confidence + sourceQuery); claims saved to DB and displayed in References tab',
        zh: 'D2：论断级证据链 — 方向智能体输出结构化论断（论断内容 + 置信度 + 来源关键词）；论断持久化到数据库并在引用来源标签页展示',
      },
      {
        type: 'feature',
        en: 'F1: Expert-in-the-Loop — research pipeline can pause after any stage (1/2/3); paused sessions show expert review panel; "Continue Research" resumes with optional user notes injected as planner context',
        zh: 'F1：专家介入循环 — 研究流水线可在任意阶段（1/2/3）后暂停；暂停后显示专家审核面板；「继续研究」可附带专家批注注入 Planner 上下文',
      },
      {
        type: 'improvement',
        en: 'D1: Framework dimension context embedded in ReAct prompt — agents get structured guidance matching their assigned dimension for deeper, more focused analysis',
        zh: 'D1：框架维度上下文注入 ReAct 提示词 — 智能体获得与所分配维度精确匹配的结构化指令，分析更深入、更聚焦',
      },
      {
        type: 'improvement',
        en: 'DB schema: added InsightClaim table (D2) and PAUSED enum value for InsightResearchStatus (F1)',
        zh: '数据库 Schema：新增 InsightClaim 表（D2）及 InsightResearchStatus 的 PAUSED 枚举值（F1）',
      },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'Teams module: full backend integration — teams, members, and assistants now persist in PostgreSQL instead of localStorage',
        zh: '团队模块：完整后端集成 — 团队、成员和 AI 助手现在持久化到 PostgreSQL，不再依赖 localStorage',
      },
      {
        type: 'feature',
        en: 'Teams: invite team members by email directly from the team detail page',
        zh: '团队：在团队详情页通过邮箱邀请新成员',
      },
      {
        type: 'feature',
        en: 'Teams: dynamic AI assistant catalog — models sourced live from backend /ai/models endpoint, no more fake model IDs',
        zh: '团队：动态 AI 助手目录 — 模型实时来自后端 /ai/models 接口，不再使用虚假模型 ID',
      },
      {
        type: 'feature',
        en: 'Teams schema extended: goal, status (ACTIVE/PAUSED/ARCHIVED), canvasJson, and per-assistant iconText/accent/asStatus fields',
        zh: '团队 Schema 扩展：新增 goal、status（ACTIVE/PAUSED/ARCHIVED）、canvasJson，以及助手的 iconText/accent/asStatus 字段',
      },
      {
        type: 'improvement',
        en: 'Teams: canvas layout changes now persist to the database on drag',
        zh: '团队：拖动画布后布局变化实时保存到数据库',
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Insights Phase B: Planner Agent in Stage 1 generates a structured JSON research plan, intelligently assigning agents to directions with custom approach hints',
        zh: 'AI 洞察 Phase B：Stage 1 引入 Planner Agent，生成结构化 JSON 研究计划，为每个方向智能分配智能体并提供研究方法指引',
      },
      {
        type: 'feature',
        en: 'AI Insights Phase B: DB checkpoint persistence — each completed stage is saved to InsightResearchSession.checkpoints, enabling automatic resume from the last completed stage on error',
        zh: 'AI 洞察 Phase B：DB 检查点持久化，每个阶段完成后保存到数据库，研究中断后可自动从断点续研',
      },
      {
        type: 'feature',
        en: 'AI Insights Phase C1: ReAct capability — each direction agent can call [WEB_SEARCH] or [KB_SEARCH] tools in a think-act-observe loop (up to 3 steps) before finalizing JSON analysis',
        zh: 'AI 洞察 Phase C1：ReAct 能力，每个方向智能体可在最终输出 JSON 前通过 think-act-observe 循环调用工具（最多 3 步）',
      },
      {
        type: 'feature',
        en: 'AI Insights Phase C2: Knowledge base RAG — user knowledge notes are semantically searched and injected as context before each direction analysis',
        zh: 'AI 洞察 Phase C2：知识库 RAG 集成，每次方向分析前语义搜索用户知识库，将相关笔记作为上下文注入',
      },
      {
        type: 'feature',
        en: 'AI Insights Phase C3: Dynamic plan adjustment — if overall confidence < 60% after Stage 2, Planner re-reads results and generates revised agent assignments; low-quality directions are re-analyzed',
        zh: 'AI 洞察 Phase C3：动态计划调整，Stage 2 整体置信度低于 60% 时 Planner 重新规划，低质量方向被重新分析',
      },
      {
        type: 'improvement',
        en: 'AI Insights: "Resume Research" button appears for interrupted runs with saved checkpoints; resumeResearch i18n key added',
        zh: 'AI 洞察：中断研究且有检查点时显示"断点续研"按钮',
      },
      {
        type: 'improvement',
        en: 'AI Insights: ReAct steps count shown in direction-analyzed discussion entries; replan events styled with replan icon',
        zh: 'AI 洞察：方向分析讨论条目显示 ReAct 调用次数；重规划事件以专属图标展示',
      },
    ],
  },
  {
    version: 'v0.9.2',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Store: expanded curated catalog from 8 to 42 tools and skills across all categories (chat, image, code, research, writing, video/audio, productivity, developer frameworks)',
        zh: 'AI 商店：策划工具目录从 8 个扩展至 42 个，覆盖聊天助手、图像生成、代码开发、搜索研究、写作内容、视频音频、效率工具及开发者框架等全部分类',
      },
      {
        type: 'feature',
        en: 'AI Store: new item detail page (/ai-store/[id]) with full description, trial notes, recommend reasons, categories, tags, and related tools grid',
        zh: 'AI 商店：新增工具详情页（/ai-store/[id]），展示完整描述、使用体验、推荐理由、分类标签及相关工具推荐',
      },
      {
        type: 'feature',
        en: 'AI Store: bookmark/favorites feature — save tools with one click, toggle saved filter, and bookmark state persists via backend API',
        zh: 'AI 商店：收藏/书签功能，一键收藏工具，支持已收藏筛选，收藏状态同步至后端数据库',
      },
      {
        type: 'feature',
        en: 'AI Store: AI-powered "For You" recommendations based on recent chat history, with fallback to featured items',
        zh: 'AI 商店：基于用户 AI 对话历史的个性化"为你推荐"功能，无历史时降级显示精选工具',
      },
    ],
  },
  {
    version: 'v0.9.1',
    date: '2026-02-27',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'OpenClaw WeChat Hub: new Monitor tab with real-time bot status, Agent Network org-chart visualization, and recent notes feed',
        zh: 'OpenClaw 微信中心：新增监控标签页，支持 Bot 实时状态、Agent 网络可视化（组织图）与最近笔记动态',
      },
      {
        type: 'feature',
        en: 'OpenClaw: one-click startup script (start-wechat.ps1) and .env.example for WeChat bot deployment',
        zh: 'OpenClaw：一键启动脚本（start-wechat.ps1）与微信机器人部署环境变量模板',
      },
      {
        type: 'feature',
        en: 'Backend: new JWT-authenticated /api/v1/openclaw/bridge-status endpoint for dashboard status polling',
        zh: '后端：新增 JWT 认证的 /api/v1/openclaw/bridge-status 端点，供监控面板轮询桥接状态',
      },
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Todo: DB-backed subtasks, task colors, and repeat rules (daily/weekly/monthly) with auto-recurrence',
        zh: 'AI 待办：子任务、任务颜色、重复规则（每天/每周/每月）已同步至服务端，支持自动循环创建',
      },
      {
        type: 'feature',
        en: 'AI Todo: batch operations — select multiple tasks and mark done, mark todo, or delete',
        zh: 'AI 待办：批量操作——多选任务后可标记完成、标记待办或删除',
      },
      {
        type: 'feature',
        en: 'AI Todo: auto-postpone overdue tasks to today on page load',
        zh: 'AI 待办：页面加载时自动将逾期任务延期到今天',
      },
      {
        type: 'feature',
        en: 'AI Todo: AI-powered weekly/monthly summary with task stats and productivity insights',
        zh: 'AI 待办：AI 周报/月报总结，含任务统计与效率建议',
      },
      {
        type: 'feature',
        en: 'AI Todo: countdown timer with browser notification on completion',
        zh: 'AI 待办：倒计时器，计时结束时推送浏览器通知',
      },
      {
        type: 'feature',
        en: 'AI Todo: CSV and plain-text export formats alongside existing Markdown export',
        zh: 'AI 待办：新增 CSV 与纯文本导出格式（在已有 Markdown 导出基础上）',
      },
      {
        type: 'improvement',
        en: 'AI Insights: Markdown and PDF export for insight reports',
        zh: 'AI 洞察：洞察报告支持导出为 Markdown 和 PDF',
      },
      {
        type: 'improvement',
        en: 'AI Insights: full i18n extraction — all page text moved to en/zh.json under aiInsights.* namespace',
        zh: 'AI 洞察：完成全站 i18n 提取，所有页面文本已迁移至 en/zh.json 的 aiInsights.* 命名空间',
      },
    ],
  },
  {
    version: 'v0.8.1',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'Profile > API Keys: add custom models per provider — models appear in the chat model selector',
        zh: '个人中心 > API Keys：支持为每个服务商添加自定义模型，模型将出现在对话模型选择器中',
      },
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Insights: 4-stage multi-agent deep research with real-time SSE streaming',
        zh: 'AI 洞察：4 阶段多 Agent 深度研究，SSE 实时推流展示阶段进度与讨论',
      },
      {
        type: 'feature',
        en: 'AI Insights: optional Tavily web search integration for evidence collection',
        zh: 'AI 洞察：集成 Tavily 网络搜索，支持实时引用来源收集',
      },
      {
        type: 'feature',
        en: 'AI Insights: credibility score auto-calculated from references after research',
        zh: 'AI 洞察：研究完成后基于参考文献自动计算可信度评分',
      },
      {
        type: 'feature',
        en: 'AI Insights: Markdown export for insight reports',
        zh: 'AI 洞察：洞察报告支持一键导出为 Markdown 文件',
      },
    ],
  },
  {
    version: 'v0.7.0',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'feature',
        en: 'AI Insights: full backend persistence (PostgreSQL + NestJS) replacing localStorage',
        zh: 'AI 洞察：使用 PostgreSQL + NestJS 后端持久化，替换 localStorage 临时存储',
      },
      {
        type: 'feature',
        en: 'AI Insights: team / AI-team / tasks / directions now save to database',
        zh: 'AI 洞察：研究团队、AI 团队、任务列表、研究方向均已持久化到数据库',
      },
      {
        type: 'feature',
        en: 'AI Insights: collaboration event log auto-records every change operation',
        zh: 'AI 洞察：协作动态标签页自动记录每次变更操作日志',
      },
    ],
  },
  {
    version: 'v0.6.5',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'Remove redundant Native AI Chat page — AI Ask covers the same functionality',
        zh: '移除重复的原生AI问答模块，AI问答已覆盖相同功能',
      },
    ],
  },
  {
    version: 'v0.6.4',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'Remove ChatKit (OpenAI beta) — Native AI Chat now runs on the self-hosted backend',
        zh: '移除 ChatKit（OpenAI Beta）— 原生AI问答改为使用自建后端，无需第三方 Workflow 配置',
      },
    ],
  },
  {
    version: 'v0.6.3',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'fix',
        en: 'Message save failures now surface a toast warning instead of silently discarding',
        zh: '消息保存失败时前端显示警告提示，不再静默丢失',
      },
      {
        type: 'fix',
        en: 'Credits are now deducted only after a successful AI response, not on failed requests',
        zh: '积分仅在 AI 成功响应后扣除，失败请求不再扣分',
      },
      {
        type: 'fix',
        en: 'Web search errors now return a proper HTTP error instead of being silently injected into the AI prompt',
        zh: '联网搜索失败时返回明确错误，不再注入 AI 提示词',
      },
      {
        type: 'improvement',
        en: 'Gemini now streams responses chunk-by-chunk like other models',
        zh: 'Gemini 现在支持逐字流式输出，与其他模型一致',
      },
      {
        type: 'feature',
        en: 'Chat sessions can now be renamed via the pencil icon in the history sidebar',
        zh: '聊天记录支持重命名（点击历史侧边栏的铅笔图标）',
      },
      {
        type: 'improvement',
        en: 'AI context window limit raised from 50 to 100 messages (configurable via AI_CONTEXT_MSG_LIMIT)',
        zh: 'AI 上下文消息数上限从 50 提升至 100（可通过 AI_CONTEXT_MSG_LIMIT 配置）',
      },
    ],
  },
  {
    version: 'v0.6.2',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'Remove AISE Workflow feature and sidebar entry',
        zh: '移除 AISE 工作流功能及侧边栏入口',
      },
    ],
  },
  {
    version: 'v0.6.1',
    date: '2026-02-26',
    latest: false,
    changes: [
      {
        type: 'improvement',
        en: 'start.ps1: skip git pull when working tree has uncommitted changes',
        zh: '启动脚本：工作区有未提交改动时自动跳过 git pull，避免中断',
      },
      {
        type: 'improvement',
        en: 'start.ps1: smart pnpm install — skip if node_modules is already up-to-date',
        zh: '启动脚本：node_modules 未变化时跳过 pnpm install，加快启动速度',
      },
      {
        type: 'improvement',
        en: 'start.ps1: smart prisma generate — skip if schema.prisma has not changed',
        zh: '启动脚本：schema.prisma 未变化时跳过 prisma generate',
      },
      {
        type: 'fix',
        en: 'start.ps1: switch from prisma db push to prisma migrate deploy (respects migration files)',
        zh: '启动脚本：将 prisma db push 改为 prisma migrate deploy，正确应用迁移文件',
      },
      {
        type: 'improvement',
        en: 'start.ps1: auto-copy backend/.env from .env.example if missing',
        zh: '启动脚本：backend/.env 不存在时自动从 .env.example 复制',
      },
      {
        type: 'improvement',
        en: 'start.ps1: backend readiness now checked via HTTP GET /health instead of TCP port',
        zh: '启动脚本：后端就绪检测改为 HTTP /health 接口，更准确反映 NestJS 完全启动',
      },
      {
        type: 'feature',
        en: 'Backend: add GET /health endpoint for startup readiness probing',
        zh: '后端：新增 GET /health 接口，供启动脚本和监控探活使用',
      },
    ],
  },
  {
    version: 'v0.6.0',
    date: '2026-02-26',
    changes: [
      {
        type: 'feature',
        en: 'Knowledge base RAG: vector embeddings, semantic search with cosine similarity',
        zh: '知识库 RAG：向量化嵌入 + 余弦相似度语义搜索',
      },
      {
        type: 'feature',
        en: 'My Library RAG UI: per-note embed status badge, keyword/semantic search toggle, score display',
        zh: '知识库 RAG UI：笔记向量化状态徽章、关键词/语义搜索切换、相关度分数展示',
      },
      {
        type: 'feature',
        en: 'Teams backend module: full CRUD for teams, members, AI assistants, and missions',
        zh: '新增 Teams 后端模块：团队、成员、AI 助手、任务的完整 CRUD',
      },
      {
        type: 'feature',
        en: 'Knowledge notes CRUD: create, update, and delete notes via API',
        zh: '知识笔记 CRUD：支持通过 API 创建、编辑、删除笔记',
      },
      {
        type: 'feature',
        en: 'Stateless JWT refresh token: silent auto-refresh on 401 with request queuing',
        zh: '无状态 JWT 刷新令牌：401 时静默自动刷新，并发请求自动排队',
      },
      {
        type: 'improvement',
        en: 'Unified API response envelope { success, data, meta } with auto-unwrap on frontend',
        zh: '统一 API 响应格式 { success, data, meta }，前端自动解包',
      },
      {
        type: 'improvement',
        en: 'api.ts: 30s timeout, structured error handling, and res.ok validation',
        zh: 'api.ts：新增 30 秒超时、结构化错误处理与 res.ok 校验',
      },
      {
        type: 'fix',
        en: 'CORS: replace wildcard with configurable origin whitelist via CORS_ORIGINS env',
        zh: '安全修复：CORS 由全开放改为 CORS_ORIGINS 环境变量白名单',
      },
      {
        type: 'fix',
        en: 'JwtAuthGuard: verify user still exists in DB before allowing request',
        zh: '安全修复：JwtAuthGuard 在允许请求前校验用户是否仍存在于数据库',
      },
      {
        type: 'fix',
        en: 'API base URL now reads from NEXT_PUBLIC_API_BASE env var instead of being hardcoded',
        zh: '修复 API 基础地址硬编码问题，改为读取 NEXT_PUBLIC_API_BASE 环境变量',
      },
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-02-15',
    changes: [
      {
        type: 'feature',
        en: 'Bring your own AI API keys for chat',
        zh: '\u652f\u6301\u81ea\u5e26 AI Key \u8fdb\u884c\u5bf9\u8bdd',
      },
      {
        type: 'improvement',
        en: 'Add global dark mode synced to profile settings',
        zh: '\u65b0\u589e\u5168\u5c40\u6697\u8272\u6a21\u5f0f\uff0c\u5e76\u4e0e\u4e2a\u4eba\u8bbe\u7f6e\u540c\u6b65',
      },
      {
        type: 'feature',
        en: 'Introduce integration connect flows for Notion, Google Drive, and Feishu',
        zh: '\u65b0\u589e Notion / Google Drive / \u98de\u4e66\u96c6\u6210\u8fde\u63a5',
      },
      {
        type: 'improvement',
        en: 'Add YouTube Explore RSS fallback and sample data notice',
        zh: 'YouTube \u63a2\u7d22\u652f\u6301 RSS \u964d\u7ea7\u4e0e\u793a\u4f8b\u6570\u636e\u63d0\u793a',
      },
      {
        type: 'fix',
        en: 'Fix todo date filtering across week/month views',
        zh: '\u4fee\u590d\u5f85\u529e\u5728\u5468/\u6708\u89c6\u56fe\u4e2d\u7684\u65e5\u671f\u7b5b\u9009\u504f\u5dee',
      },
      {
        type: 'feature',
        en: 'Add colors, reminders, and subtasks for Todos',
        zh: '\u65b0\u589e\u5f85\u529e\u989c\u8272\u3001\u63d0\u9192\u4e0e\u5b50\u4efb\u52a1',
      },
      {
        type: 'improvement',
        en: 'Persist richer explore bookmarks in My Library',
        zh: '\u652f\u6301\u4fdd\u5b58\u66f4\u4e30\u5bcc\u7684\u6536\u85cf\u4fe1\u606f\uff0c\u5e76\u5728\u6211\u7684\u8d44\u6599\u5e93\u4e2d\u5c55\u793a',
      },
    ],
  },
  {
    version: 'v0.4.4',
    date: '2026-02-15',
    changes: [
      {
        type: 'feature',
        en: 'Add admin console and AI Todos/Store experiences',
        zh: '新增管理员后台、AI 待办与 AI 商店体验',
      },
      {
        type: 'improvement',
        en: 'Add daily check-in reminder with signed-in syncing',
        zh: '新增每日打卡提醒，并在登录后支持同步',
      },
      {
        type: 'improvement',
        en: 'Improve one-click dev start reliability on Windows',
        zh: '优化 Windows 一键启动脚本稳定性',
      },
    ],
  },
  {
    version: 'v0.4.3',
    date: '2026-02-14',
    changes: [
      {
        type: 'feature',
        en: 'Add Google Sign-In via Firebase Authentication',
        zh: '新增 Google 登录（Firebase Authentication）',
      },
      {
        type: 'improvement',
        en: 'Polish welcome footer quote rotation and themes',
        zh: '优化欢迎页底部名言轮播与主题背景',
      },
      {
        type: 'feature',
        en: 'Introduce Notifications and What’s New pages',
        zh: '新增 通知 与 更新日志 页面',
      },
    ],
  },
  {
    version: 'v0.4.2',
    date: '2026-02-10',
    changes: [
      {
        type: 'feature',
        en: 'Add SSE streaming chat UI',
        zh: '新增 SSE 流式对话 UI',
      },
      {
        type: 'fix',
        en: 'Improve session restore logic for chat history',
        zh: '修复聊天记录恢复的稳定性问题',
      },
    ],
  },
  {
    version: 'v0.4.1',
    date: '2026-02-01',
    changes: [
      {
        type: 'feature',
        en: 'Multi-provider model selector (OpenAI/DeepSeek/Gemini)',
        zh: '新增多供应商模型选择（OpenAI/DeepSeek/Gemini）',
      },
      {
        type: 'improvement',
        en: 'Refine sidebar layout and i18n toggling',
        zh: '优化侧边栏布局与中英切换体验',
      },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0]?.version ?? 'v0.0.0';

export function countChangesByType(releases: ReleaseNote[]) {
  const totals: Record<ChangeType, number> = {
    feature: 0,
    fix: 0,
    improvement: 0,
    breaking: 0,
  };

  for (const r of releases) {
    for (const c of r.changes) {
      totals[c.type] += 1;
    }
  }

  return totals;
}
