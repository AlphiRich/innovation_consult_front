/**
 * Election Campaign OS — donor capture/edit form (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2. `idNumberEncrypted`/`registrationNumberEncrypted`
 * are deliberately not in this form — real AES-256 encryption needs a
 * Cloud KMS-backed key exchange that isn't provisioned yet (no live
 * Firebase project — see BUILD-STATUS.md), same disclosed gap as
 * VoterForm.tsx's phone encryption. Writing a fake "encrypted" field
 * would be worse than omitting it. Capability: `ppfa.edit`.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Donor, DonorDraft, DonorType } from '@/dal/ports/donors';

const DONOR_TYPE_LABEL: Record<DonorType, string> = {
  NATURAL_PERSON: 'Natural person',
  JURISTIC_PERSON: 'Juristic person (company/trust/etc.)',
  FOREIGN: 'Foreign donor',
  ANONYMOUS: 'Anonymous',
};

interface DonorFormProps {
  ctx: SessionContext;
  donor?: Donor;
  onDone: (donor: Donor) => void;
  onCancel: () => void;
}

export function DonorForm({ ctx, donor, onDone, onCancel }: DonorFormProps) {
  const queryClient = useQueryClient();
  const [donorType, setDonorType] = useState<DonorType>(donor?.donorType ?? 'NATURAL_PERSON');
  const [displayName, setDisplayName] = useState(donor?.displayName ?? '');
  const [contactEmail, setContactEmail] = useState(donor?.contactEmail ?? '');
  const [isForeign, setIsForeign] = useState(donor?.isForeign ?? false);

  const mutation = useMutation({
    mutationFn: (draft: DonorDraft) => dal.donors.upsert(ctx, draft),
    onSuccess: (_result, draft) => {
      queryClient.invalidateQueries({ queryKey: ['donors', ctx.tenantId] });
      onDone({
        ...draft,
        createdAt: donor?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: ctx.uid,
      });
    },
  });

  const canSubmit = displayName.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      id: donor?.id ?? crypto.randomUUID(),
      tenantId: ctx.tenantId,
      donorType,
      displayName: displayName.trim(),
      contactEmail: contactEmail.trim() || undefined,
      isForeign: donorType === 'FOREIGN' || isForeign,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">{donor ? 'Edit donor' : 'New donor'}</h3>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Donor type</span>
        <select
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
          value={donorType}
          onChange={(e) => setDonorType(e.target.value as DonorType)}
        >
          {(Object.keys(DONOR_TYPE_LABEL) as DonorType[]).map((t) => (
            <option key={t} value={t}>
              {DONOR_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">
          {donorType === 'ANONYMOUS' ? 'Reference label' : 'Name'}
        </span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={donorType === 'ANONYMOUS' ? 'e.g. Anonymous — collection box, Ward 4 rally' : 'Full name or entity name'}
          required
        />
      </label>

      {donorType !== 'ANONYMOUS' && (
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Contact email</span>
          <input
            type="email"
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </label>
      )}

      {donorType !== 'FOREIGN' && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isForeign} onChange={(e) => setIsForeign(e.target.checked)} />
          <span className="text-body-md font-body">Foreign donor (PPFA foreign-funding restrictions apply)</span>
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
          className="flex-1 bg-ink text-paper rounded py-2.5 text-label-caps font-display uppercase disabled:opacity-40"
        >
          {mutation.isPending ? 'Saving…' : donor ? 'Save changes' : 'Add donor'}
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
