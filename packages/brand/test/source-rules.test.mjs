import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function sourceFiles() {
  return readdirSync(SRC, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => relative(SRC, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

test('src has no hover:border', () => {
  const files = sourceFiles();
  assert.ok(files.length > 0, 'src/**/*.tsx was empty');
  for (const file of files) {
    const source = readFileSync(join(SRC, file), 'utf8');
    assert.doesNotMatch(
      source,
      /hover:border/,
      `src/${file} changes a border on hover`,
    );
  }
});
