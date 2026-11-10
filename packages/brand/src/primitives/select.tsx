import type { SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `select` — Input chrome, body role, control heights. The chevron
// is inline SVG so it can resolve --ow-ink-muted; a data URL cannot.
export function Select({
  dense = false,
  className,
  disabled,
  children,
  ...rest
}: {
  dense?: boolean;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={twMerge('relative inline-flex', className)}>
      <select
        disabled={disabled}
        className={twMerge(
          'appearance-none w-full rounded-[var(--ow-radius-md)] border border-[var(--ow-outline)] bg-[var(--ow-canvas)] pl-[var(--ow-control-padding)] pr-[calc(var(--ow-control-padding)+var(--ow-space-4))] [font:var(--ow-font-body)] text-[var(--ow-ink)] aria-[invalid=true]:border-[var(--ow-danger)]',
          dense
            ? 'h-[var(--ow-control-height-dense)]'
            : 'h-[var(--ow-control-height)]',
          disabled ? 'text-[var(--ow-ink-muted)]' : undefined,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        fill="none"
        className="pointer-events-none absolute right-[var(--ow-control-padding)] top-1/2 -translate-y-1/2 size-[var(--ow-space-3)] text-[var(--ow-ink-muted)]"
      >
        <path
          d="M3 4.5 6 8 9 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
