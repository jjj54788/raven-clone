import type { GameState, PlacedBuilding, GridCell } from './types';
import { GRID_SIZE, getTemperatureDrop, getBuildingDef } from './constants';

/** Update global temperature for the new day */
export function updateGlobalTemperature(state: GameState): GameState {
  const drop = getTemperatureDrop(state.day);
  const diffMod = state.difficulty === 'hard' ? 1.3 : state.difficulty === 'easy' ? 0.7 : 1.0;
  const newTemp = state.globalTemperature - drop * diffMod;
  return { ...state, globalTemperature: Math.round(newTemp * 10) / 10 };
}

/** Calculate effective local temperature for every grid cell */
export function updateCellTemperatures(state: GameState): GameState {
  const grid: GridCell[][] = state.grid.map((row) =>
    row.map((cell) => ({ ...cell, temperature: state.globalTemperature })),
  );

  for (const building of state.buildings) {
    const def = getBuildingDef(building.type);
    if (!def || def.heatRadius <= 0 || def.heatOutput <= 0) continue;
    if (building.efficiency <= 0) continue;

    const effectiveHeat = def.heatOutput * building.efficiency;
    const radius = def.heatRadius;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = building.gridX + dx;
        const gy = building.gridY + dy;
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) continue;

        const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance
        if (dist > radius) continue;

        const falloff = 1 - dist / (radius + 1);
        grid[gy][gx].temperature += effectiveHeat * falloff;
      }
    }
  }

  return { ...state, grid };
}

/** Get the heat output map for rendering heat overlay */
export function getHeatMap(state: GameState): number[][] {
  const heat: number[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(0),
  );

  for (const building of state.buildings) {
    const def = getBuildingDef(building.type);
    if (!def || def.heatRadius <= 0 || def.heatOutput <= 0) continue;
    if (building.efficiency <= 0) continue;

    const effectiveHeat = def.heatOutput * building.efficiency;
    const radius = def.heatRadius;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = building.gridX + dx;
        const gy = building.gridY + dy;
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) continue;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist > radius) continue;
        const falloff = 1 - dist / (radius + 1);
        heat[gy][gx] += effectiveHeat * falloff;
      }
    }
  }

  return heat;
}

/** Check if a building is within any heat zone */
export function isBuildingHeated(building: PlacedBuilding, state: GameState): boolean {
  const cell = state.grid[building.gridY]?.[building.gridX];
  return cell ? cell.temperature > state.globalTemperature : false;
}
