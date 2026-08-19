import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

export type CardItem = {
  title: string;
  body: string;
  /** Site-local href. Present means the card links and takes the hover treatment. */
  href?: string;
  /** A CSS colour for the left rule, e.g. 'var(--ow-amarillo)'. Non-linking cards only. */
  accent?: string;
  /** A mono trailing line, e.g. 'bin · git · task · zsh'. */
  meta?: string;
};

// Gap is keyed to the column count rather than exposed as a prop because the
// two shipped grids pair them: the 3-column grid links its cards and needs the
// wider gap to absorb their -m-4 hit area, the 2-column grid does not.
const COLUMNS = {
  2: 'grid-cols-1 gap-4 sm:grid-cols-2',
  3: 'grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
} as const;

// Subsumes Included and HowItWorks, which were the same component — a grid of
// hairline-bordered cards — written twice, differing only in whether a card
// links and whether it carries an accent rule.
export function CardGrid({
  columns,
  items,
  className,
}: {
  columns: keyof typeof COLUMNS;
  items: CardItem[];
  className?: string;
}) {
  return (
    <div className={twMerge('grid', COLUMNS[columns], className)}>
      {items.map((item) => {
        const face = (
          <>
            <h2 className="text-sm font-bold tracking-tight">{item.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ow-ink-muted)]">{item.body}</p>
            {item.meta ? (
              <p className="mt-3 font-mono text-xs text-[var(--ow-ink-muted)]">{item.meta}</p>
            ) : null}
          </>
        );

        return item.href ? (
          <Link
            key={item.title}
            href={item.href}
            className="-m-4 block rounded-lg border border-transparent p-4 transition-colors hover:border-[var(--ow-hairline)] focus-visible:border-[var(--ow-hairline)]"
          >
            {face}
          </Link>
        ) : (
          <div
            key={item.title}
            className="rounded-lg border border-[var(--ow-hairline)] p-4"
            style={item.accent ? { borderLeft: `3px solid ${item.accent}` } : undefined}
          >
            {face}
          </div>
        );
      })}
    </div>
  );
}
