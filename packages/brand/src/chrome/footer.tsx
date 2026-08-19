import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { Greca } from '../marks/greca';

// The org property list, rendered as absolute anchors for the same
// cross-deployment reason as Nav's wordmark. Adding a property is one entry
// here and it appears in every consumer's footer on their next version bump.
export const PROPERTIES = [
  { label: 'otto-workbench', href: 'https://otto-nation.github.io/otto-workbench/' },
  { label: 'otto-stack', href: 'https://github.com/otto-nation/otto-stack' },
  { label: 'homebrew-tap', href: 'https://github.com/otto-nation/homebrew-tap' },
];

export function Footer({ cta, className }: { cta?: ReactNode; className?: string }) {
  return (
    <footer
      className={twMerge(
        'bg-[var(--ow-block)] px-6 py-5 text-[var(--ow-block-ink)]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Greca size={14} onDark />
          <span className="font-mono text-[10px] text-[var(--ow-block-ink-muted)]">
            MIT · otto-nation
          </span>
        </span>
        {cta}
      </div>
      <div className="mt-4 flex gap-4 font-mono text-[10px] text-[var(--ow-block-ink-muted)]">
        {PROPERTIES.map((property) => (
          <a key={property.href} href={property.href}>
            {property.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
