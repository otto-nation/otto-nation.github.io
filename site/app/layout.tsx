import './global.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'otto-nation',
  description: 'One toolchain for your machine, your services, and how you install both.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
