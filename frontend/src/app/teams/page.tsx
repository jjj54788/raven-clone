'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TeamCard from '@/components/teams/TeamCard';
import CreateTeamModal from '@/components/teams/CreateTeamModal';
import { useAuth, useTeams } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';

export default function TeamsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const { teams, ready, addTeam } = useTeams(userName, authReady);

  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const uiText = useMemo(() => {
    const zh = {
      title: 'AI \u56e2\u961f',
      subtitle: '\u591a\u4eba\u591a AI \u534f\u4f5c\u8ba8\u8bba\u793e\u533a',
      tabMine: '\u81ea\u5efa\u56e2\u961f',
      tabDiscover: '\u53d1\u73b0',
      searchPlaceholder: '\u641c\u7d22\u81ea\u5efa\u56e2\u961f...',
      create: '\u65b0\u5efa\u56e2\u961f',
      empty: '\u6682\u65e0\u56e2\u961f\uff0c\u6dfb\u52a0\u4e00\u4e2a\u5f00\u59cb\u5408\u4f5c\uff1f',
      discoverEmpty: '\u66f4\u591a\u56e2\u961f\u6b63\u5728\u63a2\u7d22\u4e2d\uff0c\u656c\u8bf7\u671f\u5f85\u3002',
      newCard: '\u65b0\u5efa\u56e2\u961f',
    };
    const en = {
      title: 'AI Teams',
      subtitle: 'Multi-AI collaboration workspace',
      tabMine: 'My Teams',
      tabDiscover: 'Discover',
      searchPlaceholder: 'Search teams...',
      create: 'Create Team',
      empty: 'No teams yet. Create one to get started.',
      discoverEmpty: 'Discover is coming soon.',
      newCard: 'Create Team',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => {
      const hay = [team.name, team.description, ...team.tags].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [search, teams]);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
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
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setTab('mine')}
                    className={[
                      'relative pb-2 text-sm font-semibold transition-colors',
                      tab === 'mine' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    {uiText.tabMine} <span className="text-xs text-gray-400">({teams.length})</span>
                    {tab === 'mine' && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-purple-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('discover')}
                    className={[
                      'relative pb-2 text-sm font-semibold transition-colors',
                      tab === 'discover' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    {uiText.tabDiscover}
                    {tab === 'discover' && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-purple-600" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                <Plus size={16} />
                {uiText.create}
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <Search size={16} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={uiText.searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {tab === 'discover' ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                {uiText.discoverEmpty}
              </div>
            ) : !ready ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
            ) : (
              <>
                {filteredTeams.length === 0 ? (
                  <div className="mb-4 rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                    {uiText.empty}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="flex min-h-[170px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white text-sm font-semibold text-gray-500 transition-colors hover:border-purple-200 hover:text-purple-700"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                      <Plus size={22} />
                    </div>
                    <span className="mt-3">{uiText.newCard}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <CreateTeamModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(draft) => {
          addTeam(draft);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}





