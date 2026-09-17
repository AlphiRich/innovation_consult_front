/**
 * Election Campaign OS — capture or edit a candidate
 * IC-ECOS-BUILD-2026-V2 §6.6. Capability: `team.manage`.
 *
 * THE ID NUMBER
 *
 * Typed in full, checked with `parseSaIdNumber` — structure, date,
 * citizenship digit and check digit — and stored only as the mask
 * `maskSaIdNumber` produces. `idNumberEncrypted` is deliberately not
 * written: real AES-256 needs a KMS-backed key exchange that is not
 * provisioned (BUILD-STATUS.md), and a field named "encrypted" holding
 * something that is not encrypted is worse than an empty one. Same stance
 * as `VoterForm` on phone numbers and `DonorForm` on donor identity
 * numbers.
 *
 * The check digit test earns its place here more than anywhere else in
 * the product: a candidate the Commission cannot match to a registered
 * voter is removed from the list under section 14(5), and the most common
 * reason is a number typed wrongly off a form.
 *
 * GENDER IS DECLARED, NEVER INFERRED
 *
 * Schedule 1's gender position cannot be reported on without the datum,
 * and the datum is self-declared. The sex marker inside an ID number is
 * deliberately not used to fill this in — it is a different thing, it is
 * frequently wrong for the person concerned, and `SaIdSexMarker` is a
 * separate type from `CandidateGender` precisely so that assigning one to
 * the other does not compile.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Candidate, CandidateDraft, CandidateGender } from '@/dal/ports/candidates';
import { maskSaIdNumber, parseSaIdNumber } from '@/lib/saIdNumber';
import { GENDER_CAPTURE_BASIS, ID_CAPTURE_BASIS } from './candidateCapture';

const GENDER_LABEL: Record<CandidateGender, string> = {
  FEMALE: 'Female',
  MALE: 'Male',
  OTHER: 'Other',
  UNDISCLOSED: 'Not declared',
};

interface CandidateFormProps {
  ctx: SessionContext;
  candidate?: Candidate;
  onDone: () => void;
  onCancel: () => void;
}

export function CandidateForm({ ctx, candidate, onDone, onCancel }: CandidateFormProps) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(candidate?.fullName ?? '');
  const [affiliation, setAffiliation] = useState<Candidate['affiliation']>(candidate?.affiliation ?? 'PR');
  const [wardCode, setWardCode] = useState(candidate?.wardCode ?? '');
  const [listRank, setListRank] = useState(candidate?.listRank ? String(candidate.listRank) : '');
  const [gender, setGender] = useState<CandidateGender>(candidate?.gender ?? 'UNDISCLOSED');
  const [idNumber, setIdNumber] = useState(''); // never pre-filled from the mask

  const mutation = useMutation({
    mutationFn: (draft: CandidateDraft) => dal.candidates.upsert(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', ctx.tenantId] });
      onDone();
    },
  });

  const parsed = idNumber.trim() ? parseSaIdNumber(idNumber) : null;
  const idProblem = parsed && !parsed.ok ? parsed.message : null;
  // An existing candidate keeps the mask already stored unless a new
  // number is typed; a new one has to have a valid number.
  const idSatisfied = candidate ? idNumber.trim() === '' || parsed?.ok === true : parsed?.ok === true;
  const canSubmit = fullName.trim().length > 0 && idSatisfied && (affiliation === 'PR' || wardCode.trim() !== '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      id: candidate?.id ?? crypto.randomUUID(),
      tenantId: ctx.tenantId,
      fullName: fullName.trim(),
      affiliation,
      wardCode: affiliation === 'WARD' ? wardCode.trim() : undefined,
      listRank: affiliation === 'PR' && listRank.trim() !== '' ? Number(listRank) : undefined,
      gender,
      // See the header: no fabricated ciphertext.
      idNumberEncrypted: candidate?.idNumberEncrypted ?? '',
      idNumberMasked: parsed?.ok ? maskSaIdNumber(parsed.digits) : (candidate?.idNumberMasked ?? ''),
      verificationStatus: candidate?.verificationStatus ?? 'PENDING',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-paper p-4 rounded">
      <h3 className="text-label-caps font-display uppercase text-ink">
        {candidate ? 'Edit candidate' : 'Add candidate'}
      </h3>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Full name, as it must appear</span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Standing as</span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value as Candidate['affiliation'])}
          >
            <option value="PR">On the party list (PR)</option>
            <option value="WARD">In a ward</option>
          </select>
        </label>

        {affiliation === 'PR' ? (
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">List position</span>
            <input
              type="number"
              min="1"
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={listRank}
              onChange={(e) => setListRank(e.target.value)}
              placeholder="1"
            />
          </label>
        ) : (
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Ward code</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={wardCode}
              onChange={(e) => setWardCode(e.target.value)}
              required
            />
          </label>
        )}
      </div>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Gender, as the candidate declares it</span>
        <select
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
          value={gender}
          onChange={(e) => setGender(e.target.value as CandidateGender)}
        >
          {(Object.keys(GENDER_LABEL) as CandidateGender[]).map((g) => (
            <option key={g} value={g}>
              {GENDER_LABEL[g]}
            </option>
          ))}
        </select>
        <span className="text-body-md font-body text-slate">{GENDER_CAPTURE_BASIS}</span>
      </label>

      <label className="space-y-1 block">
        <span className="text-label-caps font-display uppercase text-slate">Identity number</span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder={candidate?.idNumberMasked || '13 digits'}
          required={!candidate}
        />
        {idProblem && <span className="text-body-md font-body text-maroon">{idProblem}</span>}
        {parsed?.ok && (
          <span className="text-data-mono font-mono text-slate">Will be stored as {maskSaIdNumber(parsed.digits)}</span>
        )}
        <span className="text-body-md font-body text-slate">{ID_CAPTURE_BASIS}</span>
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
          {mutation.isPending ? 'Saving…' : candidate ? 'Save changes' : 'Add candidate'}
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
