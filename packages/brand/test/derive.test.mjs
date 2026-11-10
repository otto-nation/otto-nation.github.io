import assert from 'node:assert/strict';
import test from 'node:test';

import {
  declaredTokens,
  focusRing,
  lengthGroups,
  lightTokenHexes,
  scrimSpec,
} from '../src/internal/derive.mjs';

function tokensCss(rootBody, darkBody = '') {
  return `:root {\n${rootBody}}\n.dark {\n${darkBody}}\n`;
}

test('declaredTokens returns a digit token name whole', () => {
  const names = declaredTokens(tokensCss('  --ow-space-1: 4px;\n'));
  assert.equal(names.has('--ow-space-1'), true);
  assert.equal(names.has('--ow-space-'), false);
});

test('hexMap records #rrggbb and skips color-mix and var()', () => {
  const hexes = lightTokenHexes(tokensCss(
    '  --ow-canvas: #f7f2e9;\n'
    + '  --ow-alias: var(--ow-canvas);\n'
    + '  --ow-scrim: color-mix(in srgb, var(--ow-block) 50%, transparent);\n',
  ));
  assert.equal(hexes.get('--ow-canvas'), '#f7f2e9');
  assert.equal(hexes.has('--ow-alias'), false);
  assert.equal(hexes.has('--ow-scrim'), false);
});

test('hexMap throws on an 8-digit hex', () => {
  assert.throws(
    () => lightTokenHexes(tokensCss('  --ow-scrim: #1a171280;\n')),
    /--ow-scrim: unmodelled hex value #1a171280/,
  );
});

test('hexMap ignores a declaration inside a comment', () => {
  const hexes = lightTokenHexes(tokensCss(
    '  --ow-canvas: #f7f2e9;\n'
    + '  /* --ow-ghost: #123456; */\n',
  ));
  assert.equal(hexes.get('--ow-canvas'), '#f7f2e9');
  assert.equal(hexes.has('--ow-ghost'), false);
});

test('lengthGroups keys space by digit and leaves other px lengths', () => {
  const groups = lengthGroups(tokensCss(
    '  --ow-radius-md: 6px;\n'
    + '  --ow-space-1: 4px;\n'
    + '  --ow-focus-width: 2px;\n'
    + '  --ow-rule-accent: 3px;\n'
    + '  --ow-pane-board: 560px;\n'
    + '  --ow-column-min: 260px;\n',
  ));
  assert.equal(groups.radii.get('md'), '6px');
  assert.equal(groups.spacing.get('1'), '4px');
  assert.equal(groups.focus.get('width'), '2px');
  assert.equal(groups.rules.get('accent'), '3px');
  assert.equal(groups.panes.get('board'), '560px');
  assert.equal(groups.lengths.get('column-min'), '260px');
  assert.equal(groups.lengths.has('space-1'), false);
  assert.equal(groups.lengths.has('radius-md'), false);
});

test('scrimSpec parses light and dark color-mix declarations', () => {
  const css = tokensCss(
    '  --ow-scrim: color-mix(in srgb, var(--ow-block) 50%, transparent);\n',
    '  --ow-scrim: color-mix(in srgb, var(--ow-canvas) 70%, transparent);\n',
  );
  assert.deepEqual(scrimSpec(css, 'light'), { token: '--ow-block', opacity: 0.5 });
  assert.deepEqual(scrimSpec(css, 'dark'), { token: '--ow-canvas', opacity: 0.7 });
});

test('scrimSpec throws on any other shape', () => {
  assert.throws(
    () => scrimSpec(tokensCss('  --ow-scrim: #1a171280;\n')),
    /--ow-scrim: unmodelled value #1a171280/,
  );
});

test('focusRing picks the hex var as colour, not the width var', () => {
  const css = `${tokensCss(
    '  --ow-anil: #2b4ba8;\n'
    + '  --ow-focus-width: 2px;\n'
    + '  --ow-focus-offset: 2px;\n',
  )}@layer base {
  :focus-visible {
    outline: var(--ow-focus-width) solid var(--ow-anil);
    outline-offset: var(--ow-focus-offset);
  }
}
`;
  assert.deepEqual(focusRing(css), {
    color: '--ow-anil',
    width: '--ow-focus-width',
    offset: '--ow-focus-offset',
  });
});
