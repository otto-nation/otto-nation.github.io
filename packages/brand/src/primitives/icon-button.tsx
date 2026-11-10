import type { ComponentPropsWithRef, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type IconButtonBase = {
  label: string;
  children: ReactNode;
  dense?: boolean;
  className?: string;
} & Omit<
  ComponentPropsWithRef<'button'>,
  'aria-label' | 'aria-labelledby' | 'aria-pressed' | 'children'
>;

export type IconButtonProps =
  | (IconButtonBase & { tone?: 'default'; pressed?: boolean })
  | (IconButtonBase & { tone: 'danger'; pressed?: never });

// DESIGN.md `icon-button` / `icon-button-hover` / `icon-button-selected` /
// `icon-button-danger` — square at control height; outline edge; required
// label. pressed is the segmented-selected look. danger and pressed cannot
// combine.
export function IconButton({
  label,
  children,
  dense = false,
  className,
  tone = 'default',
  pressed,
  type = 'button',
  disabled,
  ref,
  ...rest
}: IconButtonProps) {
  const selected = pressed === true;
  const interactive =
    disabled || selected
      ? undefined
      : 'hover:bg-[var(--ow-hover)] active:bg-[var(--ow-selected)]';

  return (
    <button
      type={type}
      disabled={disabled}
      {...rest}
      ref={ref}
      aria-label={label}
      aria-pressed={pressed}
      className={twMerge(
        'inline-flex items-center justify-center rounded-[var(--ow-radius-md)] border border-[var(--ow-outline)]',
        dense
          ? 'size-[var(--ow-control-height-dense)]'
          : 'size-[var(--ow-control-height)]',
        selected
          ? 'bg-[var(--ow-ink)] text-[var(--ow-canvas)]'
          : twMerge(
              'bg-[var(--ow-canvas)]',
              disabled
                ? 'text-[var(--ow-ink-muted)]'
                : tone === 'danger'
                  ? 'text-[var(--ow-danger)]'
                  : 'text-[var(--ow-ink)]',
            ),
        interactive,
        className,
      )}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
