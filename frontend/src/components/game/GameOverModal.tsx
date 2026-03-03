'use client';

import { Trophy, Skull, RotateCcw, Home } from 'lucide-react';
import type { GameState, GameAction } from '@/game/types';
import { getAlivePopulation } from '@/game/population';

interface GameOverModalProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  locale: string;
  onQuit: () => void;
}

export default function GameOverModal({ state, dispatch, locale, onQuit }: GameOverModalProps) {
  if (state.phase !== 'game_over' && state.phase !== 'victory') return null;

  const zh = locale === 'zh';
  const isVictory = state.phase === 'victory';
  const alive = getAlivePopulation(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="frostpunk-panel relative mx-4 w-full max-w-sm animate-[modal-in_0.35s_ease-out] overflow-hidden p-6 text-center">
        {/* Top accent */}
        <div
          className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent to-transparent ${
            isVictory ? 'via-amber-400/60' : 'via-red-500/60'
          }`}
        />

        {/* Icon */}
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isVictory ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-red-500/10 ring-1 ring-red-500/20'
          }`}
        >
          {isVictory ? (
            <Trophy size={30} className="text-amber-400/80" />
          ) : (
            <Skull size={30} className="text-red-400/80" />
          )}
        </div>

        {/* Title */}
        <h2 className="mb-1 text-2xl font-bold tracking-wide text-slate-100">
          {isVictory
            ? zh ? '胜利！' : 'VICTORY'
            : zh ? '定居点覆灭' : 'SETTLEMENT LOST'}
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          {isVictory
            ? zh ? `你成功存活了 ${state.day} 天！` : `You survived ${state.day} days!`
            : zh ? `你存活了 ${state.day} 天` : `You lasted ${state.day} days`}
        </p>

        {/* Score Breakdown */}
        <div className="mb-5 rounded-lg bg-slate-900/40 p-4 text-sm ring-1 ring-slate-700/30">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {zh ? '分数明细' : 'SCORE BREAKDOWN'}
          </div>
          <div className="space-y-1.5 text-left text-[12px]">
            <ScoreLine label={zh ? '存活天数' : 'Days survived'} value={`${state.day} × 100`} />
            <ScoreLine label={zh ? '存活人口' : 'Alive pop.'} value={`${alive} × 50`} />
            <ScoreLine label={zh ? '希望值' : 'Hope bonus'} value={`${state.morale.hope} × 2`} />
            <ScoreLine
              label={zh ? '死亡惩罚' : 'Death penalty'}
              value={`-${state.population.dead} × 30`}
              negative
            />
            <ScoreLine
              label={zh ? '难度系数' : 'Difficulty'}
              value={state.difficulty === 'hard' ? '×1.5' : state.difficulty === 'easy' ? '×0.7' : '×1.0'}
            />
            <div className="mt-2 border-t border-slate-700/30 pt-2 text-right">
              <span className="text-[10px] text-slate-500">{zh ? '最终分数' : 'Final'}: </span>
              <span className="text-xl font-bold text-amber-300/90">{state.score}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => dispatch({ type: 'NEW_GAME', difficulty: state.difficulty })}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-blue-200 ring-1 ring-blue-400/20 transition hover:bg-[#254a75]"
          >
            <RotateCcw size={15} />
            {zh ? '再来一局' : 'Play Again'}
          </button>
          <button
            onClick={onQuit}
            className="flex items-center gap-2 rounded-lg bg-slate-700/30 px-4 py-2.5 text-sm text-slate-400 ring-1 ring-slate-600/30 transition hover:bg-slate-600/30"
          >
            <Home size={15} />
            {zh ? '菜单' : 'Menu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreLine({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={negative ? 'text-red-400/80' : 'text-slate-300'}>{value}</span>
    </div>
  );
}
