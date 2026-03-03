// =============================================
// Frostland (无尽冬日) — Game Type Definitions
// =============================================

// ---- Resources ----
export interface Resources {
  food: number;
  wood: number;
  coal: number;
  steel: number;
}

export type ResourceKey = keyof Resources;

// ---- Population ----
export interface Population {
  workers: number;
  engineers: number;
  children: number;
  sick: number;
  dead: number;
}

export interface CityMorale {
  hope: number; // 0-100
  discontent: number; // 0-100
}

// ---- Buildings ----
export type BuildingType =
  | 'generator'
  | 'tent'
  | 'house'
  | 'cookhouse'
  | 'coal_mine'
  | 'wood_depot'
  | 'steel_mill'
  | 'workshop'
  | 'medical_post'
  | 'wall'
  | 'hunter_hut';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  cost: Partial<Resources>;
  workersNeeded: number;
  engineersNeeded: number;
  production: Partial<Resources>;
  consumption: Partial<Resources>;
  heatRadius: number;
  heatOutput: number;
  housingCapacity: number;
  healthBonus: number;
  researchBonus: number;
  defenseBonus: number;
  upgradesTo?: BuildingType;
  maxPerCity?: number;
  unlockDay?: number;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  gridX: number;
  gridY: number;
  assignedWorkers: number;
  assignedEngineers: number;
  health: number; // 0-100
  efficiency: number; // 0-1
  builtOnDay: number;
}

// ---- Grid ----
export type TerrainType = 'snow' | 'rock' | 'frozen_lake' | 'ruins';

export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
  buildingId: string | null;
  temperature: number;
}

// ---- Events ----
export interface GameEvent {
  id: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  choices: EventChoice[];
  minDay: number;
  maxDay: number;
  weight: number;
  oneTime: boolean;
}

export interface EventChoice {
  labelEn: string;
  labelZh: string;
  effects: EventEffect[];
}

export interface EventEffect {
  type: 'resource' | 'population' | 'morale' | 'building_damage' | 'temperature';
  target: string;
  value: number;
}

// ---- Difficulty ----
export type Difficulty = 'easy' | 'normal' | 'hard';

// ---- Log ----
export interface LogEntry {
  day: number;
  messageEn: string;
  messageZh: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

// ---- Game State ----
export type GamePhase = 'menu' | 'playing' | 'paused' | 'game_over' | 'victory';

export interface GameState {
  day: number;
  phase: GamePhase;
  globalTemperature: number;
  resources: Resources;
  population: Population;
  morale: CityMorale;
  grid: GridCell[][];
  buildings: PlacedBuilding[];
  eventHistory: string[];
  pendingEvent: GameEvent | null;
  score: number;
  difficulty: Difficulty;
  targetDays: number;
  log: LogEntry[];
  selectedBuildingType: BuildingType | null;
  selectedCell: { x: number; y: number } | null;
  settings: {
    snowParticles: boolean;
  };
}

// ---- Actions ----
export type GameAction =
  | { type: 'NEW_GAME'; difficulty: Difficulty }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'END_DAY' }
  | { type: 'PLACE_BUILDING'; buildingType: BuildingType; x: number; y: number }
  | { type: 'REMOVE_BUILDING'; buildingId: string }
  | { type: 'ASSIGN_WORKERS'; buildingId: string; workers: number; engineers: number }
  | { type: 'EVENT_CHOICE'; choiceIndex: number }
  | { type: 'SELECT_BUILDING_TYPE'; buildingType: BuildingType | null }
  | { type: 'SELECT_CELL'; x: number; y: number }
  | { type: 'CLEAR_SELECTION' };

// ---- Save/Load ----
export interface GameSaveSummary {
  id: string;
  name: string;
  daysSurvived: number;
  score: number;
  isAutosave: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  id: string;
  daysSurvived: number;
  score: number;
  updatedAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}
