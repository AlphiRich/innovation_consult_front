/**
 * Election Campaign OS — the incident lifecycle
 *
 * Two things are checked here, and the second is the one that matters.
 *
 * The workflow model says which move is legal and who may make it. The
 * security rules decide whether the write actually lands. A transition
 * allowed in one and refused by the other is a button that fails at the
 * moment somebody presses it in a street — so the rules are read from
 * disk and compared against the model rather than trusted to match.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Capability } from '@/auth/types';
import type { IncidentStatus } from '@/dal/ports/incidents';
import { SEED_ROLES } from '@/auth/seedRoles';
import { STATUS_ORDER } from './incidentMeta';
import {
  INCIDENT_TRANSITIONS,
  TERMINAL_STATUS,
  availableTransitions,
  canTransition,
  isOpen,
  transitionRefusal,
  transitionsFrom,
} from './incidentWorkflow';

const TRIAGE: Capability[] = ['incidents.view', 'incidents.triage'];
const ESCALATE: Capability[] = ['incidents.view', 'incidents.escalate'];
const CANVASSER: Capability[] = ['incidents.create'];

const rules = () => readFileSync(path.resolve(__dirname, '..', '..', '..', 'firestore.rules'), 'utf-8');

describe('every declared status can be reached', () => {
  it('leaves no status stranded — the defect this module was built for', () => {
    // RESOLVED and CLOSED were in the type, in STATUS_LABEL and in
    // STATUS_ORDER, so the page rendered a tab for each, and nothing
    // could put an incident into either.
    const reachable = new Set<IncidentStatus>(['LOGGED', ...INCIDENT_TRANSITIONS.map((t) => t.to)]);
    for (const status of STATUS_ORDER) {
      expect(reachable.has(status), `${status} can never be reached`).toBe(true);
    }
  });

  it('can reach resolved and closed specifically, from a referred incident', () => {
    expect(canTransition('REFERRED', 'RESOLVED', TRIAGE)).toBe(true);
    expect(canTransition('REFERRED', 'CLOSED', ESCALATE)).toBe(true);
  });

  it('walks the whole forward path with the right permission at each step', () => {
    expect(canTransition('LOGGED', 'TRIAGED', TRIAGE)).toBe(true);
    expect(canTransition('TRIAGED', 'ESCALATED', ESCALATE)).toBe(true);
    expect(canTransition('ESCALATED', 'REFERRED', ESCALATE)).toBe(true);
    expect(canTransition('RESOLVED', 'CLOSED', ESCALATE)).toBe(true);
  });
});

describe('who may make which move', () => {
  it('keeps triage and escalation apart, as the rules comment says', () => {
    expect(canTransition('LOGGED', 'TRIAGED', ESCALATE)).toBe(false);
    expect(canTransition('TRIAGED', 'ESCALATED', TRIAGE)).toBe(false);
  });

  it('lets whoever triages record that something was fixed', () => {
    expect(canTransition('ESCALATED', 'RESOLVED', TRIAGE)).toBe(true);
    // …but not close the record.
    expect(canTransition('RESOLVED', 'CLOSED', TRIAGE)).toBe(false);
  });

  it('gives a canvasser no moves at all', () => {
    for (const status of STATUS_ORDER) {
      expect(availableTransitions(status, CANVASSER), status).toEqual([]);
    }
  });

  it('separates “not a legal move” from “not your move”', () => {
    expect(transitionRefusal('LOGGED', 'TRIAGED', ESCALATE)).toMatch(/do not hold the permission/i);
    expect(transitionRefusal('LOGGED', 'TRIAGED', ESCALATE)).toContain('incidents.triage');
    expect(transitionRefusal('LOGGED', 'REFERRED', ESCALATE)).toMatch(/not a move this incident can make/i);
    expect(transitionRefusal('LOGGED', 'TRIAGED', TRIAGE)).toBeNull();
  });

  it('names every capability it uses as one the capability model has', () => {
    const known = new Set(SEED_ROLES.flatMap((r) => r.defaultCaps));
    for (const transition of INCIDENT_TRANSITIONS) {
      expect(known.has(transition.capability), transition.capability).toBe(true);
    }
  });
});

describe('closed is the end of the record', () => {
  it('offers nothing out of it', () => {
    expect(transitionsFrom(TERMINAL_STATUS)).toEqual([]);
    expect(TERMINAL_STATUS).toBe('CLOSED');
  });

  it('says so, rather than offering a reopen that does not exist', () => {
    expect(transitionRefusal('CLOSED', 'LOGGED', ESCALATE)).toMatch(/log a new incident/i);
  });

  it('is not a deletion — the collection still refuses one', () => {
    const incidents = /match \/tenants\/\{tid\}\/incidents\/\{incidentId\}[\s\S]*?\n {4}\}/.exec(rules())![0];
    expect(incidents).toContain('allow delete: if false;');
  });
});

describe('what counts as open', () => {
  it('excludes resolved and closed, which is the point of reaching them', () => {
    expect(STATUS_ORDER.filter(isOpen)).toEqual(['LOGGED', 'TRIAGED', 'ESCALATED', 'REFERRED']);
  });
});

/**
 * The model and the rules are two copies of one decision. This is the
 * test that stops them drifting.
 */
describe('the security rules permit exactly what the workflow allows', () => {
  const incidentBlock = () => /match \/tenants\/\{tid\}\/incidents\/\{incidentId\}[\s\S]*?\n {4}\}/.exec(rules())![0];

  it('finds the block it is scanning', () => {
    expect(incidentBlock()).toContain("allow read:");
    expect(incidentBlock()).toContain("cap('incidents.triage')");
    expect(incidentBlock()).toContain("cap('incidents.escalate')");
  });

  it('gates resolving on triage and closing on escalate, matching the model', () => {
    const block = incidentBlock();
    // Resolution: triage capability, reachable from triaged onwards.
    expect(block).toMatch(/cap\('incidents\.triage'\)[\s\S]{0,200}RESOLVED/);
    for (const from of ['TRIAGED', 'ESCALATED', 'REFERRED']) {
      expect(block, from).toContain(`'${from}'`);
      expect(canTransition(from as IncidentStatus, 'RESOLVED', TRIAGE), from).toBe(true);
    }
    // Closing: escalate capability.
    expect(block).toMatch(/cap\('incidents\.escalate'\)[\s\S]{0,200}CLOSED/);
    expect(canTransition('REFERRED', 'CLOSED', ESCALATE)).toBe(true);
  });

  it('never lets a capability the model does not use appear as a status gate', () => {
    const block = incidentBlock().replace(/\/\/.*$/gm, '');
    const gated = [...block.matchAll(/cap\('(incidents\.[a-z_]+)'\)/g)].map((m) => m[1]);
    const modelCaps = new Set<string>(INCIDENT_TRANSITIONS.map((t) => t.capability));
    // `incidents.view` and `incidents.create` legitimately appear for read
    // and create; every *other* capability in the block must be one the
    // workflow model actually uses for a transition.
    for (const cap of gated) {
      if (cap === 'incidents.view' || cap === 'incidents.create') continue;
      expect(modelCaps.has(cap), `${cap} gates a rule but no transition`).toBe(true);
    }
  });

  it('still refuses a status change to anyone holding only incidents.view', () => {
    const block = incidentBlock();
    expect(block).toContain("cap('incidents.view') && isUnchanged('status')");
    expect(availableTransitions('LOGGED', ['incidents.view'])).toEqual([]);
  });
});
