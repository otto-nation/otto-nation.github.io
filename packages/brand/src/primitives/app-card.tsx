import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type AppCardVariant = 'card' | 'popover';

const EDGE = {
  card: 'border border-[var(--ow-hairline)]',
  popover: 'border border-[var(--ow-outline)]',
} as const;

// DESIGN.md `app-card` / `popover` — surface fill, rounded.lg, card-padding;
// card edge hairline, popover edge outline.
export function AppCard({
  children,
  variant = 'card',
  title,
  className,
}: {
  children: ReactNode;
  variant?: AppCardVariant;
  title?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        'rounded-lg bg-[var(--ow-surface)] p-[var(--ow-card-padding)] [font:var(--ow-font-body)] text-[var(--ow-ink)]',
        EDGE[variant],
        className,
      )}
    >
      {title != null ? <div className="[font:var(--ow-font-title)]">{title}</div> : null}
      {children}
    </div>
  );
}
