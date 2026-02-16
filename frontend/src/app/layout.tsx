import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/i18n/LanguageContext';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Raven AI Engine - AI-Powered Research Platform',
  description: 'AI-Powered Research Platform',
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
