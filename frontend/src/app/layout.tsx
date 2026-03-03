import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/i18n/LanguageContext';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: '格物 · Gewu - AI 研究与知识平台',
  description: '格物致知 — AI 驱动的研究、探索与知识管理平台',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
