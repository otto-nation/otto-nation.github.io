import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

const NAMED_RADIUS =
  /(?:^|[\s"'`])rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?(?=[\s"'`]|$)/;
const ARBITRARY_RADIUS = /rounded-\[(?!var\(--ow-radius-[a-z]+\))/;
const LITERAL_BORDER_LEFT = /border-l-\[\d+px\]/;
const LITERAL_SOLID = /\d+px\s+solid/;
const NUMERIC_SPACING =
  /(?:^|[\s"'`])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-[1-6](?=[\s"'`]|$)/;

function sourceFiles() {
  return readdirSync(SRC, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => relative(SRC, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

function walk(files, check) {
  assert.ok(files.length > 0, 'src/**/*.tsx was empty');
  for (const file of files) {
    check(file, readFileSync(join(SRC, file), 'utf8'));
  }
}

test('src has no hover:border', () => {
  walk(sourceFiles(), (file, source) => {
    assert.doesNotMatch(
      source,
      /hover:border/,
      `src/${file} changes a border on hover`,
    );
  });
});

test('src rounded utilities are radius tokens', () => {
  walk(sourceFiles(), (file, source) => {
    assert.doesNotMatch(
      source,
      NAMED_RADIUS,
      `src/${file} uses a named rounded utility`,
    );
    assert.doesNotMatch(
      source,
      ARBITRARY_RADIUS,
      `src/${file} uses a rounded value that is not --ow-radius-*`,
    );
  });
});

test('src has no literal rule widths', () => {
  walk(sourceFiles(), (file, source) => {
    assert.doesNotMatch(
      source,
      LITERAL_BORDER_LEFT,
      `src/${file} hard-codes a border-l pixel width`,
    );
    assert.doesNotMatch(
      source,
      LITERAL_SOLID,
      `src/${file} hard-codes an Npx solid rule`,
    );
  });
});

test('primitives have no numeric spacing utilities', () => {
  const files = sourceFiles().filter((file) => file.startsWith('primitives/'));
  walk(files, (file, source) => {
    assert.doesNotMatch(
      source,
      NUMERIC_SPACING,
      `src/${file} uses a numeric spacing utility`,
    );
  });
});
