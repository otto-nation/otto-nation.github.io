import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { transform } from 'lightningcss';

import { SOURCE_GLOB } from '../src/internal/derive.mjs';

const brandRoot = fileURLToPath(new URL('..', import.meta.url));

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

function packedTextSources() {
  const sources = [];
  for (const rel of packedPaths()) {
    if (BINARY.test(rel)) continue;
    const text = readFileSync(join(brandRoot, rel), 'utf8');
    if (text.includes('\0')) continue;
    sources.push({ rel, text, extension: extname(rel).slice(1) || 'txt' });
  }
  return sources;
}

function candidatesIn(text, extension) {
  // scanFiles treats `file` as a path to read and ignores `content` when both
  // are set, so pass content only — packed paths are already the source list.
  return new Scanner({ sources: [] }).scanFiles([{ content: text, extension }]);
}

function parseGeneratedCss(css) {
  return transform({
    filename: 'packed.css',
    code: Buffer.from(css),
    errorRecovery: false,
  });
}

function compiler() {
  return compile('@import "tailwindcss";', {
    base: brandRoot,
    onDependency() {},
  });
}

async function cssParses(candidates) {
  const css = (await compiler()).build(candidates);
  try {
    parseGeneratedCss(css);
    return true;
  } catch {
    return false;
  }
}

// build() is incremental on one compiler, so each partition needs a fresh
// compile. Split only on failure so the passing path is one compile.
async function failingCandidates(candidates) {
  if (candidates.length === 0) return [];
  if (await cssParses(candidates)) return [];
  if (candidates.length === 1) return candidates;
  const mid = Math.ceil(candidates.length / 2);
  return [
    ...(await failingCandidates(candidates.slice(0, mid))),
    ...(await failingCandidates(candidates.slice(mid))),
  ];
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

test('packed files compile to CSS lightningcss accepts', async () => {
  const sources = packedTextSources();
  assert.ok(sources.length > 0, 'npm pack listed no text files');
  const filesFor = new Map();
  for (const { rel, text, extension } of sources) {
    for (const candidate of candidatesIn(text, extension)) {
      if (!filesFor.has(candidate)) filesFor.set(candidate, []);
      filesFor.get(candidate).push(rel);
    }
  }
  const candidates = [...filesFor.keys()];
  const css = (await compiler()).build(candidates);
  try {
    parseGeneratedCss(css);
  } catch (error) {
    const failing = await failingCandidates(candidates);
    const named = failing.map((candidate) => {
      const files = filesFor.get(candidate) ?? [];
      return `${files.join(', ') || '(unknown)'}: ${candidate}`;
    });
    assert.fail(
      `packed files compile to CSS lightningcss rejects` +
        `${named.length ? `:\n${named.join('\n')}` : ''}\n${error.message}`,
    );
  }
});
