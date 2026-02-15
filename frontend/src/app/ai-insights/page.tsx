'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Cpu,
  Globe2,
  Share2,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  createInsightFromMacro,
  getAllInsightTopics,
  getInsightTopic,
  type InsightTopicSummary,
  type NewInsightPayload,
} from '@/lib/ai-insights-data';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconComponent> = {
  globe: Globe2,
  chip: Cpu,
  building: Building2,
  network: Share2,
};

function InsightCard({ topic }: { topic: InsightTopicSummary }) {
  const Icon = ICONS[topic.icon] || Sparkles;
  const progress = Math.min(100, Math.round((topic.dimensionDone / topic.dimensionTotal) * 100));

  return (
    <Link
      href={`/ai-insights/topic/${topic.id}`}
      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${topic.accent.iconBg} ${topic.accent.iconText} shadow-sm`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">{topic.category}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${topic.accent.tagBg} ${topic.accent.tagText}`}>
              {topic.visibility}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-gray-900">
            {topic.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {topic.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            {topic.reportCount} 份报告
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            {topic.sourceCount} 个来源
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>维度完成度</span>
            <span>{topic.dimensionDone}/{topic.dimensionTotal}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
            <div className={`h-1.5 rounded-full ${topic.accent.progress}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          上次刷新: {topic.lastUpdated}
        </div>
      </div>
    </Link>
  );
}

export default function AiInsightsPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState<InsightTopicSummary[]>(() => getAllInsightTopics());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [draft, setDraft] = useState<NewInsightPayload>(() => {
    const macro = getInsightTopic('us-ai-macro');
    return {
      title: macro?.title ?? 'AI宏观洞察',
      subtitle: macro?.subtitle ?? 'AI宏观洞察',
      category: macro?.category ?? '宏观洞察',
      visibility: macro?.visibility ?? '公开',
      icon: macro?.icon ?? 'globe',
    };
  });

  useEffect(() => {
    setTopics(getAllInsightTopics());
  }, []);

  const uiText = useMemo(() => {
    const zh = {
      title: 'AI 洞察',
      subtitle: 'AI 驱动的行业专题监控与分析',
      searchPlaceholder: '搜索洞察...',
      create: '新建洞察',
      emptyTitle: '没有匹配的洞察专题',
      emptyHint: '试试更换关键词，或者创建一个新的洞察。',
      createCard: '创建专题',
      createTitle: '新建洞察',
      createDesc: '基于 AI 宏观洞察模板生成新的洞察专题。',
      fieldTitle: '洞察名称',
      fieldSubtitle: '洞察副标题',
      fieldCategory: '分类',
      fieldVisibility: '可见性',
      fieldIcon: '图标',
      createSubmit: '创建并打开',
      createCancel: '取消',
      createTitlePlaceholder: '例如：美国AI宏观洞察',
      createSubtitlePlaceholder: '可选，留空将自动与名称一致',
      createRequired: '请填写洞察名称',
    };
    const en = {
      title: 'AI Insights',
      subtitle: 'AI-driven industry monitoring and analysis',
      searchPlaceholder: 'Search insights...',
      create: 'New Insight',
      emptyTitle: 'No matching insights',
      emptyHint: 'Try a different keyword or create a new insight.',
      createCard: 'Create Topic',
      createTitle: 'New Insight',
      createDesc: 'Generate a new topic based on the AI macro insight template.',
      fieldTitle: 'Title',
      fieldSubtitle: 'Subtitle',
      fieldCategory: 'Category',
      fieldVisibility: 'Visibility',
      fieldIcon: 'Icon',
      createSubmit: 'Create & open',
      createCancel: 'Cancel',
      createTitlePlaceholder: 'e.g. US AI Macro Insights',
      createSubtitlePlaceholder: 'Optional, defaults to title',
      createRequired: 'Please enter a title',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  const categoryOptions = useMemo(() => ['宏观洞察', '技术趋势', '企业追踪'], []);
  const visibilityOptions = useMemo(() => ['公开', '私有'], []);
  const iconOptions = useMemo(
    () => [
      { value: 'globe', label: '宏观/全球' },
      { value: 'chip', label: '技术/芯片' },
      { value: 'building', label: '企业' },
      { value: 'network', label: '网络/生态' },
    ],
    [],
  );

  const openCreate = () => {
    const macro = getInsightTopic('us-ai-macro');
    setDraft({
      title: macro?.title ?? 'AI宏观洞察',
      subtitle: macro?.subtitle ?? 'AI宏观洞察',
      category: macro?.category ?? '宏观洞察',
      visibility: macro?.visibility ?? '公开',
      icon: macro?.icon ?? 'globe',
    });
    setCreateError('');
    setCreating(true);
  };

  const handleCreate = () => {
    const title = draft.title.trim();
    if (!title) {
      setCreateError(uiText.createRequired);
      return;
    }
    const summary = createInsightFromMacro({
      ...draft,
      title,
      subtitle: draft.subtitle?.trim() || title,
    });
    setTopics((prev) => [summary, ...prev]);
    setCreating(false);
    setQuery('');
    router.push(`/ai-insights/topic/${summary.id}`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((topic) => {
      const hay = [topic.title, topic.subtitle, topic.category].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [query, topics]);

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
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={openCreate}
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={uiText.searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
                <p className="text-sm font-medium text-gray-700">{uiText.emptyTitle}</p>
                <p className="mt-1 text-sm text-gray-500">{uiText.emptyHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((topic) => (
                  <InsightCard key={topic.id} topic={topic} />
                ))}
                <button
                  type="button"
                  onClick={openCreate}
                  className="group flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 p-6 text-sm text-gray-400 transition-colors hover:border-purple-200 hover:text-purple-600"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                    <Plus size={20} />
                  </div>
                  <span className="mt-3 font-medium">{uiText.createCard}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {creating ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setCreating(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{uiText.createTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">{uiText.createDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"
                aria-label={uiText.createCancel}
                title={uiText.createCancel}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">{uiText.fieldTitle}</label>
                <input
                  value={draft.title}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, title: e.target.value }));
                    if (createError) setCreateError('');
                  }}
                  placeholder={uiText.createTitlePlaceholder}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">{uiText.fieldSubtitle}</label>
                <input
                  value={draft.subtitle ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder={uiText.createSubtitlePlaceholder}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">{uiText.fieldCategory}</label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">{uiText.fieldVisibility}</label>
                  <select
                    value={draft.visibility}
                    onChange={(e) => setDraft((prev) => ({ ...prev, visibility: e.target.value as NewInsightPayload['visibility'] }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">{uiText.fieldIcon}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {iconOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, icon: option.value }))}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        draft.icon === option.value
                          ? 'border-purple-200 bg-purple-50 text-purple-600'
                          : 'border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {createError ? <p className="text-xs text-red-600">{createError}</p> : null}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {uiText.createCancel}
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  {uiText.createSubmit}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
