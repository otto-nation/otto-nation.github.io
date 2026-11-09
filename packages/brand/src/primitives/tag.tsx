import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `tag` — hairline, rounded.sm, label role, ink-muted, no fill.
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={twMerge(
        'rounded-sm border border-[var(--ow-hairline)] [font:var(--ow-font-label)] text-[var(--ow-ink-muted)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
