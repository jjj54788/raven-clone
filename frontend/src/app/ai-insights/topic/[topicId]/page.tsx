'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Crown,
  FileText,
  History,
  Info,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  getInsightTopic,
  getInsightTopicDetail,
  type AiTeamMember,
  type CollaborationEvent,
  type CredibilityMetric,
  type DeepResearchDiscussion,
  type DeepResearchStage,
  type ReferenceItem,
  type ResearchDirection,
  type ResearchMember,
  type ResearchTask,
} from '@/lib/ai-insights-data';

type TabKey = 'tasks' | 'deepresearch' | 'collaboration' | 'report' | 'history' | 'credibility' | 'references';

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
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  const params = useParams<{ topicId?: string | string[] }>();
  const rawTopicId = params?.topicId;
  const topicId = Array.isArray(rawTopicId) ? rawTopicId[0] : rawTopicId;

  const topic = getInsightTopic(topicId || '');
  const detail = getInsightTopicDetail(topicId || '');
  const [teamMembers, setTeamMembers] = useState<ResearchMember[]>(detail.team);
  const [teamDraft, setTeamDraft] = useState<ResearchMember[]>(detail.team);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [aiTeam, setAiTeam] = useState<AiTeamMember[]>(detail.aiTeam);
  const [aiTeamDraft, setAiTeamDraft] = useState<AiTeamMember[]>(detail.aiTeam);
  const [isEditingAiTeam, setIsEditingAiTeam] = useState(false);
  const [directions, setDirections] = useState<ResearchDirection[]>(detail.directions);
  const [directionsDraft, setDirectionsDraft] = useState<ResearchDirection[]>(detail.directions);
  const [isEditingDirections, setIsEditingDirections] = useState(false);
  const [tasks, setTasks] = useState<ResearchTask[]>(detail.tasks);
  const [tasksDraft, setTasksDraft] = useState<ResearchTask[]>(detail.tasks);
  const [isEditingTasks, setIsEditingTasks] = useState(false);

  useEffect(() => {
    setTeamMembers(detail.team);
    setTeamDraft(detail.team);
    setAiTeam(detail.aiTeam);
    setAiTeamDraft(detail.aiTeam);
    setDirections(detail.directions);
    setDirectionsDraft(detail.directions);
    setTasks(detail.tasks);
    setTasksDraft(detail.tasks);
    setIsEditingTeam(false);
    setIsEditingAiTeam(false);
    setIsEditingDirections(false);
    setIsEditingTasks(false);
  }, [topicId]);

  const activeTeam = isEditingTeam ? teamDraft : teamMembers;
  const activeAiTeam = isEditingAiTeam ? aiTeamDraft : aiTeam;
  const activeDirections = isEditingDirections ? directionsDraft : directions;
  const activeTasks = isEditingTasks ? tasksDraft : tasks;
  const tasksTotal = Math.max(detail.tasksTotal, activeTasks.length);
  const deepResearch = detail.deepResearch;
  const tabs = useMemo<TabItem[]>(
    () => [
      { key: 'tasks', label: locale === 'zh' ? '待办列表' : 'Task List', icon: ClipboardList },
      { key: 'deepresearch', label: locale === 'zh' ? '多Agent深研' : 'Deep Research', icon: Sparkles },
      { key: 'collaboration', label: locale === 'zh' ? '协作动态' : 'Collaboration', count: 119, icon: MessageCircle },
      { key: 'report', label: locale === 'zh' ? '洞察报告' : 'Insight Report', icon: FileText },
      { key: 'history', label: locale === 'zh' ? '研究历史' : 'Research History', icon: History },
      { key: 'credibility', label: locale === 'zh' ? '可信度' : 'Credibility', icon: ShieldCheck },
      { key: 'references', label: locale === 'zh' ? '参考文献' : 'References', count: 170, icon: Search },
    ],
    [locale],
  );

  const uiText = useMemo(() => {
    const zh = {
      teamTitle: '研究团队',
      progressLabel: '整体进度',
      stageLabel: '阶段：已完成',
      editHint: '点击编辑可修改字段',
      editingHint: '编辑中：修改后请保存',
      teamEdit: '编辑团队',
      teamSave: '保存',
      teamCancel: '取消',
      teamAdd: '添加成员',
      aiTeamTitle: 'AI 团队',
      aiTeamEdit: '编辑 AI 团队',
      aiTeamAdd: '添加 AI',
      directionTitle: '研究方向',
      directionEdit: '编辑方向',
      directionAdd: '新增方向',
      directionSave: '保存',
      directionCancel: '取消',
      tasksTitle: '任务列表',
      dialogTitle: '与 Leader 对话',
      dialogPlaceholder: '输入研究指令，深入研究政策环境…',
      deepResearchTitle: '多 Agent 深度研究',
      deepResearchSubtitle: '多模型协作的深度研究与讨论产出',
      deepResearchAgents: '团队可视化',
      deepResearchFlow: '研究流程',
      deepResearchDiscussion: '讨论时间线',
      deepResearchOutputs: '讨论产出',
      deepResearchStructure: '产出结构（全量）',
      deepResearchConsensus: '共识结论',
      deepResearchDissent: '争议点',
      deepResearchKeyFindings: '关键结论',
      deepResearchOpportunities: '机会',
      deepResearchRisks: '风险',
      deepResearchOpenQuestions: '待验证问题',
      deepResearchActionItems: '行动建议',
      deepResearchChapters: '分章产出',
      deepResearchEvidence: '证据来源',
      collaborationTitle: '研究进度',
      collaborationCount: '协作消息',
      reportGenerated: '生成时间',
      executiveSummary: '执行摘要',
      toc: '目录',
      historyTitle: '研究历史时间线',
      credibilityTitle: '研究可信度报告',
      sourceEval: '数据来源评估',
      timeliness: '时效性评估',
      coverage: '覆盖度评估',
      quality: 'AI分析质量',
      limitation: '局限性声明',
    };
    const en = {
      teamTitle: 'Research Team',
      progressLabel: 'Overall Progress',
      stageLabel: 'Stage: Completed',
      editHint: 'Click edit to update fields.',
      editingHint: 'Editing: save changes when done.',
      teamEdit: 'Edit Team',
      teamSave: 'Save',
      teamCancel: 'Cancel',
      teamAdd: 'Add Member',
      aiTeamTitle: 'AI Team',
      aiTeamEdit: 'Edit AI Team',
      aiTeamAdd: 'Add AI',
      directionTitle: 'Research Directions',
      directionEdit: 'Edit Directions',
      directionAdd: 'Add Direction',
      directionSave: 'Save',
      directionCancel: 'Cancel',
      tasksTitle: 'Task List',
      dialogTitle: 'Chat with Leader',
      dialogPlaceholder: 'Enter research instructions…',
      deepResearchTitle: 'Multi-agent Deep Research',
      deepResearchSubtitle: 'Multi-model collaboration and discussion outputs',
      deepResearchAgents: 'Team Visualization',
      deepResearchFlow: 'Research Workflow',
      deepResearchDiscussion: 'Discussion Timeline',
      deepResearchOutputs: 'Discussion Outputs',
      deepResearchStructure: 'Output Structure (Full)',
      deepResearchConsensus: 'Consensus',
      deepResearchDissent: 'Dissent',
      deepResearchKeyFindings: 'Key Findings',
      deepResearchOpportunities: 'Opportunities',
      deepResearchRisks: 'Risks',
      deepResearchOpenQuestions: 'Open Questions',
      deepResearchActionItems: 'Action Items',
      deepResearchChapters: 'Chapter Outputs',
      deepResearchEvidence: 'Evidence Sources',
      collaborationTitle: 'Research Progress',
      collaborationCount: 'Collaboration Messages',
      reportGenerated: 'Generated At',
      executiveSummary: 'Executive Summary',
      toc: 'Table of Contents',
      historyTitle: 'Research Timeline',
      credibilityTitle: 'Credibility Report',
      sourceEval: 'Source Evaluation',
      timeliness: 'Timeliness',
      coverage: 'Coverage',
      quality: 'AI Quality',
      limitation: 'Limitations',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

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

  const handleTeamSave = () => {
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

  const handleAiTeamSave = () => {
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

  const handleDirectionSave = () => {
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

  const handleTaskSave = () => {
    setTasks(tasksDraft);
    setIsEditingTasks(false);
  };

  const handleTaskCancel = () => {
    setTasksDraft(tasks);
    setIsEditingTasks(false);
  };

  const teamGraph = buildTeamNodes(activeTeam);
  const aiGraph = buildAiTeamNodes(activeAiTeam);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!topic) {
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
              <h1 className="truncate text-lg font-semibold text-gray-900">{topic.title}</h1>
              <p className="text-sm text-gray-500">{topic.subtitle}</p>
            </div>
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
                      <h2 className="mt-1 text-base font-semibold text-gray-900">{topic.title}</h2>
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
                      <button
                        type="button"
                        onClick={handleDirectionAdd}
                        className="w-full rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-purple-200 hover:text-purple-600"
                      >
                        {uiText.directionAdd}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {isEditingDirections || isEditingTeam ? uiText.editingHint : uiText.editHint}
                  </div>

                  <div className="mt-3 text-xs font-semibold text-emerald-600">{uiText.stageLabel}</div>
                </div>
              </aside>

              <section className="min-w-0">
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
                    {activeTab === 'tasks' ? (
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

                    {activeTab === 'deepresearch' ? (
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
                            <button
                              type="button"
                              onClick={() => setIsEditingAiTeam(true)}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                            >
                              {uiText.aiTeamEdit}
                            </button>
                          </div>
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
                              {deepResearch.stages.map((stage) => (
                                <DeepResearchStageRow key={stage.id} stage={stage} />
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                              <span>{uiText.deepResearchDiscussion}</span>
                              <span className="text-xs text-gray-400">{deepResearch.discussions.length} 条</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {deepResearch.discussions.map((item) => (
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
                      </div>
                    ) : null}

                    {activeTab === 'report' ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <CalendarClock size={16} className="text-purple-600" />
                            {uiText.reportGenerated}: {detail.report.generatedAt}
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
                      </div>
                    ) : null}

                    {activeTab === 'history' ? (
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

                    {activeTab === 'credibility' ? (
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
                              <div className="text-sm font-semibold text-gray-700">整体可信度</div>
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

                    {activeTab === 'references' ? (
                      <div className="space-y-3">
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
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
