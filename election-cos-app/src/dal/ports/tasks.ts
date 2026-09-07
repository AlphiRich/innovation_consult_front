/**
 * Election Campaign OS — Task repository port
 * IC-ECOS-BUILD-2026-V2 §4.1. Field list provisional pending real screens.
 */
import type { SessionContext, UpsertResult } from './session';

export interface Task {
  id: string;
  tenantId: string;
  wardCode?: string;
  vdCode?: string;
  assignedTo?: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type TaskDraft = Omit<Task, 'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'>;

export interface TaskRepository {
  getById(ctx: SessionContext, id: string): Promise<Task | null>;
  listAssignedTo(ctx: SessionContext, uid: string): Promise<Task[]>;
  upsert(ctx: SessionContext, task: TaskDraft): Promise<UpsertResult>;
}
