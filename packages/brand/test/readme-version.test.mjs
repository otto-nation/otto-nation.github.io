import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const brandRoot = new URL('../', import.meta.url);
const readme = readFileSync(new URL('README.md', brandRoot), 'utf8');
const version = JSON.parse(readFileSync(new URL('package.json', brandRoot), 'utf8')).version;
const releasePlease = JSON.parse(
  readFileSync(new URL('../../../.github/.release-please-config.json', import.meta.url), 'utf8'),
);

const START = '<!-- x-release-please-start-version -->';
const END = '<!-- x-release-please-end -->';

test('release-please extra-files lists README.md', () => {
  const extra = releasePlease.packages['packages/brand']['extra-files'];
  assert.ok(
    Array.isArray(extra) && extra.includes('README.md'),
    '.github/.release-please-config.json extra-files must list README.md',
  );
});

test('each release-please version block pins package.json version', () => {
  const blocks = [];
  let from = 0;
  while (true) {
    const start = readme.indexOf(START, from);
    if (start === -1) {
      break;
    }
    const end = readme.indexOf(END, start + START.length);
    assert.ok(end !== -1, 'unclosed x-release-please-start-version');
    blocks.push(readme.slice(start + START.length, end));
    from = end + END.length;
  }
  assert.ok(blocks.length >= 2, 'README.md needs a version block on both install paths');
  for (const [i, block] of blocks.entries()) {
    const matches = [...block.matchAll(/^[ \t]*VERSION=(\d+\.\d+\.\d+)[ \t]*$/gm)];
    assert.ok(matches.length >= 1, `block ${i} has no VERSION= line`);
    for (const match of matches) {
      assert.equal(match[1], version, `block ${i} VERSION=${match[1]}`);
    }
  }
});

test('README has no concrete brand-v or brand-assets version literal', () => {
  assert.doesNotMatch(readme, /brand-v\d/);
  assert.doesNotMatch(readme, /brand(-assets)?-\d+\.\d+\.\d+/);
});
