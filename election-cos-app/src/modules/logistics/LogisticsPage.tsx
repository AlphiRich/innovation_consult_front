/**
 * Election Campaign OS — Logistics module
 * IC-ECOS-BUILD-2026-V2 §6.5. Inventory, resupply requests, approval
 * workflow. Reference: Stitch's `vd_captain_request_materials_modal` —
 * see LogisticsItemForm.tsx and src/dal/ports/logistics.ts's headers for
 * what was adopted from it and why.
 *
 * `dal.logistics.listAll` reads the whole tenant's logistics collection
 * unfiltered (firestore.rules doesn't geo-scope logistics reads — anyone
 * with logistics.view sees every item tenant-wide, unlike voters/
 * incidents/diary). That's a real, deliberate difference from every
 * other list page in this build, not an oversight: logistics is a small,
 * bounded collection (dozens to low hundreds of items, not millions of
 * voter records), so a full read doesn't run into §7.4's cost/latency
 * concern the way scanning voters would.
 *
 * NOT built this session: dispatch/deplete status transitions beyond
 * REQUESTED → APPROVED (the DAL only has `approve()`; DISPATCHED/DEPLETED
 * have no write path yet), logging existing on-hand stock (AVAILABLE
 * items with no requester — the reference screen only shows the request
 * flow), and a UI for the `logisticsApprovals` audit trail `approve()`
 * now writes (readable via the DAL if a future session builds a view for
 * it, but there isn't one here).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { LogisticsItemForm } from './LogisticsItemForm';
import { STATUS_LABEL, URGENCY_META } from './logisticsMeta';
import { Button, Card, DataLine, PageHeader } from '@/components/ui';

export function LogisticsPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ['logistics', session?.tenantId],
    queryFn: () => dal.logistics.listAll(session!),
    enabled: Boolean(session),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => dal.logistics.approve(session!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logistics', session?.tenantId] }),
  });

  if (!session) {
    return (
      <Card className="max-w-lg">
        <PageHeader slug="/logistics" title="Logistics" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
    );
  }

  // Which row is actually being approved. `isPending` alone is the whole
  // mutation's state, so every REQUESTED row read "Approving…" at once
  // while one of them was in flight — on a page whose entire job is
  // telling a coordinator what has been approved and what has not.
  // Disabling them all stays: two approvals racing the same mutation is
  // not a thing to allow. Saying they are all in flight is.
  const approvingId = approveMutation.isPending ? approveMutation.variables : null;

  const items = [...(itemsQuery.data ?? [])].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        slug="/logistics"
        title="Logistics"
        action={
          <Button onClick={() => setShowForm(true)} className="whitespace-nowrap">
            + Request materials
          </Button>
        }
      />

      {itemsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {itemsQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {itemsQuery.error instanceof Error ? itemsQuery.error.message : 'Failed to load logistics items.'}
        </p>
      )}
      {items.length === 0 && !itemsQuery.isLoading && (
        <p className="text-body-md font-body text-slate">No requests or stock logged yet.</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-headline-md font-display text-ink">{item.itemName}</p>
                <DataLine>
                  {item.quantityRequested > 0 && `Requested: ${item.quantityRequested}`}
                  {item.quantityRequested > 0 && item.quantityOnHand > 0 && ' · '}
                  {item.quantityOnHand > 0 && `On hand: ${item.quantityOnHand}`}
                  {item.wardCode && ` · ${item.wardCode}`}
                  {item.vdCode && ` · VD ${item.vdCode}`}
                </DataLine>
              </div>
              <span
                className={`px-2 py-1 rounded border text-label-caps font-display uppercase whitespace-nowrap ${TONE_PILL_CLASSES[URGENCY_META[item.urgency].tone]}`}
              >
                {URGENCY_META[item.urgency].label}
              </span>
            </div>

            {item.dropOffInstructions && (
              <p className="text-body-md font-body text-slate">{item.dropOffInstructions}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-label-caps font-display uppercase text-ink">{STATUS_LABEL[item.status]}</span>
              {item.status === 'REQUESTED' && (
                <Button
                  variant="secondary"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(item.id)}
                >
                  {approvingId === item.id ? 'Approving…' : 'Approve'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {approveMutation.isError && (
        <p className="text-body-md font-body text-maroon">
          Approval failed — check you hold the logistics.approve capability.
        </p>
      )}

      {showForm && (
        <LogisticsItemForm ctx={session} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}
