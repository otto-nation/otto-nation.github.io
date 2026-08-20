import './global.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'otto-nation',
  description: 'One toolchain for your machine, your services, and how you install both.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // Guards against browser extensions (Grammarly, Dark Reader, and similar)
    // that inject attributes into <html> before React hydrates. This page has
    // no client-side script that touches <html> itself — the flag suppresses
    // false-positive mismatch warnings from outside the app, not from the app.
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
