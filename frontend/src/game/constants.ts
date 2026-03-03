import type { BuildingDef, Resources, Population, Difficulty } from './types';

// ---- Grid ----
export const GRID_SIZE = 15;
export const CELL_SIZE_PX = 48;

// ---- Target Days ----
export const TARGET_DAYS: Record<Difficulty, number> = {
  easy: 20,
  normal: 30,
  hard: 45,
};

// ---- Starting Resources ----
export const INITIAL_RESOURCES: Resources = {
  food: 50,
  wood: 40,
  coal: 30,
  steel: 10,
};

export const INITIAL_POPULATION: Population = {
  workers: 30,
  engineers: 5,
  children: 10,
  sick: 0,
  dead: 0,
};

export const INITIAL_TEMPERATURE = -20;

// ---- Temperature ----
export function getTemperatureDrop(day: number): number {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

// ---- Consumption ----
export const FOOD_PER_PERSON = 1;
export const COAL_PER_HEATED_BUILDING = 2;

// ---- Morale ----
export const HOPE_DECAY_PER_DEATH = 8;
export const HOPE_DECAY_PER_SICK = 2;
export const HOPE_GAIN_PER_FULL_MEAL = 1;
export const DISCONTENT_GAIN_NO_FOOD = 10;
export const DISCONTENT_GAIN_COLD = 5;
export const DISCONTENT_DECAY_NATURAL = 2;

// ---- Population Health ----
export const COLD_THRESHOLD = -30; // below this temp, unhoused/unheated people get sick
export const SICK_DEATH_CHANCE = 0.1; // 10% chance per sick person per day to die
export const STARVATION_DAMAGE = 3; // people die if no food for 3 consecutive turns (tracked via sickness)

// ---- Score ----
export const SCORE_PER_DAY = 100;
export const SCORE_PER_ALIVE = 50;
export const SCORE_PER_DEATH_PENALTY = 30;
export const SCORE_HOPE_MULTIPLIER = 2;
export const SCORE_RESOURCE_MULTIPLIER = 0.5;
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.7,
  normal: 1.0,
  hard: 1.5,
};

// ---- Building Definitions ----
export const BUILDING_DEFS: BuildingDef[] = [
  {
    type: 'generator',
    name: 'Generator',
    nameZh: '蒸汽核心',
    description: 'The heart of your city. Provides heat to nearby buildings.',
    descriptionZh: '城市的核心。为附近建筑提供热量。',
    cost: {},
    workersNeeded: 2,
    engineersNeeded: 0,
    production: {},
    consumption: { coal: 5 },
    heatRadius: 3,
    heatOutput: 20,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
    maxPerCity: 1,
  },
  {
    type: 'tent',
    name: 'Tent',
    nameZh: '帐篷',
    description: 'Basic shelter. Houses 5 people.',
    descriptionZh: '基础庇护所。可容纳5人。',
    cost: { wood: 10 },
    workersNeeded: 0,
    engineersNeeded: 0,
    production: {},
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 5,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
    upgradesTo: 'house',
  },
  {
    type: 'house',
    name: 'House',
    nameZh: '房屋',
    description: 'Sturdy housing. Shelters 10 people.',
    descriptionZh: '坚固的住所。可容纳10人。',
    cost: { wood: 20, steel: 5 },
    workersNeeded: 0,
    engineersNeeded: 0,
    production: {},
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 10,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'coal_mine',
    name: 'Coal Mine',
    nameZh: '煤矿',
    description: 'Extracts coal from the frozen ground.',
    descriptionZh: '从冻土中开采煤炭。',
    cost: { wood: 15, steel: 5 },
    workersNeeded: 5,
    engineersNeeded: 0,
    production: { coal: 10 },
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'wood_depot',
    name: 'Wood Depot',
    nameZh: '伐木场',
    description: 'Gathers wood from frozen forests.',
    descriptionZh: '从冰封森林中采集木材。',
    cost: { wood: 10 },
    workersNeeded: 5,
    engineersNeeded: 0,
    production: { wood: 10 },
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'steel_mill',
    name: 'Steel Mill',
    nameZh: '钢铁厂',
    description: 'Smelts steel from ore. Requires engineers.',
    descriptionZh: '从矿石中冶炼钢铁。需要工程师。',
    cost: { wood: 20, coal: 10 },
    workersNeeded: 3,
    engineersNeeded: 2,
    production: { steel: 5 },
    consumption: { coal: 3 },
    heatRadius: 1,
    heatOutput: 5,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'cookhouse',
    name: 'Cookhouse',
    nameZh: '伙房',
    description: 'Processes raw food. Reduces food waste by 20%.',
    descriptionZh: '加工生食。减少20%食物浪费。',
    cost: { wood: 15, steel: 5 },
    workersNeeded: 3,
    engineersNeeded: 0,
    production: {},
    consumption: {},
    heatRadius: 1,
    heatOutput: 3,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'hunter_hut',
    name: "Hunter's Hut",
    nameZh: '猎人小屋',
    description: 'Sends hunters to gather food.',
    descriptionZh: '派出猎人采集食物。',
    cost: { wood: 15 },
    workersNeeded: 5,
    engineersNeeded: 0,
    production: { food: 8 },
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'medical_post',
    name: 'Medical Post',
    nameZh: '医疗站',
    description: 'Heals the sick. Requires engineers.',
    descriptionZh: '治疗伤病员。需要工程师。',
    cost: { wood: 20, steel: 10 },
    workersNeeded: 1,
    engineersNeeded: 2,
    production: {},
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 0,
    healthBonus: 5,
    researchBonus: 0,
    defenseBonus: 0,
  },
  {
    type: 'workshop',
    name: 'Workshop',
    nameZh: '工坊',
    description: 'Researches new technologies. Requires engineers.',
    descriptionZh: '研究新技术。需要工程师。',
    cost: { wood: 20, steel: 15 },
    workersNeeded: 0,
    engineersNeeded: 2,
    production: {},
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 3,
    defenseBonus: 0,
  },
  {
    type: 'wall',
    name: 'Wall',
    nameZh: '城墙',
    description: 'Fortification. Reduces storm damage.',
    descriptionZh: '防御工事。减少暴风雪伤害。',
    cost: { wood: 10, steel: 10 },
    workersNeeded: 0,
    engineersNeeded: 0,
    production: {},
    consumption: {},
    heatRadius: 0,
    heatOutput: 0,
    housingCapacity: 0,
    healthBonus: 0,
    researchBonus: 0,
    defenseBonus: 5,
  },
];

export function getBuildingDef(type: string): BuildingDef | undefined {
  return BUILDING_DEFS.find((b) => b.type === type);
}

// ---- Rendering Colors (Frostpunk industrial palette) ----
export const COLORS = {
  // Terrain — dark, cold, atmospheric
  snow: '#4a5568',
  snowDark: '#3d4a5c',
  snowLight: '#5a6a7e',
  ice: '#3a6d8c',
  iceCrack: '#2d5470',
  rock: '#2d3748',
  ruins: '#4a3f35',
  gridLine: 'rgba(100, 130, 160, 0.12)',
  gridLineDark: 'rgba(80, 100, 120, 0.08)',

  // Background
  bgDeep: '#0a1628',
  bgMid: '#111d32',
  bgHorizon: '#1a2744',

  // Buildings — muted industrial tones
  generator: '#e8722a',
  tent: '#6b7280',
  house: '#7c5a3a',
  coal_mine: '#2d2926',
  wood_depot: '#5c3d1e',
  steel_mill: '#4a4e57',
  cookhouse: '#8b3a2a',
  medical_post: '#c45050',
  workshop: '#2d5a8c',
  wall: '#4a5568',
  hunter_hut: '#4a6b2a',

  // Building highlights
  windowWarm: '#ffd080',
  windowBright: '#ffe4a8',
  fireGlow: '#ff8c40',
  steamWhite: 'rgba(180, 200, 220, 0.6)',

  // Heat & cold overlays
  heatGlow: 'rgba(255, 140, 40, 0.18)',
  heatCore: 'rgba(255, 100, 20, 0.35)',
  coldOverlay: 'rgba(80, 130, 200, 0.08)',
  frostEdge: 'rgba(100, 150, 220, 0.2)',
  selectionHighlight: 'rgba(200, 150, 100, 0.5)',
  canPlace: 'rgba(80, 180, 100, 0.3)',
  cannotPlace: 'rgba(200, 60, 60, 0.35)',

  // UI accent — brass/copper industrial
  brass: '#c8956b',
  copper: '#a07850',
  darkSteel: '#2a3447',
  panelBg: 'rgba(15, 25, 40, 0.92)',
  panelBorder: 'rgba(100, 130, 160, 0.25)',

  // Status
  dangerRed: '#DC2626',
  warningAmber: '#F59E0B',
  safeGreen: '#22C55E',
  infoCyan: '#06B6D4',
} as const;
