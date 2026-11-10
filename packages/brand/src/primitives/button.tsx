import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { leavesThisDeployment } from '../internal/href';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'xs' | 'app';

const PAGE_TEXT = { sm: 'text-sm', xs: 'text-xs' } as const;

const VARIANT = {
  solid: {
    rest: 'bg-[var(--ow-ink)] text-[var(--ow-canvas)]',
    onDark: 'bg-[var(--ow-block-ink)] text-[var(--ow-block)]',
  },
  outline: {
    rest: 'border border-[var(--ow-hairline)] bg-[var(--ow-canvas)] text-[var(--ow-ink)]',
    onDark: 'border border-[var(--ow-block-hairline)]',
  },
  ghost: {
    rest: 'text-[var(--ow-ink)]',
    onDark: 'text-[var(--ow-block-ink)]',
  },
} as const;

const VARIANT_HOVER = {
  solid: undefined,
  outline: 'hover:bg-[var(--ow-hover)]',
  ghost: 'hover:bg-[var(--ow-hover)]',
} as const;

const VARIANT_PRESSED = {
  solid: undefined,
  outline: 'active:bg-[var(--ow-selected)]',
  ghost: 'active:bg-[var(--ow-selected)]',
} as const;

type ButtonCommon = {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  dense?: boolean;
  onDark?: boolean;
  className?: string;
};

type ButtonAsLink = ButtonCommon & { href: string };

type ButtonAsButton = ButtonCommon &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonCommon> & {
    href?: never;
  };

export type ButtonProps = ButtonAsLink | ButtonAsButton;

function buttonClassName({
  variant,
  size,
  dense,
  onDark,
  disabled,
  className,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  dense: boolean;
  onDark: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const shape =
    size === 'app'
      ? twMerge(
          'inline-flex items-center justify-center px-[var(--ow-control-padding)] [font:var(--ow-font-label)]',
          dense
            ? 'h-[var(--ow-control-height-dense)]'
            : 'h-[var(--ow-control-height)]',
        )
      : twMerge(
          'px-[var(--ow-space-4)] py-[var(--ow-space-2)] font-semibold',
          PAGE_TEXT[size],
        );

  const interactive =
    disabled || onDark
      ? undefined
      : twMerge(VARIANT_HOVER[variant], VARIANT_PRESSED[variant]);

  const disabledLook = disabled
    ? variant === 'solid'
      ? 'opacity-50'
      : 'text-[var(--ow-ink-muted)]'
    : undefined;

  return twMerge(
    'rounded-[var(--ow-radius-md)]',
    shape,
    onDark ? VARIANT[variant].onDark : VARIANT[variant].rest,
    disabledLook,
    interactive,
    className,
  );
}

// DESIGN.md `button-solid` / `button-outline` / `button-ghost` / `button-on-dark`.
// One component: with href it is a link (page CTAs); without, a <button>.
// `size="app"` is the control-height label role. Hover and pressed fills
// apply to outline and ghost only — canvas text on the selected fill fails
// AA, and onDark hover is unreadable. Absorbs the three link-shaped buttons
// that shipped separately in otto-workbench.
export function Button(props: ButtonProps) {
  const variant = props.variant ?? 'solid';
  const size = props.size ?? 'sm';
  const dense = props.dense ?? false;
  const onDark = props.onDark ?? false;

  if (typeof props.href === 'string') {
    const className = buttonClassName({
      variant,
      size,
      dense,
      onDark,
      className: props.className,
    });
    const { href, children } = props;
    return leavesThisDeployment(href) ? (
      <a href={href} className={className}>
        {children}
      </a>
    ) : (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const {
    children,
    variant: _variant,
    size: _size,
    dense: _dense,
    onDark: _onDark,
    className: classNameProp,
    href: _href,
    type = 'button',
    disabled,
    ...rest
  } = props;

  return (
    <button
      type={type}
      disabled={disabled}
      className={buttonClassName({
        variant,
        size,
        dense,
        onDark,
        disabled,
        className: classNameProp,
      })}
      {...rest}
    >
      {children}
    </button>
  );
}
