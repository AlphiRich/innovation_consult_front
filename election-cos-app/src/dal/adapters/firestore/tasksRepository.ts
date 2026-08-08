/**
 * Election-COS1.0 — Firestore adapter: tasks
 * IC-ECOS-BUILD-2026-V2 §4.1.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { Task, TaskDraft, TaskRepository } from '@/dal/ports/tasks';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    tenantId: data.tenantId as string,
    wardCode: data.wardCode as string | undefined,
    vdCode: data.vdCode as string | undefined,
    assignedTo: data.assignedTo as string | undefined,
    title: data.title as string,
    status: data.status as Task['status'],
    dueAt: data.dueAt as string | undefined,
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const tasksRepository: TaskRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Task | null> {
    return getByIdGeneric(ctx, 'tasks', id, fromFirestore);
  },

  async listAssignedTo(ctx: SessionContext, uid: string): Promise<Task[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'tasks')), where('assignedTo', '==', uid)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, task: TaskDraft) {
    return upsertGeneric(ctx, 'tasks', task.id, task, false);
  },
};
