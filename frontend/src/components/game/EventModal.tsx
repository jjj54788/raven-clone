'use client';

import { AlertTriangle } from 'lucide-react';
import type { GameState, GameAction } from '@/game/types';

interface EventModalProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  locale: string;
}

export default function EventModal({ state, dispatch, locale }: EventModalProps) {
  if (!state.pendingEvent) return null;

  const event = state.pendingEvent;
  const zh = locale === 'zh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="frostpunk-panel mx-4 w-full max-w-md animate-[modal-in_0.3s_ease-out] p-6">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Icon + Title */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
            <AlertTriangle size={20} className="text-amber-400/80" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wide text-slate-100">
              {zh ? event.titleZh : event.titleEn}
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {zh ? `第 ${state.day} 天` : `Day ${state.day}`}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-5 text-sm leading-relaxed text-slate-400">
          {zh ? event.descriptionZh : event.descriptionEn}
        </p>

        {/* Choices */}
        <div className="flex flex-col gap-2">
          {event.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => dispatch({ type: 'EVENT_CHOICE', choiceIndex: idx })}
              className="rounded-lg bg-slate-700/30 px-4 py-3 text-left text-sm text-slate-200 ring-1 ring-slate-600/30 transition-all hover:bg-slate-600/30 hover:ring-[#c8956b]/30 hover:text-slate-100"
            >
              {zh ? choice.labelZh : choice.labelEn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
