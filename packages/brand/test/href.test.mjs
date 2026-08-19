import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { leavesThisDeployment } from '../src/internal/href.ts';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function sourceFiles() {
  return readdirSync(SRC, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => relative(SRC, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

// Every href here that reads as off-site but is answered site-local is the bug
// the helper exists to prevent: next/link prefixes it with the consumer's
// basePath and the link resolves inside the consumer's own site.
const OFF_SITE = [
  'https://otto-nation.github.io/',
  'HTTPS://otto-nation.github.io/',
  'MailTo:hello@otto-nation.dev',
  'mailto:hello@otto-nation.dev',
  'Tel:+15551234567',
  '//otto-nation.github.io/otto-workbench',
];

const SITE_LOCAL = ['/docs', 'docs/page', '#anchor', '?q=1', '/', ''];

test('an href that names its own destination leaves the deployment', () => {
  for (const href of OFF_SITE) {
    assert.equal(leavesThisDeployment(href), true, `${href} must render as a plain anchor`);
  }
});

test('a site-local href keeps next/link', () => {
  for (const href of SITE_LOCAL) {
    assert.equal(leavesThisDeployment(href), false, `${href} must keep Link`);
  }
});

test('a scheme is matched case-insensitively, as RFC 3986 defines it', () => {
  for (const href of ['https://x.dev', 'Https://x.dev', 'hTTps://x.dev', 'HTTPS://x.dev']) {
    assert.equal(leavesThisDeployment(href), true, `${href} is the same link as its lowercase form`);
  }
});

// The predicate only helps where it is called. A component that renders a
// caller-supplied href straight through next/link reintroduces the basePath
// mis-resolution for its own prop, and the README's claim that a caller cannot
// get this wrong stops being true. So the rule is structural: if a file renders
// Link, it routes through the check and carries the plain-anchor branch too.
test('every component that renders next/link routes its href through the check', () => {
  const linking = sourceFiles()
    .map((file) => ({ file, source: readFileSync(join(SRC, file), 'utf8') }))
    .filter(({ source }) => source.includes("from 'next/link'"));
  assert.ok(linking.length >= 3, 'expected Button, Nav, and CardGrid to render Link');

  for (const { file, source } of linking) {
    assert.ok(source.includes('leavesThisDeployment('),
      `src/${file} renders next/link without routing the href through leavesThisDeployment`);
    assert.match(source, /<a\s[^>]*href=/,
      `src/${file} has no plain-anchor branch, so an off-site href has nowhere to go`);
  }
});

test('a protocol-relative href leaves the deployment', () => {
  // No scheme, but an authority: the host decides where it lands, and a
  // basePath prefix would turn it into a path on this site.
  assert.equal(leavesThisDeployment('//example.com/x'), true);
  assert.equal(leavesThisDeployment('/example/x'), false);
});
