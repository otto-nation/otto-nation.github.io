import { twMerge } from 'tailwind-merge';

export type SegmentedOption = { value: string; label: string };

// DESIGN.md `segmented` / `segmented-selected` — hairline track, label role;
// selected is ink fill with canvas text (D6). `onDark` is `segmented-on-dark` /
// `segmented-on-dark-selected` on the block band: transparent track, no hover
// fill (same as Button onDark). Focus is the global anil ring.
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  dense = false,
  onDark = false,
  className,
}: {
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  label: string;
  dense?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={twMerge(
        onDark
          ? 'inline-flex overflow-hidden rounded-[var(--ow-radius-md)] border border-[var(--ow-block-hairline)] bg-transparent [font:var(--ow-font-label)]'
          : 'inline-flex overflow-hidden rounded-[var(--ow-radius-md)] border border-[var(--ow-hairline)] bg-[var(--ow-canvas)] [font:var(--ow-font-label)]',
        dense
          ? 'h-[var(--ow-control-height-dense)]'
          : 'h-[var(--ow-control-height)]',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={onChange ? () => onChange(option.value) : undefined}
            className={
              selected
                ? onDark
                  ? 'bg-[var(--ow-block-ink)] px-[var(--ow-control-padding)] text-[var(--ow-block)]'
                  : 'bg-[var(--ow-ink)] px-[var(--ow-control-padding)] text-[var(--ow-canvas)]'
                : onDark
                  ? 'px-[var(--ow-control-padding)] text-[var(--ow-block-ink-muted)]'
                  : 'px-[var(--ow-control-padding)] text-[var(--ow-ink-muted)] hover:bg-[var(--ow-hover)]'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
