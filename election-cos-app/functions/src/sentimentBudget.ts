/**
 * Election Campaign OS — Ward-Sentiment Intelligence budget guardrail
 * Companion to the `ward-sentiment` module in `src/auth/modules.ts`.
 *
 * MODEL NOTE — meters executions, never Rand. `src/auth/modules.ts` is
 * explicit that no price, rate or amount may live on or near a tenant
 * record; `entitlements.test.ts` enforces that for entitlements, and the
 * same reasoning applies here. A monthly execution cap is the platform's
 * own cost-containment safeguard against this module's external
 * NLP/social-API vendor bill — not a customer-facing price — so it is
 * stored and reasoned about purely as `monthlyExecutionLimit: number`.
 * Any Rand figure for this module belongs on a pricing sheet, never here.
 *
 * TWO-PHASE RESERVE/REFUND, so a transient worker failure never counts
 * against a campaign's budget. `reserveSentimentRefresh` increments
 * optimistically inside a Firestore transaction — closing the race window
 * between two concurrent refresh requests both reading the same
 * under-limit count — before the caller spends the external vendor call.
 * `reportSentimentRefreshOutcome` refunds that reservation if the
 * downstream call FAILED or was RATE_LIMITED, the direct analogue of "a
 * worker failure is billed at R0.00" one layer down, where there is no
 * billing event to begin with, only a count that should not have been
 * spent.
 *
 * Config (`sentimentBudgetConfigs`) is provisioned server-side only, by
 * the same reasoning `src/dal/ports/entitlements.ts` gives for why
 * entitlements aren't client-writable: a tenant that could raise its own
 * cap would defeat the guardrail it exists to be. There is deliberately
 * no callable here for creating or editing a config — that is an
 * operations/Admin-SDK action, not a product surface.
 *
 * NOTE: not yet deployed/wired to a live Firebase project this session,
 * same as warRoomCounters.ts — see BUILD-STATUS.md blocker #2. The pure
 * decision function is unit tested (sentimentBudget.test.ts); the
 * transaction and callable wiring need the Firestore emulator to verify
 * end-to-end, which this sandbox doesn't have.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { REGION } from './region';

if (!getApps().length) initializeApp();

export type RefreshOutcome = 'SUCCEEDED' | 'FAILED' | 'RATE_LIMITED';

interface UsageSnapshot {
  executionCount: number;
}

interface ReservationDecision {
  allowed: boolean;
  nextCount: number;
}

/**
 * Exported for testing. The entire guardrail is this one comparison:
 * reserve the next execution if, and only if, the month isn't full yet.
 */
export function decideReservation(
  usage: UsageSnapshot | undefined,
  monthlyExecutionLimit: number,
): ReservationDecision {
  const current = usage?.executionCount ?? 0;
  if (current >= monthlyExecutionLimit) {
    return { allowed: false, nextCount: current };
  }
  return { allowed: true, nextCount: current + 1 };
}

// Duplicated in src/dal/adapters/firestore/sentimentBudgetRepository.ts —
// the two packages don't share a workspace yet (same situation noted in
// warRoomCounters.ts). Keep in sync by hand.
export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function usageDocId(wardCode: string, yearMonth: string): string {
  return `${wardCode}_${yearMonth}`;
}

interface AuthToken {
  tenantId: string;
  geoScope?: string;
  wardScope?: string;
}

function requireAuth(request: { auth?: { token?: Record<string, unknown> } }): AuthToken {
  const token = request.auth?.token;
  if (!request.auth || !token?.tenantId) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  return token as unknown as AuthToken;
}

/** Mirrors firestore.rules inScope() for the one geoScope this module cares about: WARD. */
function requireWardAccess(token: AuthToken, wardCode: string): void {
  if (token.geoScope === 'WARD' && token.wardScope !== wardCode) {
    throw new HttpsError('permission-denied', 'Not in scope for this ward.');
  }
  if (token.geoScope === 'VD') {
    throw new HttpsError(
      'permission-denied',
      'Ward-Sentiment is ward-scoped; a VD-scoped caller has no ward of its own to meter.',
    );
  }
}

interface ReserveRequest {
  wardCode: string;
}
interface ReserveResponse {
  allowed: boolean;
  remaining: number;
  yearMonth: string;
}

export const reserveSentimentRefresh = onCall<ReserveRequest>(
  { region: REGION },
  async (request): Promise<ReserveResponse> => {
    const token = requireAuth(request);
    const { wardCode } = request.data;
    if (!wardCode) throw new HttpsError('invalid-argument', 'wardCode is required.');
    requireWardAccess(token, wardCode);

    const tenantId = token.tenantId;
    const yearMonth = currentYearMonth();
    const db = getFirestore();
    const configQuery = db
      .collection(`tenants/${tenantId}/sentimentBudgetConfigs`)
      .where('wardCode', '==', wardCode)
      .orderBy('effectiveDate', 'desc')
      .limit(1);
    const usageRef = db.doc(`tenants/${tenantId}/sentimentUsage/${usageDocId(wardCode, yearMonth)}`);

    return db.runTransaction(async (tx: Transaction) => {
      const configSnap = await tx.get(configQuery);
      if (configSnap.empty) {
        throw new HttpsError(
          'failed-precondition',
          `No sentimentBudgetConfigs record for ward ${wardCode} — provision one before the first refresh.`,
        );
      }
      const monthlyExecutionLimit = configSnap.docs[0].data().monthlyExecutionLimit as number;

      const usageSnap = await tx.get(usageRef);
      const decision = decideReservation(
        usageSnap.exists ? (usageSnap.data() as UsageSnapshot) : undefined,
        monthlyExecutionLimit,
      );

      if (decision.allowed) {
        tx.set(
          usageRef,
          {
            tenantId,
            wardCode,
            yearMonth,
            executionCount: decision.nextCount,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      return {
        allowed: decision.allowed,
        remaining: Math.max(0, monthlyExecutionLimit - decision.nextCount),
        yearMonth,
      };
    });
  },
);

interface ReportOutcomeRequest {
  wardCode: string;
  yearMonth: string;
  outcome: RefreshOutcome;
}
interface ReportOutcomeResponse {
  refunded: boolean;
}

export const reportSentimentRefreshOutcome = onCall<ReportOutcomeRequest>(
  { region: REGION },
  async (request): Promise<ReportOutcomeResponse> => {
    const token = requireAuth(request);
    const { wardCode, yearMonth, outcome } = request.data;
    if (!wardCode || !yearMonth || !outcome) {
      throw new HttpsError('invalid-argument', 'wardCode, yearMonth and outcome are required.');
    }
    requireWardAccess(token, wardCode);

    // Only a failed/rate-limited call refunds the reservation — a
    // SUCCEEDED outcome was already counted at reserve time and needs no
    // further write.
    if (outcome === 'SUCCEEDED') {
      return { refunded: false };
    }

    const tenantId = token.tenantId;
    const usageRef = getFirestore().doc(`tenants/${tenantId}/sentimentUsage/${usageDocId(wardCode, yearMonth)}`);
    await usageRef.set(
      { executionCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { refunded: true };
  },
);
