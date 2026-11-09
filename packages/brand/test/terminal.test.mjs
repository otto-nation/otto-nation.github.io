import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { contrast } from '../src/internal/derive.mjs';
import { generate } from '../scripts/generate-terminal-themes.mjs';

const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');

const FILES = ['otto-light.json', 'otto-dark.json'];
const THEME_KEYS = ['background', 'foreground', 'selection', 'cursor', 'ansi'];
const HEX = /^#[0-9a-f]{6}$/;

// Text slots (foreground, 1–6, 8–14) must clear AA on that file's
// background. Slots 0/7/15 in light and 0 in dark are background-class
// and exempt — same set as test/design-md.test.mjs, read here from the
// JSON itself rather than from resolveTerminal.
const TERMINAL_EXEMPT = {
  'otto-light.json': new Set([0, 7, 15]),
  'otto-dark.json': new Set([0]),
};

function fresh(tokensCss = read('src/tokens.css')) {
  return generate(read('DESIGN.md'), tokensCss);
}

test('committed terminal JSON matches a fresh generate', () => {
  const next = fresh();
  for (const name of FILES) {
    assert.equal(read(`terminal/${name}`), next[name], name);
  }
});

test('generate is idempotent', () => {
  const once = fresh();
  const twice = generate(read('DESIGN.md'), read('src/tokens.css'));
  assert.deepEqual(twice, once);
});

test('a hex change in tokens.css changes the generated JSON', () => {
  const committed = read('src/tokens.css');
  const mutated = committed.replace('#d81e5b', '#000000');
  assert.notEqual(mutated, committed, 'the subject hex was not in tokens.css');
  const next = fresh(mutated);
  const current = fresh(committed);
  assert.notEqual(next['otto-light.json'], current['otto-light.json']);
});

test('each theme has exactly the five keys, 16 ansi slots, and lowercase hex', () => {
  const next = fresh();
  for (const name of FILES) {
    const text = next[name];
    assert.equal(text.endsWith('\n'), true, `${name} missing trailing newline`);
    const parsed = JSON.parse(text);
    assert.deepEqual(Object.keys(parsed), THEME_KEYS, name);
    assert.equal(parsed.ansi.length, 16, `${name} ansi length`);
    assert.equal(text, `${JSON.stringify(parsed, null, 2)}\n`, `${name} serialization`);
    for (const key of ['background', 'foreground', 'selection', 'cursor']) {
      assert.match(parsed[key], HEX, `${name} ${key}`);
    }
    for (let i = 0; i < 16; i += 1) {
      assert.match(parsed.ansi[i], HEX, `${name} ansi[${i}]`);
    }
  }
});

test('text slots in the JSON clear AA on that file background', () => {
  for (const name of FILES) {
    const parsed = JSON.parse(read(`terminal/${name}`));
    const bg = parsed.background;
    const fgRatio = contrast(parsed.foreground, bg);
    assert.ok(
      fgRatio >= 4.5,
      `${name} foreground on background is ${fgRatio.toFixed(2)}:1, under AA`,
    );
    const exempt = TERMINAL_EXEMPT[name];
    for (let slot = 0; slot < 16; slot += 1) {
      if (exempt.has(slot)) continue;
      const ratio = contrast(parsed.ansi[slot], bg);
      assert.ok(
        ratio >= 4.5,
        `${name} ansi[${slot}] on background is ${ratio.toFixed(2)}:1, under AA`,
      );
    }
  }
});
