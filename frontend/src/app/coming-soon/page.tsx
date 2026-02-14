'use client';

import Link from 'next/link';
import { Construction } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function ComingSoonPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-violet-50">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-100">
        <Construction size={40} className="text-purple-600" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold text-gray-800">
        {t('comingSoon.title')}
      </h1>
      <p className="mt-2 text-gray-500">
        {t('comingSoon.description')}
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
      >
        {t('comingSoon.backToAsk')}
      </Link>
    </div>
  );
}
