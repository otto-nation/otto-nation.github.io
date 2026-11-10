import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// No DOM in this runner (see test/exports.test.mjs): refs cannot be observed
// at runtime. These tests hold the type (`ComponentPropsWithRef`) and the
// `ref={ref}` pass-through on the native node. tsc covers the consumer JSX.

const src = (rel) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

function assertForwardsRef(source, tag, typeArg) {
  assert.match(
    source,
    new RegExp(String.raw`ComponentPropsWithRef<'${typeArg}'>`),
    `${tag} props must include ComponentPropsWithRef<'${typeArg}'>`,
  );
  assert.match(
    source,
    new RegExp(String.raw`<${tag}[\s\S]*?ref=\{ref\}`),
    `${tag} must pass ref through to the native element`,
  );
}

test('Dialog types and forwards ref to dialog', () => {
  assertForwardsRef(src('../src/primitives/dialog.tsx'), 'dialog', 'dialog');
});

test('Input types and forwards ref to input', () => {
  assertForwardsRef(src('../src/primitives/input.tsx'), 'input', 'input');
});

test('Select types and forwards ref to select', () => {
  assertForwardsRef(src('../src/primitives/select.tsx'), 'select', 'select');
});

test('Textarea types and forwards ref to textarea', () => {
  assertForwardsRef(src('../src/primitives/textarea.tsx'), 'textarea', 'textarea');
});

test('Checkbox types and forwards ref to input', () => {
  assertForwardsRef(src('../src/primitives/checkbox.tsx'), 'input', 'input');
});

test('Button types and forwards ref to button', () => {
  assertForwardsRef(src('../src/primitives/button.tsx'), 'button', 'button');
});

test('IconButton types and forwards ref to button', () => {
  assertForwardsRef(src('../src/primitives/icon-button.tsx'), 'button', 'button');
});

test('Table types and forwards ref to table', () => {
  assertForwardsRef(src('../src/primitives/table.tsx'), 'table', 'table');
});
