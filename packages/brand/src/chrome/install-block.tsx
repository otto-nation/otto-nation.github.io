'use client';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

// `commands` replaces the hardcoded constant otto-workbench held. The copy
// button now copies every command rather than only the first — with a real
// list there is no principled reason to copy one line of three. Behavioural
// change, called out in the migration PR.
export function InstallBlock({
  shell,
  commands,
  className,
}: {
  shell: string;
  commands: string[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={twMerge('overflow-hidden rounded-lg bg-[var(--ow-block)]', className)}>
      <div className="flex items-center justify-between border-b border-[var(--ow-block-hairline)] px-3 py-2">
        <span className="font-mono text-[9px] text-[var(--ow-block-ink-muted)]">{shell}</span>
        <button
          type="button"
          aria-live="polite"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(commands.join('\n'));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch (error) {
              console.error('Failed to copy install commands', error);
            }
          }}
          className="font-mono text-[9px] text-[var(--ow-block-ink-muted)]"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-xs leading-7 text-[var(--ow-block-ink)]">
        {commands.map((command, index) => (
          <span key={command}>
            <span className="text-[var(--ow-amarillo)]">$ </span>
            {command}
            {index < commands.length - 1 ? '\n' : null}
          </span>
        ))}
      </pre>
    </div>
  );
}
