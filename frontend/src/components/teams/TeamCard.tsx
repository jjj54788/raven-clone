'use client';

import Link from 'next/link';
import { Bot, Users } from 'lucide-react';
import type { Team } from '@/lib/teams';
import { useLanguage } from '@/i18n/LanguageContext';

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return '';
  }
}

export default function TeamCard({ team }: { team: Team }) {
  const { locale } = useLanguage();
  const memberCount = team.members.length;
  const assistantCount = team.assistants.length;
  const dateLabel = formatDateShort(team.updatedAt || team.createdAt);
  const showAlerts = typeof team.alerts === 'number' && team.alerts > 0;
  const memberLabel = locale === 'zh' ? '\u6210\u5458' : 'members';
  const assistantLabel = locale === 'zh' ? 'AI' : 'AI';

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{team.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{team.description}</p>
          </div>
        </div>
        {showAlerts ? (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            {team.alerts && team.alerts > 99 ? '99+' : team.alerts}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Users size={14} className="text-gray-400" />
          {memberCount} {memberLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Bot size={14} className="text-gray-400" />
          {assistantCount} {assistantLabel}
        </span>
        {dateLabel ? <span className="ml-auto">{dateLabel}</span> : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-2">
          {team.members.slice(0, 4).map((member) => (
            <div
              key={member.id}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
              style={{ backgroundColor: member.color }}
              title={member.name}
            >
              {member.avatar}
            </div>
          ))}
          {memberCount > 4 ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-semibold text-gray-600">
              +{memberCount - 4}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {team.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

