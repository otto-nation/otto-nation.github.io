import type { InputHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `checkbox` / `checkbox-checked` — outline edge, radius-sm;
// checked is an anil fill with a canvas check. Indeterminate is not
// supported.
export function Checkbox({
  label,
  className,
  disabled,
  ...rest
}: {
  label?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const box = (
    <span className="relative inline-grid place-items-center">
      <input
        type="checkbox"
        disabled={disabled}
        className="peer appearance-none size-[var(--ow-space-4)] rounded-[var(--ow-radius-sm)] border border-[var(--ow-outline)] bg-[var(--ow-canvas)] checked:border-[var(--ow-anil)] checked:bg-[var(--ow-anil)] aria-[invalid=true]:border-[var(--ow-danger)] disabled:opacity-50"
        {...rest}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        fill="none"
        className="pointer-events-none absolute invisible peer-checked:visible text-[var(--ow-canvas)] size-[var(--ow-space-3)]"
      >
        <path
          d="M2.5 6.5 5 9 9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (label == null) {
    return (
      <span className={twMerge('relative inline-grid', className)}>{box}</span>
    );
  }

  return (
    <label
      className={twMerge(
        'inline-flex items-center gap-[var(--ow-space-2)] [font:var(--ow-font-label)]',
        disabled ? 'text-[var(--ow-ink-muted)]' : 'text-[var(--ow-ink)]',
        className,
      )}
    >
      {box}
      {label}
    </label>
  );
}
