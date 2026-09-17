/**
 * Election Campaign OS — request campaign materials
 * IC-ECOS-BUILD-2026-V2 §6.5. Reference: Stitch's
 * `vd_captain_request_materials_modal` ("Request Campaign Materials":
 * Material Type / Quantity / Delivery Urgency / Drop-off Point). This
 * form covers the REQUEST case only (creates a status: 'REQUESTED' item,
 * quantityOnHand 0) — a separate "log existing stock" flow (status:
 * 'AVAILABLE', no requester) isn't in the reference screens and isn't
 * built here; see LogisticsPage.tsx's header for what else is deferred.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { LogisticsItemDraft, LogisticsUrgency } from '@/dal/ports/logistics';
import { URGENCY_META, URGENCY_ORDER } from './logisticsMeta';

interface LogisticsItemFormProps {
  ctx: SessionContext;
  onDone: () => void;
  onCancel: () => void;
}

export function LogisticsItemForm({ ctx, onDone, onCancel }: LogisticsItemFormProps) {
  const queryClient = useQueryClient();
  const [itemName, setItemName] = useState('');
  const [quantityRequested, setQuantityRequested] = useState('1');
  const [urgency, setUrgency] = useState<LogisticsUrgency>('ROUTINE');
  const [dropOffInstructions, setDropOffInstructions] = useState('');

  const mutation = useMutation({
    mutationFn: (draft: LogisticsItemDraft) => dal.logistics.upsert(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics', ctx.tenantId] });
      onDone();
    },
  });

  const canSubmit = itemName.trim().length > 0 && Number(quantityRequested) > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      wardCode: ctx.wardScope,
      vdCode: ctx.vdScope,
      itemName: itemName.trim(),
      quantityOnHand: 0,
      quantityRequested: Number(quantityRequested) || 0,
      urgency,
      dropOffInstructions: dropOffInstructions.trim() || undefined,
      requestedBy: ctx.uid,
      status: 'REQUESTED',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">Request materials</h3>
      <p className="text-body-md font-body text-slate">
        Requests are routed to the Municipal Logistics Hub for approval.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Material</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. A5 Flyers, Branded T-Shirts"
            required
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Quantity</span>
          <input
            type="number"
            min="1"
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={quantityRequested}
            onChange={(e) => setQuantityRequested(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Delivery urgency</span>
        <div className="grid grid-cols-3 gap-1">
          {URGENCY_ORDER.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUrgency(u)}
              aria-pressed={urgency === u}
              className={`px-2 py-2 text-label-caps font-display uppercase rounded border ${
                urgency === u ? 'bg-ink text-paper border-ink' : 'bg-white text-ink border-ink/20'
              }`}
            >
              {URGENCY_META[u].label}
            </button>
          ))}
        </div>
      </label>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Drop-off point / instructions</span>
        <textarea
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          rows={2}
          value={dropOffInstructions}
          onChange={(e) => setDropOffInstructions(e.target.value)}
          placeholder="Optional — where and how it should be delivered."
        />
      </label>

      {mutation.isError && (
        <p className="text-body-md text-maroon">
          {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit || mutation.isPending}
          className="flex-1 bg-ink text-paper rounded py-2.5 text-label-caps font-display uppercase disabled:opacity-40"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit request'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
