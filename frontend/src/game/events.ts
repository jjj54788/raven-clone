import type { GameState, GameEvent, LogEntry } from './types';

// ---- Event Pool ----
export const EVENT_POOL: GameEvent[] = [
  {
    id: 'refugee_caravan',
    titleEn: 'Refugee Caravan',
    titleZh: '难民商队',
    descriptionEn:
      'A group of survivors has found your settlement. They are cold and hungry, but could bolster your workforce.',
    descriptionZh: '一群幸存者发现了你的定居点。他们又冷又饿，但可以壮大你的劳动力。',
    choices: [
      {
        labelEn: 'Welcome them (+15 workers, -20 food)',
        labelZh: '欢迎他们（+15工人，-20食物）',
        effects: [
          { type: 'population', target: 'workers', value: 15 },
          { type: 'resource', target: 'food', value: -20 },
          { type: 'morale', target: 'hope', value: 5 },
        ],
      },
      {
        labelEn: 'Turn them away (+5 discontent)',
        labelZh: '拒绝他们（+5不满）',
        effects: [{ type: 'morale', target: 'discontent', value: 5 }],
      },
    ],
    minDay: 3,
    maxDay: 999,
    weight: 10,
    oneTime: false,
  },
  {
    id: 'blizzard_warning',
    titleEn: 'Blizzard Warning',
    titleZh: '暴风雪警告',
    descriptionEn:
      'Scouts report a massive blizzard approaching. You must prepare.',
    descriptionZh: '侦察兵报告一场巨大的暴风雪正在逼近。你必须做好准备。',
    choices: [
      {
        labelEn: 'Stockpile coal (-20 coal, buildings protected)',
        labelZh: '储备煤炭（-20煤炭，建筑受保护）',
        effects: [{ type: 'resource', target: 'coal', value: -20 }],
      },
      {
        labelEn: 'Reinforce walls (-10 wood, -10 steel)',
        labelZh: '加固城墙（-10木材，-10钢铁）',
        effects: [
          { type: 'resource', target: 'wood', value: -10 },
          { type: 'resource', target: 'steel', value: -10 },
        ],
      },
      {
        labelEn: 'Do nothing (buildings may be damaged)',
        labelZh: '什么都不做（建筑可能受损）',
        effects: [{ type: 'building_damage', target: 'random', value: 30 }],
      },
    ],
    minDay: 5,
    maxDay: 999,
    weight: 8,
    oneTime: false,
  },
  {
    id: 'supply_drop',
    titleEn: 'Supply Drop',
    titleZh: '物资空投',
    descriptionEn:
      'An old military supply cache has been discovered nearby!',
    descriptionZh: '在附近发现了一个旧军事补给点！',
    choices: [
      {
        labelEn: 'Take the food (+30 food)',
        labelZh: '拿走食物（+30食物）',
        effects: [{ type: 'resource', target: 'food', value: 30 }],
      },
      {
        labelEn: 'Take the materials (+20 wood, +10 steel)',
        labelZh: '拿走材料（+20木材，+10钢铁）',
        effects: [
          { type: 'resource', target: 'wood', value: 20 },
          { type: 'resource', target: 'steel', value: 10 },
        ],
      },
    ],
    minDay: 2,
    maxDay: 999,
    weight: 12,
    oneTime: false,
  },
  {
    id: 'disease_outbreak',
    titleEn: 'Disease Outbreak',
    titleZh: '疫病爆发',
    descriptionEn:
      'A mysterious illness is spreading through the settlement.',
    descriptionZh: '一种神秘的疾病正在定居点蔓延。',
    choices: [
      {
        labelEn: 'Quarantine the sick (-5 workers, +hope)',
        labelZh: '隔离病人（-5工人，+希望）',
        effects: [
          { type: 'population', target: 'sick', value: 5 },
          { type: 'population', target: 'workers', value: -5 },
          { type: 'morale', target: 'hope', value: 3 },
        ],
      },
      {
        labelEn: 'Ignore it (10 may get sick, -hope)',
        labelZh: '无视它（10人可能生病，-希望）',
        effects: [
          { type: 'population', target: 'sick', value: 10 },
          { type: 'population', target: 'workers', value: -10 },
          { type: 'morale', target: 'hope', value: -5 },
        ],
      },
    ],
    minDay: 7,
    maxDay: 999,
    weight: 7,
    oneTime: false,
  },
  {
    id: 'worker_dispute',
    titleEn: 'Worker Dispute',
    titleZh: '工人纠纷',
    descriptionEn:
      'Workers and engineers are arguing about resource priorities.',
    descriptionZh: '工人和工程师就资源分配发生了争执。',
    choices: [
      {
        labelEn: 'Side with workers (+hope, engineers unhappy)',
        labelZh: '站在工人一边（+希望，工程师不满）',
        effects: [
          { type: 'morale', target: 'hope', value: 5 },
          { type: 'morale', target: 'discontent', value: 3 },
        ],
      },
      {
        labelEn: 'Side with engineers (+efficiency, workers unhappy)',
        labelZh: '站在工程师一边（+效率，工人不满）',
        effects: [
          { type: 'morale', target: 'discontent', value: 5 },
          { type: 'morale', target: 'hope', value: -2 },
        ],
      },
    ],
    minDay: 5,
    maxDay: 999,
    weight: 9,
    oneTime: false,
  },
  {
    id: 'frozen_ruins',
    titleEn: 'Frozen Ruins Discovered',
    titleZh: '发现冰封遗迹',
    descriptionEn:
      'Scouts found frozen ruins nearby. Exploring is risky but could yield steel.',
    descriptionZh: '侦察兵发现了附近的冰封遗迹。探索有风险但可能获得钢铁。',
    choices: [
      {
        labelEn: 'Explore (50% chance: +30 steel or 2 workers die)',
        labelZh: '探索（50%概率：+30钢铁或2名工人死亡）',
        effects: [], // handled specially
      },
      {
        labelEn: 'Too risky, ignore it',
        labelZh: '太危险了，忽略它',
        effects: [],
      },
    ],
    minDay: 4,
    maxDay: 999,
    weight: 6,
    oneTime: true,
  },
  {
    id: 'generator_malfunction',
    titleEn: 'Generator Malfunction',
    titleZh: '蒸汽核心故障',
    descriptionEn:
      'The generator is sputtering! It needs immediate repairs.',
    descriptionZh: '蒸汽核心在抖动！需要立即维修。',
    choices: [
      {
        labelEn: 'Quick patch (-10 steel)',
        labelZh: '快速修补（-10钢铁）',
        effects: [{ type: 'resource', target: 'steel', value: -10 }],
      },
      {
        labelEn: 'Full repair (-20 steel, generator at 100%)',
        labelZh: '全面维修（-20钢铁，蒸汽核心满效率）',
        effects: [{ type: 'resource', target: 'steel', value: -20 }],
      },
    ],
    minDay: 10,
    maxDay: 999,
    weight: 5,
    oneTime: false,
  },
  {
    id: 'desperate_plea',
    titleEn: 'Desperate Plea',
    titleZh: '绝望的请求',
    descriptionEn:
      'A small family begs for food at the gate. Others are watching.',
    descriptionZh: '一个小家庭在城门口乞求食物。其他人在注视着。',
    choices: [
      {
        labelEn: 'Share food (-30 food, +15 hope)',
        labelZh: '分享食物（-30食物，+15希望）',
        effects: [
          { type: 'resource', target: 'food', value: -30 },
          { type: 'morale', target: 'hope', value: 15 },
        ],
      },
      {
        labelEn: 'Refuse (-10 hope)',
        labelZh: '拒绝（-10希望）',
        effects: [{ type: 'morale', target: 'hope', value: -10 }],
      },
    ],
    minDay: 8,
    maxDay: 999,
    weight: 7,
    oneTime: false,
  },
  {
    id: 'coal_vein',
    titleEn: 'Underground Coal Vein',
    titleZh: '地下煤脉',
    descriptionEn:
      'Miners discovered a rich coal vein! Extracting it requires manpower.',
    descriptionZh: '矿工发现了一条丰富的煤脉！开采需要人力。',
    choices: [
      {
        labelEn: 'Mine it (-5 workers temporarily, +80 coal)',
        labelZh: '开采（暂时-5工人，+80煤炭）',
        effects: [{ type: 'resource', target: 'coal', value: 80 }],
      },
      {
        labelEn: 'Leave it for later',
        labelZh: '留待以后',
        effects: [],
      },
    ],
    minDay: 6,
    maxDay: 999,
    weight: 6,
    oneTime: true,
  },
  {
    id: 'the_great_storm',
    titleEn: 'The Great Storm',
    titleZh: '大风暴',
    descriptionEn:
      'A catastrophic storm strikes! The temperature plummets and buildings take damage.',
    descriptionZh: '一场灾难性的风暴来袭！气温骤降，建筑受损。',
    choices: [
      {
        labelEn: 'Hunker down (-10 temperature for 1 day)',
        labelZh: '蜷缩御寒（气温-10持续1天）',
        effects: [{ type: 'temperature', target: 'global', value: -10 }],
      },
      {
        labelEn: 'Burn extra coal to fight it (-40 coal)',
        labelZh: '多烧煤抵抗（-40煤炭）',
        effects: [{ type: 'resource', target: 'coal', value: -40 }],
      },
    ],
    minDay: 15,
    maxDay: 999,
    weight: 4,
    oneTime: false,
  },
];

/** Check if an event should trigger this turn */
export function checkForEvents(state: GameState): GameState {
  if (state.pendingEvent) return state; // already have a pending event

  // 30% base chance per turn to trigger an event
  if (Math.random() > 0.3) return state;

  const eligible = EVENT_POOL.filter((e) => {
    if (state.day < e.minDay || state.day > e.maxDay) return false;
    if (e.oneTime && state.eventHistory.includes(e.id)) return false;
    return true;
  });

  if (eligible.length === 0) return state;

  // Weighted random selection
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected: GameEvent | null = null;
  for (const event of eligible) {
    roll -= event.weight;
    if (roll <= 0) {
      selected = event;
      break;
    }
  }

  if (!selected) selected = eligible[eligible.length - 1];

  return { ...state, pendingEvent: selected };
}

/** Apply the chosen event option */
export function applyEventChoice(state: GameState, choiceIndex: number): GameState {
  if (!state.pendingEvent) return state;

  const event = state.pendingEvent;
  const choice = event.choices[choiceIndex];
  if (!choice) return state;

  let next = {
    ...state,
    pendingEvent: null,
    eventHistory: [...state.eventHistory, event.id],
  };

  // Special handling for frozen ruins exploration
  if (event.id === 'frozen_ruins' && choiceIndex === 0) {
    if (Math.random() < 0.5) {
      next.resources = { ...next.resources, steel: next.resources.steel + 30 };
      next.log = [
        ...next.log,
        {
          day: next.day,
          messageEn: 'The ruins yielded 30 steel! A fortunate discovery.',
          messageZh: '遗迹中获得了30钢铁！幸运的发现。',
          type: 'success',
        },
      ];
    } else {
      next.population = {
        ...next.population,
        workers: Math.max(0, next.population.workers - 2),
        dead: next.population.dead + 2,
      };
      next.log = [
        ...next.log,
        {
          day: next.day,
          messageEn: 'The ruins collapsed! 2 workers were killed.',
          messageZh: '遗迹坍塌了！2名工人遇难。',
          type: 'danger',
        },
      ];
    }
    return next;
  }

  // Apply standard effects
  for (const effect of choice.effects) {
    switch (effect.type) {
      case 'resource':
        next.resources = {
          ...next.resources,
          [effect.target]: Math.max(
            0,
            next.resources[effect.target as keyof typeof next.resources] + effect.value,
          ),
        };
        break;
      case 'population':
        next.population = {
          ...next.population,
          [effect.target]: Math.max(
            0,
            next.population[effect.target as keyof typeof next.population] + effect.value,
          ),
        };
        break;
      case 'morale':
        next.morale = {
          ...next.morale,
          [effect.target]: Math.max(
            0,
            Math.min(
              100,
              next.morale[effect.target as keyof typeof next.morale] + effect.value,
            ),
          ),
        };
        break;
      case 'building_damage': {
        const damageable = next.buildings.filter((b) => b.type !== 'generator');
        if (damageable.length > 0) {
          const target = damageable[Math.floor(Math.random() * damageable.length)];
          next.buildings = next.buildings.map((b) =>
            b.id === target.id
              ? { ...b, health: Math.max(0, b.health - effect.value) }
              : b,
          );
          next.log = [
            ...next.log,
            {
              day: next.day,
              messageEn: `A building was damaged by the storm!`,
              messageZh: `一座建筑被暴风雪损坏了！`,
              type: 'warning',
            },
          ];
        }
        break;
      }
      case 'temperature':
        next.globalTemperature += effect.value;
        break;
    }
  }

  // Add event log
  next.log = [
    ...next.log,
    {
      day: next.day,
      messageEn: `Event: ${event.titleEn} — chose "${choice.labelEn.split('(')[0].trim()}"`,
      messageZh: `事件：${event.titleZh} — 选择了"${choice.labelZh.split('（')[0].trim()}"`,
      type: 'info',
    },
  ];

  return next;
}
