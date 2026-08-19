import Link from 'next/link';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { leavesThisDeployment } from '../internal/href';
import { Greca } from '../marks/greca';

export const ORG_HOME = 'https://otto-nation.github.io/';

// `links` are site-local and render through Link. The one cross-deployment
// link — the wordmark, pointing at the org root — is internal to the component
// and renders as an absolute anchor. See internal/href.ts for why.
//
// `slot` exists so the docs-only search context stays out of docs-less
// consumers: the landing site passes nothing, otto-workbench passes
// <SearchButton />. chrome/search-button.tsx is the only file in the package
// that may name that dependency, which test/exports.test.mjs enforces — hence
// naming it here by file rather than by vendor.
export function Nav({
  product,
  links,
  slot,
  className,
}: {
  product: string;
  links: { label: string; href: string }[];
  slot?: ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={twMerge(
        'flex items-center justify-between border-b border-[var(--ow-hairline)] px-6 py-4',
        className,
      )}
    >
      <a href={ORG_HOME} className="flex items-center gap-2 text-sm font-bold tracking-tight">
        <Greca size={17} />
        {product}
      </a>
      <span className="flex items-center gap-4 font-mono text-xs text-[var(--ow-ink-muted)]">
        {links.map((link) =>
          leavesThisDeployment(link.href) ? (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ),
        )}
        {slot}
      </span>
    </nav>
  );
}
