'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, Bug, Zap, TriangleAlert, ArrowLeft,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { RELEASES, countChangesByType, type ChangeType } from '@/lib/changelog';
import { APP_VERSION } from '@/lib/version';

function typeMeta(type: ChangeType) {
  switch (type) {
    case 'feature':
      return { labelKey: 'whatsNew.features', className: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Sparkles };
    case 'fix':
      return { labelKey: 'whatsNew.bugFixes', className: 'bg-rose-50 text-rose-700 border-rose-100', icon: Bug };
    case 'improvement':
      return { labelKey: 'whatsNew.improvements', className: 'bg-sky-50 text-sky-700 border-sky-100', icon: Zap };
    default:
      return { labelKey: 'whatsNew.breaking', className: 'bg-amber-50 text-amber-800 border-amber-100', icon: TriangleAlert };
  }
}

export default function WhatsNewPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale, t } = useLanguage();

  const totals = useMemo(() => countChangesByType(RELEASES), []);

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

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
          <div className="mb-6">
            <Link
              href="/notifications"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={14} />
              {t('whatsNew.back')}
            </Link>

            <h1 className="mt-3 text-2xl font-semibold text-gray-900">
              {t('whatsNew.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('whatsNew.currentVersion')}:
              {' '}
              <span className="font-medium text-gray-800">{APP_VERSION}</span>
              {' '}
              <span className="text-gray-300">•</span>
              {' '}
              {RELEASES.length} {t('whatsNew.releases')}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
              <p className="text-2xl font-semibold text-emerald-800">{totals.feature}</p>
              <p className="mt-1 text-sm font-medium text-emerald-800/80">{t('whatsNew.features')}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
              <p className="text-2xl font-semibold text-rose-800">{totals.fix}</p>
              <p className="mt-1 text-sm font-medium text-rose-800/80">{t('whatsNew.bugFixes')}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
              <p className="text-2xl font-semibold text-sky-800">{totals.improvement}</p>
              <p className="mt-1 text-sm font-medium text-sky-800/80">{t('whatsNew.improvements')}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-2xl font-semibold text-amber-900">{totals.breaking}</p>
              <p className="mt-1 text-sm font-medium text-amber-900/80">{t('whatsNew.breaking')}</p>
            </div>
          </div>

          {/* Releases */}
          <div className="mt-8 space-y-7">
            {RELEASES.map((r) => (
              <div key={r.version} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{r.version}</h2>
                  <span className="text-sm text-gray-500">{r.date}</span>
                  {r.latest && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {t('whatsNew.latest')}
                    </span>
                  )}
                </div>

                <ul className="mt-4 space-y-2">
                  {r.changes.map((c, idx) => {
                    const meta = typeMeta(c.type);
                    const text = locale === 'zh' ? c.zh : c.en;
                    return (
                      <li key={`${r.version}-${idx}`} className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                          {t(meta.labelKey)}
                        </span>
                        <p className="text-sm text-gray-700">{text}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            <p>
              {locale === 'zh'
                ? '提示：你可以在 frontend/src/lib/changelog.ts 里维护每个版本的变更条目。'
                : 'Tip: maintain release entries in frontend/src/lib/changelog.ts.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
