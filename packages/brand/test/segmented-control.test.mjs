import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const SOURCE = readFileSync(
  fileURLToPath(new URL('../src/primitives/segmented-control.tsx', import.meta.url)),
  'utf8',
);

const DEFAULT_TRACK =
  'inline-flex overflow-hidden rounded-[var(--ow-radius-md)] border border-[var(--ow-hairline)] bg-[var(--ow-canvas)] [font:var(--ow-font-label)]';
const DEFAULT_SELECTED =
  'bg-[var(--ow-ink)] px-[var(--ow-control-padding)] text-[var(--ow-canvas)]';
const DEFAULT_REST =
  'px-[var(--ow-control-padding)] text-[var(--ow-ink-muted)] hover:bg-[var(--ow-hover)]';

test('default SegmentedControl class strings are unchanged', () => {
  assert.ok(SOURCE.includes(DEFAULT_TRACK), 'default track classes drifted');
  assert.ok(SOURCE.includes(DEFAULT_SELECTED), 'default selected classes drifted');
  assert.ok(SOURCE.includes(DEFAULT_REST), 'default unselected classes drifted');
});

test('onDark SegmentedControl uses the block-band tokens and drops hover fill', () => {
  assert.match(SOURCE, /onDark\s*=\s*false/, 'onDark must default false');
  assert.ok(
    SOURCE.includes(
      'inline-flex overflow-hidden rounded-[var(--ow-radius-md)] border border-[var(--ow-block-hairline)] bg-transparent [font:var(--ow-font-label)]',
    ),
    'onDark track is not transparent with block-hairline',
  );
  assert.ok(
    SOURCE.includes('bg-[var(--ow-block-ink)] px-[var(--ow-control-padding)] text-[var(--ow-block)]'),
    'onDark selected is not block-ink fill with block text',
  );
  assert.ok(
    SOURCE.includes("px-[var(--ow-control-padding)] text-[var(--ow-block-ink-muted)]"),
    'onDark unselected is not block-ink-muted',
  );
  const hoverFills = SOURCE.match(/hover:bg-\[var\(--ow-hover\)\]/g) ?? [];
  assert.equal(hoverFills.length, 1, 'onDark must not add a hover fill');
});
