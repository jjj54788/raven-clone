export type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking';

export interface ReleaseChange {
  type: ChangeType;
  en: string;
  zh: string;
}

export interface ReleaseNote {
  version: string; // e.g. "v0.4.3"
  date: string; // e.g. "2026-02-14"
  latest?: boolean;
  changes: ReleaseChange[];
}

// Keep newest first. This is a lightweight, editable data source.
export const RELEASES: ReleaseNote[] = [
  {
    version: 'v0.4.3',
    date: '2026-02-14',
    latest: true,
    changes: [
      {
        type: 'feature',
        en: 'Add Google Sign-In via Firebase Authentication',
        zh: '新增 Google 登录（Firebase Authentication）',
      },
      {
        type: 'improvement',
        en: 'Polish welcome footer quote rotation and themes',
        zh: '优化欢迎页底部名言轮播与主题背景',
      },
      {
        type: 'feature',
        en: 'Introduce Notifications and What’s New pages',
        zh: '新增 通知 与 更新日志 页面',
      },
    ],
  },
  {
    version: 'v0.4.2',
    date: '2026-02-10',
    changes: [
      {
        type: 'feature',
        en: 'Add SSE streaming chat UI',
        zh: '新增 SSE 流式对话 UI',
      },
      {
        type: 'fix',
        en: 'Improve session restore logic for chat history',
        zh: '修复聊天记录恢复的稳定性问题',
      },
    ],
  },
  {
    version: 'v0.4.1',
    date: '2026-02-01',
    changes: [
      {
        type: 'feature',
        en: 'Multi-provider model selector (OpenAI/DeepSeek/Gemini)',
        zh: '新增多供应商模型选择（OpenAI/DeepSeek/Gemini）',
      },
      {
        type: 'improvement',
        en: 'Refine sidebar layout and i18n toggling',
        zh: '优化侧边栏布局与中英切换体验',
      },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0]?.version ?? 'v0.0.0';

export function countChangesByType(releases: ReleaseNote[]) {
  const totals: Record<ChangeType, number> = {
    feature: 0,
    fix: 0,
    improvement: 0,
    breaking: 0,
  };

  for (const r of releases) {
    for (const c of r.changes) {
      totals[c.type] += 1;
    }
  }

  return totals;
}
