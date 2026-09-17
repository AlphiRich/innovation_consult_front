import { describe, expect, it } from 'vitest';
import type { Household } from '@/dal/ports/households';
import {
  ACCESS_CODE_BASIS,
  containsAccessCode,
  HAZARD_LABEL,
  HAZARD_ORDER,
  hazardsInOrder,
  noteConcerns,
  PAIR_UP_HAZARDS,
  redactAllForExport,
  redactForExport,
  requiresPairing,
  SAFETY_NOTE_BASIS,
} from './householdSafety';

const household = (over: Partial<Household> = {}): Household => ({
  id: 'hh-1',
  tenantId: 'tenant-nw405',
  vdCode: '86821094',
  wardCode: 'NW405012',
  addressLine: '148 Oakwood Drive',
  dwellingType: 'FORMAL',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  updatedBy: 'uid-1',
  deletedAt: null,
  schemaVersion: 1,
  ...over,
});

const note = (over: Partial<NonNullable<Household['accessNote']>> = {}) => ({
  hazards: [] as NonNullable<Household['accessNote']>['hazards'],
  updatedAt: '2026-03-01T00:00:00.000Z',
  updatedBy: 'uid-1',
  ...over,
});

describe('hazard ordering', () => {
  it('puts what injures people first — this is read at a gate, in a hurry', () => {
    const ordered = hazardsInOrder(note({ hazards: ['ACCESS_CODE_REQUIRED', 'DOG', 'LOCKED_GATE'] }));
    expect(ordered[0]).toBe('DOG');
    expect(HAZARD_ORDER.indexOf('DOG')).toBeLessThan(HAZARD_ORDER.indexOf('LOCKED_GATE'));
  });

  it('orders every hazard and labels every hazard', () => {
    for (const hazard of HAZARD_ORDER) {
      expect(HAZARD_LABEL[hazard]?.trim(), hazard).toBeTruthy();
    }
    expect(new Set(HAZARD_ORDER).size).toBe(HAZARD_ORDER.length);
  });

  it('returns nothing for a household with no note', () => {
    expect(hazardsInOrder(undefined)).toEqual([]);
    expect(requiresPairing(undefined)).toBe(false);
  });
});

describe('pairing', () => {
  it('flags the hazards that mean do not work this door alone', () => {
    for (const hazard of PAIR_UP_HAZARDS) {
      expect(requiresPairing(note({ hazards: [hazard] })), hazard).toBe(true);
    }
  });

  it('does not flag a merely inconvenient door', () => {
    expect(requiresPairing(note({ hazards: ['LOCKED_GATE', 'ACCESS_CODE_REQUIRED'] }))).toBe(false);
  });

  it('treats a previously reported hostile reception as a pairing hazard', () => {
    // The whole reason that category exists: a canvasser walking into a
    // repeat of last week's confrontation is a real harm.
    expect(requiresPairing(note({ hazards: ['HOSTILE_RECEPTION_REPORTED'] }))).toBe(true);
  });
});

/**
 * The easiest place in this product to write voter profiling and call it
 * something else.
 */
describe('notes are about the property, not the people', () => {
  it('flags a note that has drifted into describing a resident', () => {
    for (const text of [
      'Difficult man, always argues',
      'She drinks, come back in the morning',
      'Elderly lady, very friendly',
      'The owner is rude',
      'Aggressive guy at this address',
    ]) {
      expect(noteConcerns(text), text).not.toBeNull();
    }
  });

  it('leaves a proper property note alone', () => {
    for (const text of [
      'Dog loose in the front yard',
      'Knock at the side gate, front bell does not work',
      'No lighting past the driveway',
      'Steep steps, use the ramp on the left',
      'Shouted at, asked us to leave',
    ]) {
      expect(noteConcerns(text), text).toBeNull();
    }
  });

  it('names the word that triggered it, so the prompt can be acted on', () => {
    const concern = noteConcerns('The husband works nights');
    expect(concern?.matched.toLowerCase()).toBe('husband');
    expect(concern?.message).toMatch(/describes a person rather than the property/i);
  });

  it('explains why, in terms of the person who could ask to see it', () => {
    expect(noteConcerns('he is difficult')?.message).toMatch(/they can ask to see/i);
  });

  it('is a prompt, never a refusal — it returns a concern and blocks nothing', () => {
    // Someone standing at a gate with a genuine concern must be able to
    // record it. What they get is a nudge to write it differently.
    const concern = noteConcerns('he threatened us');
    expect(concern).not.toBeNull();
    expect(typeof concern!.message).toBe('string');
  });

  it('says nothing about an empty note', () => {
    expect(noteConcerns(undefined)).toBeNull();
    expect(noteConcerns('')).toBeNull();
  });
});

/**
 * A gate code is access control for somebody's home.
 */
describe('access codes never leave', () => {
  const withCode = household({
    accessNote: note({ hazards: ['ACCESS_CODE_REQUIRED'], note: 'Gate code needed', accessCode: '4129' }),
  });

  it('strips the code for export while keeping the hazard and the note', () => {
    const redacted = redactForExport(withCode);
    expect(redacted.accessNote?.accessCode).toBeUndefined();
    expect(redacted.accessNote?.hazards).toEqual(['ACCESS_CODE_REQUIRED']);
    expect(redacted.accessNote?.note).toBe('Gate code needed');
  });

  it('leaves no trace of the code anywhere in the serialised export', () => {
    const redacted = redactForExport(withCode);
    expect(JSON.stringify(redacted)).not.toContain('4129');
    expect(containsAccessCode(redacted)).toBe(false);
    // And the detector is not vacuous.
    expect(containsAccessCode(withCode)).toBe(true);
  });

  it('does not mutate the original — the field copy keeps its code', () => {
    redactForExport(withCode);
    expect(withCode.accessNote?.accessCode).toBe('4129');
  });

  it('passes through a household with no code, without copying needlessly', () => {
    const plain = household();
    expect(redactForExport(plain)).toBe(plain);
  });

  it('redacts a whole list', () => {
    const list = redactAllForExport([withCode, household({ id: 'hh-2' })]);
    expect(list.some((h) => containsAccessCode(h))).toBe(false);
    expect(list).toHaveLength(2);
  });
});

describe('the guidance says what it needs to', () => {
  it('tells the author what belongs and what does not', () => {
    expect(SAFETY_NOTE_BASIS).toMatch(/approach this property safely/i);
    expect(SAFETY_NOTE_BASIS).toMatch(/Do not describe the people who live here/i);
    expect(SAFETY_NOTE_BASIS).toMatch(/they can ask to see/i);
  });

  it('states plainly where an access code goes and does not go', () => {
    expect(ACCESS_CODE_BASIS).toMatch(/access control for someone’s home/i);
    expect(ACCESS_CODE_BASIS).toMatch(/never included in an export, a referral or anything printed/i);
  });
});
