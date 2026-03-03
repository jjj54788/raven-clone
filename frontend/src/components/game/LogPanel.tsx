'use client';

import { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';
import type { GameState } from '@/game/types';

interface LogPanelProps {
  state: GameState;
  locale: string;
}

export default function LogPanel({ state, locale }: LogPanelProps) {
  const zh = locale === 'zh';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.log.length]);

  const recentLogs = state.log.slice(-10);

  return (
    <div className="frostpunk-panel flex flex-col gap-1 p-2 text-[11px]">
      <div className="flex items-center gap-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
        <ScrollText size={9} className="text-[#c8956b]/60" />
        {zh ? '事件日志' : 'EVENT LOG'}
      </div>
      <div
        ref={scrollRef}
        className="flex max-h-20 flex-col gap-0.5 overflow-y-auto"
      >
        {recentLogs.map((entry, i) => {
          const colorClass =
            entry.type === 'danger'
              ? 'text-red-400/80'
              : entry.type === 'warning'
                ? 'text-amber-400/80'
                : entry.type === 'success'
                  ? 'text-emerald-400/80'
                  : 'text-slate-500';
          return (
            <div key={i} className={`flex gap-1 ${colorClass}`}>
              <span className="shrink-0 font-mono text-slate-600">
                D{entry.day}
              </span>
              <span>{zh ? entry.messageZh : entry.messageEn}</span>
            </div>
          );
        })}
        {recentLogs.length === 0 && (
          <span className="text-slate-600">
            {zh ? '等待中...' : 'Awaiting events...'}
          </span>
        )}
      </div>
    </div>
  );
}
