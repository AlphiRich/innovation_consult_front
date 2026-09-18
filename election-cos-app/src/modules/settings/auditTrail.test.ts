/**
 * Election Campaign OS — guards on the audit log screen's honesty
 *
 * A screen headed "Audit log" makes a claim by its title. A reader who
 * has been shown one assumes the entries cannot have been altered —
 * that is what the word means outside software. This log is append-only
 * from the client and is not hash-chained, so the screen has to say the
 * second part as plainly as it implies the first.
 *
 * The security review that arrived with this session recommends a
 * hash-chained, tamper-evident audit table for a different build. It is
 * right, and it is not built here. These tests fail if the page ever
 * stops admitting that.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { AuditEvent } from '@/dal/ports/auditLog';
import {
  AUDIT_ACTION_LABEL,
  AUDIT_EMPTY_BASIS,
  AUDIT_INTEGRITY_BASIS,
  AUDIT_SCOPE_BASIS,
  describeAction,
  groupByDay,
  isUnknownAction,
} from './auditTrail';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const event = (over: Partial<AuditEvent> = {}): AuditEvent => ({
  id: 'e1',
  tenantId: 't',
  actorUid: 'uid-1',
  action: 'ppfa.export',
  targetType: 'donor',
  targetId: 'd1',
  occurredAt: '2026-09-17T10:00:00.000Z',
  ...over,
});

describe('what the log says about itself', () => {
  it('admits it is not tamper-evident', () => {
    expect(AUDIT_INTEGRITY_BASIS).toMatch(/not tamper-evident/i);
    expect(AUDIT_INTEGRITY_BASIS).toMatch(/no hash chain/i);
    expect(AUDIT_INTEGRITY_BASIS).toMatch(/could alter it and the record would not show it/i);
  });

  it('claims only the append-only property the rules actually give it', () => {
    // The claim is checkable: firestore.rules denies every client write
    // to the collection. If that ever loosened, the sentence would be
    // false and this fails.
    const rules = readFileSync(path.join(REPO_ROOT, 'firestore.rules'), 'utf8');
    expect(rules).toMatch(/auditLog\/\{eventId\}[\s\S]{0,160}allow write: if false/);
    expect(AUDIT_INTEGRITY_BASIS).toMatch(/append-only/i);
    expect(AUDIT_INTEGRITY_BASIS).not.toMatch(/\b(immutable|cannot be altered|proof against)\b/i);
  });

  it('is clear that it is not a record of who read what', () => {
    expect(AUDIT_SCOPE_BASIS).toMatch(/Ordinary reads are not/i);
    expect(AUDIT_SCOPE_BASIS).toMatch(/cannot tell you who looked at a voter record/i);
  });

  it('explains an empty log rather than letting it read as quiet', () => {
    expect(AUDIT_EMPTY_BASIS).toMatch(/no live Firebase project/i);
    expect(AUDIT_EMPTY_BASIS).toMatch(/does not mean the acts above have never happened/i);
  });
});

describe('describing an action', () => {
  it('names the actions the codebase actually claims to write', () => {
    // Each of these is promised in a module header or a port comment. A
    // label for an action nobody writes would be the log describing
    // something the system never does.
    for (const action of ['voter.phone.unmask', 'ppfa.export', 'ppfa.config.create']) {
      expect(AUDIT_ACTION_LABEL[action]).toBeTruthy();
      expect(isUnknownAction(action)).toBe(false);
    }
  });

  it('shows an unknown action as itself rather than guessing', () => {
    expect(describeAction('something.nobody.declared')).toBe('something.nobody.declared');
    expect(isUnknownAction('something.nobody.declared')).toBe(true);
  });

  it('matches the action strings the port documents', () => {
    const port = readFileSync(path.join(REPO_ROOT, 'src/dal/ports/auditLog.ts'), 'utf8');
    for (const action of ['voter.phone.unmask', 'ppfa.export', 'ppfa.config.create']) {
      expect(port, action).toContain(action);
    }
  });
});

describe('grouping', () => {
  it('groups by day, newest first, losing nothing', () => {
    const events = [
      event({ id: 'a', occurredAt: '2026-09-15T08:00:00.000Z' }),
      event({ id: 'b', occurredAt: '2026-09-17T09:00:00.000Z' }),
      event({ id: 'c', occurredAt: '2026-09-17T18:00:00.000Z' }),
    ];
    const grouped = groupByDay(events);
    expect(grouped.map((g) => g.day)).toEqual(['2026-09-17', '2026-09-15']);
    expect(grouped[0].events.map((e) => e.id)).toEqual(['c', 'b']);
    expect(grouped.flatMap((g) => g.events)).toHaveLength(events.length);
  });

  it('handles an empty log', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
