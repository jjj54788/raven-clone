'use client';

import { useMemo } from 'react';
import {
  Thermometer,
  Wheat,
  TreePine,
  Flame,
  Wrench,
  Users,
  Heart,
  Frown,
  Sun,
  Star,
} from 'lucide-react';
import type { GameState } from '@/game/types';
import { getProductionPerTurn, getConsumptionPerTurn } from '@/game/resources';
import { getAlivePopulation, getAvailableWorkers, getAvailableEngineers } from '@/game/population';

interface GameHUDProps {
  state: GameState;
  locale: string;
}

export default function GameHUD({ state, locale }: GameHUDProps) {
  const zh = locale === 'zh';

  const production = useMemo(() => getProductionPerTurn(state), [state]);
  const consumption = useMemo(() => getConsumptionPerTurn(state), [state]);
  const alive = getAlivePopulation(state);
  const availWorkers = getAvailableWorkers(state);
  const availEngineers = getAvailableEngineers(state);

  const tempVal = Math.round(state.globalTemperature);
  const tempSeverity =
    tempVal > -25 ? 0 : tempVal > -35 ? 1 : tempVal > -45 ? 2 : 3;

  return (
    <div className="frostpunk-panel flex items-center gap-2 px-3 py-1.5 text-[13px]">
      {/* Day Counter */}
      <div className="flex items-center gap-1.5 border-r border-[rgba(100,130,160,0.2)] pr-2.5">
        <Sun size={14} className="text-amber-500/80" />
        <span className="font-bold tracking-wide text-amber-200/90">
          {zh ? `第 ${state.day} 天` : `Day ${state.day}`}
        </span>
        <span className="text-[10px] text-slate-500">/ {state.targetDays}</span>
      </div>

      {/* Temperature Gauge */}
      <div className="flex items-center gap-1.5 border-r border-[rgba(100,130,160,0.2)] pr-2.5">
        <Thermometer
          size={14}
          className={[
            'text-blue-300',
            'text-blue-400',
            'text-indigo-400',
            'text-violet-400',
          ][tempSeverity]}
        />
        <div className="flex items-center gap-1">
          <span
            className={`font-mono text-sm font-bold ${
              ['text-blue-300', 'text-blue-400', 'text-indigo-400', 'text-violet-400'][tempSeverity]
            }`}
          >
            {tempVal > 0 ? '+' : ''}
            {tempVal}°
          </span>
          {/* Mini temperature bar */}
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                ['bg-blue-400', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-600'][tempSeverity]
              }`}
              style={{ width: `${Math.max(5, 100 - Math.abs(tempVal) * 1.5)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="flex items-center gap-2 border-r border-[rgba(100,130,160,0.2)] pr-2.5">
        <ResourceBadge
          icon={<Wheat size={13} className="text-amber-400/80" />}
          value={state.resources.food}
          delta={production.food - consumption.food}
        />
        <ResourceBadge
          icon={<TreePine size={13} className="text-emerald-400/80" />}
          value={state.resources.wood}
          delta={production.wood - consumption.wood}
        />
        <ResourceBadge
          icon={<Flame size={13} className="text-orange-400/80" />}
          value={state.resources.coal}
          delta={production.coal - consumption.coal}
        />
        <ResourceBadge
          icon={<Wrench size={13} className="text-slate-400/80" />}
          value={state.resources.steel}
          delta={production.steel - consumption.steel}
        />
      </div>

      {/* Population */}
      <div className="flex items-center gap-1.5 border-r border-[rgba(100,130,160,0.2)] pr-2.5">
        <Users size={13} className="text-sky-400/80" />
        <span className="font-mono text-sm font-semibold text-slate-200">{alive}</span>
        <span className="text-[10px] text-slate-500">
          {availWorkers}W {availEngineers}E
        </span>
        {state.population.sick > 0 && (
          <span className="rounded bg-red-500/15 px-1 text-[10px] font-medium text-red-400">
            {state.population.sick} {zh ? '病' : 'sick'}
          </span>
        )}
      </div>

      {/* Morale Gauges */}
      <div className="flex items-center gap-2">
        <MoraleGauge
          icon={<Heart size={12} className="text-emerald-400/80" />}
          value={state.morale.hope}
          color="emerald"
          label={zh ? '希望' : 'Hope'}
        />
        <MoraleGauge
          icon={<Frown size={12} className="text-red-400/80" />}
          value={state.morale.discontent}
          color="red"
          label={zh ? '不满' : 'Unrest'}
        />
      </div>

      {/* Score */}
      <div className="ml-auto flex items-center gap-1 border-l border-[rgba(100,130,160,0.2)] pl-2.5">
        <Star size={12} className="text-amber-500/70" />
        <span className="font-mono text-sm font-bold text-amber-300/90">{state.score}</span>
      </div>
    </div>
  );
}

function ResourceBadge({
  icon,
  value,
  delta,
}: {
  icon: React.ReactNode;
  value: number;
  delta: number;
}) {
  const isLow = value < 10;
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className={`font-mono text-xs ${isLow ? 'font-bold text-red-400' : 'text-slate-200'}`}>
        {value}
      </span>
      {delta !== 0 && (
        <span
          className={`text-[10px] font-medium ${delta > 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}
        >
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
  );
}

function MoraleGauge({
  icon,
  value,
  color,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  color: 'emerald' | 'red';
  label: string;
}) {
  const barColor = color === 'emerald' ? 'bg-emerald-500/80' : 'bg-red-500/80';
  const trackColor = color === 'emerald' ? 'bg-emerald-900/30' : 'bg-red-900/30';

  return (
    <div className="flex items-center gap-1" title={`${label}: ${value}`}>
      {icon}
      <div className={`h-1.5 w-12 overflow-hidden rounded-full ${trackColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-5 text-right font-mono text-[10px] text-slate-500">{value}</span>
    </div>
  );
}
