/**
 * Election-COS1.0 — inline household quick-add
 * IC-ECOS-BUILD-2026-V2 §6.2. Closes a real gap: VoterForm requires
 * selecting an existing household, but there was no way to create one.
 * `dwellingType` + `informalDescriptor` + GPS is the working identifier
 * for informal settlements where formal street addressing doesn't exist
 * — see src/dal/ports/households.ts. GPS capture isn't wired here (no
 * device geolocation call in this pass); address/descriptor is enough to
 * unblock voter capture, and the household record can be enriched later.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Household, HouseholdDraft } from '@/dal/ports/households';

const DWELLING_TYPE_LABEL: Record<Household['dwellingType'], string> = {
  FORMAL: 'Formal',
  INFORMAL: 'Informal settlement',
  BACKYARD: 'Backyard dwelling',
  OTHER: 'Other',
};

interface HouseholdQuickAddProps {
  ctx: SessionContext;
  vdCode: string;
  wardCode: string;
  onCreated: (household: Household) => void;
  onCancel: () => void;
}

export function HouseholdQuickAdd({ ctx, vdCode, wardCode, onCreated, onCancel }: HouseholdQuickAddProps) {
  const queryClient = useQueryClient();
  const [dwellingType, setDwellingType] = useState<Household['dwellingType']>('FORMAL');
  const [addressLine, setAddressLine] = useState('');
  const [informalDescriptor, setInformalDescriptor] = useState('');

  const mutation = useMutation({
    mutationFn: async (draft: HouseholdDraft) => {
      await dal.households.upsert(ctx, draft);
      return draft;
    },
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ['households', ctx.tenantId, vdCode] });
      onCreated({
        ...draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: ctx.uid,
        deletedAt: null,
        schemaVersion: 1,
      });
    },
  });

  const needsDescriptor = dwellingType === 'INFORMAL' || dwellingType === 'BACKYARD';
  const canSubmit = addressLine.trim().length > 0 || (needsDescriptor && informalDescriptor.trim().length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !vdCode || !wardCode) return;
    mutation.mutate({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      vdCode,
      wardCode,
      addressLine: addressLine.trim(),
      dwellingType,
      informalDescriptor: informalDescriptor.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gold/40 bg-paper p-4 rounded">
      <h4 className="text-label-caps font-display uppercase text-ink">New household</h4>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Dwelling type</span>
        <select
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
          value={dwellingType}
          onChange={(e) => setDwellingType(e.target.value as Household['dwellingType'])}
        >
          {(Object.keys(DWELLING_TYPE_LABEL) as Household['dwellingType'][]).map((t) => (
            <option key={t} value={t}>
              {DWELLING_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">
          {dwellingType === 'FORMAL' ? 'Street address' : 'Address (if any)'}
        </span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder={dwellingType === 'FORMAL' ? '12 Oak Street' : 'Nearest street, if known'}
        />
      </label>

      {needsDescriptor && (
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">
            Informal descriptor {dwellingType === 'INFORMAL' && '(required if no address)'}
          </span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={informalDescriptor}
            onChange={(e) => setInformalDescriptor(e.target.value)}
            placeholder="e.g. 3rd shack past the standpipe, blue door"
          />
        </label>
      )}

      {mutation.isError && (
        <p className="text-body-md text-maroon">
          {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit || mutation.isPending}
          className="flex-1 bg-gold text-ink rounded py-2 text-label-caps font-display uppercase disabled:opacity-40"
        >
          {mutation.isPending ? 'Saving…' : 'Add household'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
