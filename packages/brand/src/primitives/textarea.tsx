import type { TextareaHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `textarea` — Input chrome, body role, vertical resize; row count
// sets height. Invalid is a danger edge via aria-invalid.
export function Textarea({
  className,
  disabled,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      disabled={disabled}
      className={twMerge(
        'rounded-[var(--ow-radius-md)] border border-[var(--ow-outline)] bg-[var(--ow-canvas)] px-[var(--ow-control-padding)] py-[var(--ow-space-1)] min-h-[var(--ow-control-height)] [font:var(--ow-font-body)] text-[var(--ow-ink)] placeholder:text-[var(--ow-ink-muted)] resize-y aria-[invalid=true]:border-[var(--ow-danger)]',
        disabled ? 'text-[var(--ow-ink-muted)]' : undefined,
        className,
      )}
      {...rest}
    />
  );
}
