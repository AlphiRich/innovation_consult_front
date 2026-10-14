import { describe, expect, it } from 'vitest';
import type { Task } from '@/dal/ports/tasks';
import { actionLabel, nextStatus, sortTasks, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from './taskStatus';

function task(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    tenantId: 'tenant-1',
    title: 'Test task',
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'uid-1',
    deletedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

describe('nextStatus', () => {
  it('advances OPEN to IN_PROGRESS to DONE', () => {
    expect(nextStatus('OPEN')).toBe('IN_PROGRESS');
    expect(nextStatus('IN_PROGRESS')).toBe('DONE');
  });

  it('is terminal at DONE', () => {
    expect(nextStatus('DONE')).toBeNull();
  });
});

describe('actionLabel', () => {
  it('has a button label for every non-terminal status', () => {
    expect(actionLabel('OPEN')).toBe('Start task');
    expect(actionLabel('IN_PROGRESS')).toBe('Mark done');
  });

  it('has no action once done', () => {
    expect(actionLabel('DONE')).toBeNull();
  });
});

describe('TASK_STATUS_ORDER / TASK_STATUS_LABEL', () => {
  it('has a label for every status in the order list', () => {
    for (const status of TASK_STATUS_ORDER) {
      expect(TASK_STATUS_LABEL[status]).toBeTruthy();
    }
  });
});

describe('sortTasks', () => {
  it('sorts open work ahead of in-progress ahead of done', () => {
    const tasks = [task({ id: 'a', status: 'DONE' }), task({ id: 'b', status: 'OPEN' }), task({ id: 'c', status: 'IN_PROGRESS' })];
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('within a status, sorts the soonest due date first', () => {
    const tasks = [
      task({ id: 'a', status: 'OPEN', dueAt: '2026-03-02T00:00:00.000Z' }),
      task({ id: 'b', status: 'OPEN', dueAt: '2026-03-01T00:00:00.000Z' }),
    ];
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('puts tasks with no due date after tasks that have one, within the same status', () => {
    const tasks = [
      task({ id: 'a', status: 'OPEN', dueAt: undefined }),
      task({ id: 'b', status: 'OPEN', dueAt: '2026-03-01T00:00:00.000Z' }),
    ];
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('does not mutate the input array', () => {
    const tasks = [task({ id: 'a', status: 'DONE' }), task({ id: 'b', status: 'OPEN' })];
    const original = [...tasks];
    sortTasks(tasks);
    expect(tasks).toEqual(original);
  });
});
