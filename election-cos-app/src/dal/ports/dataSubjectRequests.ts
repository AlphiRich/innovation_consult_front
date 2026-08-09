/**
 * Election-COS1.0 — POPIA data subject request port
 *
 * NEW SCOPE, added in a follow-up session — not in the original
 * 01-claude-code-build-spec-v2.md. Source: 04-legal-compliance-workstream.md
 * action LG10 ("Add data subject request workflow to Phase 3 scope") and
 * 05-project-schedule.xlsx task 3.8. POPIA Condition 8 (data subject
 * participation) requires a way for a data subject to request access to,
 * correction of, or deletion of their personal information, and for the
 * responsible party (the political party — Innovation Consult is the
 * Operator, see 04 §3) to act on it and record that they did.
 *
 * Modelled after the incident workflow's shape (fixed taxonomy, status
 * machine, capability-gated) rather than invented from scratch.
 */
import type { SessionContext, UpsertResult } from './session';

export type DataSubjectType = 'VOTER' | 'STAFF' | 'CANDIDATE' | 'DONOR';
export type DataSubjectRequestType = 'ACCESS' | 'CORRECTION' | 'DELETION';
export type DataSubjectRequestStatus = 'RECEIVED' | 'IN_PROGRESS' | 'FULFILLED' | 'REJECTED';

export interface DataSubjectRequest {
  id: string;
  tenantId: string;
  subjectType: DataSubjectType;
  subjectId?: string; // linked record, if the requester is already in the system
  requestType: DataSubjectRequestType;
  requesterName: string;
  requesterContact: string; // how they reached out — phone, email, in person
  status: DataSubjectRequestStatus;
  receivedAt: string; // ISO 8601
  handledBy?: string; // staff uid
  fulfilledAt?: string;
  rejectionReason?: string; // required if status is REJECTED
  notes?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type DataSubjectRequestDraft = Pick<
  DataSubjectRequest,
  'id' | 'tenantId' | 'subjectType' | 'subjectId' | 'requestType' | 'requesterName' | 'requesterContact'
>;

export interface DataSubjectRequestRepository {
  getById(ctx: SessionContext, id: string): Promise<DataSubjectRequest | null>;
  listOpen(ctx: SessionContext): Promise<DataSubjectRequest[]>;
  /** Logs a new request. Always status RECEIVED — never pre-fulfilled. */
  log(ctx: SessionContext, request: DataSubjectRequestDraft): Promise<UpsertResult>;
  updateStatus(
    ctx: SessionContext,
    id: string,
    status: DataSubjectRequestStatus,
    detail: { rejectionReason?: string; notes?: string },
  ): Promise<void>;
}
