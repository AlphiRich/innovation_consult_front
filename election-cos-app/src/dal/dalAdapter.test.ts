import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Election Campaign OS — the database decision, as a test
 *
 * "Firestore is my final decision." — project owner, 13 Sep 2026.
 *
 * Firestore is the datastore. The conditional Phase 8 Postgres migration
 * (IC-ECOS-BUILD-2026-V2 §10) is closed: not deferred, not waiting on a
 * paying subscriber. See BUILD-STATUS.md, "DECISION — Firestore is the
 * database", for the full record including what the decision accepts.
 *
 * This file exists because the proposal to move to Cloud SQL Postgres
 * arrived from outside this repository four separate times between
 * sessions 13 and 19, each time costing a session's worth of re-analysis.
 * The next arrival should meet a failing test and a decision record rather
 * than an open question.
 *
 * It is a tripwire, not a prohibition. If the owner reverses the decision,
 * this file is the first thing to delete — deliberately, which is the
 * point.
 */

const ROOT = process.cwd();

describe('the database decision', () => {
  it('ships no SQL client or ORM', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

    const SQL_PACKAGES = [
      'pg',
      'postgres',
      'pg-promise',
      'knex',
      'kysely',
      'sequelize',
      'typeorm',
      'drizzle-orm',
      '@prisma/client',
      'prisma',
      'mysql2',
      'better-sqlite3',
    ];
    for (const name of SQL_PACKAGES) {
      expect(installed, `package.json gained "${name}" — see BUILD-STATUS.md`).not.toContain(name);
    }
  });

  it('keeps the Postgres adapter directory free of an implementation', () => {
    const dir = resolve(ROOT, 'src/dal/adapters/postgres');
    // Asserting the property rather than an exact listing: docs and the
    // .gitkeep that tracks the empty directory are fine, code is not.
    const implementation = readdirSync(dir).filter((f) => /\.(ts|tsx|js|mjs|sql)$/.test(f));
    expect(implementation, 'the Postgres adapter directory gained code').toEqual([]);
  });

  it('records the closure where someone opening that directory will read it', () => {
    const readme = readFileSync(resolve(ROOT, 'src/dal/adapters/postgres/README.md'), 'utf8');
    expect(readme).toMatch(/final decision/i);
    expect(readme).not.toMatch(/Phase 8, conditional/i);
  });

  it('still refuses VITE_DAL_ADAPTER=postgres, and says why', () => {
    const source = readFileSync(resolve(ROOT, 'src/dal/index.ts'), 'utf8');
    expect(source).toContain("adapter === 'postgres'");
    expect(source).toMatch(/throw new Error/);
    // The guard must not degrade into a warning-and-continue: silently
    // serving Firestore under a postgres setting would make a
    // misconfigured deployment look like it had honoured the setting.
    expect(source).not.toMatch(/console\.(warn|error)\([^)]*postgres/i);
  });
});

/**
 * The decision explicitly does NOT license removing the port/adapter
 * pattern. Its migration justification is gone; three live ones are not
 * (module testability, the SessionContext discipline, the offline seam).
 * These assert the seam is still there, so "the migration is off, so the
 * abstraction is pointless" cannot quietly become a refactor.
 */
describe('the DAL seam outlives the migration argument', () => {
  it('keeps one port interface per adapter implementation', () => {
    const ports = readdirSync(resolve(ROOT, 'src/dal/ports')).filter(
      (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'session.ts',
    );
    expect(ports.length).toBeGreaterThan(15);
  });

  it('routes module code through src/dal, never at the Firebase SDK directly', () => {
    // The ESLint boundary rule is the real enforcement; this asserts the
    // property it protects, so the property survives a config change.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        if (/from ['"]firebase\//.test(readFileSync(full, 'utf8'))) {
          offenders.push(full.slice(ROOT.length + 1));
        }
      }
    };
    walk(resolve(ROOT, 'src/modules'));
    expect(offenders).toEqual([]);
  });
});
