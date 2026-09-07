/**
 * Election Campaign OS — Ward capture/edit form
 * IC-ECOS-BUILD-2026-V2 §6.1. Real IEC demarcation data now exists for JB
 * Marks/NW405 (session 8 — see tools/seed-data/ and docs/nw405-seed-data.md)
 * but nothing has been loaded into a live tenant yet (no live Firebase
 * project — BUILD-STATUS.md blocker #2), and other municipalities still
 * have no source data at all. This manual form remains the practical
 * fallback for both cases.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Ward, WardDraft } from '@/dal/ports/wards';

interface WardFormProps {
  ctx: SessionContext;
  ward?: Ward;
  defaultMunicipalityCode: string;
  onDone: () => void;
  onCancel: () => void;
}

export function WardForm({ ctx, ward, defaultMunicipalityCode, onDone, onCancel }: WardFormProps) {
  const queryClient = useQueryClient();
  const [wardCode, setWardCode] = useState(ward?.wardCode ?? '');
  const [name, setName] = useState(ward?.name ?? '');
  const [municipalityCode, setMunicipalityCode] = useState(ward?.municipalityCode ?? defaultMunicipalityCode);
  const [registeredVoters, setRegisteredVoters] = useState(String(ward?.registeredVoters ?? ''));

  const mutation = useMutation({
    mutationFn: (draft: WardDraft) => dal.wards.upsert(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards', ctx.tenantId] });
      onDone();
    },
  });

  const canSubmit = wardCode.trim().length > 0 && name.trim().length > 0 && municipalityCode.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      id: wardCode.trim(),
      tenantId: ctx.tenantId,
      wardCode: wardCode.trim(),
      municipalityCode: municipalityCode.trim(),
      name: name.trim(),
      registeredVoters: Number(registeredVoters) || 0,
      vdCodes: ward?.vdCodes ?? [],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">{ward ? 'Edit ward' : 'New ward'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Ward code</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={wardCode}
            onChange={(e) => setWardCode(e.target.value)}
            placeholder="NW405-W12"
            disabled={Boolean(ward)}
            required
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Municipality code</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={municipalityCode}
            onChange={(e) => setMunicipalityCode(e.target.value)}
            placeholder="NW405"
            required
          />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Name</span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ward 12"
          required
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Registered voters</span>
        <input
          type="number"
          min="0"
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={registeredVoters}
          onChange={(e) => setRegisteredVoters(e.target.value)}
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
          {mutation.isPending ? 'Saving…' : ward ? 'Save changes' : 'Add ward'}
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
