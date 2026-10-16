/**
 * Election Campaign OS — Data Subject Requests (POPIA Condition 8)
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
import { isOverdue, RESPONSE_TARGET_BASIS } from './dataSubjectRequestSla';
import { SubjectAccessModal } from './SubjectAccessModal';
import {
  blocksFulfilment,
  DONOR_ERASURE_REFUSAL_REASON,
  ERASURE_CAPABILITY_BASIS,
  erasurePosition,
} from './dataSubjectErasure';
import { BasisNote, Button, Card, DataLine, Field, PageHeader, Pill } from '@/components/ui';

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
  const [preparingId, setPreparingId] = useState<string | null>(null);

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
      <Card className="max-w-lg">
        <PageHeader slug="/settings/data-requests" title="Data Subject Requests" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
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
      <PageHeader
        slug="/settings/data-requests"
        title="Data Subject Requests"
        description={`POPIA Condition 8. ${RESPONSE_TARGET_BASIS}`}
        action={
          <Button onClick={() => setShowForm(true)} className="whitespace-nowrap">
            + Log request
          </Button>
        }
      />
      <BasisNote>{ERASURE_CAPABILITY_BASIS}</BasisNote>

      {showForm && (
        <form onSubmit={handleSubmit}>
          {/* Four bare <label> wrappers before this, none associated —
              on the form that records a POPIA request. */}
          <Card tone="accent" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject type">
                {(props) => (
                  <select
                    {...props}
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value as DataSubjectType)}
                  >
                    {(Object.keys(SUBJECT_TYPE_LABEL) as DataSubjectType[]).map((t) => (
                      <option key={t} value={t}>
                        {SUBJECT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Request type">
                {(props) => (
                  <select
                    {...props}
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as DataSubjectRequestType)}
                  >
                    {(Object.keys(REQUEST_TYPE_LABEL) as DataSubjectRequestType[]).map((t) => (
                      <option key={t} value={t}>
                        {REQUEST_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>

            <Field label="Requester name" required>
              {(props) => (
                <input
                  {...props}
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="How they reached out" required hint="Phone, email, or in person.">
              {(props) => (
                <input
                  {...props}
                  value={requesterContact}
                  onChange={(e) => setRequesterContact(e.target.value)}
                  required
                />
              )}
            </Field>

            {logMutation.isError && <p className="text-body-md font-body text-maroon">Save failed.</p>}

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="secondary"
                disabled={!canSubmit || logMutation.isPending}
                className="flex-1"
              >
                {logMutation.isPending ? 'Logging…' : 'Log request'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </form>
      )}

      {requestsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {requests.length === 0 && !requestsQuery.isLoading && (
        <p className="text-body-md font-body text-slate">No open requests.</p>
      )}

      <div className="space-y-3">
        {requests.map((req) => {
          const overdue = isOverdue(req.receivedAt, req.status);
          // A DELETION cannot be honestly fulfilled by this system for any
          // subject type — see dataSubjectErasure.ts. The request, the log
          // and the Compliance Officer's ability to action it all stay;
          // what is withheld is the button that would write a false
          // outcome into the compliance record.
          const fulfilBlocked = blocksFulfilment(req.subjectType, req.requestType);
          const erasure = req.requestType === 'DELETION' ? erasurePosition(req.subjectType) : null;
          return (
            <Card key={req.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-md font-body text-ink font-semibold">
                    {REQUEST_TYPE_LABEL[req.requestType]} — {SUBJECT_TYPE_LABEL[req.subjectType]}
                  </p>
                  <DataLine>
                    {req.requesterName} · {req.requesterContact} · received{' '}
                    {new Date(req.receivedAt).toLocaleDateString('en-ZA')}
                  </DataLine>
                </div>
                {overdue && <Pill className="bg-maroon/10 text-maroon">Overdue</Pill>}
              </div>

              {erasure && (
                <p className="text-body-md font-body text-maroon border-l-2 border-maroon/40 pl-3">
                  {erasure.basis}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {/*
                 * Every control below says which request it acts on in its
                 * accessible name. A list of open requests otherwise
                 * presents as a run of identical "Start", "Mark
                 * fulfilled" and "Reject" buttons, which is the worst
                 * possible ambiguity on a screen where the actions write
                 * a compliance record.
                 */}
                {req.requestType === 'ACCESS' && (
                  /* Hand-rolled: a gold outline, where Button's ghost
                     variant is ink. Passing border-gold through className
                     would race ghost's own border-ink/20 in the same
                     Tailwind group — stylesheet order decides, not the
                     class attribute. */
                  <button
                    type="button"
                    onClick={() => setPreparingId(req.id)}
                    aria-label={`Prepare response for ${req.requesterName}`}
                    className="inline-flex min-h-11 items-center rounded border border-gold px-3 py-1.5 text-label-caps font-display uppercase text-ink"
                  >
                    Prepare response
                  </button>
                )}
                {req.status === 'RECEIVED' && (
                  <Button
                    variant="secondary"
                    onClick={() => statusMutation.mutate({ id: req.id, status: 'IN_PROGRESS', detail: {} })}
                    aria-label={`Start work on ${req.requesterName}'s request`}
                  >
                    Start
                  </Button>
                )}
                {req.status !== 'FULFILLED' && !fulfilBlocked && (
                  /* Hand-rolled: green is an outcome colour Button has no
                     variant for, and adding one here would decide what
                     "confirm success" looks like product-wide. */
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ id: req.id, status: 'FULFILLED', detail: {} })}
                    aria-label={`Mark ${req.requesterName}'s request fulfilled`}
                    className="inline-flex min-h-11 items-center rounded bg-green px-3 py-1.5 text-label-caps font-display uppercase text-white"
                  >
                    Mark fulfilled
                  </button>
                )}
                {rejectingId === req.id ? (
                  <div className="flex flex-wrap items-end gap-2">
                    {/* Was placeholder-only: a placeholder is not a label,
                        it vanishes on the first keystroke, and this field
                        is the written reason a refusal is recorded on. */}
                    <Field label="Reason for refusal">
                      {(props) => (
                        <input
                          {...props}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                      )}
                    </Field>
                    <Button
                      variant="danger"
                      disabled={!rejectionReason.trim()}
                      onClick={() =>
                        statusMutation.mutate({ id: req.id, status: 'REJECTED', detail: { rejectionReason: rejectionReason.trim() } })
                      }
                      aria-label={`Confirm refusal of ${req.requesterName}'s request`}
                    >
                      Confirm
                    </Button>
                  </div>
                ) : (
                  /* Hand-rolled, same reason: a maroon outline and maroon
                     text, both of which would race ghost's ink. */
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(req.id);
                      // Offered, not applied — the operator can edit or clear
                      // it. A reason that writes itself is how a template ends
                      // up asserting something nobody checked.
                      setRejectionReason(
                        erasure?.disposition === 'RESTRICTED_BY_LAW' ? DONOR_ERASURE_REFUSAL_REASON : '',
                      );
                    }}
                    aria-label={`Reject ${req.requesterName}'s request`}
                    className="inline-flex min-h-11 items-center rounded border border-maroon/40 px-3 py-1.5 text-label-caps font-display uppercase text-maroon"
                  >
                    {erasure?.disposition === 'RESTRICTED_BY_LAW' ? 'Refuse — retention required' : 'Reject'}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {preparingId &&
        (() => {
          const req = requests.find((r) => r.id === preparingId);
          if (!req) return null;
          return <SubjectAccessModal ctx={session} request={req} onClose={() => setPreparingId(null)} />;
        })()}
    </div>
  );
}
