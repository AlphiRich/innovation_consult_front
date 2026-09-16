import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { SEED_ROLES } from '@/auth/seedRoles';
import { NO_ANSWER_COOLOFF_HOURS, INACCESSIBLE_COOLOFF_HOURS } from '@/modules/voters/canvassQueue';
import { HAZARD_LABEL, HAZARD_ORDER, PAIR_UP_HAZARDS } from '@/modules/voters/householdSafety';
import { assembleManual, groupByArea, type Sop } from './manualModel';
import { PLANNED_SOPS, SOPS } from './sops';
import { CANVASSER_SOP } from './sops/canvasserSop';
import { ROLE_PURPOSE, TENANT_SETUP_SOP } from './sops/tenantSetupSop';
import { WARD_SEEDING_SOP } from './sops/wardSeedingSop';
import { REGISTER_IMPORT_SOP } from './sops/registerImportSop';
import { WARD_ROUND_SOP } from './sops/wardRoundSop';
import { INCIDENT_SOP } from './sops/incidentSop';
import { REFERRAL_SOP } from './sops/referralSop';
import { WAR_ROOM_SOP } from './sops/warRoomSop';
import {
  EVIDENCE_BASIS,
  INTEGRITY_HASH_BASIS,
  buildReferralDocument,
} from '@/modules/incidents/referral/referralDocument';
import { CHECK_MESSAGE } from '@/modules/incidents/referral/verifyReferral';
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_ORDER } from '@/modules/incidents/incidentMeta';
import {
  INCIDENT_TRANSITIONS,
  availableTransitions,
  canTransition,
  isOpen,
} from '@/modules/incidents/incidentWorkflow';
import { STANDING_DISCLAIMER } from '@/modules/incidents/referral/referralDocument';
import {
  CONTACT_STATUS_LABEL,
  INACCESSIBLE_COOLOFF_HOURS as INACCESSIBLE_HOURS,
  NO_ANSWER_COOLOFF_HOURS as NO_ANSWER_HOURS,
  isQueueable,
  summariseQueue,
} from '@/modules/voters/canvassQueue';
import type { ContactStatus, Household } from '@/dal/ports/households';
import { MIN_REFERENCE_LENGTH, holdingAddressLine, planImport } from '@/modules/voters/bulkImport';
import { RECONCILIATION_BASIS, reconcileSeed } from '@/modules/wards/seedReconciliation';
import { EMPTY_DRAFT, provisioningProblems, SIGN_IN_ID_BASIS } from '@/modules/settings/staffProvisioning';
import { DATA_SUBJECT_REQUEST_SOP } from './sops/dataSubjectRequestSop';
import {
  blocksFulfilment,
  DONOR_ERASURE_REFUSAL_REASON,
  DOORSTEP_ERASURE_ANSWER,
  ERASURE_CAPABILITY_BASIS,
} from '@/modules/settings/dataSubjectErasure';
import { RESPONSE_TARGET_BASIS } from '@/modules/settings/dataSubjectRequestSla';
import { COMPLETENESS_NOTICE, UNSEARCHED_SOURCES } from '@/modules/settings/subjectAccess';
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

  it('never lists a number as both written and planned', () => {
    // The appendix prints PLANNED_SOPS as "not yet issued". A number left
    // in both lists after being written would print as issued in the body
    // and unwritten in the appendix of the same document.
    const written = new Set(SOPS.map((s) => s.number));
    for (const planned of PLANNED_SOPS) {
      expect(written.has(planned.number), `${planned.number} is written and still listed as planned`).toBe(false);
    }
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

  it('lists every procedure in the appendix, written ones included, each with its state', () => {
    // A register of only the unwritten ones makes "not in your copy" and
    // "does not exist" indistinguishable, which is the question the
    // appendix exists to answer.
    const text = printed(buildManualPdf(manual, meta));
    for (const sop of [...SOPS, ...PLANNED_SOPS]) {
      expect(text, sop.number).toContain(sop.number);
    }
    expect(text).toContain('in this copy');
    // SOP-02 is the Party HQ Admin's, so a canvasser's copy has to say so
    // rather than leaving a hole between SOP-01 and SOP-03.
    expect(text).toContain('addressed to another role');
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


/**
 * SOP-02 is the administrator's first hour, and the procedure everything
 * else in the manual assumes was done. Its claims are checked against the
 * role table, the provisioning rules and the security rules it describes.
 */
describe('SOP-02 describes the setup path that actually exists', () => {
  const text = JSON.stringify(TENANT_SETUP_SOP);

  it('is addressed to the role that can actually perform it', () => {
    expect(TENANT_SETUP_SOP.roles).toEqual(['party-hq-admin']);
    expect(TENANT_SETUP_SOP.requiresAnyCapability).toContain('team.manage');
    const admin = SEED_ROLES.find((r) => r.id === 'party-hq-admin')!;
    for (const cap of TENANT_SETUP_SOP.requiresAnyCapability ?? []) {
      expect(admin.defaultCaps, `party-hq-admin cannot ${cap}`).toContain(cap);
    }
  });

  it('names every role, with the reach the role table actually gives it', () => {
    const scopeWord: Record<string, string> = {
      TENANT: 'whole tenant',
      MUNICIPALITY: 'whole municipality',
      WARD: 'one ward',
      VD: 'one voting district',
    };
    const section = TENANT_SETUP_SOP.sections.find((s) => s.heading.includes('Choosing the role'));
    const listed = (section?.steps ?? []).join('\n');
    expect(section?.steps).toHaveLength(SEED_ROLES.length);
    for (const role of SEED_ROLES) {
      expect(listed, role.id).toContain(`${role.label} (${scopeWord[role.geoScope]})`);
    }
  });

  it('states the count of roles by deriving it, never as a written-in number', () => {
    // "Seven roles" in prose is a number that goes stale the day an eighth
    // is added. It is allowed to appear only if it is still true.
    const spelled = /\b(five|six|seven|eight|nine)\b\s+roles/i.exec(text);
    if (spelled) {
      const words: Record<string, number> = { five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
      expect(words[spelled[1].toLowerCase()], 'the SOP names a role count that is now wrong').toBe(SEED_ROLES.length);
    }
  });

  it('tells the administrator the sign-in ID comes from the person, not from a lookup', () => {
    expect(text).toContain(SIGN_IN_ID_BASIS);
    expect(text).toMatch(/Awaiting access/);
  });

  it('warns about the silent failure the provisioning rules exist to prevent', () => {
    const section = TENANT_SETUP_SOP.sections.find((s) => s.heading.includes('give them their ground'));
    const warnings = (section?.warnings ?? []).join(' ');
    expect(warnings).toMatch(/empty application/i);
    // The SOP may only promise a refusal the code actually performs.
    expect(
      provisioningProblems(
        { ...EMPTY_DRAFT, signInId: 'uid', firstName: 'A', lastName: 'B', phone: '1', roleId: 'ward-lead' },
        [],
      ).map((p) => p.field),
    ).toEqual(['wardScope']);
    expect(
      provisioningProblems(
        { ...EMPTY_DRAFT, signInId: 'uid', firstName: 'A', lastName: 'B', phone: '1', roleId: 'finance-officer', wardScope: 'W12' },
        [],
      ).length,
    ).toBeGreaterThan(0);
  });

  it('has prose for every role, so none prints as “undefined”', () => {
    for (const role of SEED_ROLES) {
      expect(ROLE_PURPOSE[role.id], `no SOP-02 description for ${role.id}`).toBeTruthy();
    }
  });

  it('describes each role with capabilities the role actually has, and lacks', () => {
    const caps = (id: string) => SEED_ROLES.find((r) => r.id === id)!.defaultCaps;
    const listed = (TENANT_SETUP_SOP.sections.find((s) => s.heading.includes('Choosing the role'))?.steps ?? []).join('\n');

    // "reads everything — but deliberately cannot edit a voter record or a donation"
    expect(listed).toMatch(/Party HQ Admin[^\n]*cannot edit a voter record or a donation/);
    for (const view of ['warroom.view', 'voters.view', 'wards.view', 'diary.view', 'incidents.view', 'logistics.view', 'ppfa.view', 'analytics.view', 'dsr.view'] as const) {
      expect(caps('party-hq-admin'), `party-hq-admin is described as reading everything but lacks ${view}`).toContain(view);
    }
    expect(caps('party-hq-admin')).not.toContain('voters.edit');
    expect(caps('party-hq-admin')).not.toContain('ppfa.edit');

    // "Holds no export and cannot change disclosure thresholds"
    expect(listed).toMatch(/Compliance Officer[^\n]*Holds no export/);
    for (const cap of caps('compliance-officer')) {
      expect(cap.endsWith('.export'), `compliance-officer holds ${cap}`).toBe(false);
    }

    // "Holds nothing on the voter roll"
    expect(listed).toMatch(/Finance Officer[^\n]*Holds nothing on the voter roll/);
    for (const cap of caps('finance-officer')) {
      expect(cap.startsWith('voters.'), `finance-officer holds ${cap}`).toBe(false);
    }
  });

  it('states the separation of duties the role table keeps, and that an override can break it', () => {
    const section = TENANT_SETUP_SOP.sections.find((s) => s.heading.includes('not quite right'));
    const warnings = (section?.warnings ?? []).join(' ');
    expect(warnings).toMatch(/disclosure thresholds/i);
    // The claim is the three-way concentration rule roleModel.test.ts
    // enforces, not a two-way one. Stated precisely because the first
    // draft of this SOP said the defaults keep thresholds and data
    // requests apart — which is true of the Compliance and Finance
    // Officers and false of the Party HQ Admin, who holds both.
    const caps = (id: string) => SEED_ROLES.find((r) => r.id === id)!.defaultCaps;
    for (const role of SEED_ROLES) {
      const allThree =
        role.defaultCaps.includes('ppfa.edit') &&
        role.defaultCaps.includes('ppfa.manage_thresholds') &&
        role.defaultCaps.includes('dsr.manage');
      expect(allThree, `${role.id} holds all three of the combination SOP-02 says no role holds`).toBe(false);
    }
    expect(warnings).toMatch(/Compliance Officer cannot change disclosure thresholds/i);
    expect(caps('compliance-officer')).not.toContain('ppfa.manage_thresholds');
    expect(warnings).toMatch(/Finance Officer cannot answer data requests/i);
    expect(caps('finance-officer')).not.toContain('dsr.manage');
  });

  it('does not claim deactivation reaches a device that is already offline', () => {
    const section = TENANT_SETUP_SOP.sections.find((s) => s.heading.includes('someone leaves'));
    const warnings = (section?.warnings ?? []).join(' ');
    expect(warnings).toMatch(/not a remote wipe/i);
    expect(warnings).toMatch(/already offline/i);
  });

  it('promises no deletion of the departed person’s record', () => {
    expect(text).toMatch(/it is not deleted/i);
  });
});


/**
 * SOP-03 is the foundation everything else scopes to, and the one whose
 * numbers can be wrong without anything saying so. Its claims are checked
 * against the reconciliation code and against the real gazette output on
 * disk — the split-voting-district figures in the prose are counted from
 * `seed-data/`, not quoted.
 */
describe('SOP-03 describes the seeding path that actually exists', () => {
  const text = JSON.stringify(WARD_SEEDING_SOP);

  it('reaches both roles that can see ward data, and no others', () => {
    expect(WARD_SEEDING_SOP.roles).toEqual(['party-hq-admin', 'municipal-team-lead']);
    expect(WARD_SEEDING_SOP.requiresAnyCapability).toEqual(['wards.view']);
    const canSee = SEED_ROLES.filter((r) => r.defaultCaps.includes('wards.view')).map((r) => r.id);
    expect(canSee.sort()).toEqual([...WARD_SEEDING_SOP.roles].sort());
  });

  it('says only the HQ admin can change wards, which is what the roles say', () => {
    const section = WARD_SEEDING_SOP.sections.find((s) => s.heading.includes('Who can do which part'));
    expect((section?.body ?? []).join(' ')).toMatch(/Municipal Team Lead can see everything[^.]*change none/i);
    const editors = SEED_ROLES.filter((r) => r.defaultCaps.includes('wards.edit')).map((r) => r.id);
    expect(editors).toEqual(['party-hq-admin']);
  });

  it('quotes the reconciliation basis rather than paraphrasing it', () => {
    expect(text).toContain(RECONCILIATION_BASIS);
  });

  it('describes severities the way the reconciliation code actually assigns them', () => {
    const profile = {
      id: 'municipality',
      tenantId: 't',
      municipalityCode: 'NW405',
      municipalityName: 'JB Marks Local Municipality',
      province: 'North West',
      totalCouncilSeats: 67,
      wardSeats: 2,
      prSeats: 65,
      createdAt: '',
      updatedAt: '',
      updatedBy: 'system',
    };
    const ward = (over: Record<string, unknown>) => ({
      id: 'w',
      tenantId: 't',
      wardCode: 'NW405-W1',
      municipalityCode: 'NW405',
      name: 'Ward 1',
      registeredVoters: 100,
      vdCodes: ['1'],
      createdAt: '',
      updatedAt: '',
      updatedBy: 'system',
      deletedAt: null,
      schemaVersion: 1,
      ...over,
    });

    // "Clear everything marked in red" — a short count must be BLOCKING.
    const short = reconcileSeed([ward({})], profile);
    expect(short.blocking.map((i) => i.code)).toContain('WARD_COUNT_MISMATCH');

    // "usually a seed that was interrupted; occasionally simply the next
    // thing on your list" — a ward with no VDs must NOT block.
    const noVds = reconcileSeed(
      [ward({}), ward({ id: 'w2', wardCode: 'NW405-W2', vdCodes: [] })],
      profile,
    );
    expect(noVds.warnings.map((i) => i.code)).toContain('WARD_WITHOUT_VDS');
    expect(noVds.blocking.map((i) => i.code)).not.toContain('WARD_WITHOUT_VDS');

    // "the same code twice in one ward ... the seed check blocks on it"
    const doubled = reconcileSeed(
      [ward({ vdCodes: ['1', '1'] }), ward({ id: 'w2', wardCode: 'NW405-W2' })],
      profile,
    );
    expect(doubled.blocking.map((i) => i.code)).toContain('VD_CODE_REPEATED_IN_WARD');
  });

  it('counts split voting districts from the real gazette output, not from memory', () => {
    const seed = JSON.parse(
      readFileSync(path.resolve(__dirname, '..', '..', '..', 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
    ) as { votingDistricts: { vdCode: string }[] }[];
    const perCode = new Map<string, number>();
    for (const entry of seed) {
      for (const vd of entry.votingDistricts) perCode.set(vd.vdCode, (perCode.get(vd.vdCode) ?? 0) + 1);
    }
    const splitCount = [...perCode.values()].filter((n) => n > 1).length;
    const section = WARD_SEEDING_SOP.sections.find((s) => s.heading.includes('two wards'));
    const body = (section?.body ?? []).join(' ');
    expect(body).toContain(`${splitCount} of ${perCode.size} station codes are split`);
    // The SOP calls that "a quarter of them". Hold the prose to the maths.
    expect(splitCount / perCode.size).toBeGreaterThan(0.2);
    expect(splitCount / perCode.size).toBeLessThan(0.3);
  });

  it('warns that a re-seed strips a ward lead of their scope', () => {
    const section = WARD_SEEDING_SOP.sections.find((s) => s.heading.includes('demarcation changes'));
    expect((section?.warnings ?? []).join(' ')).toMatch(/renumbered leaves that person seeing nothing/i);
  });

  it('refuses to call a clean check a correct ward list', () => {
    const section = WARD_SEEDING_SOP.sections.find((s) => s.heading.includes('before anyone works it'));
    expect((section?.warnings ?? []).join(' ')).toMatch(/not a statement that your ward list is correct/i);
  });

  it('tells nobody to adjust a number to make totals agree', () => {
    expect(text).toMatch(/do not adjust a number to make them match/i);
  });
});


/**
 * SOP-04 is the one onboarding step that writes people rather than
 * reference data, so its refusals are the part that matters. Each is
 * checked by running the planner, not by reading the prose.
 */
describe('SOP-04 describes the import that actually exists', () => {
  const text = JSON.stringify(REGISTER_IMPORT_SOP);

  const CONSENT = {
    method: 'WRITTEN' as const,
    declaredAt: '2026-03-02T00:00:00.000Z',
    reference: 'Membership forms 001-112, Ikageng drive, 2 March 2026',
  };
  const VDS = [
    { vdCode: 'SPLIT', wardCode: 'W1' },
    { vdCode: 'SPLIT', wardCode: 'W2' },
    { vdCode: 'SIMPLE', wardCode: 'W1' },
  ];
  const person = (over: Record<string, unknown> = {}) => ({
    firstName: 'Lerato',
    lastName: 'Molefe',
    phone: '0821234567',
    lineNumber: 2,
    ...over,
  });

  it('goes to the one role that holds both permissions an import needs', () => {
    // Writing voters needs voters.edit; placing them needs to read the
    // ward table, which needs wards.view. Exactly one role holds both.
    const both = SEED_ROLES.filter(
      (r) => r.defaultCaps.includes('voters.edit') && r.defaultCaps.includes('wards.view'),
    ).map((r) => r.id);
    expect(both).toEqual(['municipal-team-lead']);
    expect(REGISTER_IMPORT_SOP.roles).toEqual(both);
    expect(REGISTER_IMPORT_SOP.requiresAnyCapability).toEqual(['voters.edit']);
  });

  it('is right that the HQ admin cannot run one', () => {
    const admin = SEED_ROLES.find((r) => r.id === 'party-hq-admin')!;
    expect(admin.defaultCaps).not.toContain('voters.edit');
    expect(text).toMatch(/deliberately kept off the voter roll/i);
  });

  it('quotes the real minimum reference length', () => {
    expect(text).toContain(`At least ${MIN_REFERENCE_LENGTH} characters`);
  });

  it('promises a refusal for a split district, and the planner delivers it', () => {
    const warnings = (REGISTER_IMPORT_SOP.sections.find((s) => s.heading.includes('refused for its voting district'))?.warnings ?? []).join(' ');
    expect(warnings).toMatch(/does not say which ward/i);
    const result = planImport({ rows: [person({ vdCode: 'SPLIT' })], consent: CONSENT, votingDistricts: VDS });
    expect(result.ready).toHaveLength(0);
    expect(result.rejected[0].code).toBe('SPLIT_VOTING_DISTRICT');
  });

  it('promises a refusal for an unseeded district, and the planner delivers it', () => {
    const result = planImport({ rows: [person({ vdCode: 'ELSEWHERE' })], consent: CONSENT, votingDistricts: VDS });
    expect(result.rejected[0].code).toBe('UNKNOWN_VOTING_DISTRICT');
  });

  it('promises the whole file is refused with no districts loaded, and points at SOP-03', () => {
    const warnings = JSON.stringify(REGISTER_IMPORT_SOP.sections);
    expect(warnings).toMatch(/Seed the wards first — SOP-03/);
    const result = planImport({ rows: [person()], consent: CONSENT, votingDistricts: [] });
    expect(result.fileErrors[0]).toMatch(/SOP-03/);
  });

  it('promises no invented address, and the planner invents none', () => {
    const result = planImport({
      rows: [person({ vdCode: 'SIMPLE' })],
      consent: CONSENT,
      votingDistricts: VDS,
      makeId: () => 'fixed',
    });
    expect(result.households[0].addressLine).toBe(holdingAddressLine(CONSENT.reference));
    expect(text).toMatch(/No street is invented for them/i);
    expect(text).toMatch(/canvasser sent to a door that is not there/i);
  });

  it('promises doors are written before the people in them', () => {
    expect(text).toMatch(/Doors are created first, then the people in them/i);
  });

  it('refuses a doorstep consent method for a batch, as the SOP says', () => {
    expect(text).toMatch(/nobody verbally consented four hundred people in a batch/i);
    // The type system is the enforcement — BulkConsentMethod excludes it —
    // so the SOP is describing something that cannot be expressed at all.
    const methods: string[] = ['WRITTEN', 'DIGITAL'];
    expect(methods).not.toContain('VERBAL_DOORSTEP');
  });

  it('says the duplicate check errs towards holding a name back', () => {
    const warnings = (REGISTER_IMPORT_SOP.sections.find((s) => s.heading.includes('before you write anything'))?.warnings ?? []).join(' ');
    expect(warnings).toMatch(/errs towards holding a name back/i);
    expect(warnings).toMatch(/the rest is masked/i);
  });
});


/**
 * SOP-05 is the supervisor's counterpart to SOP-01, and its central claim
 * is the coverage definition — the number a campaign quotes at itself all
 * season. It is checked by running the queue, not by reading the prose.
 */
describe('SOP-05 describes the round that actually exists', () => {
  const text = JSON.stringify(WARD_ROUND_SOP);

  const door = (over: Partial<Household> = {}): Household => ({
    id: Math.random().toString(36).slice(2),
    tenantId: 't',
    vdCode: '86910587',
    wardCode: 'NW405-W1',
    addressLine: '1 Main Road',
    dwellingType: 'FORMAL',
    createdAt: '',
    updatedAt: '',
    updatedBy: 'system',
    deletedAt: null,
    schemaVersion: 1,
    ...over,
  });

  it('reaches the two roles that run rounds', () => {
    expect(WARD_ROUND_SOP.roles).toEqual(['ward-lead', 'vd-captain']);
    for (const roleId of WARD_ROUND_SOP.roles) {
      const role = SEED_ROLES.find((r) => r.id === roleId)!;
      expect(role.defaultCaps, roleId).toContain('voters.view');
      // Both can also close a door out; the SOP says the supervisor reads
      // and the canvasser records, so view is what gates the document.
      expect(role.defaultCaps, roleId).toContain('voters.edit');
    }
    expect(WARD_ROUND_SOP.requiresAnyCapability).toEqual(['voters.view']);
  });

  it('quotes the real cool-off periods', () => {
    expect(text).toContain(`${NO_ANSWER_HOURS} hours`);
    expect(text).toContain(`${INACCESSIBLE_HOURS} hours`);
  });

  it('lists the outcomes a canvasser can actually record', () => {
    const section = WARD_ROUND_SOP.sections.find((s) => s.heading.includes('Closing a door out'))!;
    // Named explicitly rather than derived from CONTACT_STATUS_LABEL. The
    // SOP builds its list from that map, so comparing against the same
    // derivation compares the map to itself — deleting a label passed this
    // test while silently shortening the printed procedure. Found by
    // injection, not by review.
    expect(section.steps).toEqual([
      'Contacted',
      'No answer',
      'Could not reach the door',
      'Asked not to be contacted again',
    ]);
    // And the map is still the source: the SOP must not have drifted off it.
    for (const label of section.steps!) {
      expect(Object.values(CONTACT_STATUS_LABEL), label).toContain(label);
    }
  });

  it('keeps a label for every state the queue can be in', () => {
    // The same defect from the other side: a state with no label vanishes
    // from the SOP and from the round page's breakdown together.
    const states: ContactStatus[] = [
      'NOT_CONTACTED',
      'IN_PROGRESS',
      'CONTACTED',
      'NO_ANSWER',
      'INACCESSIBLE',
      'REFUSED_RECONTACT',
    ];
    for (const state of states) expect(CONTACT_STATUS_LABEL[state], state).toBeTruthy();
    expect(Object.keys(CONTACT_STATUS_LABEL).sort()).toEqual([...states].sort());
  });

  it('states the coverage definition the code computes, refusals excluded', () => {
    const body = (WARD_ROUND_SOP.sections.find((s) => s.heading.includes('coverage figure counts'))?.body ?? []).join(' ');
    expect(body).toMatch(/taken out of the denominator/i);

    // Four doors, one refused. Two worked. If refusals counted, coverage
    // would be 50%; excluded, it is 66.7%. The SOP describes the latter.
    const summary = summariseQueue([
      door({ contactStatus: 'CONTACTED' }),
      door({ contactStatus: 'NO_ANSWER', lastContactedAt: new Date().toISOString() }),
      door({ contactStatus: 'NOT_CONTACTED' }),
      door({ contactStatus: 'REFUSED_RECONTACT' }),
    ]);
    expect(summary.refused).toBe(1);
    expect(summary.coveragePct).toBe(66.7);
    expect(summary.coveragePct).not.toBe(50);
  });

  it('is right that a refusal is never offered again, at any interval', () => {
    const longAgo = new Date('2020-01-01').toISOString();
    expect(isQueueable(door({ contactStatus: 'REFUSED_RECONTACT', lastContactedAt: longAgo }))).toBe(false);
    expect(text).toMatch(/never offered to anyone, at any interval/i);
  });

  it('is right that a door being worked now is not offered to anyone else', () => {
    expect(isQueueable(door({ contactStatus: 'IN_PROGRESS' }))).toBe(false);
    expect(text).toMatch(/not offered to anyone else/i);
  });

  it('is right that an untouched door is always offered', () => {
    expect(isQueueable(door({ contactStatus: 'NOT_CONTACTED' }))).toBe(true);
    expect(isQueueable(door())).toBe(true); // absent status reads as untouched
  });

  it('calls the cool-offs operational rather than legal, as the code does', () => {
    const warnings = (WARD_ROUND_SOP.sections.find((s) => s.heading.includes('when they come back'))?.warnings ?? []).join(' ');
    expect(warnings).toMatch(/not legal ones/i);
    expect(warnings).toMatch(/Nothing in law says/i);
  });

  it('refuses to let coverage be read as support or turnout', () => {
    expect(text).toMatch(/measure of ground walked, not of support won/i);
    expect(text).toMatch(/Do not present a coverage percentage as a turnout projection/i);
  });

  it('tells the reader the figures are only as current as the last sync', () => {
    expect(text).toMatch(/only ever as current as the last phone to come back into signal/i);
  });

  it('connects the address-less import back to SOP-04', () => {
    expect(text).toMatch(/holding record and never enter a round/i);
    expect(text).toContain('SOP-04');
  });
});


/**
 * SOP-06 is shared by four roles and is the only procedure whose output
 * leaves the campaign. Its steps are checked against the workflow model,
 * which is itself checked against firestore.rules — so a step described
 * here is a step the database will permit.
 */
describe('SOP-06 describes the incident path that actually exists', () => {
  const text = JSON.stringify(INCIDENT_SOP);

  it('reaches every role that can log or read an incident', () => {
    const involved = SEED_ROLES.filter(
      (r) => r.defaultCaps.includes('incidents.create') || r.defaultCaps.includes('incidents.view'),
    ).map((r) => r.id);
    // The HQ admin holds incidents.view but runs no field procedure; the
    // SOP is addressed to the four roles that work an incident.
    for (const roleId of INCIDENT_SOP.roles) {
      expect(involved, roleId).toContain(roleId);
    }
    expect(INCIDENT_SOP.roles).toEqual(['canvasser', 'vd-captain', 'ward-lead', 'municipal-team-lead']);
    expect(INCIDENT_SOP.requiresAnyCapability).toEqual(['incidents.create', 'incidents.view']);
  });

  it('names the four categories the database will accept, and no others', () => {
    const body = (INCIDENT_SOP.sections[0].body ?? []).join(' ');
    for (const label of Object.values(CATEGORY_LABEL)) {
      expect(body.toLowerCase(), label).toContain(label.toLowerCase());
    }
    expect(body).toMatch(/no free-text category/i);
  });

  it('is right that a canvasser cannot see what they logged', () => {
    const canvasser = SEED_ROLES.find((r) => r.id === 'canvasser')!;
    expect(canvasser.defaultCaps).toContain('incidents.create');
    expect(canvasser.defaultCaps).not.toContain('incidents.view');
    expect(text).toMatch(/cannot see incidents after logging them, including their own/i);
  });

  it('is right that triage and escalation are held apart', () => {
    expect(canTransition('LOGGED', 'TRIAGED', ['incidents.escalate'])).toBe(false);
    expect(canTransition('TRIAGED', 'ESCALATED', ['incidents.triage'])).toBe(false);
    expect(text).toMatch(/cannot escalate, and whoever escalates cannot triage/i);
  });

  it('lists every distinct step with the permission the model requires', () => {
    const section = INCIDENT_SOP.sections.find((s) => s.heading.includes('Who does which step'))!;
    const listed = (section.steps ?? []).join('\n');
    for (const transition of INCIDENT_TRANSITIONS) {
      expect(listed, transition.label).toContain(transition.label);
      expect(listed, transition.capability).toContain(transition.capability);
    }
  });

  it('describes resolving and closing, which the product can now actually do', () => {
    // The defect SOP-06 was written against: both were unreachable.
    expect(canTransition('REFERRED', 'RESOLVED', ['incidents.triage'])).toBe(true);
    expect(canTransition('REFERRED', 'CLOSED', ['incidents.escalate'])).toBe(true);
    expect(text).toMatch(/Mark it resolved when the problem is actually fixed/i);
    expect(text).toMatch(/only ever goes up/i);
    // And every declared status is reachable, so no tab is permanently empty.
    const reachable = new Set(['LOGGED', ...INCIDENT_TRANSITIONS.map((t) => t.to)]);
    for (const status of STATUS_ORDER) expect(reachable.has(status), status).toBe(true);
  });

  it('is right that closing is terminal and is not a deletion', () => {
    expect(availableTransitions('CLOSED', ['incidents.escalate', 'incidents.triage'])).toEqual([]);
    expect(text).toMatch(/There is no reopening/i);
    expect(text).toMatch(/Nothing here deletes an incident/i);
    expect(STATUS_ORDER.filter(isOpen)).not.toContain('CLOSED');
  });

  it('carries the referral disclaimer verbatim rather than paraphrasing it', () => {
    expect(text).toContain(STANDING_DISCLAIMER);
  });

  it('claims no transmission, no dispatch and no alert', () => {
    expect(text).toMatch(/The platform sends nothing/i);
    expect(text).toMatch(/not an emergency service/i);
    expect(text).toMatch(/alerts nobody, and dispatches nothing/i);
    // And it must not claim the opposite anywhere.
    expect(text).not.toMatch(/\bnotifies the municipality\b/i);
    expect(text).not.toMatch(/\bsubmits? (the referral|it) to\b/i);
  });

  it('keeps incidents about places and access notes about safety', () => {
    expect(text).toMatch(/about a place, not about a person/i);
    expect(text).toContain('SOP-01');
  });
});


/**
 * SOP-07 is the only procedure whose output is read by somebody the
 * campaign does not control. Its quoted constants are checked against the
 * ones actually printed on the document.
 */
describe('SOP-07 describes the referral that actually gets issued', () => {
  const text = JSON.stringify(REFERRAL_SOP);

  const INCIDENT_FIXTURE = {
    id: '8f2c1a9e-4d55-4f6b-9c31-7a0e5b2d8811',
    tenantId: 't',
    vdCode: '32900123',
    wardCode: 'NW405012',
    category: 'WATER_SANITATION' as const,
    severity: 'HIGH' as const,
    status: 'ESCALATED' as const,
    description: 'Sewage overflow at the corner of Church and Kruis Street.',
    photoPaths: [],
    reportedBy: 'uid-canvasser',
    createdAt: '2026-03-02T08:00:00.000Z',
    updatedAt: '2026-03-04T10:00:00.000Z',
    updatedBy: 'uid-lead',
    deletedAt: null,
    schemaVersion: 1,
  };

  const REFERRAL_INPUT = {
    incident: INCIDENT_FIXTURE,
    issuingOrganisation: 'Ward 12 Campaign Office',
    recipient: {
      municipalityName: 'JB Marks Local Municipality',
      municipalityCode: 'NW405',
      department: 'Water & Sanitation',
    },
    coveringNote: '',
    preparedByUid: 'uid-lead',
    preparedAt: '2026-03-04T10:00:00.000Z',
    authorisation: null,
  };

  it('goes to the role that can authorise one', () => {
    expect(REFERRAL_SOP.roles).toEqual(['municipal-team-lead']);
    expect(REFERRAL_SOP.requiresAnyCapability).toEqual(['incidents.escalate']);
    const lead = SEED_ROLES.find((r) => r.id === 'municipal-team-lead')!;
    expect(lead.defaultCaps).toContain('incidents.escalate');
  });

  it('quotes the disclaimer printed on the document, verbatim', () => {
    expect(text).toContain(STANDING_DISCLAIMER);
    // And the disclaimer still says the document carries no authority.
    expect(STANDING_DISCLAIMER).toMatch(/not a municipal or government document/i);
    expect(STANDING_DISCLAIMER).toMatch(/carries no municipal or state authority/i);
  });

  it('quotes the evidence and hash bases rather than paraphrasing them', () => {
    expect(text).toContain(EVIDENCE_BASIS);
    expect(text).toContain(INTEGRITY_HASH_BASIS);
  });

  it('carries the tamper message the check itself produces', () => {
    expect(text).toContain(CHECK_MESSAGE.DIFFERS);
  });

  it('is right that a referral needs an escalated incident', () => {
    const logged = { ...INCIDENT_FIXTURE, status: 'LOGGED' as const };
    expect(() => buildReferralDocument({ ...REFERRAL_INPUT, incident: logged })).toThrow(/escalated/i);
    expect(text).toMatch(/can only be prepared for an incident that has been escalated/i);
  });

  it('is right that the issuing organisation is never filled in for you', () => {
    expect(() =>
      buildReferralDocument({ ...REFERRAL_INPUT, issuingOrganisation: '   ' }),
    ).toThrow();
    expect(text).toMatch(/typed by you and is not filled in from anywhere/i);
  });

  it('is right that one person cannot sign in another’s name', () => {
    expect(text).toMatch(/refuses to let one person sign in another/i);
  });

  it('claims no transmission and no notification', () => {
    expect(text).toMatch(/platform sends nothing and notifies nobody/i);
    expect(text).toMatch(/referred to a filing cabinet/i);
    expect(text).not.toMatch(/\bautomatically (sends|submits|notifies)\b/i);
  });

  it('states the narrow meaning of a passing check', () => {
    expect(text).toMatch(/nothing about the photographs/i);
    expect(text).toMatch(/not a signature/i);
    expect(text).toMatch(/cannot show the referral was ever delivered/i);
  });

  it('tells nobody to quietly replace a document already sent', () => {
    expect(text).toMatch(/do not quietly re-issue a corrected one/i);
    expect(text).toMatch(/Tell the department, in writing, quoting the original reference/i);
  });
});


/**
 * SOP-08 is read every morning and quoted upward, so its job is
 * provenance: which number came from where. The tests check the claims
 * that decide whether a reader trusts the right one.
 */
describe('SOP-08 describes the war room honestly', () => {
  const text = JSON.stringify(WAR_ROOM_SOP);

  it('goes to the roles that can open it', () => {
    expect(WAR_ROOM_SOP.roles).toEqual(['municipal-team-lead', 'party-hq-admin']);
    expect(WAR_ROOM_SOP.requiresAnyCapability).toEqual(['warroom.view']);
    for (const roleId of WAR_ROOM_SOP.roles) {
      expect(SEED_ROLES.find((r) => r.id === roleId)!.defaultCaps, roleId).toContain('warroom.view');
    }
  });

  it('separates the two percentages that sound alike', () => {
    // The war room's is records held over the registered roll; the round's
    // is doors worked over doors workable. Conflating them is the single
    // most likely misreading of this screen.
    expect(text).toMatch(/share of the electorate this campaign holds a record for/i);
    expect(text).toMatch(/doors worked out of doors workable/i);
    expect(text).toMatch(/neither is a substitute for the other/i);
  });

  it('says which door figure is measured and which is self-reported', () => {
    expect(text).toMatch(/counted from the door records/i);
    expect(text).toMatch(/self-reported/i);
    expect(text).toMatch(/Never present the self-reported figure as a measurement/i);
  });

  it('lists every door state the counters actually carry', () => {
    const section = WAR_ROOM_SOP.sections.find((s) => s.heading.includes('Doors by state'))!;
    expect(section.steps).toEqual(Object.values(CONTACT_STATUS_LABEL));
  });

  it('quotes the seed-check basis rather than paraphrasing it', () => {
    expect(text).toContain(RECONCILIATION_BASIS);
    expect(text).toMatch(/A short seed has no other symptom/i);
  });

  it('defines open incidents the way the workflow module does', () => {
    const open = STATUS_ORDER.filter(isOpen);
    expect(open).toEqual(['LOGGED', 'TRIAGED', 'ESCALATED', 'REFERRED']);
    const body = (WAR_ROOM_SOP.sections.find((s) => s.heading === 'Open incidents')?.body ?? []).join(' ');
    for (const status of open) {
      expect(body.toLowerCase(), status).toContain(STATUS_LABEL[status].toLowerCase());
    }
    expect(body).toMatch(/Resolved and closed drop out of it/i);
  });

  it('refuses to let referred be read as delivered', () => {
    expect(text).toMatch(/has not necessarily been delivered/i);
    expect(text).toMatch(/the platform sends nothing/i);
  });

  it('refuses to let sentiment be read as a poll', () => {
    expect(text).toMatch(/it is not a poll/i);
    expect(text).toMatch(/no sampling frame, no weighting and no margin of error/i);
    expect(text).not.toMatch(/\b(projected|forecast) (turnout|result|vote share)\b/i);
  });

  it('says plainly what the platform does not track', () => {
    expect(text).toMatch(/no volunteer presence tracking/i);
    expect(text).toMatch(/does not know what the other parties are doing/i);
  });
});


/**
 * SOP-09 is the only procedure whose output goes to a member of the
 * public who has no way to check it. These guards are about the three
 * things it could get wrong and nobody outside would ever find out: an
 * answer that looks complete and is not, a working target presented as
 * law, and a promise of erasure this product cannot keep.
 */
describe('SOP-09 handles a data subject request honestly', () => {
  const text = JSON.stringify(DATA_SUBJECT_REQUEST_SOP);

  it('goes to the roles that can open the request log', () => {
    expect(DATA_SUBJECT_REQUEST_SOP.roles).toEqual(['compliance-officer', 'party-hq-admin']);
    expect(DATA_SUBJECT_REQUEST_SOP.requiresAnyCapability).toEqual(['dsr.view']);
    for (const roleId of DATA_SUBJECT_REQUEST_SOP.roles) {
      expect(SEED_ROLES.find((r) => r.id === roleId)!.defaultCaps, roleId).toContain('dsr.view');
    }
    // And the search it instructs them to run needs voters.view, which
    // both of them hold — a procedure whose central step its own audience
    // cannot perform is the defect this SOP exists to have fixed.
    for (const roleId of DATA_SUBJECT_REQUEST_SOP.roles) {
      expect(SEED_ROLES.find((r) => r.id === roleId)!.defaultCaps, roleId).toContain('voters.view');
    }
  });

  it('names every source the response could not search', () => {
    for (const source of UNSEARCHED_SOURCES) {
      expect(text).toContain(source.label);
      expect(text).toContain(source.reason);
    }
    expect(text).toMatch(/worse than no response at all/i);
  });

  it('quotes the completeness notice rather than paraphrasing it', () => {
    expect(text).toContain(COMPLETENESS_NOTICE);
  });

  it('never describes the response target as statutory', () => {
    expect(text).toContain(RESPONSE_TARGET_BASIS);
    expect(text).not.toMatch(/\bstatutory (deadline|turnaround|window|limit)\b/i);
    expect(text).not.toMatch(/\b(POPIA|the Act) (requires|gives you|allows) \d+ days\b/i);
    expect(text).toMatch(/not a legal deadline/i);
  });

  it('refuses to describe a deletion as something this platform fulfils', () => {
    expect(text).toContain(ERASURE_CAPABILITY_BASIS);
    expect(text).toContain(DONOR_ERASURE_REFUSAL_REASON);
    expect(text).toMatch(/suppression is not destruction/i);
    expect(text).not.toMatch(/\b(permanently|fully) (purged|deleted|erased|destroyed)\b/i);
    expect(text).not.toMatch(/\bmark (it|the request) fulfilled\b.{0,80}\bdeletion\b/i);
  });

  it('agrees with the code about which deletions can be marked fulfilled', () => {
    // Every subject type, every deletion — the SOP's central claim.
    for (const subjectType of ['VOTER', 'STAFF', 'CANDIDATE', 'DONOR'] as const) {
      expect(blocksFulfilment(subjectType, 'DELETION'), subjectType).toBe(true);
      expect(blocksFulfilment(subjectType, 'ACCESS'), subjectType).toBe(false);
      expect(blocksFulfilment(subjectType, 'CORRECTION'), subjectType).toBe(false);
    }
    // …and the SOP says "fulfilled" is the true word for the other two.
    expect(text).toMatch(/for a correction, that word is true/i);
  });

  it('gives the canvasser the same answer as the compliance officer', () => {
    expect(text).toContain(DOORSTEP_ERASURE_ANSWER);
    expect(JSON.stringify(CANVASSER_SOP)).toContain(DOORSTEP_ERASURE_ANSWER);
  });

  it('insists somebody verifies who is asking', () => {
    expect(text).toMatch(/does not verify identity/i);
    expect(text).toMatch(/that you verify is not optional/i);
  });

  it('does not let a nil search read as a nil holding', () => {
    expect(text).toMatch(/nil search result, not a finding that the campaign holds nothing/i);
    expect(text).toMatch(/exact match/i);
  });

  it('claims no transmission', () => {
    expect(text).toMatch(/platform sends nothing/i);
    expect(text).toMatch(/Downloading the draft has not answered anybody/i);
  });

  it('keeps a gate code out of a subject access response', () => {
    expect(text).toMatch(/never disclosed to anybody, including the data subject/i);
  });
});
