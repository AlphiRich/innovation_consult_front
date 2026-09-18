/**
 * Election Campaign OS — the acquisition tool stays honest
 *
 * `tools/source-acquisition/acquire.py` replaces a supplied ETL script
 * whose defect was not missing code but false reporting: it printed a
 * progress line per item and then "ETL Pipeline complete" while every
 * network call in it sat commented out.
 *
 * That tool is Python and runs on an operator's machine, so the TypeScript
 * suite cannot execute it. What this can do is hold the two properties
 * that stop it decaying back into the thing it replaced — a completion
 * message that cannot be reached on a failed run, and a registry whose
 * entries are honest about never having been fetched.
 *
 * The tool's own `--self-test` proves the download-and-verify machinery,
 * with a local server and no network. Run it before trusting the script:
 *   python3 tools/source-acquisition/acquire.py --self-test
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TOOL = path.join(REPO_ROOT, 'tools', 'source-acquisition');
const script = readFileSync(path.join(TOOL, 'acquire.py'), 'utf8');
const registry = JSON.parse(readFileSync(path.join(TOOL, 'sources.json'), 'utf8')) as {
  sources: { id: string; url: string; status: string; note?: string; expect?: Record<string, unknown> }[];
};

describe('the acquisition script cannot claim a completion it did not reach', () => {
  it('returns non-zero before it can print a success line', () => {
    // The ordering is the guarantee: report() returns 1 on any failure,
    // and both completion sentences sit after that return.
    const failureExit = script.indexOf('This run did not complete.');
    const probeDone = script.indexOf('Every source responded.');
    const fetchDone = script.indexOf('Every selected source was downloaded and verified.');
    expect(failureExit).toBeGreaterThan(-1);
    expect(probeDone).toBeGreaterThan(failureExit);
    expect(fetchDone).toBeGreaterThan(failureExit);
    expect(script).toMatch(/if failed:[\s\S]{0,400}return 1/);
  });

  it('has no silent pass where a fetch should be', () => {
    // The original's two scrape functions ended in `pass` with every
    // request commented out. Nothing here may do that.
    expect(script).not.toMatch(/^\s*#\s*response = requests\.get/m);
    expect(script).not.toMatch(/\n\s{8}pass\s*\n/);
    expect(script).toMatch(/urllib\.request\.urlopen/);
  });

  it('renames a download only after it verifies', () => {
    const verify = script.indexOf('problem = verify_payload(');
    const rename = script.indexOf('temporary.replace(destination)');
    expect(verify).toBeGreaterThan(-1);
    expect(rename).toBeGreaterThan(verify);
  });

  it('writes a manifest of what actually arrived', () => {
    expect(script).toMatch(/def write_manifest/);
    expect(script).toMatch(/"sha256"|sha256=/);
  });

  it('carries no hardcoded desktop path and no credential', () => {
    // The original targeted C:\Users\<name>\Desktop\... and told the
    // operator to "plug in your IEC credentials here".
    expect(script).not.toMatch(/C:\\+Users/i);
    expect(script).not.toMatch(/\b(api[_-]?key|token)\s*=\s*["'][A-Za-z0-9]{8,}/i);
    expect(script).toMatch(/os\.environ\.get\(source\.auth_env/);
  });
});

describe('discovery proposes and never acquires', () => {
  it('writes every proposed row as unconfirmed, with the human decisions left blank', () => {
    expect(script).toMatch(/"status": "UNCONFIRMED"/);
    expect(script).toMatch(/REPLACE_ME/);
    expect(script).toMatch(/discovery proposes, it does not acquire/i);
  });

  it('scans one page rather than crawling a government portal', () => {
    expect(script).toMatch(/a link scan and not a crawler/i);
    // No recursion into discovered links: run_discovery reads one URL.
    expect(script).not.toMatch(/def\s+crawl|while\s+queue|frontier/);
  });

  it('proposes only things that look like datasets', () => {
    expect(script).toMatch(/DATASET_SUFFIXES/);
    expect(script).toMatch(/mailto:/);
  });
});

describe('the skill matches the tool it documents', () => {
  const skill = readFileSync(
    path.join(REPO_ROOT, '.claude', 'skills', 'iec-data-ingestion', 'SKILL.md'),
    'utf8',
  );

  it('documents only flags the script actually has', () => {
    // A skill naming a flag that does not exist sends the next session
    // down a path the tool cannot walk.
    for (const flag of ['--self-test', '--discover', '--probe', '--fetch', '--only', '--suggest-to']) {
      expect(skill, `skill mentions ${flag}`).toContain(flag);
      expect(script, `script implements ${flag}`).toContain(flag);
    }
  });

  it('carries the refusal that governs this whole area', () => {
    expect(skill).toMatch(/Nothing is reported as done unless it was done/i);
    expect(skill).toMatch(/Never sentiment/i);
  });

  it('points at modules that exist', () => {
    for (const file of [
      'src/modules/ingest/electionResultSchema.ts',
      'src/modules/ingest/ingestResult.ts',
      'src/modules/ingest/mappings.ts',
      'src/lib/saIdNumber.ts',
      'docs/design-decision-and-change-log.md',
      'tools/source-acquisition/acquire.py',
    ]) {
      expect(skill, `skill cites ${file}`).toContain(path.basename(file));
      expect(existsSync(path.join(REPO_ROOT, file)), `${file} exists`).toBe(true);
    }
  });
});

describe('the source registry is honest about what has been checked', () => {
  it('marks every entry CONFIRMED or UNCONFIRMED', () => {
    expect(registry.sources.length).toBeGreaterThan(0);
    for (const source of registry.sources) {
      expect(['CONFIRMED', 'UNCONFIRMED'], source.id).toContain(source.status);
    }
  });

  it('ships nothing as CONFIRMED, because nothing has been fetched from here', () => {
    // The network policy in the build environment denies these hosts at
    // CONNECT. An entry may only be promoted by an operator who fetched
    // it and looked at the file.
    for (const source of registry.sources) {
      expect(source.status, `${source.id} claims CONFIRMED — who fetched it?`).toBe('UNCONFIRMED');
    }
  });

  it('gives every entry something to verify the payload against', () => {
    // Without an `expect`, a portal's HTML error page lands on disk
    // wearing the right filename and the run reports success.
    for (const source of registry.sources) {
      expect(source.expect, source.id).toBeTruthy();
      expect(Object.keys(source.expect ?? {}).length, source.id).toBeGreaterThan(0);
    }
  });

  it('does not repeat the endpoint nobody ever called', () => {
    // api.elections.org.za/results/{year}/LGE/{prov} came from the
    // supplied note, commented out. Stating it as a known URL would be
    // the error this whole exercise corrects.
    for (const source of registry.sources) {
      expect(source.url, source.id).not.toMatch(/api\.elections\.org\.za/);
    }
  });
});
