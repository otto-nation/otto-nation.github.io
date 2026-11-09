import type { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type ActionButtonVariant = 'solid' | 'outline' | 'ghost';

const VARIANT = {
  solid: 'bg-[var(--ow-ink)] text-[var(--ow-canvas)]',
  outline:
    'border border-[var(--ow-hairline)] bg-[var(--ow-canvas)] text-[var(--ow-ink)]',
  ghost: 'text-[var(--ow-ink)]',
} as const;

const VARIANT_HOVER = {
  solid: undefined,
  outline: 'hover:bg-[var(--ow-hover)]',
  ghost: 'hover:bg-[var(--ow-hover)]',
} as const;

// DESIGN.md `button-solid` / `button-outline` / `button-ghost` — label role,
// control heights; hover fill never changes the border.
export function ActionButton({
  children,
  variant = 'solid',
  dense = false,
  className,
  type = 'button',
  disabled,
  ...rest
}: {
  variant?: ActionButtonVariant;
  dense?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={twMerge(
        'inline-flex items-center justify-center rounded-md px-[var(--ow-control-padding)] [font:var(--ow-font-label)]',
        dense
          ? 'h-[var(--ow-control-height-dense)]'
          : 'h-[var(--ow-control-height)]',
        VARIANT[variant],
        disabled ? 'text-[var(--ow-ink-muted)]' : VARIANT_HOVER[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
