/**
 * Election Campaign OS — household access & safety notes
 * IC-ECOS-BUILD-2026-V2 §6.2, §7.
 *
 * The note a canvasser reads before opening a gate. It is written by the
 * last person who worked the door, for the next one.
 *
 * TWO RULES, AND THEY PULL IN OPPOSITE DIRECTIONS
 *
 * 1. **It is about the property, not the people.** A safety note is the
 *    easiest place in this product to write voter profiling and call it
 *    something else. "Difficult family", "drinks", "always argues" are
 *    characterisations of residents, are personal information nobody
 *    consented to, and would be read back to the campaign if a data
 *    subject ever asked what was held about them. The hazard list is
 *    fixed for that reason, and `noteConcerns()` flags free text that has
 *    drifted into describing a person.
 *
 * 2. **It has to actually keep someone safe.** Sanitising it into
 *    uselessness is its own failure: a canvasser who walks into a loose
 *    dog or a repeat of last week's confrontation is a real person
 *    getting hurt. So `HOSTILE_RECEPTION_REPORTED` exists, and the
 *    ordering below puts the things that injure people first.
 *
 * The flag is a warning to the author, never a block. Someone standing at
 * a gate with a genuine concern must be able to record it; what they get
 * is a prompt to write it about the property instead.
 *
 * ACCESS CODES LEAVE NOTHING
 *
 * A gate code is access control for somebody's home. `redactForExport()`
 * removes it, and `householdSafety.test.ts` fails if any export path or
 * printed document can carry one.
 */
import type { AccessHazard, Household, HouseholdAccessNote } from '@/dal/ports/households';

/** Shown wherever a safety note is written. */
export const SAFETY_NOTE_BASIS =
  'Write what the next canvasser needs to approach this property safely — dogs, gates, lighting, ' +
  'how to get in. Do not describe the people who live here: that is not a safety note, it is a ' +
  'record about a person that they can ask to see.';

export const ACCESS_CODE_BASIS =
  'Gate and intercom codes are access control for someone’s home. They are shown in the field and ' +
  'are never included in an export, a referral or anything printed.';

/** Most likely to injure someone first — this is read at a gate, in a hurry. */
export const HAZARD_ORDER: AccessHazard[] = [
  'DOG',
  'HOSTILE_RECEPTION_REPORTED',
  'POOR_LIGHTING',
  'DIFFICULT_ACCESS',
  'LOCKED_GATE',
  'ACCESS_CODE_REQUIRED',
  'OTHER',
];

export const HAZARD_LABEL: Record<AccessHazard, string> = {
  DOG: 'Dog on the property',
  HOSTILE_RECEPTION_REPORTED: 'Hostile reception previously reported',
  POOR_LIGHTING: 'Poorly lit — avoid after dark',
  DIFFICULT_ACCESS: 'Difficult access',
  LOCKED_GATE: 'Locked gate',
  ACCESS_CODE_REQUIRED: 'Access code required',
  OTHER: 'Other — see note',
};

/** Hazards that mean: do not work this door alone. */
export const PAIR_UP_HAZARDS: AccessHazard[] = ['DOG', 'HOSTILE_RECEPTION_REPORTED', 'POOR_LIGHTING'];

export function hazardsInOrder(note: HouseholdAccessNote | undefined): AccessHazard[] {
  if (!note) return [];
  return HAZARD_ORDER.filter((h) => note.hazards.includes(h));
}

/** True when this door should not be worked by someone on their own. */
export function requiresPairing(note: HouseholdAccessNote | undefined): boolean {
  return hazardsInOrder(note).some((h) => PAIR_UP_HAZARDS.includes(h));
}

/**
 * Free-text patterns that suggest the note has drifted from describing a
 * property to describing a resident.
 *
 * A heuristic, and deliberately a loose one — it prompts, it does not
 * police. A false positive costs the author a moment's thought, which is
 * the entire point of showing it.
 */
const PERSON_DIRECTED =
  /\b(he|she|him|her|his|hers|they|them|their|husband|wife|mother|father|son|daughter|owner|tenant|resident|occupant|man|woman|lady|guy|old|young|drunk|drinks|aggressive|rude|racist|crazy|difficult|unfriendly|lazy)\b/i;

export interface NoteConcern {
  /** The word that triggered it, so the prompt can be specific. */
  matched: string;
  message: string;
}

export function noteConcerns(note: string | undefined): NoteConcern | null {
  if (!note) return null;
  const match = PERSON_DIRECTED.exec(note);
  if (!match) return null;
  return {
    matched: match[0],
    message:
      `“${match[0]}” describes a person rather than the property. A safety note is a record about ` +
      'the people who live here as much as anything else in this system, and they can ask to see ' +
      'it. Say what the next canvasser must do — “knock at the side gate”, “dog loose in the yard” ' +
      '— rather than what someone is like.',
  };
}

/**
 * A household with the access code removed, for anything that leaves the
 * device: exports, referrals, printed sheets.
 *
 * Returns a new object; the caller cannot forget to reassign.
 */
export function redactForExport(household: Household): Household {
  if (!household.accessNote?.accessCode) return household;
  const rest = { ...household.accessNote };
  delete rest.accessCode;
  return { ...household, accessNote: rest };
}

/** Convenience for a list. */
export function redactAllForExport(households: Household[]): Household[] {
  return households.map(redactForExport);
}

/**
 * True if this value could carry an access code out of the app. Used by
 * the test suite against real export shapes; exported so a future export
 * path can assert on itself.
 */
export function containsAccessCode(value: unknown): boolean {
  return JSON.stringify(value ?? null).includes('"accessCode"');
}
