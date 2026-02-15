'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Download,
  LayoutGrid,
  MessageCircle,
  Pencil,
  Users,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TeamCanvas from '@/components/teams/TeamCanvas';
import EditTeamModal from '@/components/teams/EditTeamModal';
import { useAuth, useTeams } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TeamAssistant } from '@/lib/teams';

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
  const { teams, ready, replaceTeam } = useTeams(userName, authReady);

  const [view, setView] = useState<'team' | 'chat' | 'canvas'>('canvas');
  const [editOpen, setEditOpen] = useState(false);

  const team = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);

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
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!ready) {
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
                  onUpdate={(nextCanvas) => {
                    replaceTeam(team.id, (current) => ({
                      ...current,
                      canvas: nextCanvas,
                      updatedAt: new Date().toISOString(),
                    }));
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
            </section>
          </div>
        </div>
      </main>

      {editOpen && (
        <EditTeamModal
          open={editOpen}
          team={team}
          onClose={() => setEditOpen(false)}
          onSave={(next) => {
            replaceTeam(team.id, () => next);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
