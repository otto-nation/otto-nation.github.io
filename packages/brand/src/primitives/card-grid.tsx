import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import { leavesThisDeployment } from '../internal/href';

export type CardItem = {
  title: string;
  body: string;
  /** Present means the card links and takes the hover treatment. Site-local or
   *  off-site: the card picks Link or a plain anchor for you. */
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

// The negative margin is the hit area: a linked card is clickable a little
// beyond its text, which is why only the linking grid gets the wider gap above.
const LINKED_CARD =
  '-m-4 block rounded-lg border border-transparent p-4 transition-colors hover:border-[var(--ow-hairline)] focus-visible:border-[var(--ow-hairline)]';

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
      {items.map((item, index) => {
        // Two cards can carry the same title — the component is reused across
        // grids and the copy is the caller's — so the position disambiguates
        // it while the title still remounts the card when the entry changes.
        const key = `${index}-${item.title}`;
        const face = (
          <>
            <h2 className="text-sm font-bold tracking-tight">{item.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ow-ink-muted)]">{item.body}</p>
            {item.meta ? (
              <p className="mt-3 font-mono text-xs text-[var(--ow-ink-muted)]">{item.meta}</p>
            ) : null}
          </>
        );

        if (!item.href) {
          return (
            <div
              key={key}
              className="rounded-lg border border-[var(--ow-hairline)] p-4"
              style={item.accent ? { borderLeft: `3px solid ${item.accent}` } : undefined}
            >
              {face}
            </div>
          );
        }

        // Same split as Button: an href that leaves the deployment is a plain
        // anchor, because next/link would resolve it under the consumer's
        // basePath. See internal/href.ts.
        return leavesThisDeployment(item.href) ? (
          <a key={key} href={item.href} className={LINKED_CARD}>
            {face}
          </a>
        ) : (
          <Link key={key} href={item.href} className={LINKED_CARD}>
            {face}
          </Link>
        );
      })}
    </div>
  );
}
