import type { MouseEventHandler, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// DESIGN.md `list-row` / `list-row-hover` / `list-row-selected` — body role,
// row heights; selected fill plus a --ow-rule-selected primary left rule (D6).
export function ListRow({
  children,
  selected = false,
  dense = false,
  onClick,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  dense?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}) {
  const classNameMerged = twMerge(
    'flex w-full items-center text-left [font:var(--ow-font-body)] text-[var(--ow-ink)]',
    dense ? 'h-[var(--ow-row-height-dense)]' : 'h-[var(--ow-row-height)]',
    selected
      ? 'border-l-[length:var(--ow-rule-selected)] border-l-[var(--color-fd-primary)] bg-[var(--ow-selected)]'
      : 'hover:bg-[var(--ow-hover)]',
    className,
  );
  const current = selected ? true : undefined;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-current={current} className={classNameMerged}>
        {children}
      </button>
    );
  }

  return (
    <div aria-current={current} className={classNameMerged}>
      {children}
    </div>
  );
}
