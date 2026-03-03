import type { GameState, LogEntry } from './types';
import {
  COLD_THRESHOLD,
  SICK_DEATH_CHANCE,
  HOPE_DECAY_PER_DEATH,
  HOPE_DECAY_PER_SICK,
  HOPE_GAIN_PER_FULL_MEAL,
  DISCONTENT_GAIN_NO_FOOD,
  DISCONTENT_GAIN_COLD,
  DISCONTENT_DECAY_NATURAL,
  getBuildingDef,
} from './constants';

/** Apply population health effects: sickness, death, healing */
export function applyPopulationEffects(state: GameState): GameState {
  const pop = { ...state.population };
  const logs: LogEntry[] = [];

  // Determine who is housed and heated
  let housingCapacity = 0;
  for (const b of state.buildings) {
    const def = getBuildingDef(b.type);
    if (def) housingCapacity += def.housingCapacity;
  }

  const totalAlive = pop.workers + pop.engineers + pop.children + pop.sick;
  const unsheltered = Math.max(0, totalAlive - housingCapacity);

  // Cold sickness: people in unheated areas or unsheltered get sick
  const isCold = state.globalTemperature < COLD_THRESHOLD;
  if (isCold && unsheltered > 0) {
    const newSick = Math.min(Math.ceil(unsheltered * 0.15), pop.workers + pop.children);
    if (newSick > 0) {
      // Move workers/children to sick
      const fromWorkers = Math.min(newSick, pop.workers);
      const fromChildren = newSick - fromWorkers;
      pop.workers -= fromWorkers;
      pop.children -= Math.min(fromChildren, pop.children);
      pop.sick += newSick;
      logs.push({
        day: state.day,
        messageEn: `${newSick} people fell ill from the cold.`,
        messageZh: `${newSick}人因寒冷而生病。`,
        type: 'warning',
      });
    }
  }

  // Food shortage effects (tracked via state._foodShortage flag from resources.ts)
  const foodShortage = (state as GameState & { _foodShortage?: boolean })._foodShortage;
  if (foodShortage) {
    const starving = Math.ceil(totalAlive * 0.05); // 5% get sick from starvation
    const fromWorkers = Math.min(starving, pop.workers);
    pop.workers -= fromWorkers;
    pop.sick += starving;
  }

  // Sick people may die
  let deaths = 0;
  for (let i = 0; i < pop.sick; i++) {
    if (Math.random() < SICK_DEATH_CHANCE) {
      deaths++;
    }
  }
  if (deaths > 0) {
    pop.sick -= deaths;
    pop.dead += deaths;
    logs.push({
      day: state.day,
      messageEn: `${deaths} people have died.`,
      messageZh: `${deaths}人不幸去世。`,
      type: 'danger',
    });
  }

  // Healing: medical posts heal sick people
  let healingCapacity = 0;
  for (const b of state.buildings) {
    const def = getBuildingDef(b.type);
    if (def && def.healthBonus > 0 && b.efficiency > 0) {
      healingCapacity += Math.floor(def.healthBonus * b.efficiency);
    }
  }
  if (healingCapacity > 0 && pop.sick > 0) {
    const healed = Math.min(healingCapacity, pop.sick);
    pop.sick -= healed;
    pop.workers += healed; // recovered become workers
    if (healed > 0) {
      logs.push({
        day: state.day,
        messageEn: `${healed} people recovered from illness.`,
        messageZh: `${healed}人康复了。`,
        type: 'success',
      });
    }
  }

  // Ensure non-negative
  pop.workers = Math.max(0, pop.workers);
  pop.engineers = Math.max(0, pop.engineers);
  pop.children = Math.max(0, pop.children);
  pop.sick = Math.max(0, pop.sick);

  return { ...state, population: pop, log: [...state.log, ...logs] };
}

/** Apply morale effects */
export function applyMoraleEffects(state: GameState): GameState {
  const morale = { ...state.morale };
  const logs: LogEntry[] = [];

  const foodShortage = (state as GameState & { _foodShortage?: boolean })._foodShortage;
  const isCold = state.globalTemperature < COLD_THRESHOLD;

  // Hope changes
  if (!foodShortage) {
    morale.hope = Math.min(100, morale.hope + HOPE_GAIN_PER_FULL_MEAL);
  }
  if (state.population.dead > 0) {
    // recent deaths tracked per turn
  }
  if (state.population.sick > 0) {
    morale.hope = Math.max(0, morale.hope - Math.ceil(state.population.sick * HOPE_DECAY_PER_SICK * 0.1));
  }

  // Discontent changes
  if (foodShortage) {
    morale.discontent = Math.min(100, morale.discontent + DISCONTENT_GAIN_NO_FOOD);
  }
  if (isCold) {
    morale.discontent = Math.min(100, morale.discontent + DISCONTENT_GAIN_COLD);
  }
  morale.discontent = Math.max(0, morale.discontent - DISCONTENT_DECAY_NATURAL);

  // Warnings
  if (morale.hope < 20) {
    logs.push({
      day: state.day,
      messageEn: 'Hope is fading. People are losing the will to survive.',
      messageZh: '希望正在消逝。人们正在失去生存的意志。',
      type: 'danger',
    });
  }
  if (morale.discontent > 80) {
    logs.push({
      day: state.day,
      messageEn: 'Discontent is dangerously high! A revolt may be imminent.',
      messageZh: '不满情绪极高！可能发生暴动。',
      type: 'danger',
    });
  }

  return { ...state, morale, log: [...state.log, ...logs] };
}

/** Get total alive population */
export function getAlivePopulation(state: GameState): number {
  const p = state.population;
  return p.workers + p.engineers + p.children + p.sick;
}

/** Get available (unassigned) workers */
export function getAvailableWorkers(state: GameState): number {
  const assigned = state.buildings.reduce((sum, b) => sum + b.assignedWorkers, 0);
  return state.population.workers - assigned;
}

/** Get available (unassigned) engineers */
export function getAvailableEngineers(state: GameState): number {
  const assigned = state.buildings.reduce((sum, b) => sum + b.assignedEngineers, 0);
  return state.population.engineers - assigned;
}
