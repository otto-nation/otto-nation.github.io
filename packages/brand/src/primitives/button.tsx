import Link from 'next/link';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { leavesThisDeployment } from '../internal/href';

const SIZES = { sm: 'text-sm', xs: 'text-xs' } as const;

// Absorbs the three link-shaped buttons that shipped separately in
// otto-workbench: hero solid, hero outline, footer outline-on-dark. They
// disagreed on size (text-sm twice, text-xs once); text-sm is the default and
// the footer takes it. README § The four intended pixel changes lists this one
// alongside the rest.
export function Button({
  href,
  children,
  variant = 'solid',
  size = 'sm',
  onDark = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'outline';
  size?: keyof typeof SIZES;
  onDark?: boolean;
  className?: string;
}) {
  const ramp =
    variant === 'solid'
      ? onDark
        ? 'bg-[var(--ow-block-ink)] text-[var(--ow-block)]'
        : 'bg-[var(--ow-ink)] text-[var(--ow-canvas)]'
      : onDark
        ? 'border border-[var(--ow-block-hairline)]'
        : 'border border-[var(--ow-hairline)]';

  const classes = twMerge('rounded-md px-4 py-2 font-semibold', SIZES[size], ramp, className);

  return leavesThisDeployment(href) ? (
    <a href={href} className={classes}>
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
