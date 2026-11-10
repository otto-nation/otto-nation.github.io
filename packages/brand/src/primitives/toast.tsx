import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { StatusGlyph, type StatusGlyphStatus } from './status-glyph';

const STATUS_LABELS: Record<StatusGlyphStatus, string> = {
  pass: 'Done',
  fail: 'Error',
  running: 'Working',
  warn: 'Warning',
  none: 'Note',
};

export function Toast({
  children,
  status,
  className,
}: {
  children: ReactNode;
  status?: StatusGlyphStatus;
  className?: string;
}) {
  return (
    <div
      role={status === 'fail' ? 'alert' : 'status'}
      className={twMerge(
        'bg-[var(--ow-surface)] text-[var(--ow-ink)] border border-[var(--ow-outline)] rounded-[var(--ow-radius-md)] p-[var(--ow-card-padding)] [font:var(--ow-font-body)]',
        className,
      )}
    >
      {status != null ? (
        <StatusGlyph
          status={status}
          label={STATUS_LABELS[status]}
          showLabel={false}
        />
      ) : null}
      {children}
    </div>
  );
}
