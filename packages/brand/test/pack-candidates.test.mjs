import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { SOURCE_GLOB } from '../src/internal/derive.mjs';

const brandRoot = fileURLToPath(new URL('..', import.meta.url));

// Tailwind v4 treats a complete `utility-[…* or |…]` token as a candidate. A
// packed README that contains one compiles to invalid CSS when a consumer's
// @source glob over-scans the package root. Markdown links have no `prefix-`
// before the brackets; regex character classes escape `[`.
const CANDIDATE = /(?<!\\)(?:^|[\s"'`:])(?:[\w-]+:)*[a-z][\w-]*-\[[^\]\s\\]*[*|][^\]\s\\]*\]/gi;
const BINARY = /\.(woff2|woff|ttf|otf|png|jpe?g|gif|webp|ico)$/i;

function packedPaths() {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: brandRoot,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(raw);
  const files = Array.isArray(parsed) ? parsed[0].files : parsed.files;
  assert.ok(files?.length, 'npm pack --dry-run --json listed no files');
  return files.map((entry) => entry.path);
}

test('README and the check hint recommend SOURCE_GLOB', () => {
  const readme = readFileSync(join(brandRoot, 'README.md'), 'utf8');
  const check = readFileSync(join(brandRoot, 'bin/otto-brand-check.mjs'), 'utf8');
  const verify = readFileSync(join(brandRoot, 'src/verify.mjs'), 'utf8');
  assert.ok(
    readme.includes(`@source '../${SOURCE_GLOB}'`),
    'README must show the same @source glob otto-brand-check recommends',
  );
  assert.match(check, /SOURCE_GLOB/);
  assert.match(verify, /SOURCE_GLOB/);
});

test('packed files contain no class-shaped arbitrary with * or |', () => {
  const hits = [];
  for (const rel of packedPaths()) {
    if (BINARY.test(rel)) continue;
    const text = readFileSync(join(brandRoot, rel), 'utf8');
    if (text.includes('\0')) continue;
    for (const match of text.matchAll(CANDIDATE)) {
      hits.push(`${rel}: ${match[0].trim()}`);
    }
  }
  assert.equal(
    hits.length,
    0,
    `packed files still carry Tailwind candidates with * or |:\n${hits.join('\n')}`,
  );
});
