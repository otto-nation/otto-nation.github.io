import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';

import { sourceFiles } from '../src/internal/source-files.mjs';

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

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'brand-src-'));
  tempDirs.push(dir);
  return dir;
}

function gitInit(dir) {
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
}

test('a file three directories deep is found without git', () => {
  const dir = tmp();
  const deep = join(dir, 'a', 'b', 'c');
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'deep.js'), 'x\n');
  const files = sourceFiles(dir, ['.js']);
  assert.equal(files.length, 1);
  assert.equal(basename(files[0]), 'deep.js');
});

test('a file three directories deep is found in a git work tree', () => {
  const dir = tmp();
  gitInit(dir);
  const deep = join(dir, 'a', 'b', 'c');
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'deep.js'), 'x\n');
  const files = sourceFiles(dir, ['.js']);
  assert.equal(files.length, 1);
  assert.equal(basename(files[0]), 'deep.js');
});

test('gitignored files are not listed', () => {
  const dir = tmp();
  gitInit(dir);
  writeFileSync(join(dir, '.gitignore'), 'dist/\n');
  mkdirSync(join(dir, 'dist'));
  writeFileSync(join(dir, 'dist', 'a.js'), 'x\n');
  writeFileSync(join(dir, 'keep.js'), 'x\n');
  const files = sourceFiles(dir, ['.js']);
  assert.equal(files.length, 1);
  assert.equal(basename(files[0]), 'keep.js');
});

test('GIT_DIR pointing at another repo is ignored', () => {
  const dir = tmp();
  gitInit(dir);
  writeFileSync(join(dir, 'app.js'), 'x\n');
  const other = tmp();
  gitInit(other);
  writeFileSync(join(other, 'other.js'), 'x\n');
  const previous = {
    GIT_DIR: process.env.GIT_DIR,
    GIT_WORK_TREE: process.env.GIT_WORK_TREE,
    GIT_INDEX_FILE: process.env.GIT_INDEX_FILE,
  };
  process.env.GIT_DIR = join(other, '.git');
  process.env.GIT_WORK_TREE = other;
  process.env.GIT_INDEX_FILE = join(other, '.git', 'index');
  try {
    const files = sourceFiles(dir, ['.js']);
    assert.equal(files.length, 1);
    assert.equal(basename(files[0]), 'app.js');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('listed files are sorted', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'z.js'), 'x\n');
  writeFileSync(join(dir, 'a.js'), 'x\n');
  writeFileSync(join(dir, 'm.js'), 'x\n');
  const files = sourceFiles(dir, ['.js']);
  assert.deepEqual(files.map((file) => basename(file)), ['a.js', 'm.js', 'z.js']);
});

test('fallback skips node_modules and dot directories', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'node_modules'));
  writeFileSync(join(dir, 'node_modules', 'x.js'), 'x\n');
  mkdirSync(join(dir, '.hidden'));
  writeFileSync(join(dir, '.hidden', 'y.js'), 'x\n');
  writeFileSync(join(dir, 'ok.js'), 'x\n');
  const files = sourceFiles(dir, ['.js']);
  assert.equal(files.length, 1);
  assert.equal(basename(files[0]), 'ok.js');
});
