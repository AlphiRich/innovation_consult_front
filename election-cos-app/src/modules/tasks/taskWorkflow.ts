/**
 * Election Campaign OS — task status and ordering
 * IC-ECOS-BUILD-2026-V2 §4.1.
 *
 * `src/dal/ports/tasks.ts` has said "field list provisional pending real
 * screens" since it was written — `TaskRepository` and its Firestore
 * adapter were complete and tested, and nothing in `src/modules/**`
 * referenced either. The Stitch suite's
 * `volunteer_tasks_innovation_consult_edition` screen is the real screen;
 * this is the logic it needs.
 *
 * That screen lives at `docs/stitch-screens/` on
 * `claude/test-coverage-analysis-mdahdx`, not on this branch — the
 * original of this file cited that path and it was briefly recorded here
 * as a wrong reference. It is not wrong; it is on the other branch, with
 * 47 other extracted screens. Porting that directory across is item 1 in
 * §10 of docs/asset-control-sheet.md.
 *
 * Unlike incidents (`incidentWorkflow.ts`), a task transition carries no
 * dedicated capability — `firestore.rules`' `/tenants/{tid}/tasks/{taskId}`
 * match gates on `tenantOK(tid) && inScope(tid, ...)` only, the same
 * ward/VD scope every geo-scoped collection uses, not a `tasks.*`
 * capability. There is no such capability in `src/auth/types.ts`, so none
 * is invented here; scope is the real gate and it is already enforced
 * server-side. (Verified against firestore.rules lines 193-197 and
 * src/auth/types.ts on 28 Oct 2026 — the incidents block two screens up
 * carries `cap('incidents.view')`, this one deliberately does not.)
 */
import type { Task } from '@/dal/ports/tasks';

export const TASK_STATUS_ORDER: Task['status'][] = ['OPEN', 'IN_PROGRESS', 'DONE'];

export const TASK_STATUS_LABEL: Record<Task['status'], string> = {
  OPEN: 'Pending',
  IN_PROGRESS: 'In progress',
  DONE: 'Completed',
};

/** Linear and one-way. A completed task is not reopened from this screen. */
const FORWARD: Record<Task['status'], Task['status'] | null> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: null,
};

export function nextStatus(current: Task['status']): Task['status'] | null {
  return FORWARD[current];
}

/** The button label for moving a task forward one step, or null if it's done. */
export function actionLabel(current: Task['status']): string | null {
  switch (current) {
    case 'OPEN':
      return 'Start task';
    case 'IN_PROGRESS':
      return 'Mark done';
    case 'DONE':
      return null;
  }
}

/**
 * Open work first, then in-progress, then done; within a status, the
 * soonest due date first and tasks with no due date last.
 *
 * Follows `canvassQueue.ts`'s convention of sorting by what needs
 * attention soonest rather than by how the data happened to arrive — with
 * one deliberate difference: canvassQueue breaks a tie on `id`, this does
 * not. Two tasks with the same status and the same `dueAt` keep their
 * input order, which `Array.prototype.sort` guarantees (stable since
 * ES2019). That is fine for rendering a list and is pinned by a test, but
 * it means the order of same-status same-due tasks is the order the
 * repository returned them in, not an intrinsic property of the data.
 */
export function sortTasks(tasks: Task[]): Task[] {
  const rank = (s: Task['status']) => TASK_STATUS_ORDER.indexOf(s);
  return [...tasks].sort((a, b) => {
    const statusDiff = rank(a.status) - rank(b.status);
    if (statusDiff !== 0) return statusDiff;
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });
}
