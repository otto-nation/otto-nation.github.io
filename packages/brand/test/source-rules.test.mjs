import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { BRAND_RULES, CONSUMER_RULES, findViolations } from '../src/internal/style-rules.mjs';
import { sourceFiles } from '../src/internal/source-files.mjs';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function tsxFiles() {
  return sourceFiles(SRC, ['.tsx']).map((abs) => relative(SRC, abs).split(sep).join('/'));
}

function walk(files, check) {
  assert.ok(files.length > 0, 'src/**/*.tsx was empty');
  for (const file of files) {
    check(file, readFileSync(join(SRC, file), 'utf8'));
  }
}

function brandRule(id) {
  const rule = BRAND_RULES.find((entry) => entry.id === id);
  assert.ok(rule, id);
  return rule;
}

function assertClean(file, source, rules) {
  const found = findViolations(source, { kind: 'script', rules });
  assert.equal(
    found.length,
    0,
    `src/${file} ${found.map((hit) => `${hit.rule.id}:${hit.line}`).join(', ')}`,
  );
}

test('src rounded utilities are radius tokens', () => {
  const rules = [brandRule('named-radius'), brandRule('arbitrary-radius')];
  walk(tsxFiles(), (file, source) => {
    assertClean(file, source, rules);
  });
});

test('src has no literal rule widths', () => {
  walk(tsxFiles(), (file, source) => {
    assertClean(file, source, [brandRule('literal-rule-width')]);
  });
});

test('primitives have no numeric spacing utilities', () => {
  const files = tsxFiles().filter((file) => file.startsWith('primitives/'));
  walk(files, (file, source) => {
    assertClean(file, source, [brandRule('numeric-spacing')]);
  });
});

test('brand src passes every consumer rule', () => {
  walk(tsxFiles(), (file, source) => {
    assertClean(file, source, CONSUMER_RULES);
  });
});
