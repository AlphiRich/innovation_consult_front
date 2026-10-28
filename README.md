// src/offline/db.ts — additive diffs (no version bump: indexes unchanged)
export type OutboxStatus = 'PENDING' | 'IN_FLIGHT' | 'APPLIED' | 'CONFLICT' | 'REJECTED' | 'DISCARDED';
// OutboxMutation +=
discardedAt?: string;
discardedBy?: string;
// LocalEntity +=
localRejected?: string;   // last terminal rejection code for this local record
// ConflictRecord +=
resolvedAt?: string;
resolvedBy?: string;