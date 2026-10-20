/**
 * Election Campaign OS — Firestore adapter: Ward-Sentiment budget guardrail
 * Read-only, by design — see src/dal/ports/sentimentBudget.ts header. All
 * writes happen in functions/src/sentimentBudget.ts via the Admin SDK;
 * firestore.rules denies client writes on both collections.
 */
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type {
  SentimentBudgetConfig,
  SentimentBudgetRepository,
  SentimentUsagePeriod,
} from '@/dal/ports/sentimentBudget';
import { db, getByIdGeneric, tenantCollectionPath } from './base';

// Duplicated in functions/src/sentimentBudget.ts — the two packages don't
// share a workspace yet (same situation noted in warRoomCounters.ts).
// Keep in sync by hand.
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function usageDocId(wardCode: string, yearMonth: string): string {
  return `${wardCode}_${yearMonth}`;
}

function configFromFirestore(id: string, data: Record<string, unknown>): SentimentBudgetConfig {
  return {
    id,
    tenantId: data.tenantId as string,
    wardCode: data.wardCode as string,
    monthlyExecutionLimit: data.monthlyExecutionLimit as number,
    effectiveDate: data.effectiveDate as string,
    sourceCitation: data.sourceCitation as string,
    createdBy: data.createdBy as string,
    createdAt: data.createdAt as string,
  };
}

function usageFromFirestore(data: Record<string, unknown>): SentimentUsagePeriod {
  return {
    tenantId: data.tenantId as string,
    wardCode: data.wardCode as string,
    yearMonth: data.yearMonth as string,
    executionCount: data.executionCount as number,
    updatedAt: data.updatedAt as string,
  };
}

export const sentimentBudgetRepository: SentimentBudgetRepository = {
  async getCurrentConfig(ctx: SessionContext, wardCode: string): Promise<SentimentBudgetConfig | null> {
    const history = await this.listConfigHistory(ctx, wardCode);
    const now = new Date().toISOString();
    const current = history.filter((c) => c.effectiveDate <= now);
    return current.length > 0 ? current[0] : null;
  },

  async listConfigHistory(ctx: SessionContext, wardCode: string): Promise<SentimentBudgetConfig[]> {
    const snap = await getDocs(
      query(
        collection(db(), tenantCollectionPath(ctx.tenantId, 'sentimentBudgetConfigs')),
        where('wardCode', '==', wardCode),
        orderBy('effectiveDate', 'desc'),
      ),
    );
    return snap.docs.map((d) => configFromFirestore(d.id, d.data()));
  },

  async getCurrentUsage(ctx: SessionContext, wardCode: string): Promise<SentimentUsagePeriod | null> {
    const id = usageDocId(wardCode, currentYearMonth());
    return getByIdGeneric(ctx, 'sentimentUsage', id, (_id, data) => usageFromFirestore(data));
  },
};
