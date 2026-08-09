/**
 * Election-COS1.0 — Firestore adapter: PPFA config
 * IC-ECOS-BUILD-2026-V2 §6.8.2. Append-only — `create` is the only write
 * path; firestore.rules additionally denies update/delete server-side.
 */
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { PPFAConfig, PPFAConfigDraft, PPFAConfigRepository } from '@/dal/ports/ppfaConfig';
import { db, tenantCollectionPath, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): PPFAConfig {
  return {
    id,
    tenantId: data.tenantId as string,
    disclosureThresholdZAR: data.disclosureThresholdZAR as number,
    annualDonorCapZAR: data.annualDonorCapZAR as number,
    warningPercentage: data.warningPercentage as number,
    aggregationRule: data.aggregationRule as PPFAConfig['aggregationRule'],
    financialYearStartMonth: data.financialYearStartMonth as number,
    effectiveDate: data.effectiveDate as string,
    sourceCitation: data.sourceCitation as string,
    createdBy: data.createdBy as string,
    createdAt: data.createdAt as string,
  };
}

export const ppfaConfigRepository: PPFAConfigRepository = {
  async getCurrent(ctx: SessionContext): Promise<PPFAConfig | null> {
    const history = await this.listHistory(ctx);
    const now = new Date().toISOString();
    const current = history.filter((c) => c.effectiveDate <= now);
    return current.length > 0 ? current[0] : null;
  },

  async listHistory(ctx: SessionContext): Promise<PPFAConfig[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'ppfaConfigs')), orderBy('effectiveDate', 'desc')),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async create(ctx: SessionContext, config: PPFAConfigDraft) {
    const id = crypto.randomUUID();
    await upsertGeneric(ctx, 'ppfaConfigs', id, config, true);
    return { id };
  },
};
