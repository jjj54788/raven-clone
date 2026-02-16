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
    version: 'v0.5.0',
    date: '2026-02-15',
    latest: true,
    changes: [
      {
        type: 'feature',
        en: 'Bring your own AI API keys for chat',
        zh: '\u652f\u6301\u81ea\u5e26 AI Key \u8fdb\u884c\u5bf9\u8bdd',
      },
      {
        type: 'improvement',
        en: 'Add global dark mode synced to profile settings',
        zh: '\u65b0\u589e\u5168\u5c40\u6697\u8272\u6a21\u5f0f\uff0c\u5e76\u4e0e\u4e2a\u4eba\u8bbe\u7f6e\u540c\u6b65',
      },
      {
        type: 'feature',
        en: 'Introduce integration connect flows for Notion, Google Drive, and Feishu',
        zh: '\u65b0\u589e Notion / Google Drive / \u98de\u4e66\u96c6\u6210\u8fde\u63a5',
      },
      {
        type: 'improvement',
        en: 'Add YouTube Explore RSS fallback and sample data notice',
        zh: 'YouTube \u63a2\u7d22\u652f\u6301 RSS \u964d\u7ea7\u4e0e\u793a\u4f8b\u6570\u636e\u63d0\u793a',
      },
      {
        type: 'fix',
        en: 'Fix todo date filtering across week/month views',
        zh: '\u4fee\u590d\u5f85\u529e\u5728\u5468/\u6708\u89c6\u56fe\u4e2d\u7684\u65e5\u671f\u7b5b\u9009\u504f\u5dee',
      },
      {
        type: 'feature',
        en: 'Add colors, reminders, and subtasks for Todos',
        zh: '\u65b0\u589e\u5f85\u529e\u989c\u8272\u3001\u63d0\u9192\u4e0e\u5b50\u4efb\u52a1',
      },
      {
        type: 'improvement',
        en: 'Persist richer explore bookmarks in My Library',
        zh: '\u652f\u6301\u4fdd\u5b58\u66f4\u4e30\u5bcc\u7684\u6536\u85cf\u4fe1\u606f\uff0c\u5e76\u5728\u6211\u7684\u8d44\u6599\u5e93\u4e2d\u5c55\u793a',
      },
    ],
  },
  {
    version: 'v0.4.4',
    date: '2026-02-15',
    changes: [
      {
        type: 'feature',
        en: 'Add admin console and AI Todos/Store experiences',
        zh: '新增管理员后台、AI 待办与 AI 商店体验',
      },
      {
        type: 'improvement',
        en: 'Add daily check-in reminder with signed-in syncing',
        zh: '新增每日打卡提醒，并在登录后支持同步',
      },
      {
        type: 'improvement',
        en: 'Improve one-click dev start reliability on Windows',
        zh: '优化 Windows 一键启动脚本稳定性',
      },
    ],
  },
  {
    version: 'v0.4.3',
    date: '2026-02-14',
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
