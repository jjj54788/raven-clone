'use client';

import { useMemo } from 'react';
import {
  Hammer,
  X,
  ChevronRight,
} from 'lucide-react';
import type { GameState, GameAction, BuildingType, Resources } from '@/game/types';
import { getBuildingDef } from '@/game/constants';
import { getAvailableBuildings, canAfford } from '@/game/buildings';
import { getAvailableWorkers, getAvailableEngineers } from '@/game/population';

interface BuildPanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  locale: string;
}

export default function BuildPanel({ state, dispatch, locale }: BuildPanelProps) {
  const zh = locale === 'zh';
  const available = useMemo(() => getAvailableBuildings(state), [state]);
  const freeW = getAvailableWorkers(state);
  const freeE = getAvailableEngineers(state);

  return (
    <div className="frostpunk-panel flex w-44 flex-col gap-1 p-2.5 text-sm md:w-52">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <Hammer size={12} className="text-[#c8956b]" />
        {zh ? '建造' : 'BUILD'}
      </div>

      {state.selectedBuildingType && (
        <button
          onClick={() => dispatch({ type: 'SELECT_BUILDING_TYPE', buildingType: null })}
          className="mb-1 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1 text-[11px] text-red-400/80 ring-1 ring-red-500/20 hover:bg-red-500/15"
        >
          <X size={11} />
          {zh ? '取消放置' : 'Cancel'} [Esc]
        </button>
      )}

      <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {available.map((type) => (
          <BuildingButton
            key={type}
            type={type}
            state={state}
            dispatch={dispatch}
            locale={locale}
            freeWorkers={freeW}
            freeEngineers={freeE}
          />
        ))}
      </div>
    </div>
  );
}

function BuildingButton({
  type,
  state,
  dispatch,
  locale,
  freeWorkers,
  freeEngineers,
}: {
  type: BuildingType;
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  locale: string;
  freeWorkers: number;
  freeEngineers: number;
}) {
  const def = getBuildingDef(type);
  if (!def) return null;

  const zh = locale === 'zh';
  const affordable = canAfford(state, type);
  const isSelected = state.selectedBuildingType === type;

  const costEntries = Object.entries(def.cost).filter(
    ([, v]) => v && v > 0,
  ) as [keyof Resources, number][];

  return (
    <button
      onClick={() =>
        dispatch({
          type: 'SELECT_BUILDING_TYPE',
          buildingType: isSelected ? null : type,
        })
      }
      disabled={!affordable}
      className={`flex items-start gap-2 rounded-md p-1.5 text-left transition-all ${
        isSelected
          ? 'bg-[#c8956b]/15 ring-1 ring-[#c8956b]/40'
          : affordable
            ? 'hover:bg-slate-700/30'
            : 'cursor-not-allowed opacity-35'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-medium text-slate-200">{zh ? def.nameZh : def.name}</span>
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {costEntries.map(([key, cost]) => {
            const has = state.resources[key] >= cost;
            return (
              <span
                key={key}
                className={`rounded px-1 text-[9px] ${
                  has
                    ? 'bg-slate-700/50 text-slate-400'
                    : 'bg-red-900/25 text-red-400/80'
                }`}
              >
                {cost}{key[0].toUpperCase()}
              </span>
            );
          })}
          {def.workersNeeded > 0 && (
            <span className={`rounded px-1 text-[9px] ${
              freeWorkers >= def.workersNeeded ? 'bg-slate-700/50 text-sky-400/80' : 'bg-red-900/25 text-red-400/80'
            }`}>
              {def.workersNeeded}W
            </span>
          )}
          {def.engineersNeeded > 0 && (
            <span className={`rounded px-1 text-[9px] ${
              freeEngineers >= def.engineersNeeded ? 'bg-slate-700/50 text-violet-400/80' : 'bg-red-900/25 text-red-400/80'
            }`}>
              {def.engineersNeeded}E
            </span>
          )}
        </div>
      </div>
      {isSelected && <ChevronRight size={12} className="mt-1 shrink-0 text-[#c8956b]/70" />}
    </button>
  );
}
