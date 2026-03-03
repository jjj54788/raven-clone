'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  Crown,
  Download,
  ExternalLink,
  FileText,
  History,
  Info,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import type {
  AiTeamMember,
  CollaborationEvent,
  CredibilityMetric,
  DeepResearchDiscussion,
  DeepResearchStage,
  DirectionSuggestion,
  InsightClaim,
  InsightContradiction,
  InsightTopicDetail,
  ReferenceItem,
  ResearchDirection,
  ResearchMember,
  ResearchTask,
} from '@/lib/ai-insights-data';
import {
  cancelInsightResearch,
  createInsightShareLink,
  exportInsightMarkdown,
  followupInsightStream,
  getInsightDetail,
  getInsightResearchStatus,
  getModels,
  getToken,
  resumeInsightResearch,
  runInsightPlan,
  startInsightResearch,
  streamInsightResearch,
  suggestInsightDirections,
  updateInsightTeam,
  updateInsightAiTeam,
  updateInsightTasks,
  updateInsightDirections,
} from '@/lib/api';

type TabKey = 'research' | 'collaboration' | 'report' | 'sources';

type TabItem = {
  key: TabKey;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
};

const TEAM_STATUS_OPTIONS: Array<{ value: ResearchMember['status']; label: string }> = [
  { value: 'leader', label: 'Leader' },
  { value: 'active', label: '工作中' },
  { value: 'done', label: '已完成' },
  { value: 'pending', label: '待研究' },
];

const DIRECTION_STATUS_OPTIONS: Array<ResearchDirection['status']> = ['完成', '进行中', '待研究'];

const AI_STATUS_OPTIONS: Array<AiTeamMember['status']> = ['空闲', '工作中', '离线'];

function statusDot(status: ResearchMember['status']): string {
  switch (status) {
    case 'leader':
      return 'bg-purple-500';
    case 'active':
      return 'bg-blue-500';
    case 'done':
      return 'bg-emerald-500';
    default:
      return 'bg-gray-300';
  }
}

function aiStatusDot(status: AiTeamMember['status']): string {
  switch (status) {
    case '空闲':
      return 'bg-emerald-500';
    case '工作中':
      return 'bg-blue-500';
    default:
      return 'bg-gray-300';
  }
}

function statusBadge(status: ResearchTask['status']): string {
  switch (status) {
    case '已完成':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case '进行中':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-100';
  }
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const safe = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative h-16 w-16 rounded-full"
      style={{ background: `conic-gradient(${color} ${safe}%, #E5E7EB 0)` }}
    >
      <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-700">
        {score}
      </div>
    </div>
  );
}

function Stars({ count }: { count?: number }) {
  const safe = Math.max(0, Math.min(5, count || 0));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < safe ? 'text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  );
}

function DirectionRow({
  item,
  editable,
  onChange,
  onRemove,
}: {
  item: ResearchDirection;
  editable?: boolean;
  onChange?: (next: ResearchDirection) => void;
  onRemove?: () => void;
}) {
  if (editable) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
        <input
          value={item.title}
          onChange={(e) => onChange?.({ ...item, title: e.target.value })}
          className="min-w-[160px] flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        <select
          value={item.status}
          onChange={(e) => onChange?.({ ...item, status: e.target.value as ResearchDirection['status'] })}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
        >
          {DIRECTION_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            删除
          </button>
        ) : null}
      </div>
    );
  }

  const viewClassName = item.status === '完成'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : item.status === '进行中'
      ? 'border-blue-100 bg-blue-50 text-blue-700'
      : 'border-gray-200 bg-gray-50 text-gray-600';

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${viewClassName}`}>
      <span className="truncate">{item.title}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{item.status}</span>
    </div>
  );
}

function TeamMemberRow({
  member,
  editable,
  onChange,
  onRemove,
}: {
  member: ResearchMember;
  editable?: boolean;
  onChange?: (next: ResearchMember) => void;
  onRemove?: () => void;
}) {
  if (editable) {
    return (
      <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.6fr_auto] items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600">
        <input
          value={member.name}
          onChange={(e) => onChange?.({ ...member, name: e.target.value })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        <input
          value={member.role}
          onChange={(e) => onChange?.({ ...member, role: e.target.value })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        <select
          value={member.status}
          onChange={(e) => onChange?.({ ...member, status: e.target.value as ResearchMember['status'] })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
        >
          {TEAM_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={Number.isFinite(member.tasks) ? member.tasks : 0}
          onChange={(e) => onChange?.({ ...member, tasks: Number(e.target.value || 0) })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            删除
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.6fr_auto] items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs text-gray-500">
      <span className="font-medium text-gray-700">{member.name}</span>
      <span className="text-gray-500">{member.role}</span>
      <span className="inline-flex items-center gap-1 text-gray-500">
        <span className={`h-2 w-2 rounded-full ${statusDot(member.status)}`} />
        {TEAM_STATUS_OPTIONS.find((option) => option.value === member.status)?.label ?? member.status}
      </span>
      <span className="text-right text-gray-400">{member.tasks}</span>
      <span />
    </div>
  );
}

function AiTeamRow({
  member,
  editable,
  onChange,
  onRemove,
}: {
  member: AiTeamMember;
  editable?: boolean;
  onChange?: (next: AiTeamMember) => void;
  onRemove?: () => void;
}) {
  if (editable) {
    return (
      <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_auto] items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600">
        <input
          value={member.name}
          onChange={(e) => onChange?.({ ...member, name: e.target.value })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        <input
          value={member.role}
          onChange={(e) => onChange?.({ ...member, role: e.target.value })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        <input
          value={member.model}
          onChange={(e) => onChange?.({ ...member, model: e.target.value })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
        />
        <select
          value={member.status}
          onChange={(e) => onChange?.({ ...member, status: e.target.value as AiTeamMember['status'] })}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
        >
          {AI_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            删除
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_auto] items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs text-gray-500">
      <span className="font-medium text-gray-700">{member.name}</span>
      <span className="text-gray-500">{member.role}</span>
      <span className="text-gray-500">{member.model}</span>
      <span className="inline-flex items-center gap-1 text-gray-500">
        <span className={`h-2 w-2 rounded-full ${aiStatusDot(member.status)}`} />
        {member.status}
      </span>
      <span />
    </div>
  );
}

function TaskRow({
  task,
  editable,
  aiTeam,
  onChange,
  onRemove,
}: {
  task: ResearchTask;
  editable?: boolean;
  aiTeam: AiTeamMember[];
  onChange?: (next: ResearchTask) => void;
  onRemove?: () => void;
}) {
  const aiNames = useMemo(() => aiTeam.map((member) => member.name), [aiTeam]);
  const aiModels = useMemo(
    () => Array.from(new Set(aiTeam.map((member) => member.model).filter(Boolean))),
    [aiTeam],
  );

  return (
    <tr className="border-b border-gray-100 last:border-none">
      <td className="px-4 py-3 text-sm text-gray-400">{task.id}</td>
      <td className="px-4 py-3">
        {editable ? (
          <div className="space-y-2">
            <input
              value={task.title}
              onChange={(e) => onChange?.({ ...task, title: e.target.value })}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-purple-300"
            />
            <input
              value={task.subtitle || ''}
              onChange={(e) => onChange?.({ ...task, subtitle: e.target.value })}
              placeholder="补充说明"
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 outline-none focus:border-purple-300"
            />
          </div>
        ) : (
          <>
            <div className="text-sm font-semibold text-gray-900">{task.title}</div>
            {task.subtitle ? <div className="text-xs text-gray-400">{task.subtitle}</div> : null}
          </>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {editable ? (
          <select
            value={task.owner}
            onChange={(e) => {
              const nextOwner = e.target.value;
              const matched = aiTeam.find((member) => member.name === nextOwner);
              onChange?.({
                ...task,
                owner: nextOwner,
                model: matched?.model || task.model,
              });
            }}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
          >
            <option value="">请选择</option>
            {aiNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          task.owner
        )}
      </td>
      <td className="px-4 py-3">
        {editable ? (
          <select
            value={task.model}
            onChange={(e) => onChange?.({ ...task, model: e.target.value })}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
          >
            <option value="">请选择</option>
            {aiModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
            {task.model}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {editable ? (
          <select
            value={task.status}
            onChange={(e) => onChange?.({ ...task, status: e.target.value as ResearchTask['status'] })}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
          >
            <option value="已完成">已完成</option>
            <option value="进行中">进行中</option>
            <option value="待开始">待开始</option>
          </select>
        ) : (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(task.status)}`}>
            {task.status}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {editable && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            删除
          </button>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}

function CollaborationCard({ event }: { event: CollaborationEvent }) {
  const meta = event.type === 'warning'
    ? { bg: 'bg-amber-50', border: 'border-amber-200', icon: <Info size={16} className="text-amber-500" /> }
    : event.type === 'success'
      ? { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 size={16} className="text-emerald-600" /> }
      : { bg: 'bg-blue-50', border: 'border-blue-200', icon: <MessageCircle size={16} className="text-blue-600" /> };

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} px-4 py-3 text-sm text-gray-700`}>
      <div className="flex items-start gap-2">
        {meta.icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-gray-800">{event.title}</p>
            <span className="text-xs text-gray-400">{event.time}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{event.detail}</p>
          <p className="mt-1 text-xs text-gray-400">{event.actor}</p>
        </div>
      </div>
    </div>
  );
}

function CredibilityMetricCard({ metric }: { metric: CredibilityMetric }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <ScoreRing score={metric.score} color={metric.color} />
      <div className="text-center text-xs text-gray-500">
        <div className="font-semibold text-gray-700">{metric.label}</div>
        <Stars count={metric.rating} />
      </div>
    </div>
  );
}

function ReferenceCard({ item }: { item: ReferenceItem }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="rounded-md bg-purple-50 px-2 py-0.5 font-semibold text-purple-600">[{item.id}]</span>
            <span className="text-gray-500">{item.domain}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">{item.title}</h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{item.score}%</span>
          <button type="button" className="text-xs text-purple-600 hover:text-purple-700">
            打开原文
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        {item.tag ? <span className="rounded-full bg-gray-100 px-2 py-0.5">{item.tag}</span> : null}
        <span>被引用 1 次</span>
      </div>
    </div>
  );
}
function buildTeamNodes(team: ResearchMember[]) {
  const leader = team.find((m) => m.status === 'leader') || team[0];
  const others = team.filter((m) => m.id !== leader?.id);
  const positions = [
    { x: 20, y: 25 },
    { x: 80, y: 25 },
    { x: 15, y: 70 },
    { x: 50, y: 80 },
    { x: 85, y: 70 },
  ];

  return {
    leader,
    nodes: others.slice(0, positions.length).map((member, index) => ({
      member,
      ...positions[index],
    })),
  };
}

function buildAiTeamNodes(team: AiTeamMember[]) {
  const leader = team.find((m) => m.isLeader) || team[0];
  const others = team.filter((m) => m.id !== leader?.id);
  const positions = [
    { x: 20, y: 25 },
    { x: 80, y: 25 },
    { x: 15, y: 70 },
    { x: 50, y: 80 },
    { x: 85, y: 70 },
  ];

  return {
    leader,
    nodes: others.slice(0, positions.length).map((member, index) => ({
      member,
      ...positions[index],
    })),
  };
}

function DeepResearchStageRow({ stage }: { stage: DeepResearchStage }) {
  const statusColor = stage.status === '已完成'
    ? 'text-emerald-600'
    : stage.status === '进行中'
      ? 'text-blue-600'
      : 'text-gray-400';
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-700">{stage.title}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">{stage.summary}</div>
        </div>
        <span className={`rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold ${statusColor}`}>
          {stage.status}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${stage.progress}%` }} />
      </div>
    </div>
  );
}

function DeepResearchDiscussionCard({ item }: { item: DeepResearchDiscussion }) {
  const meta = item.type === 'decision'
    ? { bg: 'bg-emerald-50', border: 'border-emerald-200', tag: '决策', text: 'text-emerald-700' }
    : item.type === 'question'
      ? { bg: 'bg-amber-50', border: 'border-amber-200', tag: '问题', text: 'text-amber-700' }
      : { bg: 'bg-blue-50', border: 'border-blue-200', tag: '洞察', text: 'text-blue-700' };

  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} px-3 py-2 text-xs text-gray-700`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className={`rounded-full bg-white px-2 py-0.5 font-semibold ${meta.text}`}>{meta.tag}</span>
          <span className="font-medium text-gray-700">{item.agent}</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-400">{item.model}</span>
        </div>
        <span className="text-[10px] text-gray-400">{item.time}</span>
      </div>
      <div className="mt-1 text-sm text-gray-700">{item.content}</div>
    </div>
  );
}

export default function AiInsightsTopicPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('research');

  const params = useParams<{ topicId?: string | string[] }>();
  const rawTopicId = params?.topicId;
  const topicId = Array.isArray(rawTopicId) ? rawTopicId[0] : rawTopicId;

  const [detail, setDetail] = useState<(InsightTopicDetail & { researchStatus?: string }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<ResearchMember[]>([]);
  const [teamDraft, setTeamDraft] = useState<ResearchMember[]>([]);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [aiTeam, setAiTeam] = useState<AiTeamMember[]>([]);
  const [aiTeamDraft, setAiTeamDraft] = useState<AiTeamMember[]>([]);
  const [isEditingAiTeam, setIsEditingAiTeam] = useState(false);
  const [directions, setDirections] = useState<ResearchDirection[]>([]);
  const [directionsDraft, setDirectionsDraft] = useState<ResearchDirection[]>([]);
  const [isEditingDirections, setIsEditingDirections] = useState(false);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [tasksDraft, setTasksDraft] = useState<ResearchTask[]>([]);
  const [isEditingTasks, setIsEditingTasks] = useState(false);

  const [isResearching, setIsResearching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);         // Phase F1
  const [pauseMessage, setPauseMessage] = useState<string | null>(null);  // Phase F1
  const [canResume, setCanResume] = useState(false);

  // Research launch modal state (P0)
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchOpts, setResearchOpts] = useState<{ useWebSearch: boolean; pauseAfterStages: number[]; quickMode: boolean }>({
    useWebSearch: false,
    pauseAfterStages: [],
    quickMode: false,
  });

  // B1: Conclusion card
  const [conclusionExpanded, setConclusionExpanded] = useState(false);

  // B2: Debate view mode
  const [debateViewMode, setDebateViewMode] = useState<'debate' | 'timeline'>('timeline');

  // B3: Follow-up chat
  const [followupQuestion, setFollowupQuestion] = useState('');
  const [followupAnswer, setFollowupAnswer] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);

  // A2: Direction suggestions
  const [directionSuggestLoading, setDirectionSuggestLoading] = useState(false);
  const [directionSuggestions, setDirectionSuggestions] = useState<DirectionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // D3: Share
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Plan wizard
  const [planStep, setPlanStep] = useState<'models' | 'planning' | 'directions'>('models');
  const [planModels, setPlanModels] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [planModelsLoading, setPlanModelsLoading] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<{
    directions: string[];
    summary: string;
    teamSetup: Array<{ name: string; role: string; model: string; isLeader: boolean; focus: string; status: string }>;
  } | null>(null);
  const [planDirections, setPlanDirections] = useState<string[]>([]);
  const [researchProgress, setResearchProgress] = useState(0);
  const [liveStages, setLiveStages] = useState<DeepResearchStage[]>([]);
  const [liveDiscussions, setLiveDiscussions] = useState<DeepResearchDiscussion[]>([]);
  const [liveContradictions, setLiveContradictions] = useState<InsightContradiction[]>([]);  // Phase D3
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [qualityGateAlert, setQualityGateAlert] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  // C3: Check status and auto-reconnect SSE if RUNNING
  useEffect(() => {
    if (!topicId) return;
    getInsightResearchStatus(topicId)
      .then((s) => {
        setCanResume(s.canResume ?? false);
        if (s.status === 'PAUSED') {
          setIsPaused(true);
          setPauseMessage('研究已暂停，等待专家确认后继续');
        } else if (s.status === 'RUNNING') {
          // Auto-reconnect
          setIsResearching(true);
          const token = getToken() ?? '';
          const es = streamInsightResearch(topicId, token);
          esRef.current = es;
          es.addEventListener('stage-start', (e: Event) => {
            const data = JSON.parse((e as MessageEvent).data);
            setLiveStages((prev) => {
              const exists = prev.some((st) => st.id === `stage-${data.stage}`);
              if (exists) return prev.map((st) => st.id === `stage-${data.stage}` ? { ...st, status: '进行中' as const, progress: 0 } : st);
              return [...prev, { id: `stage-${data.stage}`, title: data.title, owner: '', summary: '', status: '进行中' as const, progress: 0 }];
            });
          });
          es.addEventListener('stage-complete', (e: Event) => {
            const data = JSON.parse((e as MessageEvent).data);
            setLiveStages((prev) => prev.map((st) => st.id === `stage-${data.stage}` ? { ...st, status: '已完成' as const, progress: 100 } : st));
            setResearchProgress(data.stage * 25);
          });
          es.addEventListener('direction-analyzed', (e: Event) => {
            const data = JSON.parse((e as MessageEvent).data);
            setLiveDiscussions((prev) => [...prev, { id: `dir-${Date.now()}`, agent: data.agent ?? '', model: '', type: 'insight' as const, content: `[🔍 ${data.direction}] ${data.content}`, time: new Date().toLocaleTimeString() }]);
          });
          es.addEventListener('debate-round', (e: Event) => {
            const data = JSON.parse((e as MessageEvent).data);
            if (data.type === 'thinking') return;
            const typeMap: Record<string, DeepResearchDiscussion['type']> = { proposition: 'decision', critique: 'question', rebuttal: 'insight' };
            setLiveDiscussions((prev) => [...prev, { id: `debate-${Date.now()}`, agent: data.agent ?? '', model: '', type: typeMap[data.type] ?? 'insight', content: `[辩论 Round ${data.round}] ${data.content}`, time: new Date().toLocaleTimeString() }]);
          });
          es.addEventListener('research-complete', () => {
            setIsResearching(false);
            setResearchProgress(100);
            esRef.current?.close(); esRef.current = null;
            getInsightDetail(topicId).then((d) => { setDetail(d); setLiveStages([]); setLiveDiscussions([]); }).catch(() => {});
          });
          es.addEventListener('error', () => {
            setIsResearching(false);
            esRef.current?.close(); esRef.current = null;
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  useEffect(() => {
    if (!topicId) return;
    setDetailLoading(true);
    getInsightDetail(topicId)
      .then((d) => {
        setDetail(d);
        setTeamMembers(d.team);
        setTeamDraft(d.team);
        setAiTeam(d.aiTeam);
        setAiTeamDraft(d.aiTeam);
        setDirections(d.directions);
        setDirectionsDraft(d.directions);
        setTasks(d.tasks);
        setTasksDraft(d.tasks);
        setIsEditingTeam(false);
        setIsEditingAiTeam(false);
        setIsEditingDirections(false);
        setIsEditingTasks(false);
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [topicId]);

  const activeTeam = isEditingTeam ? teamDraft : teamMembers;
  const activeAiTeam = isEditingAiTeam ? aiTeamDraft : aiTeam;
  const activeDirections = isEditingDirections ? directionsDraft : directions;
  const activeTasks = isEditingTasks ? tasksDraft : tasks;
  const tasksTotal = Math.max(detail?.tasksTotal ?? 0, activeTasks.length);
  const deepResearch = detail?.deepResearch ?? { stages: [], discussions: [], outputs: { executiveSummary: '', keyFindings: [], opportunities: [], risks: [], openQuestions: [], actionItems: [], consensus: '', dissent: [], chapters: [] } };
  const tabs = useMemo<TabItem[]>(
    () => [
      { key: 'research', label: t('aiInsights.tabResearch'), icon: Sparkles },
      { key: 'collaboration', label: t('aiInsights.tabCollab'), icon: MessageCircle },
      { key: 'report', label: t('aiInsights.tabReport'), icon: FileText },
      { key: 'sources', label: t('aiInsights.tabSources'), icon: Search },
    ],
    [t],
  );

  const uiText = useMemo(() => ({
    teamTitle: t('aiInsights.teamTitle'),
    progressLabel: t('aiInsights.progressLabel'),
    stageLabel: t('aiInsights.stageLabel'),
    editHint: t('aiInsights.editHint'),
    editingHint: t('aiInsights.editingHint'),
    teamEdit: t('aiInsights.teamEdit'),
    teamSave: t('aiInsights.teamSave'),
    teamCancel: t('aiInsights.teamCancel'),
    teamAdd: t('aiInsights.teamAdd'),
    aiTeamTitle: t('aiInsights.aiTeamTitle'),
    aiTeamEdit: t('aiInsights.aiTeamEdit'),
    aiTeamAdd: t('aiInsights.aiTeamAdd'),
    directionTitle: t('aiInsights.directionTitle'),
    directionEdit: t('aiInsights.directionEdit'),
    directionAdd: t('aiInsights.directionAdd'),
    directionSave: t('aiInsights.directionSave'),
    directionCancel: t('aiInsights.directionCancel'),
    tasksTitle: t('aiInsights.tasksTitle'),
    dialogTitle: t('aiInsights.dialogTitle'),
    dialogPlaceholder: t('aiInsights.dialogPlaceholder'),
    deepResearchTitle: t('aiInsights.deepResearchTitle'),
    deepResearchSubtitle: t('aiInsights.deepResearchSubtitle'),
    deepResearchAgents: t('aiInsights.deepResearchAgents'),
    deepResearchFlow: t('aiInsights.deepResearchFlow'),
    deepResearchDiscussion: t('aiInsights.deepResearchDiscussion'),
    deepResearchOutputs: t('aiInsights.deepResearchOutputs'),
    deepResearchStructure: t('aiInsights.deepResearchStructure'),
    deepResearchConsensus: t('aiInsights.deepResearchConsensus'),
    deepResearchDissent: t('aiInsights.deepResearchDissent'),
    deepResearchKeyFindings: t('aiInsights.deepResearchKeyFindings'),
    deepResearchOpportunities: t('aiInsights.deepResearchOpportunities'),
    deepResearchRisks: t('aiInsights.deepResearchRisks'),
    deepResearchOpenQuestions: t('aiInsights.deepResearchOpenQuestions'),
    deepResearchActionItems: t('aiInsights.deepResearchActionItems'),
    deepResearchChapters: t('aiInsights.deepResearchChapters'),
    deepResearchEvidence: t('aiInsights.deepResearchEvidence'),
    collaborationTitle: t('aiInsights.collaborationTitle'),
    collaborationCount: t('aiInsights.collaborationCount'),
    reportGenerated: t('aiInsights.reportGenerated'),
    executiveSummary: t('aiInsights.executiveSummary'),
    toc: t('aiInsights.toc'),
    historyTitle: t('aiInsights.historyTitle'),
    credibilityTitle: t('aiInsights.credibilityTitle'),
    sourceEval: t('aiInsights.sourceEval'),
    timeliness: t('aiInsights.timeliness'),
    coverage: t('aiInsights.coverage'),
    quality: t('aiInsights.quality'),
    limitation: t('aiInsights.limitation'),
  }), [t]);

  const updateTeamMember = (index: number, next: ResearchMember) => {
    setTeamDraft((prev) => {
      const updated = prev.map((member, i) => (i === index ? next : member));
      if (next.status === 'leader') {
        return updated.map((member, i) => {
          if (i === index) return member;
          return member.status === 'leader' ? { ...member, status: 'active' } : member;
        });
      }
      return updated;
    });
  };

  const handleTeamAdd = () => {
    setTeamDraft((prev) => ([
      ...prev,
      {
        id: `member-${Date.now()}`,
        name: '新成员',
        role: '研究员',
        status: 'pending',
        tasks: 0,
      },
    ]));
  };

  const handleTeamRemove = (id: string) => {
    setTeamDraft((prev) => {
      const next = prev.filter((member) => member.id !== id);
      if (next.length > 0 && !next.some((member) => member.status === 'leader')) {
        next[0] = { ...next[0], status: 'leader' };
      }
      return next;
    });
  };

  const handleTeamSave = async () => {
    if (topicId) await updateInsightTeam(topicId, teamDraft).catch(() => {});
    setTeamMembers(teamDraft);
    setIsEditingTeam(false);
  };

  const handleTeamCancel = () => {
    setTeamDraft(teamMembers);
    setIsEditingTeam(false);
  };

  const updateAiTeamMember = (index: number, next: AiTeamMember) => {
    setAiTeamDraft((prev) => prev.map((member, i) => (i === index ? next : member)));
  };

  const handleAiTeamAdd = () => {
    setAiTeamDraft((prev) => ([
      ...prev,
      {
        id: `ai-${Date.now()}`,
        name: 'new_agent',
        role: '新角色',
        model: 'gpt-5.1',
        status: '空闲',
      },
    ]));
  };

  const handleAiTeamRemove = (id: string) => {
    setAiTeamDraft((prev) => prev.filter((member) => member.id !== id));
  };

  const handleAiTeamSave = async () => {
    if (topicId) await updateInsightAiTeam(topicId, aiTeamDraft).catch(() => {});
    setAiTeam(aiTeamDraft);
    setIsEditingAiTeam(false);
  };

  const handleAiTeamCancel = () => {
    setAiTeamDraft(aiTeam);
    setIsEditingAiTeam(false);
  };

  const updateDirection = (index: number, next: ResearchDirection) => {
    setDirectionsDraft((prev) => prev.map((item, i) => (i === index ? next : item)));
  };

  const handleDirectionAdd = () => {
    setDirectionsDraft((prev) => ([...prev, { title: '新方向', status: '待研究' }]));
  };

  const handleDirectionRemove = (index: number) => {
    setDirectionsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDirectionSave = async () => {
    if (topicId) await updateInsightDirections(topicId, directionsDraft).catch(() => {});
    setDirections(directionsDraft);
    setIsEditingDirections(false);
  };

  const handleDirectionCancel = () => {
    setDirectionsDraft(directions);
    setIsEditingDirections(false);
  };

  const updateTask = (index: number, next: ResearchTask) => {
    setTasksDraft((prev) => prev.map((task, i) => (i === index ? next : task)));
  };

  const handleTaskAdd = () => {
    setTasksDraft((prev) => {
      const fallbackAgent = aiTeamDraft[0];
      return ([
        ...prev,
        {
          id: String(prev.length + 1),
          title: '研究：新任务',
          subtitle: '',
          owner: fallbackAgent?.name || '',
          model: fallbackAgent?.model || '',
          status: '待开始',
        },
      ]);
    });
  };

  const handleTaskRemove = (index: number) => {
    setTasksDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTaskSave = async () => {
    if (topicId) await updateInsightTasks(topicId, tasksDraft).catch(() => {});
    setTasks(tasksDraft);
    setIsEditingTasks(false);
  };

  const handleTaskCancel = () => {
    setTasksDraft(tasks);
    setIsEditingTasks(false);
  };

  const handleRunResearch = () => {
    if (!topicId || isResearching) return;
    // Reset wizard state
    setPlanStep('models');
    setSelectedModelIds([]);
    setPlanResult(null);
    setPlanDirections([]);
    // Load available models
    setPlanModelsLoading(true);
    getModels()
      .then((data) => setPlanModels(Array.isArray(data) ? data : []))
      .catch(() => setPlanModels([]))
      .finally(() => setPlanModelsLoading(false));
    setShowResearchModal(true);
  };

  const handleStartPlan = async () => {
    if (!topicId || planLoading || selectedModelIds.length === 0) return;
    setPlanStep('planning');
    setPlanLoading(true);
    try {
      const result = await runInsightPlan(topicId, selectedModelIds);
      setPlanResult(result);
      setPlanDirections(result.directions);
      setPlanStep('directions');
    } catch {
      setPlanStep('models');
    } finally {
      setPlanLoading(false);
    }
  };

  const doStartResearch = async () => {
    if (!topicId || isResearching) return;
    setShowResearchModal(false);
    setIsResearching(true);
    setResearchProgress(0);
    setLiveStages([]);
    setLiveDiscussions([]);
    setLiveContradictions([]);  // Phase D3: reset on new research run

    // Save AI team from plan result (if plan wizard was used)
    if (planResult?.teamSetup && planResult.teamSetup.length > 0) {
      const aiTeamPayload = planResult.teamSetup.map((m, idx) => ({
        id: `agent-${idx}-${Date.now()}`,
        name: m.name,
        role: m.role,
        model: m.model,
        status: '空闲' as const,
        isLeader: m.isLeader,
        focus: m.focus,
      }));
      await updateInsightAiTeam(topicId, aiTeamPayload).catch(() => {});
      setAiTeam(aiTeamPayload);
      setAiTeamDraft(aiTeamPayload);
    }

    // Save confirmed directions from plan (if plan wizard was used)
    if (planDirections.length > 0) {
      const dirsPayload = planDirections.map((d) => ({ title: d, status: '待研究' as const }));
      await updateInsightDirections(topicId, dirsPayload).catch(() => {});
      setDirections(dirsPayload);
      setDirectionsDraft(dirsPayload);
    }

    try {
      await startInsightResearch(topicId, {
        useWebSearch: researchOpts.useWebSearch,
        pauseAfterStages: researchOpts.pauseAfterStages,
        quickMode: researchOpts.quickMode,
      });
    } catch {
      setIsResearching(false);
      return;
    }

    const token = getToken() ?? '';
    const es = streamInsightResearch(topicId, token);
    esRef.current = es;

    es.addEventListener('stage-start', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setLiveStages((prev) => {
        const exists = prev.some((s) => s.id === `stage-${data.stage}`);
        if (exists) return prev.map((s) => s.id === `stage-${data.stage}` ? { ...s, status: '进行中', progress: 0 } : s);
        return [...prev, { id: `stage-${data.stage}`, title: data.title, owner: '', summary: '', status: '进行中' as const, progress: 0 }];
      });
    });

    es.addEventListener('stage-complete', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setLiveStages((prev) => prev.map((s) => s.id === `stage-${data.stage}` ? { ...s, status: '已完成', progress: 100 } : s));
      setResearchProgress(data.stage * 25);
      setAgentThinking(null);
    });

    // Phase A2/A3/C1: direction-analyzed includes confidence + ReAct steps
    es.addEventListener('direction-analyzed', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      const pct = data.confidence != null ? ` (${Math.round(data.confidence * 100)}%)` : '';
      const tag = data.isReplan ? '🔁 重规划' : data.isRetry ? '🔄 补强' : '🔍 分析';
      const steps = data.reactSteps != null && data.reactSteps > 1 ? ` [ReAct×${data.reactSteps}]` : '';
      setLiveDiscussions((prev) => [...prev, {
        id: `dir-${Date.now()}-${prev.length}`,
        agent: data.agent ?? data.agentName ?? '',
        model: '',
        type: 'insight' as DeepResearchDiscussion['type'],
        content: `[${tag} · ${data.direction}${pct}${steps}] ${data.content}`,
        time: new Date().toLocaleTimeString(),
      }]);
      setAgentThinking(null);
    });

    // Phase A1: Real debate rounds — proposition / critique / rebuttal
    es.addEventListener('debate-round', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.type === 'thinking') {
        setAgentThinking(`${data.agent} 正在思考…`);
        return;
      }
      const typeMap: Record<string, DeepResearchDiscussion['type']> = {
        proposition: 'decision',
        critique: 'question',
        rebuttal: 'insight',
      };
      setLiveDiscussions((prev) => [...prev, {
        id: `debate-${data.round}-${Date.now()}`,
        agent: data.agent ?? '',
        model: '',
        type: typeMap[data.type] ?? 'insight',
        content: `[辩论 Round ${data.round} · ${data.type === 'proposition' ? '立论' : data.type === 'critique' ? '质疑' : '修订'}] ${data.content}`,
        time: new Date().toLocaleTimeString(),
      }]);
      setAgentThinking(null);
    });

    // Phase A3 + C3: Quality gate + dynamic replan alert
    es.addEventListener('quality-gate', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      const icon = data.replan ? '🔁' : '⚠️';
      const alertMsg = data.message ?? '正在对低置信度方向补充检索…';
      setQualityGateAlert(alertMsg);
      setLiveDiscussions((prev) => [...prev, {
        id: `qg-${Date.now()}`,
        agent: data.replan ? 'Planner (动态调整)' : 'Quality Gate',
        model: '',
        type: 'question' as DeepResearchDiscussion['type'],
        content: `${icon} ${alertMsg}`,
        time: new Date().toLocaleTimeString(),
      }]);
    });

    es.addEventListener('agent-thinking', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      const dir = data.direction ? ` · ${data.direction}` : '';
      const suffix = data.replan ? ' (重规划)' : data.isRetry ? ' (补强)' : '';
      setAgentThinking(`${data.agent ?? 'Agent'} 正在分析${dir}${suffix}…`);
    });

    // Phase F1: Pause event — show expert review panel
    es.addEventListener('research-paused', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setIsResearching(false);
      setIsPaused(true);
      setPauseMessage(data.message ?? '研究已暂停，等待专家介入');
      setAgentThinking(null);
      setQualityGateAlert(null);
      esRef.current?.close();
      esRef.current = null;
      setLiveDiscussions((prev) => [...prev, {
        id: `pause-${Date.now()}`,
        agent: 'System',
        model: '',
        type: 'question' as DeepResearchDiscussion['type'],
        content: `⏸️ ${data.message ?? '研究已暂停'}${data.claimsCount != null ? ` · ${data.claimsCount} 个论断待审核` : ''}`,
        time: new Date().toLocaleTimeString(),
      }]);
    });

    es.addEventListener('research-resumed', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setIsPaused(false);
      setPauseMessage(null);
      setIsResearching(true);
      setLiveDiscussions((prev) => [...prev, {
        id: `resume-${Date.now()}`,
        agent: 'System',
        model: '',
        type: 'decision' as DeepResearchDiscussion['type'],
        content: `▶️ 研究已恢复，从第 ${data.fromStage} 阶段继续${data.hasUserNotes ? '（包含专家批注）' : ''}`,
        time: new Date().toLocaleTimeString(),
      }]);
    });

    // Phase D3: Contradiction detected during analysis
    es.addEventListener('contradiction-detected', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data) as InsightContradiction;
      setLiveContradictions((prev) => [...prev, data]);
      setLiveDiscussions((prev) => [...prev, {
        id: `contradiction-${Date.now()}`,
        agent: 'ContradictionDetector',
        model: '',
        type: 'question' as DeepResearchDiscussion['type'],
        content: `⚡ 矛盾检测 [${data.severity?.toUpperCase()}] ${data.direction1} vs ${data.direction2}：${data.description}`,
        time: new Date().toLocaleTimeString(),
      }]);
    });

    es.addEventListener('research-complete', () => {
      setIsResearching(false);
      setIsPaused(false);
      setPauseMessage(null);
      setResearchProgress(100);
      setAgentThinking(null);
      setQualityGateAlert(null);
      esRef.current?.close();
      esRef.current = null;
      if (topicId) {
        getInsightDetail(topicId).then((d) => {
          setDetail(d);
          setTeamMembers(d.team);
          setTeamDraft(d.team);
          setAiTeam(d.aiTeam);
          setAiTeamDraft(d.aiTeam);
          setDirections(d.directions);
          setDirectionsDraft(d.directions);
          setTasks(d.tasks);
          setTasksDraft(d.tasks);
          setLiveStages([]);
          setLiveDiscussions([]);
        }).catch(() => {});
      }
    });

    es.addEventListener('error', () => {
      setIsResearching(false);
      setAgentThinking(null);
      setQualityGateAlert(null);
      esRef.current?.close();
      esRef.current = null;
    });
  };

  const handleCancelResearch = async () => {
    if (!topicId) return;
    try {
      await cancelInsightResearch(topicId);
    } catch { /* ignore */ }
    setIsResearching(false);
    setIsPaused(false);
    setPauseMessage(null);
    setAgentThinking(null);
    esRef.current?.close();
    esRef.current = null;
  };

  // Phase F1: Expert resume handler
  const handleResumeAfterPause = async (userNotes?: string) => {
    if (!topicId || isResearching) return;
    setIsResearching(true);
    setIsPaused(false);
    setPauseMessage(null);

    try {
      await resumeInsightResearch(topicId, { userNotes });
    } catch {
      setIsResearching(false);
      setIsPaused(true);
      return;
    }

    const token = getToken() ?? '';
    const es = streamInsightResearch(topicId, token);
    esRef.current = es;

    es.addEventListener('stage-start', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setLiveStages((prev) => {
        const exists = prev.some((s) => s.id === `stage-${data.stage}`);
        if (exists) return prev.map((s) => s.id === `stage-${data.stage}` ? { ...s, status: '进行中', progress: 0 } : s);
        return [...prev, { id: `stage-${data.stage}`, title: data.title, owner: '', summary: '', status: '进行中' as const, progress: 0 }];
      });
    });
    es.addEventListener('stage-complete', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setLiveStages((prev) => prev.map((s) => s.id === `stage-${data.stage}` ? { ...s, status: '已完成', progress: 100 } : s));
      setResearchProgress(data.stage * 25);
      setAgentThinking(null);
    });
    es.addEventListener('direction-analyzed', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      const pct = data.confidence != null ? ` (${Math.round(data.confidence * 100)}%)` : '';
      const tag = data.isReplan ? '🔁 重规划' : data.isRetry ? '🔄 补强' : '🔍 分析';
      const steps = data.reactSteps != null && data.reactSteps > 1 ? ` [ReAct×${data.reactSteps}]` : '';
      setLiveDiscussions((prev) => [...prev, {
        id: `dir-${Date.now()}-${prev.length}`,
        agent: data.agent ?? '',
        model: '',
        type: 'insight' as DeepResearchDiscussion['type'],
        content: `[${tag} · ${data.direction}${pct}${steps}] ${data.content}`,
        time: new Date().toLocaleTimeString(),
      }]);
      setAgentThinking(null);
    });
    es.addEventListener('debate-round', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.type === 'thinking') { setAgentThinking(`${data.agent} 正在思考…`); return; }
      const typeMap: Record<string, DeepResearchDiscussion['type']> = { proposition: 'decision', critique: 'question', rebuttal: 'insight' };
      setLiveDiscussions((prev) => [...prev, {
        id: `debate-${data.round}-${Date.now()}`,
        agent: data.agent ?? '',
        model: '',
        type: typeMap[data.type] ?? 'insight',
        content: `[辩论 Round ${data.round}] ${data.content}`,
        time: new Date().toLocaleTimeString(),
      }]);
      setAgentThinking(null);
    });
    es.addEventListener('agent-thinking', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      const dir = data.direction ? ` · ${data.direction}` : '';
      setAgentThinking(`${data.agent ?? 'Agent'} 正在分析${dir}…`);
    });
    es.addEventListener('research-complete', () => {
      setIsResearching(false);
      setIsPaused(false);
      setPauseMessage(null);
      setResearchProgress(100);
      setAgentThinking(null);
      esRef.current?.close();
      esRef.current = null;
      if (topicId) {
        getInsightDetail(topicId).then((d) => {
          setDetail(d);
          setTeamMembers(d.team);
          setTeamDraft(d.team);
          setAiTeam(d.aiTeam);
          setAiTeamDraft(d.aiTeam);
          setDirections(d.directions);
          setDirectionsDraft(d.directions);
          setTasks(d.tasks);
          setTasksDraft(d.tasks);
          setLiveStages([]);
          setLiveDiscussions([]);
        }).catch(() => {});
      }
    });
    es.addEventListener('error', () => {
      setIsResearching(false);
      setAgentThinking(null);
      esRef.current?.close();
      esRef.current = null;
    });
  };

  const handleExportPdf = () => {
    if (!detail) return;
    const sectionsHtml = (detail.report?.sections ?? [])
      .map((s) => `<h2>${s.title}</h2><p>${s.summary}</p>${
        s.highlights?.length ? `<ul>${s.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>` : ''
      }`)
      .join('');
    const keyFindingsHtml = deepResearch.outputs.keyFindings?.length
      ? `<h2>Key Findings</h2><ul>${deepResearch.outputs.keyFindings.map((f) => `<li>${f}</li>`).join('')}</ul>`
      : '';
    const refsHtml = detail.references?.length
      ? `<h2>References</h2><ul>${detail.references.map((r) => `<li><a href="https://${r.domain}">${r.title}</a> (${r.score}%)</li>`).join('')}</ul>`
      : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${detail.title}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#111}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px}h2{color:#374151;margin-top:28px}blockquote{border-left:4px solid #4f46e5;margin:0;padding-left:16px;color:#6b7280}li{margin-bottom:6px}.meta{color:#9ca3af;font-size:13px;margin:8px 0 24px}@media print{body{padding:0}}</style>
</head><body>
<h1>${detail.title}</h1>
<blockquote>${detail.subtitle ?? ''}</blockquote>
<p class="meta">Generated: ${new Date().toLocaleDateString()}</p>
${detail.report?.executiveSummary ? `<h2>Executive Summary</h2><p>${detail.report.executiveSummary}</p>` : ''}
${keyFindingsHtml}${sectionsHtml}${refsHtml}
</body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const handleExportMarkdown = async () => {
    if (!topicId) return;
    try {
      await exportInsightMarkdown(topicId);
    } catch {
      // fallback: client-side generation
      if (!detail) return;
      const lines: string[] = [
        `# ${detail.title}`,
        `> ${detail.subtitle ?? ''}`,
        '',
        `## Executive Summary`,
        detail.report?.executiveSummary || '',
        '',
        `## Key Findings`,
        ...(deepResearch.outputs.keyFindings ?? []).map((f) => `- ${f}`),
        '',
        ...(detail.report?.sections ?? []).flatMap((s) => [
          `## ${s.title}`,
          s.summary,
          ...(s.highlights ?? []).map((h) => `- ${h}`),
          '',
        ]),
        `## References`,
        ...(detail.references ?? []).map((r) => `- [${r.title}](https://${r.domain}) (Score: ${r.score}%)`),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${topicId}-report.md`;
      a.click();
    }
  };

  // A2: AI direction suggestions
  const handleSuggestDirections = async () => {
    if (!topicId || directionSuggestLoading) return;
    setDirectionSuggestLoading(true);
    setShowSuggestions(true);
    try {
      const res = await suggestInsightDirections(topicId);
      setDirectionSuggestions(res.suggestions);
    } catch {
      setDirectionSuggestions([]);
    } finally {
      setDirectionSuggestLoading(false);
    }
  };

  // B3: Follow-up chat
  const handleFollowup = () => {
    if (!topicId || !followupQuestion.trim() || followupLoading) return;
    setFollowupLoading(true);
    setFollowupAnswer('');
    const token = getToken() ?? '';
    const cancel = followupInsightStream(
      topicId,
      followupQuestion,
      token,
      (chunk) => setFollowupAnswer((prev) => prev + chunk),
      () => setFollowupLoading(false),
    );
    return cancel;
  };

  // D3: Create share link
  const handleCreateShare = async () => {
    if (!topicId || shareLoading) return;
    setShareLoading(true);
    try {
      const res = await createInsightShareLink(topicId);
      setShareToken(res.shareToken);
      setShowShareModal(true);
    } catch {
      /* ignore */
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShare = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/ai-insights/share/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const teamGraph = buildTeamNodes(activeTeam);
  const aiGraph = buildAiTeamNodes(activeAiTeam);
  const displayStages = isResearching && liveStages.length > 0 ? liveStages : deepResearch.stages;
  const displayDiscussions = isResearching && liveDiscussions.length > 0 ? liveDiscussions : deepResearch.discussions;

  if (!authReady || detailLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-500">Topic not found.</div>
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
          <div className="mx-auto flex w-full max-w-[1680px] items-center gap-4 px-5 py-4 sm:px-8">
            <Link href="/ai-insights" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-gray-900">{detail.title}</h1>
              <p className="text-sm text-gray-500">{detail.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleCreateShare}
              disabled={shareLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {shareLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              {t('aiInsights.shareBtn')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
          <div className="mx-auto w-full max-w-[1680px]">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
              <aside className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{uiText.teamTitle}</p>
                      <h2 className="mt-1 text-base font-semibold text-gray-900">{detail.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{detail.statusLabel}</span>
                      {isEditingTeam ? (
                        <>
                          <button
                            type="button"
                            onClick={handleTeamSave}
                            className="rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                          >
                            {uiText.teamSave}
                          </button>
                          <button
                            type="button"
                            onClick={handleTeamCancel}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                          >
                            {uiText.teamCancel}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingTeam(true)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          {uiText.teamEdit}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{uiText.progressLabel}</span>
                      <span>{detail.progress}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${detail.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="relative h-40 w-full">
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                        {teamGraph.nodes.map((node) => (
                          <line
                            key={node.member.id}
                            x1={50}
                            y1={50}
                            x2={node.x}
                            y2={node.y}
                            stroke="#D1D5DB"
                            strokeWidth="1"
                          />
                        ))}
                      </svg>

                      <div
                        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                      >
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-300 bg-white">
                          <Crown size={18} className="text-purple-500" />
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500" />
                        </div>
                        <span className="mt-1 text-[10px] font-semibold text-purple-600">
                          {teamGraph.leader?.name || 'Leader'}
                        </span>
                      </div>

                      {teamGraph.nodes.map((node) => (
                        <div
                          key={node.member.id}
                          className="absolute flex flex-col items-center"
                          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white">
                            <span className="text-xs font-semibold text-gray-600">{node.member.name}</span>
                            <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${statusDot(node.member.status)}`} />
                          </div>
                          <span className="mt-1 text-[10px] text-gray-500">{node.member.role}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-purple-500" /> Leader
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" /> 工作中
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> 已完成
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-gray-300" /> 待研究
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.6fr_auto] items-center gap-2 text-[11px] text-gray-400">
                        <span>成员</span>
                        <span>角色</span>
                        <span>状态</span>
                        <span className="text-right">任务</span>
                        <span />
                      </div>
                      {activeTeam.map((member, index) => (
                        <TeamMemberRow
                          key={member.id}
                          member={member}
                          editable={isEditingTeam}
                          onChange={(next) => updateTeamMember(index, next)}
                          onRemove={isEditingTeam ? () => handleTeamRemove(member.id) : undefined}
                        />
                      ))}
                      {isEditingTeam ? (
                        <button
                          type="button"
                          onClick={handleTeamAdd}
                          className="w-full rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-purple-200 hover:text-purple-600"
                        >
                          {uiText.teamAdd}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{uiText.aiTeamTitle}</p>
                    <div className="flex items-center gap-2">
                      {isEditingAiTeam ? (
                        <>
                          <button
                            type="button"
                            onClick={handleAiTeamSave}
                            className="rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                          >
                            {uiText.teamSave}
                          </button>
                          <button
                            type="button"
                            onClick={handleAiTeamCancel}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                          >
                            {uiText.teamCancel}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingAiTeam(true)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          {uiText.aiTeamEdit}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr_auto] items-center gap-2 text-[11px] text-gray-400">
                      <span>AI</span>
                      <span>角色</span>
                      <span>模型</span>
                      <span>状态</span>
                      <span />
                    </div>
                    {activeAiTeam.map((member, index) => (
                      <AiTeamRow
                        key={member.id}
                        member={member}
                        editable={isEditingAiTeam}
                        onChange={(next) => updateAiTeamMember(index, next)}
                        onRemove={isEditingAiTeam ? () => handleAiTeamRemove(member.id) : undefined}
                      />
                    ))}
                    {isEditingAiTeam ? (
                      <button
                        type="button"
                        onClick={handleAiTeamAdd}
                        className="w-full rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-purple-200 hover:text-purple-600"
                      >
                        {uiText.aiTeamAdd}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{uiText.directionTitle}</p>
                    <div className="flex items-center gap-2">
                      {isEditingDirections ? (
                        <>
                          <button
                            type="button"
                            onClick={handleDirectionSave}
                            className="rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                          >
                            {uiText.directionSave}
                          </button>
                          <button
                            type="button"
                            onClick={handleDirectionCancel}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                          >
                            {uiText.directionCancel}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingDirections(true)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          {uiText.directionEdit}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {activeDirections.map((item, index) => (
                      <DirectionRow
                        key={`${item.title}-${index}`}
                        item={item}
                        editable={isEditingDirections}
                        onChange={(next) => updateDirection(index, next)}
                        onRemove={isEditingDirections ? () => handleDirectionRemove(index) : undefined}
                      />
                    ))}
                    {isEditingDirections ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleDirectionAdd}
                            className="flex-1 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-purple-200 hover:text-purple-600"
                          >
                            {uiText.directionAdd}
                          </button>
                          <button
                            type="button"
                            onClick={handleSuggestDirections}
                            disabled={directionSuggestLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-100 disabled:opacity-50"
                          >
                            {directionSuggestLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                            {t('aiInsights.suggestDirections')}
                          </button>
                        </div>
                        {showSuggestions && directionSuggestions.length > 0 && (
                          <div className="rounded-xl border border-purple-100 bg-purple-50 p-2">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-purple-700">{t('aiInsights.suggestDirectionsTitle')}</span>
                              <button type="button" onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                            </div>
                            <div className="space-y-1.5">
                              {directionSuggestions.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-800">{s.title}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{s.reason}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setDirectionsDraft((prev) => [...prev, { title: s.title, status: '待研究' }])}
                                    className="shrink-0 rounded-md bg-purple-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-purple-700"
                                  >
                                    {t('aiInsights.suggestAdd')}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {directionSuggestLoading && (
                          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-600">
                            <Loader2 size={11} className="animate-spin" />
                            {t('aiInsights.suggestLoading')}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {isEditingDirections || isEditingTeam ? uiText.editingHint : uiText.editHint}
                  </div>

                  <div className="mt-3 text-xs font-semibold text-emerald-600">{uiText.stageLabel}</div>
                </div>
              </aside>

              <section className="min-w-0 space-y-3">
                {/* B1: Conclusion card — shown when executiveSummary exists */}
                {deepResearch.outputs.executiveSummary ? (
                  <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600 shrink-0" />
                        <span className="text-sm font-semibold text-purple-800">{t('aiInsights.conclusionCard')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('report')}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          {t('aiInsights.viewFullReport')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConclusionExpanded((p) => !p)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {conclusionExpanded ? t('aiInsights.conclusionCollapse') : t('aiInsights.conclusionExpand')}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-purple-700 leading-relaxed">
                      {conclusionExpanded
                        ? deepResearch.outputs.executiveSummary
                        : deepResearch.outputs.executiveSummary.slice(0, 120) + (deepResearch.outputs.executiveSummary.length > 120 ? '...' : '')}
                    </p>
                    {deepResearch.outputs.keyFindings.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {(conclusionExpanded ? deepResearch.outputs.keyFindings : deepResearch.outputs.keyFindings.slice(0, 3)).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-purple-700">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-4 pt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative flex items-center gap-2 pb-3 text-sm font-semibold transition-colors ${
                              activeTab === tab.key ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {Icon ? <Icon size={16} /> : null}
                            {tab.label}
                            {typeof tab.count === 'number' ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                                {tab.count}
                              </span>
                            ) : null}
                            {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-purple-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3">
                    {activeTab === 'research' ? (
                      <div className="space-y-4">
                        {/* Tasks section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <ClipboardList size={16} className="text-purple-600" />
                              <h3 className="text-sm font-semibold text-gray-900">{uiText.tasksTitle} ({activeTasks.length}/{tasksTotal})</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditingTasks ? (
                                <>
                                  <button type="button" onClick={handleTaskAdd} className="rounded-md border border-dashed border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-purple-200 hover:text-purple-600">新增任务</button>
                                  <button type="button" onClick={handleTaskSave} className="rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700">{uiText.teamSave}</button>
                                  <button type="button" onClick={handleTaskCancel} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">{uiText.teamCancel}</button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setIsEditingTasks(true)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">编辑任务</button>
                              )}
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-xs text-gray-400">
                                <tr>
                                  <th className="px-4 py-2">#</th>
                                  <th className="px-4 py-2">任务名称</th>
                                  <th className="px-4 py-2">负责人</th>
                                  <th className="px-4 py-2">模型</th>
                                  <th className="px-4 py-2">状态</th>
                                  <th className="px-4 py-2">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTasks.map((task, index) => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    editable={isEditingTasks}
                                    aiTeam={activeAiTeam}
                                    onChange={(next) => updateTask(index, next)}
                                    onRemove={isEditingTasks ? () => handleTaskRemove(index) : undefined}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Deep Research section */}
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <Sparkles size={18} className="text-purple-600" />
                              <div>
                                <div className="text-sm font-semibold text-gray-800">{uiText.deepResearchTitle}</div>
                                <div className="text-xs text-gray-500">{uiText.deepResearchSubtitle}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setIsEditingAiTeam(true)} disabled={isResearching} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50">{uiText.aiTeamEdit}</button>
                              {isPaused ? (
                                <button type="button" onClick={() => handleResumeAfterPause()} className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                  <CheckCircle2 size={12} />{t('aiInsights.continueResearch')}
                                </button>
                              ) : (
                                <>
                                  <button type="button" onClick={handleRunResearch} disabled={isResearching} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors ${isResearching ? 'cursor-not-allowed bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                    {isResearching ? <><Loader2 size={12} className="animate-spin" />{t('aiInsights.researching')}</> : canResume ? <><RefreshCw size={12} />{t('aiInsights.resumeResearch')}</> : <><Sparkles size={12} />{t('aiInsights.runResearch')}</>}
                                  </button>
                                  {isResearching && (
                                    <button type="button" onClick={handleCancelResearch} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                                      ✕ {t('aiInsights.cancelResearch')}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {isPaused && pauseMessage && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <div className="flex items-start gap-2">
                                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-amber-800">{t('aiInsights.researchPaused')}</div>
                                  <div className="text-xs text-amber-700 mt-0.5">{pauseMessage}</div>
                                </div>
                                <button type="button" onClick={() => handleResumeAfterPause()} className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700">{t('aiInsights.continueResearch')}</button>
                              </div>
                            </div>
                          )}
                          {isResearching && (
                            <div className="mt-3 space-y-2">
                              <div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1"><span>{t('aiInsights.researchProgress')}</span><span>{researchProgress}%</span></div>
                                <div className="h-1.5 rounded-full bg-gray-200"><div className="h-1.5 rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${researchProgress}%` }} /></div>
                              </div>
                              {agentThinking && (<div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-xs text-purple-700"><Loader2 size={11} className="animate-spin shrink-0" /><span className="truncate">{agentThinking}</span></div>)}
                              {qualityGateAlert && (<div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700"><Info size={11} className="shrink-0" /><span className="truncate">{qualityGateAlert}</span></div>)}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800"><span>{uiText.deepResearchAgents}</span><span className="text-xs text-gray-400">{activeAiTeam.length} agents</span></div>
                            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2">
                              <div className="relative h-40 w-full">
                                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                                  {aiGraph.nodes.map((node) => (<line key={node.member.id} x1={50} y1={50} x2={node.x} y2={node.y} stroke="#D1D5DB" strokeWidth="1" />))}
                                </svg>
                                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-purple-300 bg-white"><Crown size={16} className="text-purple-500" /><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500" /></div>
                                  <span className="mt-1 text-[10px] font-semibold text-purple-600">{aiGraph.leader?.name || 'Leader'}</span>
                                </div>
                                {aiGraph.nodes.map((node) => (
                                  <div key={node.member.id} className="absolute flex flex-col items-center" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}>
                                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"><span className="text-[10px] font-semibold text-gray-600">{node.member.name}</span><span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${aiStatusDot(node.member.status)}`} /></div>
                                    <span className="mt-1 text-[9px] text-gray-500">{node.member.role}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              {activeAiTeam.slice(0, 4).map((member) => (
                                <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs">
                                  <div className="min-w-0"><div className="font-semibold text-gray-700">{member.name}</div><div className="text-[10px] text-gray-400">{member.focus || member.role}</div></div>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">{member.model}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800"><span>{uiText.deepResearchFlow}</span><Share2 size={14} className="text-gray-400" /></div>
                            <div className="mt-3 space-y-2">{displayStages.map((stage) => (<DeepResearchStageRow key={stage.id} stage={stage} />))}</div>
                          </div>

                          {/* B2: Discussion with debate/timeline toggle */}
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                              <span>{uiText.deepResearchDiscussion}</span>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setDebateViewMode('timeline')} className={`rounded px-2 py-0.5 text-[11px] ${debateViewMode === 'timeline' ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}>{t('aiInsights.timelineView')}</button>
                                <button type="button" onClick={() => setDebateViewMode('debate')} className={`rounded px-2 py-0.5 text-[11px] ${debateViewMode === 'debate' ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}>{t('aiInsights.debateView')}</button>
                              </div>
                            </div>
                            {debateViewMode === 'timeline' ? (
                              <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                                {displayDiscussions.map((item) => (<DeepResearchDiscussionCard key={item.id} item={item} />))}
                              </div>
                            ) : (
                              <div className="mt-3 space-y-3">
                                {/* Debate view: group by round */}
                                {(() => {
                                  const debateItems = displayDiscussions.filter(d => d.content.includes('[辩论 Round'));
                                  const propositions = debateItems.filter(d => d.content.includes('立论'));
                                  const critiques = debateItems.filter(d => d.content.includes('质疑'));
                                  const rebuttals = debateItems.filter(d => d.content.includes('修订') || (d.content.includes('Round 3') && !d.content.includes('立论') && !d.content.includes('质疑')));
                                  if (debateItems.length === 0) return <div className="text-xs text-gray-400 text-center py-4">暂无辩论数据，完成深度研究后显示</div>;
                                  return (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
                                          <div className="text-[11px] font-semibold text-blue-700 mb-1">{t('aiInsights.debateProposer')}</div>
                                          {propositions.map(d => <div key={d.id} className="text-xs text-blue-600 mt-1">{d.content.replace(/\[辩论 Round \d+ · 立论\]\s*/, '')}</div>)}
                                        </div>
                                        <div className="rounded-lg border border-amber-100 bg-amber-50 p-2">
                                          <div className="text-[11px] font-semibold text-amber-700 mb-1">{t('aiInsights.debateCritic')}</div>
                                          {critiques.map(d => <div key={d.id} className="text-xs text-amber-600 mt-1">{d.content.replace(/\[辩论 Round \d+ · 质疑\]\s*/, '')}</div>)}
                                        </div>
                                      </div>
                                      {rebuttals.length > 0 && (
                                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                                          <div className="text-[11px] font-semibold text-emerald-700 mb-1">{t('aiInsights.debateSynthesis')}</div>
                                          {rebuttals.map(d => <div key={d.id} className="text-xs text-emerald-600 mt-1">{d.content.replace(/\[辩论 Round \d+[^\]]*\]\s*/, '')}</div>)}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.deepResearchOutputs}</div>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchKeyFindings}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">{deepResearch.outputs.keyFindings.map((item) => (<li key={item} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" /><span>{item}</span></li>))}</ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchActionItems}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">{deepResearch.outputs.actionItems.map((item) => (<li key={item} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" /><span>{item}</span></li>))}</ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchOpportunities}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">{deepResearch.outputs.opportunities.map((item) => (<li key={item} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" /><span>{item}</span></li>))}</ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchRisks}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">{deepResearch.outputs.risks.map((item) => (<li key={item} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" /><span>{item}</span></li>))}</ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* removed old tasks/deepresearch tabs — merged into research tab above */}
                    {false ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ClipboardList size={16} className="text-purple-600" />
                            <h3 className="text-sm font-semibold text-gray-900">
                            {uiText.tasksTitle} ({activeTasks.length}/{tasksTotal})
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditingTasks ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleTaskAdd}
                                  className="rounded-md border border-dashed border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-purple-200 hover:text-purple-600"
                                >
                                  新增任务
                                </button>
                                <button
                                  type="button"
                                  onClick={handleTaskSave}
                                  className="rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                                >
                                  {uiText.teamSave}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleTaskCancel}
                                  className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                                >
                                  {uiText.teamCancel}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsEditingTasks(true)}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                              >
                                编辑任务
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-400">
                              <tr>
                                <th className="px-4 py-2">#</th>
                                <th className="px-4 py-2">任务名称</th>
                                <th className="px-4 py-2">负责人</th>
                                <th className="px-4 py-2">模型</th>
                                <th className="px-4 py-2">状态</th>
                                <th className="px-4 py-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeTasks.map((task, index) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  editable={isEditingTasks}
                                  aiTeam={activeAiTeam}
                                  onChange={(next) => updateTask(index, next)}
                                  onRemove={isEditingTasks ? () => handleTaskRemove(index) : undefined}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <MessageCircle size={16} className="text-purple-600" />
                            {uiText.dialogTitle}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400"
                              placeholder={uiText.dialogPlaceholder}
                            />
                            <button
                              type="button"
                              className="h-10 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white"
                            >
                              发送
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {false && activeTab === 'deepresearch' ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <Sparkles size={18} className="text-purple-600" />
                              <div>
                                <div className="text-sm font-semibold text-gray-800">{uiText.deepResearchTitle}</div>
                                <div className="text-xs text-gray-500">{uiText.deepResearchSubtitle}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingAiTeam(true)}
                                disabled={isResearching}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                {uiText.aiTeamEdit}
                              </button>
                              {isPaused ? (
                                <button
                                  type="button"
                                  onClick={() => handleResumeAfterPause()}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                                >
                                  <CheckCircle2 size={12} />
                                  {t('aiInsights.continueResearch')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleRunResearch}
                                  disabled={isResearching}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                                    isResearching ? 'cursor-not-allowed bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                                  }`}
                                >
                                  {isResearching ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" />
                                      {t('aiInsights.researching')}
                                    </>
                                  ) : canResume ? (
                                    <>
                                      <RefreshCw size={12} />
                                      {t('aiInsights.resumeResearch')}
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={12} />
                                      {t('aiInsights.runResearch')}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          {isPaused && pauseMessage && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <div className="flex items-start gap-2">
                                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-amber-800">{t('aiInsights.researchPaused')}</div>
                                  <div className="text-xs text-amber-700 mt-0.5">{pauseMessage}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleResumeAfterPause()}
                                  className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                                >
                                  {t('aiInsights.continueResearch')}
                                </button>
                              </div>
                            </div>
                          )}
                          {isResearching && (
                            <div className="mt-3 space-y-2">
                              <div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                  <span>{t('aiInsights.researchProgress')}</span>
                                  <span>{researchProgress}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-200">
                                  <div
                                    className="h-1.5 rounded-full bg-purple-500 transition-all duration-500"
                                    style={{ width: `${researchProgress}%` }}
                                  />
                                </div>
                              </div>
                              {agentThinking && (
                                <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-xs text-purple-700">
                                  <Loader2 size={11} className="animate-spin shrink-0" />
                                  <span className="truncate">{agentThinking}</span>
                                </div>
                              )}
                              {qualityGateAlert && (
                                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                                  <Info size={11} className="shrink-0" />
                                  <span className="truncate">{qualityGateAlert}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                              <span>{uiText.deepResearchAgents}</span>
                              <span className="text-xs text-gray-400">{activeAiTeam.length} agents</span>
                            </div>
                            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2">
                              <div className="relative h-40 w-full">
                                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                                  {aiGraph.nodes.map((node) => (
                                    <line
                                      key={node.member.id}
                                      x1={50}
                                      y1={50}
                                      x2={node.x}
                                      y2={node.y}
                                      stroke="#D1D5DB"
                                      strokeWidth="1"
                                    />
                                  ))}
                                </svg>

                                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-purple-300 bg-white">
                                    <Crown size={16} className="text-purple-500" />
                                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500" />
                                  </div>
                                  <span className="mt-1 text-[10px] font-semibold text-purple-600">
                                    {aiGraph.leader?.name || 'Leader'}
                                  </span>
                                  <span className="text-[9px] text-gray-400">{aiGraph.leader?.model}</span>
                                </div>

                                {aiGraph.nodes.map((node) => (
                                  <div
                                    key={node.member.id}
                                    className="absolute flex flex-col items-center"
                                    style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                                  >
                                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white">
                                      <span className="text-[10px] font-semibold text-gray-600">{node.member.name}</span>
                                      <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${aiStatusDot(node.member.status)}`} />
                                    </div>
                                    <span className="mt-1 text-[9px] text-gray-500">{node.member.role}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              {activeAiTeam.slice(0, 4).map((member) => (
                                <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-700">{member.name}</div>
                                    <div className="text-[10px] text-gray-400">{member.focus || member.role}</div>
                                  </div>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">{member.model}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                              <span>{uiText.deepResearchFlow}</span>
                              <Share2 size={14} className="text-gray-400" />
                            </div>
                            <div className="mt-3 space-y-2">
                              {displayStages.map((stage) => (
                                <DeepResearchStageRow key={stage.id} stage={stage} />
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                              <span>{uiText.deepResearchDiscussion}</span>
                              <span className="text-xs text-gray-400">{displayDiscussions.length} 条</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {displayDiscussions.map((item) => (
                                <DeepResearchDiscussionCard key={item.id} item={item} />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.deepResearchOutputs}</div>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchKeyFindings}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                                {deepResearch.outputs.keyFindings.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchActionItems}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                                {deepResearch.outputs.actionItems.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchOpportunities}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                                {deepResearch.outputs.opportunities.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchRisks}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                                {deepResearch.outputs.risks.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchOpenQuestions}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                                {deepResearch.outputs.openQuestions.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchConsensus}</div>
                              <div className="mt-2 text-sm text-gray-600">{deepResearch.outputs.consensus}</div>
                              <div className="mt-3 text-xs font-semibold text-gray-500">{uiText.deepResearchDissent}</div>
                              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                                {deepResearch.outputs.dissent.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.deepResearchStructure}</div>
                          <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50 p-3 text-sm text-purple-700">
                            {deepResearch.outputs.executiveSummary}
                          </div>

                          <div className="mt-3 space-y-3">
                            <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchChapters}</div>
                            {deepResearch.outputs.chapters.map((chapter) => (
                              <div key={chapter.title} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-gray-800">{chapter.title}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                    <span className="rounded-full bg-white px-2 py-0.5">{chapter.owner}</span>
                                    <span className="rounded-full bg-white px-2 py-0.5">{chapter.model}</span>
                                  </div>
                                </div>
                                <p className="mt-2 text-sm text-gray-600">{chapter.summary}</p>
                                <ul className="mt-2 space-y-1 text-sm text-gray-500">
                                  {chapter.highlights.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3">
                            <div className="text-xs font-semibold text-gray-500">{uiText.deepResearchEvidence}</div>
                            <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                              {detail.references.slice(0, 4).map((item) => (
                                <ReferenceCard key={item.id} item={item} />
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="text-xs font-semibold text-gray-500">{uiText.credibilityTitle}</div>
                            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {detail.credibility.metrics.map((metric) => (
                                <CredibilityMetricCard key={metric.label} metric={metric} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'collaboration' ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">{uiText.collaborationTitle}</span>
                            <span className="text-xs text-gray-400">9/12 维度完成</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-blue-500" style={{ width: '75%' }} />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {['全部', 'Leader', '研究员', '审校员', '撰写员'].map((label) => (
                            <button
                              key={label}
                              type="button"
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="ml-auto inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                          >
                            全部维度 <ChevronDown size={12} />
                          </button>
                        </div>

                        <div className="text-xs text-gray-400">
                          <span className="font-semibold text-gray-700">{uiText.collaborationCount}</span> (119)
                        </div>

                        <div className="space-y-2">
                          {detail.collaboration.map((event) => (
                            <CollaborationCard key={event.id} event={event} />
                          ))}
                        </div>

                        {/* History timeline */}
                        {detail.history.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                              <History size={16} className="text-purple-600" />
                              {uiText.historyTitle}
                            </div>
                            <div className="space-y-3 border-l border-gray-200 pl-4">
                              {detail.history.map((item) => (
                                <div key={item.id} className="relative">
                                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold text-emerald-700">{item.title}</span>
                                      <span className="text-xs text-gray-400">{item.time}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-emerald-700">{item.summary}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {activeTab === 'report' ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                              <CalendarClock size={16} className="text-purple-600" />
                              {uiText.reportGenerated}: {detail.report.generatedAt}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleExportMarkdown}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                              >
                                <Download size={13} />
                                {t('aiInsights.exportMarkdown')}
                              </button>
                              <button
                                type="button"
                                onClick={handleExportPdf}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                              >
                                <FileText size={13} />
                                {t('aiInsights.exportPdf')}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-purple-700">{uiText.executiveSummary}</h3>
                          <div className="mt-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm text-purple-700">
                            {detail.report.executiveSummary}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-purple-700">{uiText.toc}</h3>
                          <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-purple-600 sm:grid-cols-2">
                            {detail.report.sections.map((section) => (
                              <span key={section.title} className="cursor-pointer hover:underline">
                                {section.title}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {detail.report.sections.map((section, index) => (
                            <div key={section.title} className="rounded-2xl border border-gray-200 bg-white p-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                                  {index + 1}
                                </span>
                                {section.title}
                              </div>
                              <p className="mt-2 text-sm text-gray-600">{section.summary}</p>
                              <ul className="mt-3 space-y-1 text-sm text-gray-500">
                                {section.highlights.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {/* B3: Follow-up chat */}
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                            <MessageCircle size={16} className="text-purple-600" />
                            {t('aiInsights.followupTitle')}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              value={followupQuestion}
                              onChange={(e) => setFollowupQuestion(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleFollowup()}
                              placeholder={t('aiInsights.followupPlaceholder')}
                              className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-purple-300"
                            />
                            <button
                              type="button"
                              onClick={handleFollowup}
                              disabled={followupLoading || !followupQuestion.trim()}
                              className="h-10 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                              {followupLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                              {t('aiInsights.followupSend')}
                            </button>
                          </div>
                          {followupLoading && !followupAnswer && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
                              <Loader2 size={11} className="animate-spin" />{t('aiInsights.followupLoading')}
                            </div>
                          )}
                          {followupAnswer && (
                            <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm text-purple-800 whitespace-pre-wrap">
                              {followupAnswer}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {false && activeTab === 'history' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <History size={16} className="text-purple-600" />
                          {uiText.historyTitle}
                        </div>
                        <div className="space-y-3 border-l border-gray-200 pl-4">
                          {detail.history.map((item) => (
                            <div key={item.id} className="relative">
                              <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-emerald-700">{item.title}</span>
                                  <span className="text-xs text-gray-400">{item.time}</span>
                                </div>
                                <p className="mt-1 text-sm text-emerald-700">{item.summary}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {false && activeTab === 'credibility' ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.credibilityTitle}</div>
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {detail.credibility.metrics.map((metric) => (
                              <CredibilityMetricCard key={metric.label} metric={metric} />
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <ScoreRing score={detail.credibility.overall} color="#f59e0b" />
                            <div>
                              <div className="text-sm font-semibold text-gray-700">{t('aiInsights.overallCredibility')}</div>
                              <Stars count={3} />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.sourceEval}</div>
                          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden flex">
                            {detail.credibility.sources.map((source) => (
                              <div key={source.label} className={source.color} style={{ width: `${source.percent}%` }} />
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                            {detail.credibility.sources.map((source) => (
                              <span key={source.label} className="inline-flex items-center gap-1">
                                <span className={`h-2 w-2 rounded-full ${source.color}`} />
                                {source.label}: {source.count} ({source.percent}%)
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.timeliness}</div>
                          <div className="mt-3 space-y-2">
                            {detail.credibility.timeliness.map((item) => (
                              <div key={item.label} className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="w-24 text-xs text-gray-500">{item.label}</div>
                                <div className="flex-1">
                                  <div className="h-2 rounded-full bg-gray-100">
                                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                                  </div>
                                </div>
                                <div className="w-16 text-right text-xs text-gray-400">{item.value} ({item.percent}%)</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.coverage}</div>
                          <div className="mt-3 space-y-2">
                            {detail.credibility.coverage.map((item) => (
                              <div key={item.label} className="flex items-center gap-4 text-sm">
                                <div className="flex-1 text-gray-600">{item.label}</div>
                                <div className="w-1/3">
                                  <div className="h-2 rounded-full bg-gray-100">
                                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${item.progress}%` }} />
                                  </div>
                                </div>
                                <div className="w-14 text-right text-xs text-gray-400">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.quality}</div>
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {detail.credibility.quality.map((item) => (
                              <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                                <div className={`text-lg font-semibold ${item.accent}`}>{item.value}</div>
                                <div className="mt-1 text-xs text-gray-500">{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-sm font-semibold text-gray-800">{uiText.limitation}</div>
                          <ul className="mt-3 space-y-2 text-sm text-gray-600">
                            {detail.credibility.limitations.map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'sources' ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <Search size={16} className="text-gray-400" />
                            <input
                              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                              placeholder="搜索来源..."
                            />
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                          >
                            全部 <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                          >
                            按可信度 <ChevronDown size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {detail.references.map((item) => (
                            <ReferenceCard key={item.id} item={item} />
                          ))}
                        </div>

                        {/* Phase D2: Claim-level evidence chain */}
                        {detail.claims?.length ? (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <ShieldCheck size={14} className="text-blue-600" />
                              <span className="text-xs font-semibold text-blue-800">{t('aiInsights.claimsTitle')} ({detail.claims.length})</span>
                            </div>
                            <div className="space-y-2">
                              {(detail.claims as InsightClaim[]).slice(0, 12).map((claim) => (
                                <div key={claim.id} className={`rounded-lg border bg-white px-3 py-2 ${claim.contestedBy ? 'border-amber-200' : 'border-blue-100'}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-700">{claim.statement}</div>
                                      <div className="mt-0.5 flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400">{claim.directionLabel}</span>
                                        <span className={`text-[10px] font-medium ${claim.confidence >= 0.8 ? 'text-emerald-600' : claim.confidence >= 0.6 ? 'text-amber-600' : 'text-red-500'}`}>
                                          {Math.round(claim.confidence * 100)}%
                                        </span>
                                        {claim.verified && <CheckCircle2 size={10} className="text-emerald-500" />}
                                        {claim.contestedBy && <span className="text-[10px] text-amber-600">⚡ {t('aiInsights.contested')}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Phase D3: Contradiction Detection — live during research or from DB after */}
                        {((liveContradictions.length > 0) || (detail.contradictions?.length ?? 0) > 0) ? (() => {
                          const displayed: InsightContradiction[] = liveContradictions.length > 0
                            ? liveContradictions
                            : (detail.contradictions as InsightContradiction[] ?? []);
                          return (
                          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <Info size={14} className="text-red-500" />
                              <span className="text-xs font-semibold text-red-700">{t('aiInsights.contradictionsTitle')} ({displayed.length})</span>
                              {liveContradictions.length > 0 && <span className="text-[10px] text-red-400 animate-pulse">● 实时</span>}
                            </div>
                            <div className="space-y-2">
                              {displayed.map((c, i) => (
                                <div key={i} className={`rounded-lg border bg-white px-3 py-2 ${c.severity === 'high' ? 'border-red-200' : c.severity === 'medium' ? 'border-amber-200' : 'border-gray-200'}`}>
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${c.severity === 'high' ? 'text-red-600' : c.severity === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                                      {c.severity}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{c.direction1} vs {c.direction2}</span>
                                  </div>
                                  <div className="text-xs text-gray-700">{c.description}</div>
                                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                    <div className="rounded border border-blue-100 bg-blue-50 px-2 py-1">
                                      <div className="text-[9px] font-medium text-blue-600 mb-0.5">{c.direction1}</div>
                                      <div className="text-[10px] text-gray-600">{c.claim1}</div>
                                    </div>
                                    <div className="rounded border border-purple-100 bg-purple-50 px-2 py-1">
                                      <div className="text-[9px] font-medium text-purple-600 mb-0.5">{c.direction2}</div>
                                      <div className="text-[10px] text-gray-600">{c.claim2}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })() : null}

                        {/* Credibility section in Sources tab */}
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <div className="text-sm font-semibold text-gray-800 mb-3">{uiText.credibilityTitle}</div>
                          <div className="flex items-center gap-3 mb-4">
                            <ScoreRing score={detail.credibility.overall} color="#f59e0b" />
                            <div>
                              <div className="text-sm font-semibold text-gray-700">{t('aiInsights.overallCredibility')}</div>
                              <Stars count={3} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {detail.credibility.metrics.map((metric) => (
                              <CredibilityMetricCard key={metric.label} metric={metric} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Research Launch Wizard */}
      {showResearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[480px] max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">

            {/* Step indicator */}
            <div className="mb-4 flex items-center gap-2">
              {(['models', 'planning', 'directions'] as const).map((step, i) => {
                const stepIdx = planStep === 'models' ? 0 : planStep === 'planning' ? 1 : 2;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${i <= stepIdx ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {i + 1}
                    </div>
                    {i < 2 && <div className={`h-px w-8 ${i < stepIdx ? 'bg-purple-400' : 'bg-gray-200'}`} />}
                  </div>
                );
              })}
              <button type="button" onClick={() => setShowResearchModal(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* ─── Step 1: Model Selection ─── */}
            {planStep === 'models' && (
              <>
                <div className="mb-1 text-sm font-semibold text-gray-800">组建研究团队</div>
                <p className="mb-4 text-xs text-gray-500">选择参与研究的 AI 模型（1-4个），团队将基于选定模型规划研究方向</p>

                {planModelsLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-gray-400 justify-center">
                    <Loader2 size={16} className="animate-spin" /> 加载模型列表...
                  </div>
                ) : (
                  <div className="mb-4 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {planModels.map((m) => {
                      const selected = selectedModelIds.includes(m.id);
                      const isDisabled = !selected && selectedModelIds.length >= 4;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedModelIds((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                            );
                          }}
                          className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors disabled:opacity-40 ${
                            selected
                              ? 'border-purple-300 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                            {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className={`font-semibold ${selected ? 'text-purple-700' : 'text-gray-700'}`}>{m.name}</div>
                            <div className="text-[10px] text-gray-400">{m.provider}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedModelIds.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {selectedModelIds.map((id, i) => {
                      const roles = ['首席研究员', '专题分析师', '批判评审师', '综合总结师'];
                      const m = planModels.find((x) => x.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700">
                          {i === 0 && <Crown size={9} />}
                          {m?.name ?? id} · {roles[i] ?? '研究员'}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResearchModal(false)}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleStartPlan}
                    disabled={selectedModelIds.length === 0}
                    className="flex-1 rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Sparkles size={12} />
                      开始规划讨论
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* ─── Step 2: Planning in Progress ─── */}
            {planStep === 'planning' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-purple-100 bg-purple-50">
                    <Loader2 size={28} className="animate-spin text-purple-500" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-800">AI 团队规划中...</div>
                  <div className="mt-1 text-xs text-gray-500">正在分析课题，讨论研究方向</div>
                </div>
                <div className="flex gap-1">
                  {selectedModelIds.map((id) => {
                    const m = planModels.find((x) => x.id === id);
                    return (
                      <span key={id} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                        {m?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Step 3: Confirm Directions ─── */}
            {planStep === 'directions' && planResult && (
              <>
                <div className="mb-1 text-sm font-semibold text-gray-800">确认研究方向</div>
                {planResult.summary && (
                  <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2.5 text-xs text-purple-700">
                    <span className="font-semibold text-purple-800">团队规划摘要：</span>{planResult.summary}
                  </div>
                )}

                <div className="mb-3 space-y-2">
                  {planDirections.map((dir, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-semibold text-purple-600">{i + 1}</span>
                      <input
                        value={dir}
                        onChange={(e) => setPlanDirections((prev) => prev.map((d, j) => j === i ? e.target.value : d))}
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-purple-300"
                      />
                      <button
                        type="button"
                        onClick={() => setPlanDirections((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-gray-500"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPlanDirections((prev) => [...prev, '新研究方向'])}
                    className="w-full rounded-lg border border-dashed border-gray-200 py-1.5 text-xs text-gray-400 hover:border-purple-300 hover:text-purple-600"
                  >
                    + 添加方向
                  </button>
                </div>

                {/* C1: Quick/Deep mode */}
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResearchOpts((p) => ({ ...p, quickMode: true }))}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${researchOpts.quickMode ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Zap size={13} /> {t('aiInsights.quickMode')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResearchOpts((p) => ({ ...p, quickMode: false }))}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${!researchOpts.quickMode ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Sparkles size={13} /> {t('aiInsights.deepMode')}
                  </button>
                </div>

                {/* Web search */}
                <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <div className="text-xs font-medium text-gray-700">{t('aiInsights.webSearchLabel')}</div>
                  <button
                    type="button"
                    onClick={() => setResearchOpts((p) => ({ ...p, useWebSearch: !p.useWebSearch }))}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${researchOpts.useWebSearch ? 'bg-purple-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${researchOpts.useWebSearch ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanStep('models')}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    重新选择
                  </button>
                  <button
                    type="button"
                    onClick={doStartResearch}
                    disabled={planDirections.length === 0}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    开始深度研究
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* D3: Share modal */}
      {showShareModal && shareToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-96 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">{t('aiInsights.shareTitle')}</span>
              <button type="button" onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="mb-3 text-xs text-gray-500">{t('aiInsights.sharePublic')}</div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <ExternalLink size={13} className="text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-xs text-gray-700">{typeof window !== 'undefined' ? `${window.location.origin}/ai-insights/share/${shareToken}` : `/ai-insights/share/${shareToken}`}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyShare}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Copy size={14} />
              {shareCopied ? t('aiInsights.shareCopied') : t('aiInsights.shareCopy')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
