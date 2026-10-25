/**
 * Guard: GitHub workflows must live at the repository root.
 *
 * WHY
 *
 * `election-cos-app/.github/workflows/ci.yml` existed from early in the
 * build, looked correct, and **never ran once**. GitHub reads workflows
 * only from `.github/workflows/` at the root of a repository; a nested
 * `.github` directory is an ordinary directory with a suggestive name.
 *
 * It was found on 25 October 2026 — by asking the Actions API what
 * workflows this repository has, and being told zero — not by anything
 * in the repository, because nothing in the repository could tell the
 * difference. Every "runs in CI" claim in the documentation had been
 * true of a file that was never executed.
 *
 * This is the cheapest possible check for that class of mistake, and it
 * is a test rather than a comment because a comment would not have
 * caught it either.
 *
 * Proved by injection when written: recreating
 * `election-cos-app/.github/workflows/ci.yml` fails the first test;
 * renaming the root directory fails the second. Reverted clean.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const APP = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(APP, '..');

/** Every `.github` directory in the tree, excluding dependencies. */
function findGithubDirs(root: string, depth = 0): string[] {
  if (depth > 4) return [];
  const found: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const full = path.join(root, entry);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    if (entry === '.github') {
      found.push(full);
      continue;
    }
    found.push(...findGithubDirs(full, depth + 1));
  }
  return found;
}

describe('GitHub workflow location', () => {
  it('has no .github/workflows anywhere but the repository root', () => {
    const nested = findGithubDirs(REPO)
      .filter((dir) => path.resolve(dir) !== path.join(REPO, '.github'))
      .filter((dir) => existsSync(path.join(dir, 'workflows')));

    expect(
      nested.map((d) => path.relative(REPO, d)),
      'GitHub only reads workflows from the repository root. A nested .github/workflows never runs.',
    ).toEqual([]);
  });

  it('has the workflows at the root, where GitHub reads them', () => {
    const workflows = path.join(REPO, '.github', 'workflows');
    expect(existsSync(workflows), `${workflows} must exist`).toBe(true);

    const files = readdirSync(workflows).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(files).toContain('ci.yml');
    expect(files).toContain('deploy-ecos.yml');
  });

  it('runs the whole local check suite rather than a subset of it', () => {
    // The dead workflow listed lint, typecheck, check:hex and test
    // individually, and had silently fallen three guards behind the
    // local suite by the time anyone looked. Calling check:all is what
    // stops CI and a developer's machine drifting apart.
    const ci = readdirSync(path.join(REPO, '.github', 'workflows'));
    expect(ci).toContain('ci.yml');

    const text = readFileSync(path.join(REPO, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(text).toContain('npm run check:all');
  });
});
