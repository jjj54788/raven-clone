import type { GameState, BuildingType, PlacedBuilding, Resources, LogEntry } from './types';
import { GRID_SIZE, getBuildingDef, BUILDING_DEFS } from './constants';
import { getAvailableWorkers, getAvailableEngineers } from './population';

let _nextId = 1;
function genBuildingId(): string {
  return `b_${Date.now()}_${_nextId++}`;
}

/** Check if a building can be placed at (x, y) */
export function canPlaceBuilding(
  state: GameState,
  type: BuildingType,
  x: number,
  y: number,
): { ok: boolean; reason?: string } {
  if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) {
    return { ok: false, reason: 'Out of bounds' };
  }

  const cell = state.grid[y][x];
  if (cell.buildingId) {
    return { ok: false, reason: 'Cell occupied' };
  }
  if (cell.terrain === 'frozen_lake') {
    return { ok: false, reason: 'Cannot build on frozen lake' };
  }

  const def = getBuildingDef(type);
  if (!def) return { ok: false, reason: 'Unknown building' };

  // Max per city check
  if (def.maxPerCity) {
    const existing = state.buildings.filter((b) => b.type === type);
    if (existing.length >= def.maxPerCity) {
      return { ok: false, reason: `Max ${def.maxPerCity} ${def.name} allowed` };
    }
  }

  // Unlock day check
  if (def.unlockDay && state.day < def.unlockDay) {
    return { ok: false, reason: `Unlocks on day ${def.unlockDay}` };
  }

  // Cost check
  for (const [key, cost] of Object.entries(def.cost)) {
    if (cost && state.resources[key as keyof Resources] < cost) {
      return { ok: false, reason: `Not enough ${key}` };
    }
  }

  return { ok: true };
}

/** Check if user can afford a building type */
export function canAfford(state: GameState, type: BuildingType): boolean {
  const def = getBuildingDef(type);
  if (!def) return false;
  for (const [key, cost] of Object.entries(def.cost)) {
    if (cost && state.resources[key as keyof Resources] < cost) return false;
  }
  return true;
}

/** Place a building and deduct resources */
export function placeBuilding(
  state: GameState,
  type: BuildingType,
  x: number,
  y: number,
): GameState {
  const check = canPlaceBuilding(state, type, x, y);
  if (!check.ok) return state; // silently fail if invalid

  const def = getBuildingDef(type)!;
  const resources = { ...state.resources };

  // Deduct cost
  for (const [key, cost] of Object.entries(def.cost)) {
    if (cost) resources[key as keyof Resources] -= cost;
  }

  const building: PlacedBuilding = {
    id: genBuildingId(),
    type,
    gridX: x,
    gridY: y,
    assignedWorkers: 0,
    assignedEngineers: 0,
    health: 100,
    efficiency: 0, // starts at 0 until workers assigned (or 1 for no-worker buildings)
    builtOnDay: state.day,
  };

  // Auto-assign workers if available
  const currentAssignedW = state.buildings.reduce((s, b) => s + b.assignedWorkers, 0);
  const currentAssignedE = state.buildings.reduce((s, b) => s + b.assignedEngineers, 0);
  const freeW = state.population.workers - currentAssignedW;
  const freeE = state.population.engineers - currentAssignedE;

  if (def.workersNeeded === 0 && def.engineersNeeded === 0) {
    building.efficiency = 1;
  } else {
    const autoW = Math.min(def.workersNeeded, Math.max(0, freeW));
    const autoE = Math.min(def.engineersNeeded, Math.max(0, freeE));
    building.assignedWorkers = autoW;
    building.assignedEngineers = autoE;

    const workerRatio = def.workersNeeded > 0 ? autoW / def.workersNeeded : 1;
    const engineerRatio = def.engineersNeeded > 0 ? autoE / def.engineersNeeded : 1;
    building.efficiency = Math.min(workerRatio, engineerRatio);
  }

  // Update grid
  const grid = state.grid.map((row) => row.map((cell) => ({ ...cell })));
  grid[y][x].buildingId = building.id;

  const staffNote = building.assignedWorkers > 0 || building.assignedEngineers > 0
    ? ` (${building.assignedWorkers}W${building.assignedEngineers > 0 ? `/${building.assignedEngineers}E` : ''} assigned)`
    : def.workersNeeded > 0 ? ' (no workers available!)' : '';
  const staffNoteZh = building.assignedWorkers > 0 || building.assignedEngineers > 0
    ? `（已分配${building.assignedWorkers}工人${building.assignedEngineers > 0 ? `/${building.assignedEngineers}工程师` : ''}）`
    : def.workersNeeded > 0 ? '（无可用工人！）' : '';

  const log: LogEntry = {
    day: state.day,
    messageEn: `Built ${def.name}.${staffNote}`,
    messageZh: `建造了${def.nameZh}。${staffNoteZh}`,
    type: 'info',
  };

  return {
    ...state,
    resources,
    buildings: [...state.buildings, building],
    grid,
    log: [...state.log, log],
  };
}

/** Remove a building */
export function removeBuilding(state: GameState, buildingId: string): GameState {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return state;

  const def = getBuildingDef(building.type);

  // Clear grid
  const grid = state.grid.map((row) => row.map((cell) => ({ ...cell })));
  grid[building.gridY][building.gridX].buildingId = null;

  // Refund 50% resources
  const resources = { ...state.resources };
  if (def) {
    for (const [key, cost] of Object.entries(def.cost)) {
      if (cost) resources[key as keyof Resources] += Math.floor(cost * 0.5);
    }
  }

  const log: LogEntry = {
    day: state.day,
    messageEn: `Demolished ${def?.name || 'building'}. Recovered some materials.`,
    messageZh: `拆除了${def?.nameZh || '建筑'}。回收了部分材料。`,
    type: 'info',
  };

  return {
    ...state,
    resources,
    buildings: state.buildings.filter((b) => b.id !== buildingId),
    grid,
    log: [...state.log, log],
  };
}

/** Assign workers to a building */
export function assignWorkers(
  state: GameState,
  buildingId: string,
  workers: number,
  engineers: number,
): GameState {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return state;

  const def = getBuildingDef(building.type);
  if (!def) return state;

  // Clamp to available
  const maxW = Math.min(workers, def.workersNeeded, getAvailableWorkers(state) + building.assignedWorkers);
  const maxE = Math.min(engineers, def.engineersNeeded, getAvailableEngineers(state) + building.assignedEngineers);

  // Calculate efficiency based on staffing
  let eff = 1;
  if (def.workersNeeded > 0 || def.engineersNeeded > 0) {
    const workerRatio = def.workersNeeded > 0 ? maxW / def.workersNeeded : 1;
    const engineerRatio = def.engineersNeeded > 0 ? maxE / def.engineersNeeded : 1;
    eff = Math.min(workerRatio, engineerRatio);
  }

  const buildings = state.buildings.map((b) =>
    b.id === buildingId
      ? { ...b, assignedWorkers: maxW, assignedEngineers: maxE, efficiency: eff }
      : b,
  );

  return { ...state, buildings };
}

/** Update building efficiency based on current staffing and conditions */
export function updateBuildingEfficiency(state: GameState): GameState {
  const buildings = state.buildings.map((b) => {
    const def = getBuildingDef(b.type);
    if (!def) return b;

    let eff = 1;
    if (def.workersNeeded > 0 || def.engineersNeeded > 0) {
      const workerRatio = def.workersNeeded > 0 ? b.assignedWorkers / def.workersNeeded : 1;
      const engineerRatio = def.engineersNeeded > 0 ? b.assignedEngineers / def.engineersNeeded : 1;
      eff = Math.min(workerRatio, engineerRatio);
    }

    // Health affects efficiency
    eff *= b.health / 100;

    return { ...b, efficiency: Math.max(0, Math.min(1, eff)) };
  });

  return { ...state, buildings };
}

/** Get available building types for the build panel */
export function getAvailableBuildings(state: GameState): BuildingType[] {
  return BUILDING_DEFS.filter((def) => {
    if (def.type === 'generator') return false; // placed at start
    if (def.unlockDay && state.day < def.unlockDay) return false;
    if (def.maxPerCity) {
      const count = state.buildings.filter((b) => b.type === def.type).length;
      if (count >= def.maxPerCity) return false;
    }
    return true;
  }).map((def) => def.type);
}
