import assert from 'node:assert/strict';
import test from 'node:test';

import { leavesThisDeployment } from '../src/internal/href.ts';

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

test('a protocol-relative href leaves the deployment', () => {
  // No scheme, but an authority: the host decides where it lands, and a
  // basePath prefix would turn it into a path on this site.
  assert.equal(leavesThisDeployment('//example.com/x'), true);
  assert.equal(leavesThisDeployment('/example/x'), false);
});
