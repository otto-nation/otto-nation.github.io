import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// The label shipped three times in otto-workbench with two tracking values —
// 0.16em in the hero, 0.15em in the other two. 0.15em wins on a 2-of-3
// majority; the hero's label tightens by 0.01em. README § The four intended
// pixel changes lists this one alongside the rest.
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={twMerge(
        'font-mono text-[10px] tracking-[0.15em] text-[var(--ow-ink-muted)]',
        className,
      )}
    >
      {children}
    </p>
  );
}
