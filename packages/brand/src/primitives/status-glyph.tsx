import { twMerge } from 'tailwind-merge';

const GLYPHS = {
  pass: { char: '\u2713', color: 'text-[var(--ow-done)]' },
  fail: { char: '\u00D7', color: 'text-[var(--ow-danger)]' },
  running: { char: '\u2026', color: 'text-[var(--ow-info)]' },
  warn: { char: '!', color: 'text-[var(--ow-warn)]' },
  none: { char: '\u00B7', color: 'text-[var(--ow-ink-muted)]' },
} as const;

export type StatusGlyphStatus = keyof typeof GLYPHS;

// DESIGN.md § States status glyphs — always paired with a text or aria label.
export function StatusGlyph({
  status,
  label,
  showLabel = true,
  className,
}: {
  status: StatusGlyphStatus;
  label: string;
  showLabel?: boolean;
  className?: string;
}) {
  const { char, color } = GLYPHS[status];
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 [font:var(--ow-font-meta)]',
        color,
        className,
      )}
    >
      <span aria-hidden="true">{char}</span>
      <span className={showLabel ? undefined : 'sr-only'}>{label}</span>
    </span>
  );
}
