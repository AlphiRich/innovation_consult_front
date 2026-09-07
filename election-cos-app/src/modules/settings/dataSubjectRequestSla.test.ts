import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isOverdue, RESPONSE_TARGET_BASIS, RESPONSE_TARGET_DAYS } from './dataSubjectRequestSla';

describe('isOverdue', () => {
  const now = new Date('2026-08-08T00:00:00.000Z');

  it('is false for a request received today', () => {
    expect(isOverdue(now.toISOString(), 'RECEIVED', now)).toBe(false);
  });

  it(`is false just under ${RESPONSE_TARGET_DAYS} days`, () => {
    const received = new Date(now.getTime() - (RESPONSE_TARGET_DAYS - 1) * 86_400_000).toISOString();
    expect(isOverdue(received, 'IN_PROGRESS', now)).toBe(false);
  });

  it(`is true past ${RESPONSE_TARGET_DAYS} days and still open`, () => {
    const received = new Date(now.getTime() - (RESPONSE_TARGET_DAYS + 1) * 86_400_000).toISOString();
    expect(isOverdue(received, 'IN_PROGRESS', now)).toBe(true);
  });

  it('is never overdue once fulfilled, however old', () => {
    const received = new Date(now.getTime() - 365 * 86_400_000).toISOString();
    expect(isOverdue(received, 'FULFILLED', now)).toBe(false);
  });

  it('is never overdue once rejected', () => {
    const received = new Date(now.getTime() - 365 * 86_400_000).toISOString();
    expect(isOverdue(received, 'REJECTED', now)).toBe(false);
  });
});

// Session 16 — a drift guard, added because the drift actually happened.
// The ecos-v2 fork took this module's 30-day working assumption and shipped
// it as "21-day statutory turnaround limit" on its DSR page and "14-day SLA
// enforcement" on its settings index: two different numbers, neither ours,
// one asserted as statutory, for a window this file says is not statutory
// (docs/ecos-v2-fork-review.md §4d). These tests make the same edit fail
// here. They can only catch the phrasings named below — they are a tripwire
// on a known failure, not proof that every claim on the page is sound.
/** Vitest runs from the app root, so resolve source files from there. */
const settingsFile = (name: string) => resolve(process.cwd(), 'src/modules/settings', name);

describe('response-window claim discipline', () => {
  it('the caveat never asserts the window is statutory or a legal deadline', () => {
    expect(RESPONSE_TARGET_BASIS).not.toMatch(/statutory/i);
    // "not a legal deadline" is the required disclaimer, so only a bare
    // "legal deadline" claim (one not preceded by "not a") should fail.
    expect(RESPONSE_TARGET_BASIS).not.toMatch(/(?<!not a )legal deadline/i);
  });

  it('the caveat states it is an assumption and names the pending review', () => {
    expect(RESPONSE_TARGET_BASIS).toMatch(/working assumption/i);
    expect(RESPONSE_TARGET_BASIS).toMatch(/attorney review/i);
    expect(RESPONSE_TARGET_BASIS).toContain(String(RESPONSE_TARGET_DAYS));
  });

  it('the DSR page renders the shared caveat rather than retyping the figure', () => {
    const page = readFileSync(settingsFile('DataSubjectRequestsPage.tsx'), 'utf8');
    expect(page).toContain('RESPONSE_TARGET_BASIS');
    // A bare "<N>-day" string in the page would mean the number had been
    // hand-written next to, or instead of, the caveat it must travel with.
    expect(page).not.toMatch(/\d+-day/);
  });

  it('no settings or finance surface labels a response window statutory', () => {
    for (const file of ['DataSubjectRequestsPage.tsx', 'SettingsPage.tsx', 'PPFAThresholdsPage.tsx']) {
      const source = readFileSync(settingsFile(file), 'utf8');
      expect(source, file).not.toMatch(/statutory (turnaround|deadline|SLA)/i);
      expect(source, file).not.toMatch(/\d+-day (statutory|SLA)/i);
    }
  });
});
