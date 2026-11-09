import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `tag` — hairline, rounded.sm, label role, ink-muted, no fill, px-1.
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-sm border border-[var(--ow-hairline)] px-1 [font:var(--ow-font-label)] text-[var(--ow-ink-muted)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
