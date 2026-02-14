'use client';

const quotes = [
  {
    en: 'Two roads diverged in a wood, and I took the one less traveled by.',
    zh: '两条路在树林里分岔，我选择了人迹罕至的那条。',
    author: 'Robert Frost',
    authorZh: '罗伯特·弗罗斯特',
  },
  {
    en: 'The only way to do great work is to love what you do.',
    zh: '成就伟大事业的唯一方法就是热爱你所做的事。',
    author: 'Steve Jobs',
    authorZh: '史蒂夫·乔布斯',
  },
  {
    en: 'In the middle of difficulty lies opportunity.',
    zh: '困难之中蕴藏着机遇。',
    author: 'Albert Einstein',
    authorZh: '阿尔伯特·爱因斯坦',
  },
];

export default function QuoteFooter() {
  // 每天显示不同的名言
  const today = new Date().getDate();
  const quote = quotes[today % quotes.length];

  return (
    <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFhMWEyZTtzdG9wLW9wYWNpdHk6MC44IiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzJkMmQ0NDtzdG9wLW9wYWNpdHk6MC42IiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />

      <div className="relative px-8 py-6">
        {/* 引号装饰 */}
        <span className="text-3xl font-serif text-gray-500 opacity-50">&ldquo;</span>

        <div className="mt-1">
          <p className="text-base font-medium text-white leading-relaxed">
            {quote.en}
          </p>
          <p className="mt-2 text-sm text-purple-300">
            {quote.zh}
          </p>
        </div>

        <p className="mt-4 text-right text-sm text-gray-400">
          —— {quote.author} {quote.authorZh}
        </p>
      </div>
    </div>
  );
}
