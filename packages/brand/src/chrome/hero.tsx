import type { ReactNode } from 'react';
import { Rings } from '../marks/rings';
import { Eyebrow } from '../primitives/eyebrow';

// `headline` is a ReactNode, not a string, so a two-line break survives the
// extraction — otto-workbench's is "One command.<br />Every machine."
export function Hero({
  eyebrow,
  headline,
  lede,
  actions,
}: {
  eyebrow: string;
  headline: ReactNode;
  lede: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden px-6 pb-9 pt-11">
      <Rings />
      <div className="relative max-w-full sm:max-w-[62%]">
        <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
        <h1 className="text-5xl font-extrabold leading-[0.94] tracking-[-0.022em]">{headline}</h1>
        <p className="mt-4 max-w-[88%] leading-relaxed text-[var(--ow-ink-muted)]">{lede}</p>
        {actions ? <div className="mt-5 flex gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
