'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Circle,
  Download,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  Pencil,
  Plus,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TeamCanvas from '@/components/teams/TeamCanvas';
import EditTeamModal from '@/components/teams/EditTeamModal';
import { useAuth, useTeams } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  getTeam,
  addTeamMember,
  listTodoLists,
  createTodoList,
  listTodoTasks,
  createTodoTask,
  updateTodoTask,
  decomposeTodo,
  type TodoTask,
  type TodoList,
} from '@/lib/api';
import { apiTeamDetailToTeam, type Team, type TeamAssistant } from '@/lib/teams';

function statusBadge(status?: string) {
  if (status === 'done') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'running') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function statusLabel(status: string | undefined, locale: 'en' | 'zh') {
  if (locale === 'en') {
    if (status === 'done') return 'Done';
    if (status === 'running') return 'Running';
    return 'Idle';
  }
  if (status === 'done') return '\u5df2\u5b8c\u6210';
  if (status === 'running') return '\u8fd0\u884c\u4e2d';
  return '\u5f85\u547d';
}

function memberRoleLabel(role: string, locale: 'en' | 'zh') {
  if (locale === 'en') return role === 'owner' ? 'Owner' : 'Member';
  return role === 'owner' ? '\u8d1f\u8d23\u4eba' : '\u6210\u5458';
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const { replaceTeam } = useTeams(authReady);

  const [team, setTeam] = useState<Team | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [view, setView] = useState<'team' | 'chat' | 'canvas' | 'tasks'>('canvas');
  const [editOpen, setEditOpen] = useState(false);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Team tasks state
  const [teamListId, setTeamListId] = useState<string | null>(null);
  const [teamTasks, setTeamTasks] = useState<TodoTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [decomposeOpen, setDecomposeOpen] = useState(false);
  const [decomposeGoal, setDecomposeGoal] = useState('');
  const [decomposeLoading, setDecomposeLoading] = useState(false);
  const [decomposeError, setDecomposeError] = useState('');

  const loadTeamDetail = useCallback(async () => {
    if (!teamId) return;
    setDetailLoading(true);
    try {
      const data = await getTeam(teamId);
      setTeam(apiTeamDetailToTeam(data));
    } catch {
      setTeam(null);
    } finally {
      setDetailLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (authReady) loadTeamDetail();
  }, [authReady, loadTeamDetail]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !teamId) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await addTeamMember(teamId, { email });
      setInviteEmail('');
      setInviteMsg({ ok: true, text: locale === 'zh' ? '\u9080\u8bf7\u6210\u529f' : 'Invitation sent' });
      await loadTeamDetail();
    } catch (err: any) {
      setInviteMsg({ ok: false, text: locale === 'zh' ? '\u7528\u6237\u4e0d\u5b58\u5728' : (err?.message || 'User not found') });
    } finally {
      setInviting(false);
      setTimeout(() => setInviteMsg(null), 4000);
    }
  };

  // Resolve or create a dedicated todo list for this team
  const resolveTeamList = useCallback(async (teamName: string): Promise<string> => {
    const listName = `Team: ${teamName}`;
    const lists: TodoList[] = await listTodoLists();
    const existing = lists.find((l) => l.name === listName);
    if (existing) return existing.id;
    const created = await createTodoList({ name: listName, color: '#7c3aed' });
    return created.id;
  }, []);

  const loadTeamTasks = useCallback(async () => {
    if (!team) return;
    setTasksLoading(true);
    try {
      const listId = teamListId ?? await resolveTeamList(team.name);
      if (!teamListId) setTeamListId(listId);
      const res = await listTodoTasks({ listId, status: 'open' });
      setTeamTasks(res);
    } catch {
      setTeamTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [team, teamListId, resolveTeamList]);

  useEffect(() => {
    if (view === 'tasks' && team) loadTeamTasks();
  }, [view, team, loadTeamTasks]);

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !team) return;
    setAddingTask(true);
    try {
      let listId = teamListId;
      if (!listId) {
        listId = await resolveTeamList(team.name);
        setTeamListId(listId);
      }
      const task = await createTodoTask({ title, listId, priority: 0 });
      setTeamTasks((prev) => [task, ...prev]);
      setNewTaskTitle('');
    } catch {
      // ignore
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (task: TodoTask) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      await updateTodoTask(task.id, { status: newStatus });
      setTeamTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch {
      // ignore
    }
  };

  const handleDecompose = async () => {
    const goal = decomposeGoal.trim();
    if (!goal || !team) return;
    setDecomposeLoading(true);
    setDecomposeError('');
    try {
      let listId = teamListId;
      if (!listId) {
        listId = await resolveTeamList(team.name);
        setTeamListId(listId);
      }
      const { tasks } = await decomposeTodo({ goal, listId });
      setTeamTasks((prev) => [...(tasks ?? []), ...prev]);
      setDecomposeOpen(false);
      setDecomposeGoal('');
    } catch {
      setDecomposeError(locale === 'zh' ? 'AI 拆解失败，请重试' : 'AI decompose failed. Please try again.');
    } finally {
      setDecomposeLoading(false);
    }
  };

  const uiText = useMemo(() => {
    const zh = {
      back: '\u8fd4\u56de\u56e2\u961f',
      members: 'MEMBERS',
      assistants: 'AI ASSISTANTS',
      teamCanvas: 'AI Team Canvas',
      done: '\u5df2\u5b8c\u6210',
      download: '\u4e0b\u8f7d PDF \u62a5\u544a',
      chatEmpty: 'AI Team Chat \u529f\u80fd\u5373\u5c06\u4e0a\u7ebf',
      teamEmpty: '\u56e2\u961f\u5927\u5c4f\u4fe1\u606f\u6b63\u5728\u8865\u5168',
      canvasHint: '\u62d6\u52a8 AI \u8282\u70b9\u8c03\u6574\u5e03\u5c40',
      edit: '\u7f16\u8f91\u56e2\u961f',
      aiTeam: 'AI Team',
      chat: 'Chat',
      canvas: 'Canvas',
      tasks: '\u4efb\u52a1',
      invitePlaceholder: '\u8f93\u5165\u90ae\u7b71\u9080\u8bf7',
      inviteBtn: '\u9080\u8bf7',
      taskPlaceholder: '\u65b0\u5efa\u4efb\u52a1\u2026',
      addTask: '\u6dfb\u52a0',
      aiDecompose: 'AI \u62c6\u89e3',
      decomposeTitle: 'AI \u62c6\u89e3\u56e2\u961f\u76ee\u6807',
      decomposePlaceholder: '\u63cf\u8ff0\u56e2\u961f\u76ee\u6807\uff0cAI \u5c06\u81ea\u52a8\u62c6\u89e3\u6210\u5177\u4f53\u4efb\u52a1\u2026',
      decomposeSubmit: '\u5f00\u59cb\u62c6\u89e3',
      decomposeLoading: 'AI \u62c6\u89e3\u4e2d\u2026',
      noTasks: '\u6682\u65e0\u4efb\u52a1\uff0c\u5feb\u6765\u521b\u5efa\u7b2c\u4e00\u4e2a\u5427',
    };
    const en = {
      back: 'Back to Teams',
      members: 'MEMBERS',
      assistants: 'AI ASSISTANTS',
      teamCanvas: 'AI Team Canvas',
      done: 'Completed',
      download: 'Download PDF',
      chatEmpty: 'AI Team Chat is coming soon',
      teamEmpty: 'Team overview is coming soon',
      canvasHint: 'Drag AI nodes to adjust layout',
      edit: 'Edit team',
      aiTeam: 'AI Team',
      chat: 'Chat',
      canvas: 'Canvas',
      tasks: 'Tasks',
      invitePlaceholder: 'Email address to invite',
      inviteBtn: 'Invite',
      taskPlaceholder: 'New task…',
      addTask: 'Add',
      aiDecompose: 'AI Decompose',
      decomposeTitle: 'AI Decompose Team Goal',
      decomposePlaceholder: 'Describe the team goal, AI will break it into actionable tasks…',
      decomposeSubmit: 'Decompose',
      decomposeLoading: 'AI is decomposing…',
      noTasks: 'No tasks yet. Create the first one!',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  if (!authReady || detailLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">Team not found</p>
          <Link href="/teams" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-purple-600">
            <ArrowLeft size={16} />
            {uiText.back}
          </Link>
        </div>
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
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/teams"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-purple-700"
              >
                <ArrowLeft size={16} />
                {uiText.back}
              </Link>
              <span className="text-sm text-gray-300">/</span>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{team.name}</h1>
                <p className="text-xs text-gray-500">{team.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                  view === 'team'
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                onClick={() => setView('team')}
              >
                <Users size={16} />
                {uiText.aiTeam}
              </button>
              <button
                type="button"
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                  view === 'chat'
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                onClick={() => setView('chat')}
              >
                <MessageCircle size={16} />
                {uiText.chat}
              </button>
              <button
                type="button"
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                  view === 'canvas'
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                onClick={() => setView('canvas')}
              >
                <LayoutGrid size={16} />
                {uiText.canvas}
              </button>
              <button
                type="button"
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                  view === 'tasks'
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                onClick={() => setView('tasks')}
              >
                <ListChecks size={16} />
                {uiText.tasks}
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Pencil size={16} />
                {uiText.edit}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Download size={16} />
                {uiText.download}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
            <aside className="w-full shrink-0 space-y-4 lg:w-80">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Users size={16} className="text-purple-600" />
                  {team.name}
                </div>
                <p className="mt-2 text-sm text-gray-500">{team.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {team.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{uiText.members}</p>
                <div className="mt-3 space-y-2">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-400">{memberRoleLabel(member.role, locale)}</p>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${member.online ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        title={member.online ? 'Online' : 'Offline'}
                      />
                    </div>
                  ))}
                </div>

                {/* Invite member */}
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInvite(); } }}
                      placeholder={uiText.invitePlaceholder}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-purple-300"
                    />
                    <button
                      type="button"
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300"
                    >
                      <UserPlus size={12} />
                      {uiText.inviteBtn}
                    </button>
                  </div>
                  {inviteMsg && (
                    <p className={`mt-1.5 text-xs ${inviteMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {inviteMsg.text}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{uiText.assistants}</p>
                <div className="mt-3 space-y-2">
                  {team.assistants.map((assistant: TeamAssistant) => (
                    <div
                      key={assistant.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${assistant.accent} text-white`}
                      >
                        <span className="text-sm font-semibold">{assistant.iconText}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{assistant.name}</p>
                        <p className="text-xs text-gray-500">{assistant.provider} - {assistant.model}</p>
                        <p className="text-xs text-gray-400">{assistant.role}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(assistant.status)}`}
                      >
                        {statusLabel(assistant.status, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <section className="min-w-0 flex-1 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-purple-600" />
                  <h2 className="text-base font-semibold text-gray-900">{uiText.teamCanvas}</h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {uiText.done}
                  </span>
                </div>
                {team.goal && (
                  <p className="mt-2 text-sm text-gray-500">{team.goal}</p>
                )}
                {view === 'canvas' && (
                  <p className="mt-2 text-xs text-gray-400">{uiText.canvasHint}</p>
                )}
              </div>

              {view === 'canvas' && (
                <TeamCanvas
                  team={team}
                  editable
                  onUpdate={async (nextCanvas) => {
                    const updated = { ...team, canvas: nextCanvas, updatedAt: new Date().toISOString() };
                    setTeam(updated);
                    await replaceTeam(updated, team);
                  }}
                />
              )}

              {view === 'chat' && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                  {uiText.chatEmpty}
                </div>
              )}

              {view === 'team' && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                  {uiText.teamEmpty}
                </div>
              )}

              {view === 'tasks' && (
                <div className="space-y-3">
                  {/* Quick-add + AI Decompose toolbar */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
                      placeholder={uiText.taskPlaceholder}
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                    />
                    <button
                      type="button"
                      onClick={handleAddTask}
                      disabled={addingTask || !newTaskTitle.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300"
                    >
                      <Plus size={16} />
                      {uiText.addTask}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecomposeOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      <Sparkles size={16} />
                      {uiText.aiDecompose}
                    </button>
                  </div>

                  {/* AI Decompose Modal */}
                  {decomposeOpen && (
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-purple-900">{uiText.decomposeTitle}</p>
                      <textarea
                        value={decomposeGoal}
                        onChange={(e) => setDecomposeGoal(e.target.value)}
                        rows={3}
                        placeholder={uiText.decomposePlaceholder}
                        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none"
                      />
                      {decomposeError && <p className="text-xs text-rose-600">{decomposeError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDecompose}
                          disabled={decomposeLoading || !decomposeGoal.trim()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300"
                        >
                          <Sparkles size={14} />
                          {decomposeLoading ? uiText.decomposeLoading : uiText.decomposeSubmit}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDecomposeOpen(false); setDecomposeGoal(''); setDecomposeError(''); }}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          {locale === 'zh' ? '取消' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Task list */}
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                    {tasksLoading ? (
                      <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
                    ) : teamTasks.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-400">{uiText.noTasks}</div>
                    ) : (
                      teamTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task)}
                            className="shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            {task.status === 'DONE'
                              ? <CheckCircle2 size={18} className="text-emerald-500" />
                              : <Circle size={18} />}
                          </button>
                          <span className={`flex-1 text-sm ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                          </span>
                          {task.dueAt && (
                            <span className="text-xs text-gray-400">
                              {new Date(task.dueAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {editOpen && team && (
        <EditTeamModal
          open={editOpen}
          team={team}
          onClose={() => setEditOpen(false)}
          onSave={async (next) => {
            // Preserve existing assistants from API until EditTeamModal supports dynamic catalog (Step 10)
            const safeNext: Team = { ...next, assistants: team.assistants, leaderId: team.leaderId };
            await replaceTeam(safeNext, team);
            setEditOpen(false);
            await loadTeamDetail();
          }}
        />
      )}
    </div>
  );
}
