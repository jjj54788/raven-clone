import type { GameState, Resources, LogEntry } from './types';
import { getBuildingDef, FOOD_PER_PERSON, COAL_PER_HEATED_BUILDING } from './constants';

/** Calculate and apply resource production from buildings */
export function applyResourceProduction(state: GameState): GameState {
  const res = { ...state.resources };
  const logs: LogEntry[] = [];

  for (const building of state.buildings) {
    const def = getBuildingDef(building.type);
    if (!def) continue;

    const eff = building.efficiency;
    if (eff <= 0) continue;

    for (const [key, amount] of Object.entries(def.production)) {
      if (amount && amount > 0) {
        const produced = Math.floor(amount * eff);
        res[key as keyof Resources] += produced;
      }
    }
  }

  return {
    ...state,
    resources: res,
    log: [...state.log, ...logs],
  };
}

/** Calculate and apply resource consumption */
export function applyResourceConsumption(state: GameState): GameState {
  const res = { ...state.resources };
  const pop = { ...state.population };
  const logs: LogEntry[] = [];
  let foodShortage = false;

  // Food consumption: all living people eat
  const totalPeople = pop.workers + pop.engineers + pop.children + pop.sick;

  // Check if we have cookhouses for efficiency
  const cookhouses = state.buildings.filter(
    (b) => b.type === 'cookhouse' && b.efficiency > 0,
  );
  const foodEfficiency = cookhouses.length > 0 ? 0.8 : 1.0; // 20% less waste with cookhouse

  const foodNeeded = Math.ceil(totalPeople * FOOD_PER_PERSON * foodEfficiency);
  if (res.food >= foodNeeded) {
    res.food -= foodNeeded;
  } else {
    foodShortage = true;
    res.food = 0;
    logs.push({
      day: state.day,
      messageEn: 'Food supplies have run out! People are starving.',
      messageZh: '食物耗尽！人们正在挨饿。',
      type: 'danger',
    });
  }

  // Coal consumption: heated buildings consume coal
  for (const building of state.buildings) {
    const def = getBuildingDef(building.type);
    if (!def) continue;
    for (const [key, amount] of Object.entries(def.consumption)) {
      if (amount && amount > 0) {
        const consumed = Math.ceil(amount * building.efficiency);
        if (res[key as keyof Resources] >= consumed) {
          res[key as keyof Resources] -= consumed;
        } else {
          res[key as keyof Resources] = 0;
          // Building efficiency drops if it can't consume fuel
          if (key === 'coal') {
            logs.push({
              day: state.day,
              messageEn: `${def.name} has no coal! Efficiency dropping.`,
              messageZh: `${def.nameZh}没有煤炭了！效率下降。`,
              type: 'warning',
            });
          }
        }
      }
    }
  }

  return {
    ...state,
    resources: res,
    population: pop,
    log: [...state.log, ...logs],
    _foodShortage: foodShortage,
  } as GameState & { _foodShortage?: boolean };
}

/** Get total resource production per turn (for display) */
export function getProductionPerTurn(state: GameState): Resources {
  const prod: Resources = { food: 0, wood: 0, coal: 0, steel: 0 };
  for (const building of state.buildings) {
    const def = getBuildingDef(building.type);
    if (!def || building.efficiency <= 0) continue;
    for (const [key, amount] of Object.entries(def.production)) {
      if (amount) prod[key as keyof Resources] += Math.floor(amount * building.efficiency);
    }
  }
  return prod;
}

/** Get total resource consumption per turn (for display) */
export function getConsumptionPerTurn(state: GameState): Resources {
  const cons: Resources = { food: 0, wood: 0, coal: 0, steel: 0 };
  const totalPeople =
    state.population.workers +
    state.population.engineers +
    state.population.children +
    state.population.sick;

  const cookhouses = state.buildings.filter(
    (b) => b.type === 'cookhouse' && b.efficiency > 0,
  );
  const foodEfficiency = cookhouses.length > 0 ? 0.8 : 1.0;
  cons.food = Math.ceil(totalPeople * FOOD_PER_PERSON * foodEfficiency);

  for (const building of state.buildings) {
    const def = getBuildingDef(building.type);
    if (!def || building.efficiency <= 0) continue;
    for (const [key, amount] of Object.entries(def.consumption)) {
      if (amount) cons[key as keyof Resources] += Math.ceil(amount * building.efficiency);
    }
  }

  return cons;
}
