/**
 * Election-COS1.0 — Firestore adapter: staff profiles
 * IC-ECOS-BUILD-2026-V2 §4.1, §4.3. The full-fidelity identity record that
 * Firebase Auth is deliberately NOT allowed to hold.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { StaffRepository } from '@/dal/ports/staff';
import type { StaffProfile } from '@/auth/types';
import { db, tenantCollectionPath, upsertGeneric } from './base';
import { doc, getDoc } from 'firebase/firestore';

function fromFirestore(uid: string, data: Record<string, unknown>): StaffProfile {
  return {
    uid,
    tenantId: data.tenantId as string,
    firstName: data.firstName as string,
    lastName: data.lastName as string,
    phone: data.phone as string,
    roleId: data.roleId as string,
    wardScope: data.wardScope as string | undefined,
    vdScope: data.vdScope as string | undefined,
    capOverrides: (data.capOverrides as StaffProfile['capOverrides']) ?? { granted: [], revoked: [] },
    active: Boolean(data.active),
  };
}

export const staffRepository: StaffRepository = {
  async getByUid(ctx: SessionContext, uid: string): Promise<StaffProfile | null> {
    const ref = doc(db(), tenantCollectionPath(ctx.tenantId, 'staff'), uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  },

  async listActive(ctx: SessionContext): Promise<StaffProfile[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'staff')), where('active', '==', true)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, profile: StaffProfile): Promise<void> {
    await upsertGeneric(ctx, 'staff', profile.uid, profile, false);
  },

  async deactivate(ctx: SessionContext, uid: string): Promise<void> {
    await upsertGeneric(ctx, 'staff', uid, { active: false }, false);
  },
};
