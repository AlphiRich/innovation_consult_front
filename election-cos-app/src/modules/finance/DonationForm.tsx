/**
 * Election Campaign OS — record a donation (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3. This form NEVER blocks on amount
 * or threshold — dal.donations.record() has no rejection path for that,
 * and this component doesn't add one either. Capability: `ppfa.edit`.
 * Money is captured in Rand for a human to type, converted to integer
 * cents (randToCents) before it ever reaches the DAL — never a float
 * downstream of this form.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { DonationDraft } from '@/dal/ports/donations';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';
import { randToCents } from '@/lib/money';
import { deriveFinancialYear, deriveQuarter } from './financialYear';

interface DonationFormProps {
  ctx: SessionContext;
  donorId: string;
  config: PPFAConfig;
  onDone: () => void;
  onCancel: () => void;
}

export function DonationForm({ ctx, donorId, config, onDone, onCancel }: DonationFormProps) {
  const queryClient = useQueryClient();
  const [amountRand, setAmountRand] = useState('');
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [inKind, setInKind] = useState(false);
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: (draft: DonationDraft) => dal.donations.record(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations', ctx.tenantId, donorId] });
      onDone();
    },
  });

  const amountZAR = randToCents(Number(amountRand) || 0);
  const canSubmit = amountZAR > 0 && receivedAt.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const date = new Date(receivedAt);
    mutation.mutate({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      donorId,
      amountZAR,
      receivedAt: date.toISOString(),
      financialYear: deriveFinancialYear(date, config.financialYearStartMonth),
      quarter: deriveQuarter(date, config.financialYearStartMonth),
      inKind,
      description: description.trim() || undefined,
      recordedBy: ctx.uid,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">Record donation</h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Amount (ZAR)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={amountRand}
            onChange={(e) => setAmountRand(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Date received</span>
          <input
            type="date"
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={inKind} onChange={(e) => setInKind(e.target.checked)} />
        <span className="text-body-md font-body">In-kind donation (goods/services, not cash)</span>
      </label>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Description</span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
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
          {mutation.isPending ? 'Recording…' : 'Record donation'}
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
