import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { lint } from '@google/design.md/linter';
import { GENERATED_HEADER, generate } from '../scripts/generate-design-md.mjs';

const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');

function sources(tokensCss = read('src/tokens.css')) {
  return {
    tokensCss,
    fontsCss: read('src/fonts.css'),
    eyebrowSource: read('src/primitives/eyebrow.tsx'),
  };
}

test('DESIGN.md matches a fresh generate from tokens.css', () => {
  const committed = read('DESIGN.md');
  assert.equal(generate(committed, sources()), committed);
});

test('generate opens the front matter with the do-not-edit header', () => {
  const stripped = read('DESIGN.md').replace(`${GENERATED_HEADER.join('\n')}\n`, '');
  const regenerated = generate(stripped, sources());
  assert.ok(
    regenerated.startsWith(`---\n${GENERATED_HEADER.join('\n')}\nversion: alpha\n`),
    'front matter does not open with the generated header',
  );
});

test('generate is idempotent', () => {
  const committed = read('DESIGN.md');
  const once = generate(committed, sources());
  assert.equal(generate(once, sources()), once);
});

test('a hex change in tokens.css fails the drift assertion', () => {
  const committed = read('DESIGN.md');
  const mutated = read('src/tokens.css').replace('#d81e5b', '#000000');
  assert.notEqual(mutated, read('src/tokens.css'), 'the subject hex was not in tokens.css');
  assert.notEqual(generate(committed, sources(mutated)), committed);
});

test('the pinned linter reports no errors and no unexpected warnings', () => {
  const report = lint(read('DESIGN.md'));
  const errors = report.findings.filter((finding) => finding.severity === 'error');
  const warnings = report.findings.filter((finding) => finding.severity === 'warning');
  const unexpected = warnings.filter((finding) => finding.rule !== 'orphaned-tokens');
  assert.equal(errors.length, 0, formatFindings('errors', errors));
  assert.equal(unexpected.length, 0, formatFindings('warnings', unexpected));
});

test('the package exports DESIGN.md', () => {
  const require = createRequire(import.meta.url);
  assert.equal(
    require.resolve('@otto-nation/brand/DESIGN.md'),
    fileURLToPath(new URL('DESIGN.md', root)),
  );
});

function formatFindings(label, findings) {
  if (findings.length === 0) return '';
  return `${label}: ${findings.map((finding) => `${finding.rule ?? '?'} ${finding.path ?? ''} ${finding.message}`).join('\n')}`;
}
