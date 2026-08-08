/**
 * Election Campaign OS — Staff profile repository port
 * IC-ECOS-BUILD-2026-V2 §4.1, §4.3. This is where everything forbidden
 * from Firebase Auth actually lives.
 */
import type { SessionContext } from './session';
import type { StaffProfile } from '@/auth/types';

export interface StaffRepository {
  getByUid(ctx: SessionContext, uid: string): Promise<StaffProfile | null>;
  listActive(ctx: SessionContext): Promise<StaffProfile[]>;
  upsert(ctx: SessionContext, profile: StaffProfile): Promise<void>;
  deactivate(ctx: SessionContext, uid: string): Promise<void>;
}
