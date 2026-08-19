'use client';

import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Fragment } from 'react';

// The landing page has no fumadocs layout, so it inherits the ⌘K hotkey from
// RootProvider's SearchProvider but renders none of its chrome. This is that
// chrome: a trigger for the dialog the provider already owns, not a second
// search UI. `hotKey` comes from the same context, so the label follows the
// provider's binding (⌘ on mac, Ctrl elsewhere) instead of hardcoding it.
//
// Exported at @otto-nation/brand/search-button rather than from the root
// barrel: it is the only component that touches fumadocs-ui, and re-exporting
// it from index.ts would pull fumadocs into the graph of every consumer that
// imports anything — including the landing site, which has no docs at all.
export function SearchButton() {
  const { enabled, hotKey, setOpenSearch } = useSearchContext();

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      aria-label="Search documentation"
      className="flex items-center gap-2 rounded-md border border-[var(--ow-hairline)] px-2 py-1 transition-colors hover:border-[var(--ow-amarillo)] focus-visible:border-[var(--ow-amarillo)]"
    >
      search
      <kbd className="rounded-sm border border-[var(--ow-hairline)] px-1 text-[10px] leading-4">
        {hotKey.map((key, index) => (
          <Fragment key={index}>{key.display}</Fragment>
        ))}
      </kbd>
    </button>
  );
}
