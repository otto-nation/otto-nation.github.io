// Internal to the package: not in the barrel, and the exports map carries no
// wildcard, so a consumer importing this path gets ERR_PACKAGE_PATH_NOT_EXPORTED.
//
// One owner for "which files does a source scan see". otto-brand-check and the
// brand's own source-rules test both call this, so a gitignored bundle cannot
// be scanned by one and skipped by the other.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

export class SourceScanError extends Error {}

function gitEnv() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function gitLines(root) {
  try {
    const listing = execFileSync(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'],
      { env: gitEnv(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 },
    );
    return listing.split('\0').filter(Boolean);
  } catch {
    // Deliberate: any git failure (no repo, no git binary) falls back to the directory walk.
    return null;
  }
}

function skippedSegment(relativePath) {
  return relativePath.split(sep).some((segment) => segment === 'node_modules' || segment.startsWith('.'));
}

function fallbackLines(root) {
  let entries;
  try {
    entries = readdirSync(root, { recursive: true, withFileTypes: true });
  } catch (cause) {
    throw new SourceScanError(`cannot read source directory: ${root}`, { cause });
  }
  const lines = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const dir = entry.parentPath ?? entry.path;
    const abs = join(dir, entry.name);
    const rel = relative(root, abs);
    if (skippedSegment(rel)) continue;
    lines.push(rel.split(sep).join('/'));
  }
  return lines;
}

export function sourceFiles(root, extensions) {
  const absRoot = resolve(root);
  try {
    if (!statSync(absRoot).isDirectory()) {
      throw new SourceScanError(`cannot read source directory: ${root}`);
    }
  } catch (cause) {
    if (cause instanceof SourceScanError) throw cause;
    throw new SourceScanError(`cannot read source directory: ${root}`, { cause });
  }
  const allowed = new Set(extensions);
  const listed = gitLines(absRoot) ?? fallbackLines(absRoot);
  const files = [];
  for (const rel of listed) {
    const abs = join(absRoot, rel);
    if (!existsSync(abs)) continue;
    if (!allowed.has(extname(abs))) continue;
    files.push(abs);
  }
  files.sort();
  return files;
}
