/**
 * Tests for the task workflow.
 *
 * The guard worth having here is `TASK_STATUS_ORDER covers every status`.
 * TypeScript already forces `TASK_STATUS_LABEL` and `FORWARD` to be
 * exhaustive, because both are `Record<Task['status'], …>`. But
 * `TASK_STATUS_ORDER` is a plain array: adding a fourth member to
 * `Task['status']` would compile cleanly while silently leaving the new
 * status unranked, and `indexOf` would return -1 — sorting it above
 * everything else. That is the one way this file can rot without the
 * compiler noticing, so it gets a runtime test.
 *
 * Proved by injection when written. Adding 'CANCELLED' to Task['status']
 * *alone* does not demonstrate it — both Records stop being exhaustive and
 * the compiler catches it first. The realistic mistake is the one that
 * compiles: add the status AND dutifully update `TASK_STATUS_LABEL`,
 * `FORWARD` and `actionLabel`, and forget only the array. Done exactly
 * that: `tsc --noEmit` clean, and `1 failed | 9 passed` — this test and no
 * other. Reverted clean.
 */
import { describe, it, expect } from 'vitest';
import type { Task } from '@/dal/ports/tasks';
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_LABEL,
  nextStatus,
  actionLabel,
  sortTasks,
} from './taskWorkflow';

function task(id: string, status: Task['status'], dueAt?: string): Task {
  return {
    id,
    tenantId: 't1',
    title: id,
    status,
    dueAt,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    updatedBy: 'u1',
    deletedAt: null,
    schemaVersion: 1,
  };
}

describe('task status model', () => {
  it('TASK_STATUS_ORDER covers every status the label map knows', () => {
    expect([...TASK_STATUS_ORDER].sort()).toEqual(Object.keys(TASK_STATUS_LABEL).sort());
  });

  it('advances one step at a time and stops at DONE', () => {
    expect(nextStatus('OPEN')).toBe('IN_PROGRESS');
    expect(nextStatus('IN_PROGRESS')).toBe('DONE');
    expect(nextStatus('DONE')).toBeNull();
  });

  it('offers no action on a completed task', () => {
    expect(actionLabel('OPEN')).toBe('Start task');
    expect(actionLabel('IN_PROGRESS')).toBe('Mark done');
    expect(actionLabel('DONE')).toBeNull();
  });

  it('every non-terminal status has both a next status and a label', () => {
    for (const status of TASK_STATUS_ORDER) {
      expect(Boolean(nextStatus(status))).toBe(Boolean(actionLabel(status)));
    }
  });
});

describe('sortTasks', () => {
  it('puts open work first, then in progress, then done', () => {
    const sorted = sortTasks([task('c', 'DONE'), task('a', 'OPEN'), task('b', 'IN_PROGRESS')]);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('within a status, sorts by soonest due date', () => {
    const sorted = sortTasks([
      task('late', 'OPEN', '2026-11-04T00:00:00.000Z'),
      task('soon', 'OPEN', '2026-10-29T00:00:00.000Z'),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['soon', 'late']);
  });

  it('puts undated tasks last within their status, not first', () => {
    const sorted = sortTasks([
      task('undated', 'OPEN'),
      task('dated', 'OPEN', '2026-11-04T00:00:00.000Z'),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['dated', 'undated']);
  });

  it('ranks status above due date — a due DONE task still sorts below an undated OPEN one', () => {
    const sorted = sortTasks([
      task('done-but-due', 'DONE', '2026-10-28T00:00:00.000Z'),
      task('open-undated', 'OPEN'),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['open-undated', 'done-but-due']);
  });

  it('keeps input order for same status and same due date (stable sort)', () => {
    const due = '2026-10-30T00:00:00.000Z';
    const sorted = sortTasks([task('second', 'OPEN', due), task('first', 'OPEN', due)]);
    expect(sorted.map((t) => t.id)).toEqual(['second', 'first']);
  });

  it('does not mutate its input', () => {
    const input = [task('c', 'DONE'), task('a', 'OPEN')];
    const before = input.map((t) => t.id);
    sortTasks(input);
    expect(input.map((t) => t.id)).toEqual(before);
  });
});
