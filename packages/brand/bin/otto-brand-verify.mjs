#!/usr/bin/env node
// Fails a consumer's CI when its built static export does not carry
// @otto-nation/brand. otto-brand-check reads configuration before a build and
// catches what is missing from it; this reads the output after one and catches
// what a valid configuration still failed to produce. Every fault here ships a
// page that built clean and renders wrong. It asserts:
//
//   - every --ow-* token tokens.css declares survived into the emitted CSS
//   - the one utility class that exists only inside the package was compiled,
//     which is what proves Tailwind's @source glob reached in
//   - each vendored woff2 was emitted as a build asset
//   - a control utility the consumer owns was compiled, without which none of
//     the above distinguishes "the package is missing" from "no CSS at all"
//
// Every expectation is derived from the installed package's own source — see
// src/verify.mjs, which holds the logic this only prints.
//
// Usage:
//   otto-brand-verify --out <dir> --control <utility>

import { verifyExport } from '../src/verify.mjs';

function parseArgs(argv) {
  const args = { out: null, control: null };
  let current = null;
  for (const token of argv) {
    if (token === '--out' || token === '--control') {
      current = token;
      continue;
    }
    // Both flags take exactly one value, unlike otto-brand-check's variadic
    // --src, so the slot is cleared once it is filled. Leaving it open would
    // let a stray trailing word silently replace the value the caller meant.
    if (current === '--out') args.out = token;
    else if (current === '--control') args.control = token;
    else usage(`unexpected argument: ${token}`);
    current = null;
  }
  if (!args.out || !args.control) {
    usage('--out and --control are both required');
  }
  return args;
}

function usage(message) {
  console.error(`otto-brand-verify: ${message}`);
  console.error('usage: otto-brand-verify --out <dir> --control <utility>');
  console.error(
    '  --control names a utility class your own markup uses and the package does not,\n' +
    '  such as py-7. It is what tells a missing package apart from an empty CSS build.',
  );
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));

let result;
try {
  result = verifyExport({ out: args.out, control: args.control });
} catch (error) {
  // A throw means nothing could be verified at all, so it exits like a failed
  // check rather than a usage error — the invocation was well-formed.
  console.error(`otto-brand-verify: ${error.message}`);
  process.exit(1);
}

if (!result.ok) {
  console.error(`otto-brand-verify: ${result.failures.length} problem(s)\n`);
  for (const failure of result.failures) console.error(`  ${failure}\n`);
  process.exit(1);
}

console.log(
  `otto-brand-verify: ${args.out} carries every --ow-* token, the package-only utility, ` +
  `every vendored face, and the ${args.control} control`,
);
