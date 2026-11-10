import type { ComponentPropsWithRef } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `input` — outline border, rounded.md, body role, control heights;
// disabled ink-muted. Focus is the tokens.css base rule.
export function Input({
  dense = false,
  className,
  disabled,
  ref,
  ...rest
}: {
  dense?: boolean;
} & ComponentPropsWithRef<'input'>) {
  return (
    <input
      ref={ref}
      disabled={disabled}
      className={twMerge(
        'rounded-[var(--ow-radius-md)] border border-[var(--ow-outline)] bg-[var(--ow-canvas)] px-[var(--ow-control-padding)] [font:var(--ow-font-body)] text-[var(--ow-ink)] placeholder:text-[var(--ow-ink-muted)] aria-[invalid=true]:border-[var(--ow-danger)]',
        dense
          ? 'h-[var(--ow-control-height-dense)]'
          : 'h-[var(--ow-control-height)]',
        disabled ? 'text-[var(--ow-ink-muted)]' : undefined,
        className,
      )}
      {...rest}
    />
  );
}
