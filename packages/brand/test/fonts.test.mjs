import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { fontStack } from '../src/internal/derive.mjs';

const FONTS_CSS = readFileSync(fileURLToPath(new URL('../src/fonts.css', import.meta.url)), 'utf8');
const SUBSET_SCRIPT = readFileSync(
  fileURLToPath(new URL('../../../bin/subset-fallback-fonts', import.meta.url)),
  'utf8',
);

function fontFaces() {
  return [...FONTS_CSS.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
    family: body.match(/font-family:\s*'([^']+)'/)?.[1],
    src: body.match(/url\('([^']+)'\)/)?.[1],
    range: body.match(/unicode-range:\s*([^;]+);/)?.[1].trim(),
  }));
}

function stack(variable) {
  const value = fontStack(FONTS_CSS, variable);
  assert.ok(value, `${variable} is not declared in fonts.css`);
  return value;
}

const fallbacks = () => fontFaces().filter((face) => face.family.startsWith('Otto Fallback'));

// bin/subset-fallback-fonts builds the subset from this range and refuses to
// run when the two disagree; the test holds the same line without network.
test('both fallback faces declare one shared unicode-range', () => {
  const faces = fallbacks();
  assert.deepEqual(faces.map((face) => face.family).sort(), ['Otto Fallback Mono', 'Otto Fallback Sans']);
  assert.ok(faces.every((face) => face.range), 'a fallback face has no unicode-range');
  assert.equal(new Set(faces.map((face) => face.range)).size, 1, 'the fallback faces declare different ranges');
});

// Second, never first: League must keep drawing every character it has, and
// the fallback only fills what it lacks. Ahead of League, it would replace
// League's own digits-and-fractions in the overlap.
test('each fallback sits directly after its League face in the stack', () => {
  assert.deepEqual(stack('--font-display').slice(0, 2), ['League Spartan', 'Otto Fallback Sans']);
  assert.deepEqual(stack('--font-mono').slice(0, 2), ['League Mono', 'Otto Fallback Mono']);
});

test('every @font-face src is vendored, with its licence', () => {
  for (const face of fontFaces()) {
    assert.ok(face.src, `${face.family} has no url() src`);
    assert.ok(
      existsSync(fileURLToPath(new URL(`../src/${face.src}`, import.meta.url))),
      `${face.family}: ${face.src} is not in src/`,
    );
  }
  assert.ok(existsSync(fileURLToPath(new URL('../src/fonts/OFL-IBMPlex.txt', import.meta.url))));
});

// The script writes to these exact names; fonts.css must point at them, or a
// regeneration ships files nothing loads.
test('the subset script writes the files fonts.css loads', () => {
  for (const face of fallbacks()) {
    const file = face.src.split('/').pop();
    assert.ok(SUBSET_SCRIPT.includes(`"${file}"`), `bin/subset-fallback-fonts never writes ${file}`);
  }
});
