/**
 * Election-COS1.0 — log a field diary entry
 * IC-ECOS-BUILD-2026-V2 §6.3. See src/dal/ports/diary.ts for the
 * CANVASS-vs-RALLY/OBSERVATION/OTHER split and why both exist.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { DiaryActivityType, DiaryEntryDraft } from '@/dal/ports/diary';
import { useVdWard } from '@/lib/useVdWard';
import { ACTIVITY_META, ACTIVITY_ORDER } from './diaryMeta';

interface DiaryEntryFormProps {
  ctx: SessionContext;
  onDone: () => void;
  onCancel: () => void;
}

function toLocalDatetimeInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function DiaryEntryForm({ ctx, onDone, onCancel }: DiaryEntryFormProps) {
  const queryClient = useQueryClient();
  const vdCode = ctx.vdScope ?? '';

  // Same split-VD handling as VoterForm/IncidentForm — see src/lib/useVdWard.ts.
  const { wardOptions, resolved: resolvedVotingDistrict, isLoading: wardLoading, setSelectedWardCode } = useVdWard(
    ctx,
    vdCode,
  );

  const [activityType, setActivityType] = useState<DiaryActivityType>('CANVASS');
  const [title, setTitle] = useState('');
  const [streetName, setStreetName] = useState('');
  const [householdsVisited, setHouseholdsVisited] = useState('0');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => toLocalDatetimeInputValue(new Date()));

  const isCanvass = activityType === 'CANVASS';

  const mutation = useMutation({
    mutationFn: (draft: DiaryEntryDraft) => dal.diary.upsert(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaryEntries', ctx.tenantId] });
      onDone();
    },
  });

  const canSubmit =
    Boolean(resolvedVotingDistrict) &&
    streetName.trim().length > 0 &&
    (isCanvass || title.trim().length > 0); // RALLY/OBSERVATION/OTHER need a headline; CANVASS doesn't.

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !resolvedVotingDistrict) return;
    mutation.mutate({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      vdCode,
      wardCode: resolvedVotingDistrict.wardCode,
      staffUid: ctx.uid,
      activityType,
      title: title.trim() || undefined,
      streetName: streetName.trim(),
      householdsVisited: isCanvass ? Number(householdsVisited) || 0 : 0,
      notes: notes.trim() || undefined,
      occurredAt: new Date(occurredAt).toISOString(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">New diary entry</h3>

      {!vdCode && (
        <p className="text-body-md font-body text-maroon">
          No VD in your session scope yet — diary logging needs a live session. See BUILD-STATUS.md.
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
          {wardLoading ? 'Looking up ward for this VD…' : `VD ${vdCode} isn't seeded yet — can't log an entry safely.`}
        </p>
      )}

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Activity</span>
        <div className="grid grid-cols-4 gap-1">
          {ACTIVITY_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActivityType(t)}
              aria-pressed={activityType === t}
              className={`px-2 py-2 text-label-caps font-display uppercase rounded border ${
                activityType === t ? 'bg-ink text-paper border-ink' : 'bg-white text-ink border-ink/20'
              }`}
            >
              {ACTIVITY_META[t].label}
            </button>
          ))}
        </div>
      </label>

      {!isCanvass && (
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Title</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Street Corner Meeting: Oak & Main"
            required
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Street</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={streetName}
            onChange={(e) => setStreetName(e.target.value)}
            placeholder="Oak Street"
            required
          />
        </label>
        {isCanvass && (
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Households visited</span>
            <input
              type="number"
              min="0"
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={householdsVisited}
              onChange={(e) => setHouseholdsVisited(e.target.value)}
            />
          </label>
        )}
      </div>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">When</span>
        <input
          type="datetime-local"
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          required
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Notes</span>
        <textarea
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional — what happened, what came up."
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
          {mutation.isPending ? 'Saving…' : 'Log entry'}
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
