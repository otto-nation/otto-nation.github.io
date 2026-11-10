import assert from 'node:assert/strict';
import test from 'node:test';

import { declaredTokens, lightTokenHexes } from '../src/internal/derive.mjs';

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
