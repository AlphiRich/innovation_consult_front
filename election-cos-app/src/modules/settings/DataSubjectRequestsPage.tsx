/**
 * Election-COS1.0 — Data Subject Requests (POPIA Condition 8)
 * IC-ECOS-BUILD-2026-V2 — new scope, see src/dal/ports/dataSubjectRequests.ts.
 * Capability: `dsr.view` (read) / `dsr.manage` (log/update).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type {
  DataSubjectRequestDraft,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  DataSubjectType,
} from '@/dal/ports/dataSubjectRequests';
import { isOverdue, RESPONSE_TARGET_DAYS } from './dataSubjectRequestSla';

const SUBJECT_TYPE_LABEL: Record<DataSubjectType, string> = {
  VOTER: 'Voter',
  STAFF: 'Staff',
  CANDIDATE: 'Candidate',
  DONOR: 'Donor',
};

const REQUEST_TYPE_LABEL: Record<DataSubjectRequestType, string> = {
  ACCESS: 'Access',
  CORRECTION: 'Correction',
  DELETION: 'Deletion',
};

export function DataSubjectRequestsPage() {
  const session = useSession();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [subjectType, setSubjectType] = useState<DataSubjectType>('VOTER');
  const [requestType, setRequestType] = useState<DataSubjectRequestType>('ACCESS');
  const [requesterName, setRequesterName] = useState('');
  const [requesterContact, setRequesterContact] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const requestsQuery = useQuery({
    queryKey: ['dataSubjectRequests', session?.tenantId],
    queryFn: () => dal.dataSubjectRequests.listOpen(session!),
    enabled: Boolean(session),
  });

  const logMutation = useMutation({
    mutationFn: (draft: DataSubjectRequestDraft) => dal.dataSubjectRequests.log(session!, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSubjectRequests', session?.tenantId] });
      setShowForm(false);
      setRequesterName('');
      setRequesterContact('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      detail,
    }: {
      id: string;
      status: DataSubjectRequestStatus;
      detail: { rejectionReason?: string; notes?: string };
    }) => dal.dataSubjectRequests.updateStatus(session!, id, status, detail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSubjectRequests', session?.tenantId] });
      setRejectingId(null);
      setRejectionReason('');
    },
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/settings/data-requests</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Data Subject Requests</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const requests = requestsQuery.data ?? [];
  const canSubmit = requesterName.trim().length > 0 && requesterContact.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    logMutation.mutate({
      id: crypto.randomUUID(),
      tenantId: session!.tenantId,
      subjectType,
      requestType,
      requesterName: requesterName.trim(),
      requesterContact: requesterContact.trim(),
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/settings/data-requests</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Data Subject Requests</h1>
          <p className="text-body-md font-body text-slate mt-1">
            POPIA Condition 8. Overdue means past a working {RESPONSE_TARGET_DAYS}-day target — see this page's
            data helper for why that figure isn't a confirmed legal deadline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
        >
          + Log request
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-white p-4 rounded">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Subject type</span>
              <select
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as DataSubjectType)}
              >
                {(Object.keys(SUBJECT_TYPE_LABEL) as DataSubjectType[]).map((t) => (
                  <option key={t} value={t}>
                    {SUBJECT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Request type</span>
              <select
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as DataSubjectRequestType)}
              >
                {(Object.keys(REQUEST_TYPE_LABEL) as DataSubjectRequestType[]).map((t) => (
                  <option key={t} value={t}>
                    {REQUEST_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Requester name</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              required
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">How they reached out</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={requesterContact}
              onChange={(e) => setRequesterContact(e.target.value)}
              placeholder="Phone, email, or in-person"
              required
            />
          </label>

          {logMutation.isError && <p className="text-body-md text-maroon">Save failed.</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSubmit || logMutation.isPending}
              className="flex-1 bg-ink text-paper rounded py-2.5 text-label-caps font-display uppercase disabled:opacity-40"
            >
              {logMutation.isPending ? 'Logging…' : 'Log request'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {requestsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {requests.length === 0 && !requestsQuery.isLoading && (
        <p className="text-body-md font-body text-slate">No open requests.</p>
      )}

      <div className="space-y-3">
        {requests.map((req) => {
          const overdue = isOverdue(req.receivedAt, req.status);
          return (
            <div key={req.id} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-md font-body text-ink font-semibold">
                    {REQUEST_TYPE_LABEL[req.requestType]} — {SUBJECT_TYPE_LABEL[req.subjectType]}
                  </p>
                  <p className="text-data-mono font-mono text-slate">
                    {req.requesterName} · {req.requesterContact} · received{' '}
                    {new Date(req.receivedAt).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                {overdue && (
                  <span className="px-2 py-1 rounded bg-maroon/10 text-maroon text-label-caps font-display uppercase">
                    Overdue
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {req.status === 'RECEIVED' && (
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ id: req.id, status: 'IN_PROGRESS', detail: {} })}
                    className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase"
                  >
                    Start
                  </button>
                )}
                {req.status !== 'FULFILLED' && (
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ id: req.id, status: 'FULFILLED', detail: {} })}
                    className="px-3 py-1.5 bg-green text-white rounded text-label-caps font-display uppercase"
                  >
                    Mark fulfilled
                  </button>
                )}
                {rejectingId === req.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="border border-ink/20 rounded px-2 py-1 text-body-md font-body"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason"
                    />
                    <button
                      type="button"
                      disabled={!rejectionReason.trim()}
                      onClick={() =>
                        statusMutation.mutate({ id: req.id, status: 'REJECTED', detail: { rejectionReason: rejectionReason.trim() } })
                      }
                      className="px-3 py-1.5 bg-maroon text-white rounded text-label-caps font-display uppercase disabled:opacity-40"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRejectingId(req.id)}
                    className="px-3 py-1.5 border border-maroon/40 rounded text-label-caps font-display uppercase text-maroon"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
