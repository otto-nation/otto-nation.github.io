import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONSUMER_RULES,
  findViolations,
  maskComments,
} from '../src/internal/style-rules.mjs';

function hits(source, kind, ids) {
  const rules = ids
    ? CONSUMER_RULES.filter((rule) => ids.includes(rule.id))
    : CONSUMER_RULES;
  return findViolations(source, { kind, rules });
}

function idsOf(source, kind) {
  return hits(source, kind).map((finding) => finding.rule.id);
}

test('literal-color flags a Tailwind arbitrary hex', () => {
  const found = idsOf('const x = "bg-[#18160f]";', 'script');
  assert.ok(found.includes('literal-color'));
});

test('literal-color skips an HTML entity', () => {
  assert.equal(idsOf('const x = "&#10003;";', 'script').includes('literal-color'), false);
});

test('literal-color skips href="#add"', () => {
  assert.equal(idsOf('<a href="#add">', 'script').includes('literal-color'), false);
});

test('literal-color skips rgb(from var(--ow-ink) …)', () => {
  const source = 'const x = "color: rgb(from var(--ow-ink) r g b / 50%)";';
  assert.equal(idsOf(source, 'script').includes('literal-color'), false);
});

test('pill-radius flags rounded-full and skips a radius token', () => {
  assert.ok(idsOf('className="rounded-full"', 'script').includes('pill-radius'));
  assert.equal(
    idsOf('className="rounded-[var(--ow-radius-md)]"', 'script').includes('pill-radius'),
    false,
  );
});

test('hover-border flags group-hover:border and skips hover:bg', () => {
  assert.ok(idsOf('className="group-hover:border-ink"', 'script').includes('hover-border'));
  assert.equal(idsOf('className="hover:bg-ink"', 'script').includes('hover-border'), false);
});

test('outline-removed flags a bare outline-none', () => {
  assert.ok(idsOf('className="outline-none"', 'script').includes('outline-removed'));
});

test('outline-removed accepts a ring on the same element', () => {
  assert.equal(
    idsOf('className="outline-none focus-visible:ring-2"', 'script').includes('outline-removed'),
    false,
  );
});

test('outline-removed accepts a ring inside cn(...)', () => {
  const source = "className={cn('outline-none', cond && 'focus-visible:ring-2')}";
  assert.equal(idsOf(source, 'script').includes('outline-removed'), false);
});

test('outline-removed does not count focus-visible:ring-0', () => {
  assert.ok(
    idsOf('className="outline-none focus-visible:ring-0"', 'script').includes('outline-removed'),
  );
});

test('outline-removed flags a const-only string', () => {
  assert.ok(idsOf('const BASE = "outline-none";', 'script').includes('outline-removed'));
});

test('outline-removed does not take a ring from another element', () => {
  const source = '<a className="outline-none" /><a className="focus-visible:ring-2" />';
  assert.ok(idsOf(source, 'script').includes('outline-removed'));
});

test('token-redefined flags a declaration and skips an @theme map', () => {
  assert.ok(idsOf('--ow-canvas: red;', 'css').includes('token-redefined'));
  assert.equal(
    idsOf('--color-canvas: var(--ow-canvas);', 'css').includes('token-redefined'),
    false,
  );
});

test('palette-color flags Tailwind palette utilities and CSS named colours', () => {
  assert.ok(idsOf('className="bg-black/60"', 'script').includes('palette-color'));
  assert.ok(idsOf('className="text-white"', 'script').includes('palette-color'));
  assert.ok(idsOf('className="bg-red-500"', 'script').includes('palette-color'));
  assert.ok(idsOf('a { color: white; }', 'css').includes('palette-color'));
});

test('palette-color skips tokens, inherit, and transparent', () => {
  assert.equal(
    idsOf('className="bg-[var(--ow-canvas)]"', 'script').includes('palette-color'),
    false,
  );
  assert.equal(idsOf('a { color: inherit; }', 'css').includes('palette-color'), false);
  assert.equal(idsOf('a { color: transparent; }', 'css').includes('palette-color'), false);
});

test('maskComments keeps length and newlines', () => {
  const source = 'a /* x\ny */ b\n';
  const masked = maskComments(source);
  assert.equal(masked.length, source.length);
  assert.equal([...masked].filter((char) => char === '\n').length, 2);
});

test('maskComments leaves a /**/ glob inside a string', () => {
  const glob = "@source '../x/**/*.tsx';";
  assert.equal(maskComments(glob), glob);
});

test('maskComments does not stall on a blank line before a line comment', () => {
  const source = 'const a = 1;\n\n// later\nconst b = 2;\n';
  const masked = maskComments(source);
  assert.equal(masked.length, source.length);
  assert.match(masked, /const b = 2/);
});

test('a violation after a 3-line block comment reports line 5', () => {
  const source = '/*\n \n */\n\nconst x = "rounded-full";\n';
  const found = hits(source, 'script', ['pill-radius']);
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 5);
});

test('same-line ignore suppresses pill-radius', () => {
  const source = 'const x = "rounded-full"; // otto-brand-ignore: pill-radius — avatar\n';
  assert.equal(idsOf(source, 'script').includes('pill-radius'), false);
});

test('next-line ignore suppresses pill-radius', () => {
  const source = '// otto-brand-ignore: pill-radius — avatar\nconst x = "rounded-full";\n';
  assert.equal(idsOf(source, 'script').includes('pill-radius'), false);
});

test('file-level ignore suppresses pill-radius', () => {
  const source = '/* otto-brand-ignore-file: pill-radius — avatars */\nconst x = "rounded-full";\n';
  assert.equal(idsOf(source, 'script').includes('pill-radius'), false);
});

test('one ignore can name several ids', () => {
  const source =
    '// otto-brand-ignore: pill-radius, hover-border — third-party\n' +
    'const x = "rounded-full hover:border-ink";\n';
  const found = idsOf(source, 'script');
  assert.equal(found.includes('pill-radius'), false);
  assert.equal(found.includes('hover-border'), false);
});

test('an ignore with no reason reports ignore-reason and suppresses nothing', () => {
  const source = '// otto-brand-ignore: pill-radius\nconst x = "rounded-full";\n';
  const found = idsOf(source, 'script');
  assert.ok(found.includes('ignore-reason'));
  assert.ok(found.includes('pill-radius'));
});

test('an unknown ignore id reports ignore-unknown-rule', () => {
  const source = '// otto-brand-ignore: nonesuch — nope\nconst x = 1;\n';
  assert.ok(idsOf(source, 'script').includes('ignore-unknown-rule'));
});

test('an unused ignore reports ignore-unused', () => {
  const source = '// otto-brand-ignore: pill-radius — leftover\nconst x = "text-sm";\n';
  assert.ok(idsOf(source, 'script').includes('ignore-unused'));
});
