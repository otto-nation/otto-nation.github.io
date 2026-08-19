import Link from 'next/link';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

const SIZES = { sm: 'text-sm', xs: 'text-xs' } as const;

// Absorbs the three link-shaped buttons that shipped separately in
// otto-workbench: hero solid, hero outline, footer outline-on-dark. They
// disagreed on size (text-sm twice, text-xs once); text-sm is the default and
// the footer takes it, which is one of the four intended pixel changes.
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

  // A consumer with a basePath (otto-workbench sets '/otto-workbench') has
  // next/link prefix every internal href. An absolute URL run through Link
  // resolves inside the wrong site, so anything with a scheme is a plain
  // anchor and only site-local hrefs keep Link. Structural, not incidental:
  // a caller cannot get it wrong by passing the wrong prop.
  return /^[a-z]+:/.test(href) ? (
    <a href={href} className={classes}>
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
