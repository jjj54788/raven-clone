import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Raven AI Engine - AI-Powered Research Platform',
  description: 'Raven AI Engine Clone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
