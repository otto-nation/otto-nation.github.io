import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
};

// DESIGN.md `field` — label role above, meta-role hint or danger error
// below. Caller-supplied id wires htmlFor and aria-describedby; no useId.
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (control: FieldControlProps) => ReactNode;
  className?: string;
}) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control: FieldControlProps = {
    id,
    ...(messageId ? { 'aria-describedby': messageId } : {}),
    ...(error ? { 'aria-invalid': true as const } : {}),
  };
  return (
    <div className={twMerge('flex flex-col gap-[var(--ow-space-1)]', className)}>
      <label
        htmlFor={id}
        className="[font:var(--ow-font-label)] text-[var(--ow-ink)]"
      >
        {label}
      </label>
      {children(control)}
      {error ? (
        <p
          id={`${id}-error`}
          className="[font:var(--ow-font-meta)] text-[var(--ow-danger)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="[font:var(--ow-font-meta)] text-[var(--ow-ink-muted)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
