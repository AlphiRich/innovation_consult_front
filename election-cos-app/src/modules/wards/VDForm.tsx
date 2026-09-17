/**
 * Election Campaign OS — Voting District capture/edit form
 * IC-ECOS-BUILD-2026-V2 §6.1. Scoped to a single ward — vdCode is the IEC
 * code (e.g. '86910138'), captured as free text (real IEC demarcation data
 * now exists for JB Marks/NW405 — see tools/seed-data/ — but general free
 * text is kept since other municipalities aren't seeded).
 *
 * A vdCode is not unique to one ward: the real NW405 gazette schedules
 * ~19% of voting stations as split across 2+ wards, each with only its
 * own portion of registeredVoters (see votingDistricts.ts port comment).
 * This form warns, non-blockingly, when the vdCode being entered already
 * exists in another ward — that's expected for a split VD, not an error.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { VotingDistrict, VotingDistrictDraft } from '@/dal/ports/votingDistricts';

interface VDFormProps {
  ctx: SessionContext;
  wardCode: string;
  vd?: VotingDistrict;
  onDone: () => void;
  onCancel: () => void;
}

export function VDForm({ ctx, wardCode, vd, onDone, onCancel }: VDFormProps) {
  const queryClient = useQueryClient();
  const [vdCode, setVdCode] = useState(vd?.vdCode ?? '');
  const [name, setName] = useState(vd?.name ?? '');
  const [registeredVoters, setRegisteredVoters] = useState(String(vd?.registeredVoters ?? ''));
  const [debouncedVdCode, setDebouncedVdCode] = useState(vdCode);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedVdCode(vdCode.trim()), 300);
    return () => clearTimeout(t);
  }, [vdCode]);

  const otherWardsQuery = useQuery({
    queryKey: ['votingDistrict-by-vdCode', ctx.tenantId, debouncedVdCode],
    queryFn: () => dal.votingDistricts.findByVdCode(ctx, debouncedVdCode),
    enabled: debouncedVdCode.length > 0,
  });
  const otherWards = (otherWardsQuery.data ?? []).filter((existing) => existing.wardCode !== wardCode);

  const mutation = useMutation({
    mutationFn: async (draft: VotingDistrictDraft) => {
      await dal.votingDistricts.upsert(ctx, draft);
      // Ward.vdCodes is the source wardStats.totalsFor() sums for the VD
      // count — a new VD that isn't reflected there would silently make
      // that stat wrong. Keep it in sync rather than let it drift.
      const parentWard = await dal.wards.getByCode(ctx, wardCode);
      if (parentWard && !parentWard.vdCodes.includes(draft.vdCode)) {
        await dal.wards.upsert(ctx, {
          id: parentWard.id,
          tenantId: parentWard.tenantId,
          wardCode: parentWard.wardCode,
          municipalityCode: parentWard.municipalityCode,
          name: parentWard.name,
          registeredVoters: parentWard.registeredVoters,
          vdCodes: [...parentWard.vdCodes, draft.vdCode],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votingDistricts', ctx.tenantId, wardCode] });
      queryClient.invalidateQueries({ queryKey: ['wards', ctx.tenantId] });
      onDone();
    },
  });

  const canSubmit = vdCode.trim().length > 0 && name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      id: `${wardCode}::${vdCode.trim()}`,
      tenantId: ctx.tenantId,
      vdCode: vdCode.trim(),
      wardCode,
      name: name.trim(),
      registeredVoters: Number(registeredVoters) || 0,
      centroid: vd?.centroid,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">{vd ? 'Edit voting district' : 'New voting district'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">VD code (IEC)</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={vdCode}
            onChange={(e) => setVdCode(e.target.value)}
            placeholder="86910138"
            disabled={Boolean(vd)}
            required
          />
          {otherWards.length > 0 && (
            <p className="text-body-md font-body text-teal">
              Also in: {otherWards.map((o) => o.wardCode).join(', ')} — expected for a split voting station, not an
              error.
            </p>
          )}
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
      </div>
      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Name</span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pudulogo Primary"
          required
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
          {mutation.isPending ? 'Saving…' : vd ? 'Save changes' : 'Add VD'}
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
