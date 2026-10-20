/**
 * Election Campaign OS — Ward-Sentiment Intelligence budget guardrail port
 * Companion to the `ward-sentiment` module declared in `src/auth/modules.ts`
 * ("Not built here yet — the entitlement exists ahead of the surface").
 * This is the metering half of that module: a per-ward monthly cap on
 * successful NLP/social-API refreshes, so the module's external vendor
 * cost can never run away regardless of how a campaign uses it.
 *
 * NO PRICE, RATE OR AMOUNT LIVES HERE — same rule as `src/auth/modules.ts`
 * and `src/dal/ports/entitlements.ts`, for the same reason: a Rand figure
 * on or near a tenant record is the appearance of differential terms
 * between competing parties, whatever the number says. The commercial
 * material behind this module prices a refresh in Rand; that pricing
 * never crosses into this port. `monthlyExecutionLimit` is a plain count
 * of successful refreshes, set by the platform as an internal
 * cost-containment safeguard against its own NLP/social-API vendor bill —
 * not a customer-facing entitlement, which is exactly why it is
 * server-provisioned only (see SentimentBudgetRepository below) rather
 * than client-settable like `PPFAConfig`: a tenant that could raise its
 * own cap would defeat the guardrail it exists to be.
 *
 * Writes happen only in functions/src/sentimentBudget.ts (Admin SDK,
 * inside a transaction, to close the race window between two concurrent
 * refresh requests reading the same under-limit count). This port is
 * read-only by design; firestore.rules denies client writes on both
 * collections outright.
 */
import type { SessionContext } from './session';

export interface SentimentBudgetConfig {
  id: string;
  tenantId: string;
  wardCode: string;
  /** Successful refreshes allowed per calendar month. A count, never a Rand figure. */
  monthlyExecutionLimit: number;
  effectiveDate: string;
  /** Free-text provenance for *why this cap*, e.g. an internal ops decision reference — never a price list. */
  sourceCitation: string;
  createdBy: string;
  createdAt: string;
}

export interface SentimentUsagePeriod {
  tenantId: string;
  wardCode: string;
  /** 'YYYY-MM', UTC calendar month. */
  yearMonth: string;
  /** Successful refreshes reserved so far this month. Never decremented except by a refunded (FAILED/RATE_LIMITED) outcome. */
  executionCount: number;
  updatedAt: string;
}

export interface SentimentBudgetRepository {
  /** The config whose effectiveDate is the most recent one not in the future, or null if the ward has none provisioned yet. */
  getCurrentConfig(ctx: SessionContext, wardCode: string): Promise<SentimentBudgetConfig | null>;
  listConfigHistory(ctx: SessionContext, wardCode: string): Promise<SentimentBudgetConfig[]>;
  /** Usage for the current UTC calendar month, or null if no refresh has been reserved yet this month. */
  getCurrentUsage(ctx: SessionContext, wardCode: string): Promise<SentimentUsagePeriod | null>;
}
