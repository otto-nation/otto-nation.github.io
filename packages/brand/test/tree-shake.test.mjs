import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { build } from 'esbuild';

const brandRoot = fileURLToPath(new URL('..', import.meta.url));

const tempDirs = [];
process.on('exit', () => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup: a stray failure here must not flip the exit code.
    }
  }
});

// esbuild honours package.json sideEffects only when the files resolve as a
// package. A relative path into src/ ignores the field, so the entry imports
// `@otto-nation/brand` from a temp dir whose node_modules symlink is the
// package. That is also why esbuild is a devDependency: it is the only
// bundler that can run inside `node --test` without a fixture app.
function consumerDir() {
  const dir = mkdtempSync(join(tmpdir(), 'brand-shake-'));
  tempDirs.push(dir);
  const scoped = join(dir, 'node_modules', '@otto-nation');
  mkdirSync(scoped, { recursive: true });
  symlinkSync(brandRoot, join(scoped, 'brand'));
  return dir;
}

const nextExternal = {
  name: 'external-next',
  setup(buildApi) {
    buildApi.onResolve({ filter: /^next(\/|$)/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

async function bundle(names) {
  const dir = consumerDir();
  const entry = join(dir, 'entry.js');
  writeFileSync(entry, `export { ${names.join(', ')} } from '@otto-nation/brand';\n`);
  const result = await build({
    absWorkingDir: dir,
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    write: false,
    logLevel: 'silent',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    plugins: [nextExternal],
  });
  return result.outputFiles[0].text;
}

function hasNextImport(code) {
  return /from\s*['"]next(?:\/[^'"]*)?['"]/.test(code)
    || /import\s*['"]next(?:\/[^'"]*)?['"]/.test(code);
}

test('Tag and SegmentedControl do not pull next/link through the barrel', async () => {
  const code = await bundle(['Tag', 'SegmentedControl']);
  assert.equal(hasNextImport(code), false, 'unused barrel exports left a next import');
  assert.ok(!code.includes('next/link'), 'output still mentions next/link');
  assert.ok(!code.includes('next/'), 'output still mentions a next/ path');
});

test('Button keeps next/link, so the shake test can see it', async () => {
  const code = await bundle(['Button']);
  assert.ok(
    code.includes('next/link'),
    'Button bundle dropped next/link; the shake assertion would be vacuous',
  );
});
