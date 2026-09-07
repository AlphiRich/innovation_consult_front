/**
 * Election Campaign OS — log an incident
 * IC-ECOS-BUILD-2026-V2 §6.4. Fixed taxonomy: category and severity are
 * both selects over the enum, never free text (mirrors firestore.rules'
 * own category allow-list). Photos are Cloud Storage paths, never Base64
 * in the document — no live Storage project exists yet (BUILD-STATUS.md
 * blocker #2), so there's no real uploader here; this form only records a
 * path if one is already known (e.g. a future device-camera flow that
 * uploads first and hands back a path), same disclosed-gap treatment as
 * VoterForm.tsx's phone encryption.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { IncidentCategory, IncidentDraft, IncidentSeverity } from '@/dal/ports/incidents';
import { useVdWard } from '@/lib/useVdWard';
import { CATEGORY_LABEL, SEVERITY_META, SEVERITY_ORDER } from './incidentMeta';

interface IncidentFormProps {
  ctx: SessionContext;
  onDone: () => void;
  onCancel: () => void;
}

export function IncidentForm({ ctx, onDone, onCancel }: IncidentFormProps) {
  const queryClient = useQueryClient();
  const vdCode = ctx.vdScope ?? '';

  // Same split-VD handling as VoterForm/HouseholdQuickAdd — an incident's
  // wardCode drives geoScopeConstraints() for Ward Lead visibility
  // (firestore.rules inScope()), so it has to be the right ward, not a
  // guess. See src/lib/useVdWard.ts.
  const { wardOptions, resolved: resolvedVotingDistrict, isLoading: wardLoading, setSelectedWardCode } = useVdWard(
    ctx,
    vdCode,
  );

  const [category, setCategory] = useState<IncidentCategory>('WATER_SANITATION');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: (draft: IncidentDraft) => dal.incidents.create(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', ctx.tenantId] });
      onDone();
    },
  });

  const canSubmit = description.trim().length > 0 && Boolean(resolvedVotingDistrict) && vdCode.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !resolvedVotingDistrict) return;
    mutation.mutate({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      vdCode,
      wardCode: resolvedVotingDistrict.wardCode,
      category,
      severity,
      description: description.trim(),
      photoPaths: [],
      reportedBy: ctx.uid,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">Log incident</h3>

      {!vdCode && (
        <p className="text-body-md font-body text-maroon">
          No VD in your session scope yet — incident logging needs a live session. See BUILD-STATUS.md.
        </p>
      )}

      {vdCode && wardOptions.length > 1 && !resolvedVotingDistrict && (
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">
            VD {vdCode} is split across wards — which one is this?
          </span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value=""
            onChange={(e) => setSelectedWardCode(e.target.value)}
          >
            <option value="" disabled>
              Select a ward
            </option>
            {wardOptions.map((o) => (
              <option key={o.wardCode} value={o.wardCode}>
                {o.wardCode}
              </option>
            ))}
          </select>
        </label>
      )}

      {vdCode && wardOptions.length <= 1 && !resolvedVotingDistrict && (
        <p className="text-body-md font-body text-maroon">
          {wardLoading ? 'Looking up ward for this VD…' : `VD ${vdCode} isn't seeded yet — can't log an incident safely.`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Category</span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value as IncidentCategory)}
          >
            {(Object.keys(CATEGORY_LABEL) as IncidentCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Severity</span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
          >
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Description</span>
        <textarea
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's happening, where, and since when — as reported."
          required
        />
      </label>

      <p className="text-body-md font-body text-slate">
        Photos aren't attached here yet — no live Storage project exists (BUILD-STATUS.md). Log the incident now;
        photos can be added once a live project supports uploads.
      </p>

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
          {mutation.isPending ? 'Saving…' : 'Log incident'}
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
