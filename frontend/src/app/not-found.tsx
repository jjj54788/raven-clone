'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-violet-50">
      <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
        {t('notFound.title')}
      </h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-800">
        {t('notFound.subtitle')}
      </h2>
      <p className="mt-2 text-gray-500">
        {t('notFound.description')}
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
      >
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
