import type { ComponentPropsWithRef, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// Consumers open it with ref.current.showModal(). `ref` is a React 19 prop
// forwarded to <dialog>. Older browsers may not pass custom properties to
// ::backdrop (scrim then transparent; still modal).
export function Dialog({
  id,
  title,
  children,
  actions,
  className,
  ref,
  ...rest
}: {
  id: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithRef<'dialog'>, 'id'>) {
  return (
    <dialog
      {...rest}
      ref={ref}
      id={id}
      aria-labelledby={`${id}-title`}
      className={twMerge(
        'm-auto bg-[var(--ow-surface)] text-[var(--ow-ink)] border border-[var(--ow-outline)] rounded-[var(--ow-radius-lg)] p-[var(--ow-card-padding)] backdrop:bg-[var(--ow-scrim)]',
        className,
      )}
    >
      <h2 id={`${id}-title`} className="[font:var(--ow-font-title)]">
        {title}
      </h2>
      {children}
      {actions != null ? (
        <form
          method="dialog"
          className="flex justify-end gap-[var(--ow-space-2)]"
        >
          {actions}
        </form>
      ) : null}
    </dialog>
  );
}
