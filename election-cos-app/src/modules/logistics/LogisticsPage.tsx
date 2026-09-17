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
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/logistics</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Logistics</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const items = [...(itemsQuery.data ?? [])].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/logistics</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Logistics</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
        >
          + Request materials
        </button>
      </div>

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
          <div key={item.id} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-headline-md font-display text-ink">{item.itemName}</p>
                <p className="text-data-mono font-mono text-slate">
                  {item.quantityRequested > 0 && `Requested: ${item.quantityRequested}`}
                  {item.quantityRequested > 0 && item.quantityOnHand > 0 && ' · '}
                  {item.quantityOnHand > 0 && `On hand: ${item.quantityOnHand}`}
                  {item.wardCode && ` · ${item.wardCode}`}
                  {item.vdCode && ` · VD ${item.vdCode}`}
                </p>
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
                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(item.id)}
                  className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
                >
                  {approveMutation.isPending ? 'Approving…' : 'Approve'}
                </button>
              )}
            </div>
          </div>
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
