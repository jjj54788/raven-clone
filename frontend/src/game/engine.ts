import type { GameState, GameAction, Difficulty, GridCell } from './types';
import {
  GRID_SIZE,
  TARGET_DAYS,
  INITIAL_RESOURCES,
  INITIAL_POPULATION,
  INITIAL_TEMPERATURE,
  SCORE_PER_DAY,
  SCORE_PER_ALIVE,
  SCORE_PER_DEATH_PENALTY,
  SCORE_HOPE_MULTIPLIER,
  SCORE_RESOURCE_MULTIPLIER,
  DIFFICULTY_MULTIPLIER,
} from './constants';
import { updateGlobalTemperature, updateCellTemperatures } from './temperature';
import { applyResourceProduction, applyResourceConsumption } from './resources';
import { applyPopulationEffects, applyMoraleEffects, getAlivePopulation } from './population';
import { placeBuilding, removeBuilding, assignWorkers, updateBuildingEfficiency } from './buildings';
import { checkForEvents, applyEventChoice } from './events';

/** Generate the initial grid with terrain */
function generateGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  const center = Math.floor(GRID_SIZE / 2);

  for (let y = 0; y < GRID_SIZE; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const dist = Math.abs(x - center) + Math.abs(y - center);
      let terrain: GridCell['terrain'] = 'snow';

      // Place some terrain variety
      const rand = Math.random();
      if (dist > 6 && rand < 0.08) terrain = 'rock';
      if (dist > 5 && rand > 0.95) terrain = 'frozen_lake';
      if (dist > 4 && rand > 0.92 && rand < 0.95) terrain = 'ruins';

      row.push({
        x,
        y,
        terrain,
        buildingId: null,
        temperature: INITIAL_TEMPERATURE,
      });
    }
    grid.push(row);
  }

  // Ensure center is always snow (for the generator)
  grid[center][center].terrain = 'snow';

  return grid;
}

/** Create a fresh game state */
export function createInitialState(difficulty: Difficulty): GameState {
  const grid = generateGrid();
  const center = Math.floor(GRID_SIZE / 2);

  // Place the generator at center
  const generatorId = 'generator_0';
  grid[center][center].buildingId = generatorId;

  const state: GameState = {
    day: 1,
    phase: 'playing',
    globalTemperature: INITIAL_TEMPERATURE,
    resources: { ...INITIAL_RESOURCES },
    population: { ...INITIAL_POPULATION },
    morale: { hope: 60, discontent: 10 },
    grid,
    buildings: [
      {
        id: generatorId,
        type: 'generator',
        gridX: center,
        gridY: center,
        assignedWorkers: 2,
        assignedEngineers: 0,
        health: 100,
        efficiency: 1,
        builtOnDay: 1,
      },
    ],
    eventHistory: [],
    pendingEvent: null,
    score: 0,
    difficulty,
    targetDays: TARGET_DAYS[difficulty],
    log: [
      {
        day: 1,
        messageEn: 'The generator roars to life. Your settlement begins.',
        messageZh: '蒸汽核心轰鸣启动。你的定居点开始了。',
        type: 'success',
      },
    ],
    selectedBuildingType: null,
    selectedCell: null,
    settings: { snowParticles: true },
  };

  return updateCellTemperatures(state);
}

/** Calculate score */
function calculateScore(state: GameState): GameState {
  const alive = getAlivePopulation(state);
  const dayBonus = state.day * SCORE_PER_DAY;
  const popBonus = alive * SCORE_PER_ALIVE;
  const deathPenalty = state.population.dead * SCORE_PER_DEATH_PENALTY;
  const moraleBonus = Math.floor(state.morale.hope * SCORE_HOPE_MULTIPLIER);
  const resBonus = Math.floor(
    (state.resources.food + state.resources.wood + state.resources.coal + state.resources.steel) *
      SCORE_RESOURCE_MULTIPLIER,
  );
  const mult = DIFFICULTY_MULTIPLIER[state.difficulty];

  const score = Math.floor((dayBonus + popBonus + moraleBonus + resBonus - deathPenalty) * mult);
  return { ...state, score: Math.max(0, score) };
}

/** Check win/lose conditions */
function checkWinLose(state: GameState): GameState {
  const alive = getAlivePopulation(state);

  // Lose: everyone dead
  if (alive <= 0) {
    return {
      ...state,
      phase: 'game_over',
      log: [
        ...state.log,
        {
          day: state.day,
          messageEn: 'Everyone has perished. The settlement is lost.',
          messageZh: '所有人都已死去。定居点覆灭了。',
          type: 'danger',
        },
      ],
    };
  }

  // Lose: discontent maxed out (revolt)
  if (state.morale.discontent >= 100) {
    return {
      ...state,
      phase: 'game_over',
      log: [
        ...state.log,
        {
          day: state.day,
          messageEn: 'The people have revolted! You have been overthrown.',
          messageZh: '人民起义了！你被推翻了。',
          type: 'danger',
        },
      ],
    };
  }

  // Lose: hope at 0
  if (state.morale.hope <= 0) {
    return {
      ...state,
      phase: 'game_over',
      log: [
        ...state.log,
        {
          day: state.day,
          messageEn: 'All hope is lost. The people have given up.',
          messageZh: '希望全无。人们放弃了。',
          type: 'danger',
        },
      ],
    };
  }

  // Win: survived target days
  if (state.day >= state.targetDays) {
    return {
      ...state,
      phase: 'victory',
      log: [
        ...state.log,
        {
          day: state.day,
          messageEn: `You survived ${state.targetDays} days! The settlement endures!`,
          messageZh: `你存活了${state.targetDays}天！定居点延续了！`,
          type: 'success',
        },
      ],
    };
  }

  return state;
}

/** Advance one turn (day) */
export function advanceTurn(state: GameState): GameState {
  if (state.phase !== 'playing') return state;
  if (state.pendingEvent) return state; // must resolve event first

  let next: GameState = { ...state, day: state.day + 1 };

  // Trim log to last 30 entries before adding new ones
  if (next.log.length > 30) {
    next.log = next.log.slice(-20);
  }

  // 1. Temperature update
  next = updateGlobalTemperature(next);

  // 2. Update building efficiency
  next = updateBuildingEfficiency(next);

  // 3. Resource production
  next = applyResourceProduction(next);

  // 4. Resource consumption
  next = applyResourceConsumption(next);

  // 5. Population effects (sickness, death, healing)
  next = applyPopulationEffects(next);

  // 6. Morale
  next = applyMoraleEffects(next);

  // 7. Update cell temperatures (after building changes)
  next = updateCellTemperatures(next);

  // 8. Random events
  next = checkForEvents(next);

  // 9. Win/lose check
  next = checkWinLose(next);

  // 10. Score
  next = calculateScore(next);

  // Clean up internal flags
  const { _foodShortage, ...cleaned } = next as GameState & { _foodShortage?: boolean };

  return cleaned;
}

/** Game reducer for useReducer */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState(action.difficulty);

    case 'LOAD_GAME':
      return action.state;

    case 'END_DAY':
      return advanceTurn(state);

    case 'PLACE_BUILDING':
      return placeBuilding(state, action.buildingType, action.x, action.y);

    case 'REMOVE_BUILDING':
      return removeBuilding(state, action.buildingId);

    case 'ASSIGN_WORKERS':
      return assignWorkers(state, action.buildingId, action.workers, action.engineers);

    case 'EVENT_CHOICE':
      return applyEventChoice(state, action.choiceIndex);

    case 'SELECT_BUILDING_TYPE':
      return { ...state, selectedBuildingType: action.buildingType };

    case 'SELECT_CELL':
      return { ...state, selectedCell: { x: action.x, y: action.y } };

    case 'CLEAR_SELECTION':
      return { ...state, selectedBuildingType: null, selectedCell: null };

    default:
      return state;
  }
}
