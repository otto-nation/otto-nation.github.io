import { Children, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// No horizontal-scroll wrapper: a wrapper sized for one page's layout clips
// wide columns on every other page, and pages that need scrolling can add
// their own around the table.

export type TableAlign = 'start' | 'center' | 'end';

const ALIGN: Record<TableAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

const ROW_VARIANT = {
  // A section heading inside the body, spanning the full width. Not interactive, so no hover.
  // Header rows opt out of the row hover with className="hover:bg-transparent".
  section:
    'bg-[var(--ow-surface)] hover:bg-[var(--ow-surface)] [&>td]:[font:var(--ow-font-section)] [&>td]:text-[var(--ow-ink-muted)]',
  // A summary row closing the table off.
  total: '[&>td]:border-b-0 [&>td]:border-t [&>td]:border-t-[var(--ow-ink)] [&>td]:font-semibold',
} as const;

type CellStyleProps = {
  align?: TableAlign;
  /** Monospace, tabular figures, no wrapping — for measurements and counts. */
  numeric?: boolean;
  /** De-emphasised secondary text — for notes and annotations. */
  muted?: boolean;
  /** Fixed column width, e.g. '40px'. Applied inline: a Tailwind arbitrary
   *  value built from a prop is never seen by the class scanner. */
  width?: string;
  /** Lower bound on column width, so a prose column cannot collapse. */
  minWidth?: string;
};

function cellClassName({ align = 'start', numeric, muted }: CellStyleProps) {
  return twMerge(
    'border-b border-[var(--ow-hairline)] px-[var(--ow-space-3)] py-[var(--ow-space-2)] align-top',
    ALIGN[align],
    numeric && '[font:var(--ow-font-code)] tabular-nums whitespace-nowrap',
    muted && 'text-[var(--ow-ink-muted)]',
  );
}

function cellStyle({ width, minWidth }: CellStyleProps): CSSProperties | undefined {
  if (!width && !minWidth) return undefined;
  return { width, minWidth };
}

// Splits a cell's styling props from the DOM attributes that pass straight
// through, so Cell and HeaderCell cannot drift when a style prop is added.
//
// `style` is pulled out alongside the CellStyleProps keys (rather than left
// in `attrs`) so a caller-supplied `style` prop can be merged with the
// computed width/minWidth instead of being spread after them and silently
// clobbering them — JSX resolves duplicate props in declaration order, last
// wins.
function splitCellProps<P extends CellStyleProps & { style?: CSSProperties }>(
  props: P,
): {
  cellProps: CellStyleProps;
  passedStyle: CSSProperties | undefined;
  attrs: Omit<P, keyof CellStyleProps | 'style'>;
} {
  const { align, numeric, muted, width, minWidth, style, ...attrs } = props;
  return { cellProps: { align, numeric, muted, width, minWidth }, passedStyle: style, attrs };
}

// Merges a caller-supplied `style` with the computed width/minWidth, rather
// than letting one silently overwrite the other.
function mergeCellStyle(
  cellProps: CellStyleProps,
  passedStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  const computed = cellStyle(cellProps);
  return passedStyle || computed ? { ...passedStyle, ...computed } : undefined;
}

export function Table({
  caption,
  children,
  className,
  ref,
  ...rest
}: { caption?: ReactNode } & ComponentPropsWithRef<'table'>) {
  return (
    <table
      className={twMerge(
        'w-full border-collapse [font:var(--ow-font-body)] text-[var(--ow-ink)]',
        className,
      )}
      {...rest}
      ref={ref}
    >
      {caption ? (
        <caption className="pb-[var(--ow-space-2)] text-left [font:var(--ow-font-section)] text-[var(--ow-ink-muted)]">
          {caption}
        </caption>
      ) : null}
      {children}
    </table>
  );
}

// A row written across several source lines arrives with a whitespace text
// node between each pair of cells, because JSX keeps the newline and indent
// between two elements as a child. Nothing may sit between <tr> and its <td>s:
// the browser hoists those text nodes out of the table while React's server
// render leaves them in, so the trees disagree and the row logs a hydration
// error. Filtered here rather than by reflowing the MDX onto single lines —
// several rows in these plans carry a paragraph per cell, and a row that has
// to stay on one line is a row nobody can read in the source.
//
// Only Row needs this: React already discards the whitespace between sibling
// <tr> elements, so Head and Body do not filter.
function withoutWhitespace(children: ReactNode) {
  return Children.toArray(children).filter(
    (child) => typeof child !== 'string' || child.trim() !== '',
  );
}

function Head({ children, className, ...rest }: ComponentPropsWithRef<'thead'>) {
  return (
    <thead className={className} {...rest}>
      {children}
    </thead>
  );
}

function Body({ children, className, ...rest }: ComponentPropsWithRef<'tbody'>) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

function Row({
  variant,
  children,
  className,
  ...rest
}: { variant?: keyof typeof ROW_VARIANT } & ComponentPropsWithRef<'tr'>) {
  return (
    <tr
      className={twMerge(
        'hover:bg-[var(--ow-hover)]',
        variant && ROW_VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {withoutWhitespace(children)}
    </tr>
  );
}

function Cell({
  children,
  className,
  ...rest
}: CellStyleProps & Omit<ComponentPropsWithRef<'td'>, 'align'>) {
  const { cellProps, passedStyle, attrs } = splitCellProps(rest);
  return (
    <td
      className={twMerge(cellClassName(cellProps), className)}
      style={mergeCellStyle(cellProps, passedStyle)}
      {...attrs}
    >
      {children}
    </td>
  );
}

function HeaderCell({
  children,
  className,
  ...rest
}: CellStyleProps & Omit<ComponentPropsWithRef<'th'>, 'align'>) {
  const { cellProps, passedStyle, attrs } = splitCellProps(rest);
  return (
    <th
      className={twMerge(
        cellClassName(cellProps),
        'border-b border-b-[var(--ow-ink)] font-semibold whitespace-nowrap',
        '[font:var(--ow-font-section)] text-[var(--ow-ink-muted)]',
        className,
      )}
      style={mergeCellStyle(cellProps, passedStyle)}
      {...attrs}
    >
      {children}
    </th>
  );
}

Table.Head = Head;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;
Table.HeaderCell = HeaderCell;
