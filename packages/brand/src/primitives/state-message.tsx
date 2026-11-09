import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type StateMessageKind = 'empty' | 'loading' | 'stale' | 'error';

const COLOR = {
  empty: 'text-[var(--ow-ink-muted)]',
  loading: 'text-[var(--ow-ink-muted)]',
  stale: 'text-[var(--ow-warn)]',
  error: 'text-[var(--ow-danger)]',
} as const;

const ROLE = {
  empty: undefined,
  loading: 'status',
  stale: 'status',
  error: 'alert',
} as const;

const LOADING_COPY = 'Loading\u2026';

// DESIGN.md § States — empty / loading / stale / error copy.
export function StateMessage({
  kind,
  children,
  action,
  className,
}: {
  kind: StateMessageKind;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={ROLE[kind]}
      className={twMerge(
        '[font:var(--ow-font-body)]',
        COLOR[kind],
        kind === 'empty' ? 'text-center' : undefined,
        className,
      )}
    >
      {children ?? (kind === 'loading' ? LOADING_COPY : null)}
      {action}
    </div>
  );
}
