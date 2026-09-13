import { describe, expect, it } from 'vitest';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { SEED_ROLES } from '@/auth/seedRoles';
import { NO_ANSWER_COOLOFF_HOURS, INACCESSIBLE_COOLOFF_HOURS } from '@/modules/voters/canvassQueue';
import { HAZARD_LABEL, HAZARD_ORDER, PAIR_UP_HAZARDS } from '@/modules/voters/householdSafety';
import { assembleManual, groupByArea, type Sop } from './manualModel';
import { PLANNED_SOPS, SOPS } from './sops';
import { CANVASSER_SOP } from './sops/canvasserSop';
import { DOORSTEP_ERASURE_ANSWER } from '@/modules/settings/dataSubjectErasure';
import { buildManualPdf, manualFileName, MANUAL_STATUS_NOTE } from './manualPdf';

const NOW = new Date('2026-06-01T00:00:00.000Z');

const ent = (module: string, over: Partial<TenantEntitlement> = {}): TenantEntitlement => ({
  id: module,
  tenantId: 't',
  module: module as TenantEntitlement['module'],
  activeFrom: '2026-01-01T00:00:00.000Z',
  createdAt: '',
  updatedAt: '',
  updatedBy: 'system',
  ...over,
});

const audience = (roleId: string, over: Partial<Parameters<typeof assembleManual>[1]> = {}) => ({
  roleId,
  caps: SEED_ROLES.find((r) => r.id === roleId)?.defaultCaps ?? [],
  entitlements: [] as TenantEntitlement[],
  now: NOW,
  ...over,
});

const decoder = new TextDecoder('latin1');
const printed = (bytes: Uint8Array) =>
  [...decoder.decode(bytes).matchAll(/\(((?:\\.|[^\\()])*)\) Tj/g)]
    .map((m) => m[1].replace(/\\([()\\])/g, '$1'))
    .join(' ');

describe('the SOP register', () => {
  it('numbers every SOP uniquely and in sequence with the planned ones', () => {
    const all = [...SOPS.map((s) => s.number), ...PLANNED_SOPS.map((s) => s.number)];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(all);
  });

  it('addresses every SOP to roles that exist', () => {
    const ids = new Set(SEED_ROLES.map((r) => r.id));
    for (const sop of [...SOPS, ...PLANNED_SOPS]) {
      for (const role of sop.roles) {
        expect(ids.has(role), `${sop.number} names unknown role "${role}"`).toBe(true);
      }
    }
  });

  it('starts with the canvasser SOP — the one most people will ever read', () => {
    expect(SOPS[0].number).toBe('SOP-01');
    expect(SOPS[0].roles).toEqual(['canvasser', 'vd-captain']);
  });

  it('ships no empty SOP — a heading with nothing under it is worse than a gap', () => {
    for (const sop of SOPS) {
      expect(sop.sections.length, sop.number).toBeGreaterThan(0);
      expect(sop.purpose.trim().length, sop.number).toBeGreaterThan(40);
      for (const section of sop.sections) {
        const content = (section.body?.length ?? 0) + (section.steps?.length ?? 0);
        expect(content, `${sop.number} / ${section.heading}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('assembleManual filters by role and entitlement', () => {
  const ppfaSop: Sop = {
    number: 'SOP-10',
    title: 'Recording donations',
    area: 'FUNDING',
    roles: ['finance-officer'],
    requiresModule: 'ppfa-disclosure',
    requiresAnyCapability: ['ppfa.edit'],
    purpose: 'x'.repeat(50),
    sections: [{ heading: 'h', body: ['b'] }],
  };
  const all = [CANVASSER_SOP, ppfaSop];

  it('gives a canvasser the field SOP and not another role’s', () => {
    const manual = assembleManual(all, audience('canvasser'));
    expect(manual.sops.map((s) => s.number)).toEqual(['SOP-01']);
    // Another role's procedure is not "withheld" — it was never theirs.
    expect(manual.withheld).toEqual([]);
  });

  it('withholds a subscribed-module SOP when the tenant has not bought it', () => {
    const manual = assembleManual(all, audience('finance-officer'));
    expect(manual.sops).toEqual([]);
    expect(manual.withheld[0].number).toBe('SOP-10');
    expect(manual.withheld[0].reason).toMatch(/not part of your subscription/i);
  });

  it('includes it once the module is subscribed', () => {
    const manual = assembleManual(all, audience('finance-officer', { entitlements: [ent('ppfa-disclosure')] }));
    expect(manual.sops.map((s) => s.number)).toEqual(['SOP-10']);
    expect(manual.withheld).toEqual([]);
  });

  it('withholds on capability separately from subscription', () => {
    const manual = assembleManual(all, {
      ...audience('finance-officer', { entitlements: [ent('ppfa-disclosure')] }),
      caps: [],
    });
    expect(manual.withheld[0].reason).toMatch(/permissions this procedure requires/i);
  });

  it('names the role the copy was assembled for', () => {
    expect(assembleManual(all, audience('canvasser')).roleLabel).toBe('Canvasser');
  });

  it('groups by area in reading order, skipping empty areas', () => {
    const grouped = groupByArea(assembleManual(all, audience('canvasser')));
    expect(grouped.map((g) => g.area)).toEqual(['FIELD']);
  });
});

/**
 * The manual grounds the operational claims the legal instruments will be
 * drafted against, so a sentence that overstates the product would end up
 * in a contract. These check SOP-01 against the code it describes.
 */
describe('SOP-01 describes what the code actually does', () => {
  const text = JSON.stringify(CANVASSER_SOP);

  it('quotes the real cool-off periods rather than round numbers', () => {
    expect(text).toContain(`${NO_ANSWER_COOLOFF_HOURS} hours`);
    expect(text).toContain(`${INACCESSIBLE_COOLOFF_HOURS} hours`);
  });

  it('lists the six door states the queue actually has', () => {
    for (const phrase of [
      'Contacted',
      'No answer',
      'Could not reach the door',
      'Asked not to be contacted again',
      'In progress',
      'Not contacted',
    ]) {
      expect(text, phrase).toContain(phrase);
    }
  });

  it('states the refusal-is-terminal rule the code enforces', () => {
    expect(text).toMatch(/never offered to anyone again/i);
    expect(text).toMatch(/cannot be undone from the field/i);
  });

  // Explicit rather than derived from the label's first word: the label
  // reads "Poorly lit" while the prose reads "poor lighting", and a
  // first-word proxy would have had the SOP bent to fit the test.
  const HAZARD_PROSE: Record<string, string> = {
    DOG: 'dog',
    HOSTILE_RECEPTION_REPORTED: 'hostile reception',
    POOR_LIGHTING: 'lighting',
    DIFFICULT_ACCESS: 'difficult access',
    LOCKED_GATE: 'locked gate',
    ACCESS_CODE_REQUIRED: 'access code',
  };

  it('covers every hazard label the app can show', () => {
    // Each hazard is labelled, and each label has prose to match it.
    for (const hazard of HAZARD_ORDER.filter((h) => h !== 'OTHER')) {
      expect(HAZARD_LABEL[hazard], hazard).toBeTruthy();
      expect(HAZARD_PROSE[hazard], `${hazard} has no prose mapping`).toBeTruthy();
    }
  });

  it('names every pairing hazard it tells a canvasser to pair up for', () => {
    for (const hazard of PAIR_UP_HAZARDS) {
      expect(text.toLowerCase(), hazard).toContain(HAZARD_PROSE[hazard]);
    }
  });

  it('covers every hazard category in the section about reading the note', () => {
    const section = CANVASSER_SOP.sections.find((s) => s.heading.includes('access note before'));
    const body = (section?.body ?? []).join(' ').toLowerCase();
    for (const hazard of HAZARD_ORDER.filter((h) => h !== 'OTHER')) {
      expect(body, hazard).toContain(HAZARD_PROSE[hazard]);
    }
  });

  it('repeats the erasure position rather than promising a purge', () => {
    // The source material's doorstep script promised data would be
    // "permanently purged post-election". This build hard-deletes nothing.
    expect(text).toMatch(/suppresses records; it does not destroy or de-identify them/i);
  });

  it('gives the canvasser the true answer, not only the prohibition', () => {
    // A rule that says only what may not be said leaves a canvasser
    // improvising at a gate, which is how the overclaim was written in the
    // first place. The answer comes from the module that owns the erasure
    // position, so the two cannot drift apart.
    const consent = JSON.stringify(CANVASSER_SOP.sections.find((s) => s.heading.includes('consent')));
    expect(consent).toContain(DOORSTEP_ERASURE_ANSWER);
    expect(DOORSTEP_ERASURE_ANSWER).toMatch(/taken out of the app/i);
    expect(DOORSTEP_ERASURE_ANSWER).toMatch(/logged and answered/i);
    expect(DOORSTEP_ERASURE_ANSWER).toMatch(/do not tell them the record is wiped/i);
  });

  it('never promises destruction, in this or any future SOP', () => {
    // Scanned over the whole register, so a promise reintroduced in SOP-05
    // is caught too. Phrased as promise *shapes* rather than banned words:
    // "a phone that is wiped before the queue drains" is true and has to
    // survive, and a guard that trips on accurate prose gets reverted
    // rather than obeyed.
    const register = JSON.stringify(SOPS);
    expect(register, 'no SOP may use the language of purging at all').not.toMatch(/purg/i);
    expect(register).not.toMatch(/\bpermanently (?:deleted|erased|destroyed|removed)\b/i);
    expect(register).not.toMatch(
      /\b(?:will be|gets?|is|are) (?:deleted|erased|destroyed|wiped)\b[^.]{0,60}\belection\b/i,
    );
  });

  it('tells the canvasser consent comes before capture, not after', () => {
    const consent = CANVASSER_SOP.sections.find((s) => s.heading.includes('consent'));
    expect(consent?.steps?.[3]).toMatch(/^Only if they agree/);
    expect(JSON.stringify(consent)).toMatch(/refuses to save a voter record without consent/i);
  });

  it('carries the offline warnings that actually lose a shift', () => {
    expect(text).toMatch(/private or incognito/i);
    expect(text).toMatch(/clear your browser history or site data/i);
  });

  it('never instructs anyone to write a note about a resident', () => {
    expect(text).toMatch(/Do not write about the people who live there/i);
  });
});

describe('the printed manual', () => {
  const manual = assembleManual(SOPS, audience('canvasser'));
  const meta = { organisation: 'Ward 12 Campaign Office', version: '1.0' };

  it('is a real PDF', () => {
    const bytes = buildManualPdf(manual, meta);
    const raw = decoder.decode(bytes);
    expect(raw.startsWith('%PDF-1.7\n')).toBe(true);
    expect(raw.endsWith('%%EOF\n')).toBe(true);
    expect(Number(/\/Count (\d+)/.exec(raw)![1])).toBeGreaterThan(2);
  });

  it('says on its own cover that it is not a contract', () => {
    const text = printed(buildManualPdf(manual, meta));
    expect(text).toContain('not a contract, a licence or a privacy notice');
    expect(text).toContain('the agreement governs');
    expect(MANUAL_STATUS_NOTE).toMatch(/does not vary any agreement/i);
  });

  it('names the role and the organisation the copy was made for', () => {
    const text = printed(buildManualPdf(manual, meta));
    expect(text).toContain('Ward 12 Campaign Office');
    expect(text).toContain('Prepared for');
    expect(text).toContain('Canvasser copy');
  });

  it('prints the safety section a canvasser needs', () => {
    const text = printed(buildManualPdf(manual, meta));
    expect(text).toContain('Read the access note before you open the gate');
    expect(text).toContain('Writing an access note for the next canvasser');
  });

  it('lists what is not in this copy rather than omitting it silently', () => {
    const withheldManual = assembleManual(
      [
        ...SOPS,
        {
          number: 'SOP-10',
          title: 'Recording donations',
          area: 'FUNDING',
          roles: ['canvasser'],
          requiresModule: 'ppfa-disclosure',
          purpose: 'x'.repeat(50),
          sections: [{ heading: 'h', body: ['b'] }],
        } as Sop,
      ],
      audience('canvasser'),
    );
    const text = printed(buildManualPdf(withheldManual, meta));
    expect(text).toContain('Not included in this copy');
    expect(text).toContain('nothing is silently missing');
  });

  it('shows the shape of the full manual without pretending it is written', () => {
    const text = printed(buildManualPdf(manual, meta));
    expect(text).toContain('not yet issued');
    expect(text).toContain('SOP-09');
  });

  it('numbers every page', () => {
    const raw = decoder.decode(buildManualPdf(manual, meta));
    const count = Number(/\/Count (\d+)/.exec(raw)![1]);
    expect(raw).toContain(`(Page 1 of ${count}) Tj`);
    expect(raw).toContain(`(Page ${count} of ${count}) Tj`);
  });

  it('is byte-for-byte deterministic', () => {
    expect(Array.from(buildManualPdf(manual, meta))).toEqual(Array.from(buildManualPdf(manual, meta)));
  });

  it('names the file after the document reference, the role and the version', () => {
    expect(manualFileName(manual, meta)).toBe('ic-ecos-man-2026-canvasser-copy-v1-0.pdf');
  });
});
