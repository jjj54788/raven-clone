'use client';

export default function QuoteFooter() {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-8 py-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs text-purple-200 mb-2">❝</p>
        <p className="text-sm font-medium text-white leading-relaxed">
          In the middle of difficulty lies opportunity.
        </p>
        <p className="mt-1 text-sm text-purple-200">
          困难之中蕴藏着机遇。
        </p>
        <p className="mt-3 text-right text-xs text-purple-300">
          —— Albert Einstein 阿尔伯特·爱因斯坦
        </p>
      </div>
    </div>
  );
}
