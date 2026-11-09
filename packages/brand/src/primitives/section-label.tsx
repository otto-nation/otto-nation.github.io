import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `section-label` — typography.section, sentence case, ink-muted.
export function SectionLabel({
  children,
  count,
  className,
}: {
  children: ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 [font:var(--ow-font-section)] text-[var(--ow-ink-muted)]',
        className,
      )}
    >
      {children}
      {count != null ? <span className="[font:var(--ow-font-meta)]">{count}</span> : null}
    </span>
  );
}
