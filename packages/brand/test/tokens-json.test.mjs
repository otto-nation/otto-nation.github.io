import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';
import { generate, TOP_LEVEL_KEYS } from '../scripts/generate-tokens-json.mjs';

const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');
const HEX = /^#[0-9a-f]{6}$/;
const PX = /^\d+px$/;

function fresh(tokensCss = read('src/tokens.css')) {
  return generate(tokensCss, read('src/fonts.css'), read('src/primitives/eyebrow.tsx'));
}

function parsed(text = fresh()) {
  return JSON.parse(text);
}

test('committed tokens.json matches a fresh generate', () => {
  assert.equal(read('tokens.json'), fresh());
});

test('generate is idempotent', () => {
  const once = fresh();
  assert.equal(fresh(), once);
});

test('a hex change in tokens.css changes the generated JSON', () => {
  const committed = read('src/tokens.css');
  const mutated = committed.replace('#d81e5b', '#000000');
  assert.notEqual(mutated, committed, 'the subject hex was not in tokens.css');
  assert.notEqual(fresh(mutated), fresh(committed));
});

test('a length change in tokens.css changes the generated JSON', () => {
  const committed = read('src/tokens.css');
  const mutated = committed.replace('--ow-radius-md: 6px', '--ow-radius-md: 7px');
  assert.notEqual(mutated, committed, 'the subject length was not in tokens.css');
  assert.notEqual(fresh(mutated), fresh(committed));
});

test('schemaVersion is 1 and top-level keys are exact', () => {
  const text = fresh();
  assert.equal(text.endsWith('\n'), true, 'missing trailing newline');
  const doc = parsed(text);
  assert.equal(text, `${JSON.stringify(doc, null, 2)}\n`, 'serialization');
  assert.equal(typeof doc.schemaVersion, 'number');
  assert.equal(doc.schemaVersion, 1);
  assert.equal('version' in doc, false);
  assert.deepEqual(Object.keys(doc), TOP_LEVEL_KEYS);
});

test('every colour is a 6-digit lowercase hex', () => {
  const doc = parsed();
  for (const theme of ['light', 'dark']) {
    const colors = doc.colors[theme];
    assert.ok(colors.primary, `colors.${theme}.primary missing`);
    assert.ok(colors['on-primary'], `colors.${theme}.on-primary missing`);
    for (const [key, value] of Object.entries(colors)) {
      assert.equal(typeof value, 'string', `colors.${theme}.${key}`);
      assert.match(value, HEX, `colors.${theme}.${key}`);
    }
  }
  assert.match(doc.focus.color.light, HEX);
  assert.match(doc.focus.color.dark, HEX);
  assert.match(doc.scrim.light.color, HEX);
  assert.match(doc.scrim.dark.color, HEX);
});

test('every length is a px string', () => {
  const doc = parsed();
  for (const [role, spec] of Object.entries(doc.typography)) {
    if (spec.fontSize !== undefined) {
      assert.equal(typeof spec.fontSize, 'string', `typography.${role}.fontSize`);
      assert.match(spec.fontSize, PX, `typography.${role}.fontSize`);
    }
    if (spec.lineHeight !== undefined) {
      assert.equal(typeof spec.lineHeight, 'string', `typography.${role}.lineHeight`);
      assert.match(spec.lineHeight, PX, `typography.${role}.lineHeight`);
    }
    if (spec.fontWeight !== undefined) {
      assert.equal(typeof spec.fontWeight, 'number', `typography.${role}.fontWeight`);
      assert.equal(Number.isInteger(spec.fontWeight), true, `typography.${role}.fontWeight`);
    }
  }
  for (const [group, values] of [
    ['radii', doc.radii],
    ['spacing', doc.spacing],
    ['lengths', doc.lengths],
    ['rules', doc.rules],
    ['panes', doc.panes],
  ]) {
    assert.ok(Object.keys(values).length > 0, `${group} is empty`);
    for (const [key, value] of Object.entries(values)) {
      assert.equal(typeof value, 'string', `${group}.${key}`);
      assert.match(value, PX, `${group}.${key}`);
    }
  }
  assert.equal(typeof doc.focus.width, 'string');
  assert.match(doc.focus.width, PX);
  assert.equal(typeof doc.focus.offset, 'string');
  assert.match(doc.focus.offset, PX);
});

test('light and dark colour keysets are equal', () => {
  const doc = parsed();
  assert.deepEqual(Object.keys(doc.colors.light), Object.keys(doc.colors.dark));
});

test('values agree with the DESIGN.md YAML', () => {
  const doc = parsed();
  const yaml = parse(frontMatterBody(read('DESIGN.md')));
  for (const [key, value] of Object.entries(yaml.rounded)) {
    assert.equal(doc.radii[key], value, `radii.${key}`);
  }
  for (const [key, value] of Object.entries(yaml.spacing)) {
    if (/^\d+$/.test(key)) {
      assert.equal(doc.spacing[key], value, `spacing.${key}`);
    } else {
      assert.equal(doc.lengths[key], value, `lengths.${key}`);
    }
  }
  for (const [key, value] of Object.entries(yaml.colors)) {
    const hex = String(value).toLowerCase();
    if (key.startsWith('dark-')) {
      assert.equal(doc.colors.dark[key.slice('dark-'.length)], hex, `colors.dark.${key.slice(5)}`);
    } else {
      assert.equal(doc.colors.light[key], hex, `colors.light.${key}`);
    }
  }
});

test('dark scrim uses canvas at 0.7 and does not lighten', () => {
  const doc = parsed();
  assert.equal(typeof doc.scrim.light.opacity, 'number');
  assert.equal(typeof doc.scrim.dark.opacity, 'number');
  assert.equal(doc.scrim.light.opacity, 0.5);
  assert.equal(doc.scrim.dark.opacity, 0.7);
  assert.equal(doc.scrim.dark.color, doc.colors.dark.canvas);
});

function frontMatterBody(designMd) {
  if (!designMd.startsWith('---\n')) {
    throw new Error('DESIGN.md must start with YAML front matter');
  }
  const end = designMd.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error('DESIGN.md front matter is not closed');
  }
  return designMd.slice(4, end);
}
