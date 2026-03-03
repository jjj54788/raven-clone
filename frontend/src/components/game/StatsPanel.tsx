'use client';

import { useMemo } from 'react';
import { BarChart3, Home, Users, Thermometer, Pickaxe } from 'lucide-react';
import type { GameState } from '@/game/types';
import { getAlivePopulation, getAvailableWorkers, getAvailableEngineers } from '@/game/population';
import { getProductionPerTurn, getConsumptionPerTurn } from '@/game/resources';
import { getBuildingDef } from '@/game/constants';

interface StatsPanelProps {
  state: GameState;
  locale: string;
}

export default function StatsPanel({ state, locale }: StatsPanelProps) {
  const zh = locale === 'zh';
  const alive = getAlivePopulation(state);
  const freeW = getAvailableWorkers(state);
  const freeE = getAvailableEngineers(state);
  const prod = useMemo(() => getProductionPerTurn(state), [state]);
  const cons = useMemo(() => getConsumptionPerTurn(state), [state]);

  const housingCap = useMemo(() => {
    let cap = 0;
    for (const b of state.buildings) {
      const def = getBuildingDef(b.type);
      if (def) cap += def.housingCapacity;
    }
    return cap;
  }, [state.buildings]);

  const unsheltered = Math.max(0, alive - housingCap);

  const buildingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of state.buildings) {
      counts[b.type] = (counts[b.type] || 0) + 1;
    }
    return counts;
  }, [state.buildings]);

  const net = {
    food: prod.food - cons.food,
    wood: prod.wood - cons.wood,
    coal: prod.coal - cons.coal,
    steel: prod.steel - cons.steel,
  };

  const daysLeft = (key: 'food' | 'wood' | 'coal' | 'steel') => {
    if (net[key] >= 0) return '∞';
    return Math.floor(state.resources[key] / Math.abs(net[key]));
  };

  return (
    <div className="frostpunk-panel absolute left-3 top-16 z-10 hidden w-44 flex-col gap-1.5 p-2.5 text-[11px] text-slate-400 lg:flex">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
        <BarChart3 size={10} className="text-[#c8956b]/60" />
        {zh ? '统计概览' : 'OVERVIEW'}
      </div>

      <Section icon={<Users size={11} className="text-sky-400/70" />} title={zh ? '人口' : 'Pop'}>
        <Row label={zh ? '工人' : 'Workers'} value={`${state.population.workers} (${freeW})`} />
        <Row label={zh ? '工程师' : 'Engineers'} value={`${state.population.engineers} (${freeE})`} />
        <Row label={zh ? '儿童' : 'Children'} value={state.population.children} />
        {state.population.sick > 0 && <Row label={zh ? '生病' : 'Sick'} value={state.population.sick} danger />}
        {state.population.dead > 0 && <Row label={zh ? '死亡' : 'Dead'} value={state.population.dead} danger />}
      </Section>

      <Section icon={<Home size={11} className="text-amber-400/70" />} title={zh ? '住房' : 'Housing'}>
        <Row label={zh ? '容量' : 'Cap'} value={`${alive}/${housingCap}`} danger={unsheltered > 0} />
        {unsheltered > 0 && <Row label={zh ? '无家可归' : 'Unsheltered'} value={unsheltered} danger />}
      </Section>

      <Section icon={<Pickaxe size={11} className="text-emerald-400/70" />} title={zh ? '净值/回合' : 'Net/Turn'}>
        <NetRow label={zh ? '食' : 'F'} net={net.food} daysLeft={daysLeft('food')} />
        <NetRow label={zh ? '木' : 'W'} net={net.wood} daysLeft={daysLeft('wood')} />
        <NetRow label={zh ? '煤' : 'C'} net={net.coal} daysLeft={daysLeft('coal')} />
        <NetRow label={zh ? '钢' : 'S'} net={net.steel} daysLeft={daysLeft('steel')} />
      </Section>

      <Section icon={<Thermometer size={11} className="text-blue-400/70" />} title={zh ? '温度' : 'Temp'}>
        <Row label={zh ? '当前' : 'Now'} value={`${Math.round(state.globalTemperature)}°C`} />
        <Row
          label={zh ? '明日' : 'Next'}
          value={`~${Math.round(state.globalTemperature - (state.day <= 10 ? 1 : state.day <= 20 ? 2 : 3))}°C`}
          danger={state.globalTemperature < -35}
        />
      </Section>

      <div className="border-t border-slate-700/30 pt-1">
        <span className="text-[9px] text-slate-600">
          {zh ? '建筑' : 'Bldg'}: {state.buildings.length}
          {' · '}
          {Object.entries(buildingCounts)
            .slice(0, 4)
            .map(([k, v]) => `${v}${BABBREV[k] || k}`)
            .join(' ')}
        </span>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-700/30 pt-1.5">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-medium text-slate-500">
        {icon} {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={danger ? 'font-medium text-red-400/80' : 'text-slate-400'}>{value}</span>
    </div>
  );
}

function NetRow({ label, net, daysLeft }: { label: string; net: number; daysLeft: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span>
        <span className={net >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}>
          {net >= 0 ? '+' : ''}{net}
        </span>
        {net < 0 && <span className="ml-0.5 text-slate-600">({daysLeft}d)</span>}
      </span>
    </div>
  );
}

const BABBREV: Record<string, string> = {
  generator: 'G', tent: 'T', house: 'H', coal_mine: 'C', wood_depot: 'W',
  steel_mill: 'S', cookhouse: 'K', hunter_hut: 'Ht', medical_post: 'M', workshop: 'Ws', wall: 'Wl',
};
