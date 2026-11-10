import type { ButtonHTMLAttributes } from 'react';
import { Button, type ButtonVariant } from './button';

export type ActionButtonVariant = ButtonVariant;

/**
 * @deprecated Use `<Button size="app">`. Kept as an alias until the next major;
 * removal is tracked in https://github.com/otto-nation/otto-nation.github.io/issues/34.
 */
export function ActionButton(
  props: {
    variant?: ActionButtonVariant;
    dense?: boolean;
  } & ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return <Button size="app" {...props} />;
}
