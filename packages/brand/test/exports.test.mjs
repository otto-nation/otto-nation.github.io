import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const read = (relative) => readFileSync(fileURLToPath(new URL(relative, root)), 'utf8');

test('every exports-map target exists on disk', () => {
  for (const target of Object.values(manifest.exports)) {
    if (target.includes('*')) continue;
    assert.doesNotThrow(() => read(target), `${target} is exported but missing`);
  }
});

test('the bin is listed in files, or it never ships', () => {
  assert.ok(manifest.files.includes('bin'), 'files must include "bin"');
  assert.ok(manifest.files.includes('src'), 'files must include "src"');
  assert.doesNotThrow(() => read(manifest.bin['otto-brand-check']),
    'package.json declares a bin that is not on disk');
});

test('the root barrel does not reach fumadocs', () => {
  // Importing the barrel must not pull fumadocs-ui into a consumer's graph.
  // The landing site has no docs and must not acquire a fumadocs dependency
  // just by importing Nav.
  const barrel = read('src/index.ts');
  const reachable = [...barrel.matchAll(/from '(\.[^']+)'/g)].map(([, path]) =>
    read(`src/${path.replace(/^\.\//, '')}.tsx`),
  );
  for (const source of [barrel, ...reachable]) {
    const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map(([, s]) => s);
    assert.ok(!specifiers.some((s) => s.includes('fumadocs')),
      'a barrel-reachable module imports fumadocs');
  }
});

test('SearchButton has its own subpath export', () => {
  assert.equal(manifest.exports['./search-button'], './src/chrome/search-button.tsx');
  assert.ok(read('src/chrome/search-button.tsx').includes('fumadocs-ui/contexts/search'));
});

test('fumadocs-ui is an optional peer', () => {
  assert.equal(manifest.peerDependenciesMeta['fumadocs-ui'].optional, true);
});

test('every component in src is reachable from the barrel or a subpath export', () => {
  const barrel = read('src/index.ts');
  const subpaths = Object.values(manifest.exports).join(' ');
  for (const file of ['marks/greca', 'marks/rings', 'primitives/eyebrow', 'primitives/button',
    'primitives/card-grid', 'chrome/nav', 'chrome/footer', 'chrome/hero',
    'chrome/install-block', 'chrome/search-button']) {
    const referenced = barrel.includes(`./${file}'`) || subpaths.includes(`./src/${file}.tsx`);
    assert.ok(referenced, `src/${file}.tsx is unreachable — dead code or a missing export`);
  }
});
