'use client';

import { useMemo } from 'react';
import { X, Users, Wrench, Minus, Plus, Trash2 } from 'lucide-react';
import type { GameState, GameAction } from '@/game/types';
import { getBuildingDef } from '@/game/constants';
import { getAvailableWorkers, getAvailableEngineers } from '@/game/population';
import { getAudio } from '@/game/audio';

interface BuildingInfoProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  locale: string;
}

export default function BuildingInfo({ state, dispatch, locale }: BuildingInfoProps) {
  const zh = locale === 'zh';

  const building = useMemo(() => {
    if (!state.selectedCell) return null;
    const cell = state.grid[state.selectedCell.y]?.[state.selectedCell.x];
    if (!cell?.buildingId) return null;
    return state.buildings.find((b) => b.id === cell.buildingId) ?? null;
  }, [state.selectedCell, state.grid, state.buildings]);

  if (!building) return null;

  const def = getBuildingDef(building.type);
  if (!def) return null;

  const freeW = getAvailableWorkers(state) + building.assignedWorkers;
  const freeE = getAvailableEngineers(state) + building.assignedEngineers;

  return (
    <div className="frostpunk-panel absolute bottom-16 left-4 w-60 p-3 text-sm">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          {zh ? def.nameZh : def.name}
        </h3>
        <button
          onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
        >
          <X size={13} />
        </button>
      </div>

      <p className="mb-2 text-[10px] leading-relaxed text-slate-500">
        {zh ? def.descriptionZh : def.description}
      </p>

      {/* Stats Grid */}
      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <StatRow
          label={zh ? '效率' : 'Eff'}
          value={`${Math.round(building.efficiency * 100)}%`}
          color={building.efficiency > 0.7 ? 'text-emerald-400/80' : building.efficiency > 0.3 ? 'text-amber-400/80' : 'text-red-400/80'}
        />
        <StatRow
          label={zh ? '耐久' : 'HP'}
          value={`${building.health}%`}
          color={building.health < 50 ? 'text-red-400/80' : 'text-slate-300'}
        />
        {Object.entries(def.production).filter(([, v]) => v && v > 0).map(([k, v]) => (
          <StatRow
            key={k}
            label={zh ? '产出' : 'Prod'}
            value={`+${Math.floor((v ?? 0) * building.efficiency)} ${k}`}
            color="text-emerald-400/80"
          />
        ))}
        {Object.entries(def.consumption).filter(([, v]) => v && v > 0).map(([k, v]) => (
          <StatRow
            key={k}
            label={zh ? '消耗' : 'Uses'}
            value={`-${Math.ceil((v ?? 0) * building.efficiency)} ${k}`}
            color="text-red-400/80"
          />
        ))}
        {def.housingCapacity > 0 && (
          <StatRow label={zh ? '住房' : 'Housing'} value={`${def.housingCapacity}`} color="text-sky-400/80" />
        )}
        {def.heatOutput > 0 && (
          <StatRow label={zh ? '热量' : 'Heat'} value={`+${Math.round(def.heatOutput * building.efficiency)}`} color="text-orange-400/80" />
        )}
      </div>

      {/* Worker Assignment */}
      {(def.workersNeeded > 0 || def.engineersNeeded > 0) && (
        <div className="mb-2 border-t border-slate-700/40 pt-2">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {zh ? '人员分配' : 'Staff'}
          </div>
          {def.workersNeeded > 0 && (
            <WorkerSlider
              label={zh ? '工人' : 'W'}
              icon={<Users size={11} />}
              current={building.assignedWorkers}
              max={Math.min(def.workersNeeded, freeW)}
              onChange={(v) =>
                dispatch({
                  type: 'ASSIGN_WORKERS',
                  buildingId: building.id,
                  workers: v,
                  engineers: building.assignedEngineers,
                })
              }
            />
          )}
          {def.engineersNeeded > 0 && (
            <WorkerSlider
              label={zh ? '工程师' : 'E'}
              icon={<Wrench size={11} />}
              current={building.assignedEngineers}
              max={Math.min(def.engineersNeeded, freeE)}
              onChange={(v) =>
                dispatch({
                  type: 'ASSIGN_WORKERS',
                  buildingId: building.id,
                  workers: building.assignedWorkers,
                  engineers: v,
                })
              }
            />
          )}
        </div>
      )}

      {/* Demolish */}
      {building.type !== 'generator' && (
        <button
          onClick={() => {
            getAudio().playSfx('demolish');
            dispatch({ type: 'REMOVE_BUILDING', buildingId: building.id });
            dispatch({ type: 'CLEAR_SELECTION' });
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1.5 text-[10px] text-red-400/80 ring-1 ring-red-500/15 hover:bg-red-500/15"
        >
          <Trash2 size={11} />
          {zh ? '拆除（回收50%）' : 'Demolish (50% refund)'}
        </button>
      )}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

function WorkerSlider({
  label,
  icon,
  current,
  max,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  current: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-0.5 flex items-center gap-2">
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => { getAudio().playSfx('assign'); onChange(Math.max(0, current - 1)); }}
          className="rounded bg-slate-700/40 p-0.5 hover:bg-slate-600/40 disabled:opacity-30"
          disabled={current <= 0}
        >
          <Minus size={10} />
        </button>
        <span className="w-7 text-center font-mono text-[10px] text-slate-300">
          {current}/{max}
        </span>
        <button
          onClick={() => { getAudio().playSfx('assign'); onChange(Math.min(max, current + 1)); }}
          className="rounded bg-slate-700/40 p-0.5 hover:bg-slate-600/40 disabled:opacity-30"
          disabled={current >= max}
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  );
}
