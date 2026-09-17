/**
 * Election Campaign OS — Voter capture/edit form
 * IC-ECOS-BUILD-2026-V2 §6.2. Layout informed by the Stitch suite's
 * household_voter_logging / voter_profiling_service_delivery_intake
 * screens (card structure, section rhythm) — reskinned to our real
 * design tokens, not their retired Civic Authority palette (see
 * tailwind.config.js header). Fields are exactly the Voter type in
 * src/dal/ports/voters.ts — the reference screens show additional
 * fields (age/employment/email/primary-concerns tags/engagement-history
 * timeline) that aren't part of the governing data model; see
 * docs/screen-findings.md for that as a flagged scope question rather
 * than silently added here.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Household } from '@/dal/ports/households';
import type { Voter, VoterDraft } from '@/dal/ports/voters';
import { maskPhone } from '@/lib/phone';
import { useVdWard } from '@/lib/useVdWard';
import { HouseholdQuickAdd } from './HouseholdQuickAdd';
import { SENTIMENT_META, SENTIMENT_ORDER } from './sentiment';
import { TONE_ACTIVE_CLASSES } from '@/design/toneClasses';

const NEW_HOUSEHOLD_VALUE = '__new__';

const CONSENT_METHOD_LABEL: Record<Voter['popiaConsentMethod'], string> = {
  VERBAL_DOORSTEP: 'Verbal (doorstep)',
  WRITTEN: 'Written',
  DIGITAL: 'Digital',
};

interface VoterFormProps {
  ctx: SessionContext;
  /** Pass an existing voter to edit; omit to create. */
  voter?: Voter;
  /** Pre-selects a household when creating from a household's detail view. */
  defaultHouseholdId?: string;
  onDone: () => void;
  onCancel: () => void;
}

export function VoterForm({ ctx, voter, defaultHouseholdId, onDone, onCancel }: VoterFormProps) {
  const queryClient = useQueryClient();
  const vdCode = voter?.vdCode ?? ctx.vdScope ?? '';

  const householdsQuery = useQuery({
    queryKey: ['households', ctx.tenantId, vdCode],
    queryFn: () => dal.households.listByVD(ctx, vdCode, { pageSize: 50 }),
    enabled: vdCode.length > 0,
  });

  // Ward is derived from the VD record, not ctx.wardScope — a VD-scoped
  // canvasser's token typically has vdScope but not wardScope, and a new
  // household's wardCode must be correct for §4.2 geographic scoping to
  // work, not just non-empty. See src/lib/useVdWard.ts for why (split VDs).
  const {
    wardOptions,
    resolved: resolvedVotingDistrict,
    isLoading: votingDistrictsLoading,
    setSelectedWardCode,
  } = useVdWard(ctx, vdCode);

  const [firstName, setFirstName] = useState(voter?.firstName ?? '');
  const [lastName, setLastName] = useState(voter?.lastName ?? '');
  const [householdId, setHouseholdId] = useState(voter?.householdId ?? defaultHouseholdId ?? '');
  const [showHouseholdQuickAdd, setShowHouseholdQuickAdd] = useState(false);
  // Households query invalidation (triggered on create) races with this
  // form needing the new household's vdCode/wardCode immediately to build
  // the voter draft — keep a local copy rather than depend on the refetch
  // having landed by the time the user hits submit.
  const [justCreatedHousehold, setJustCreatedHousehold] = useState<Household | null>(null);
  const [phone, setPhone] = useState(''); // raw entry; never pre-filled from phoneMasked
  const [sentiment, setSentiment] = useState<Voter['sentiment']>(voter?.sentiment ?? 'UNDECIDED');
  const [consentGiven, setConsentGiven] = useState(voter?.popiaConsentGiven ?? false);
  const [consentMethod, setConsentMethod] = useState<Voter['popiaConsentMethod']>(
    voter?.popiaConsentMethod ?? 'VERBAL_DOORSTEP',
  );

  const mutation = useMutation({
    mutationFn: (draft: VoterDraft) => dal.voters.upsert(ctx, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters', ctx.tenantId] });
      onDone();
    },
  });

  const household =
    householdsQuery.data?.items.find((h) => h.id === householdId) ??
    (justCreatedHousehold?.id === householdId ? justCreatedHousehold : undefined);
  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && householdId.length > 0 && consentGiven;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !household) return;

    const draft: VoterDraft = {
      id: voter?.id ?? crypto.randomUUID(),
      tenantId: ctx.tenantId,
      householdId,
      vdCode: household.vdCode,
      wardCode: household.wardCode,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // §6.2.1: masked value is always derived and stored for display.
      // phoneEncrypted is intentionally omitted — real AES-256 encryption
      // needs a Cloud KMS-backed key exchange that isn't provisioned yet
      // (no live Firebase project — see BUILD-STATUS.md). Leaving a raw
      // phone number out of the write entirely is safer than a fake
      // "encrypted" field that isn't.
      phoneMasked: phone.trim() ? maskPhone(phone) : (voter?.phoneMasked ?? ''),
      sentiment,
      popiaConsentGiven: consentGiven,
      popiaConsentAt: consentGiven ? new Date().toISOString() : undefined,
      popiaConsentMethod: consentMethod,
    };
    mutation.mutate(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-label-caps font-display uppercase text-slate">Voter</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">First name</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Last name</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Household</span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={showHouseholdQuickAdd ? NEW_HOUSEHOLD_VALUE : householdId}
            onChange={(e) => {
              if (e.target.value === NEW_HOUSEHOLD_VALUE) {
                setShowHouseholdQuickAdd(true);
                return;
              }
              setShowHouseholdQuickAdd(false);
              setHouseholdId(e.target.value);
            }}
            required
            disabled={!vdCode}
          >
            <option value="" disabled>
              {householdsQuery.isLoading ? 'Loading households…' : 'Select a household'}
            </option>
            {householdsQuery.data?.items.map((h) => (
              <option key={h.id} value={h.id}>
                {h.addressLine || h.informalDescriptor || h.id}
              </option>
            ))}
            {justCreatedHousehold && !householdsQuery.data?.items.some((h) => h.id === justCreatedHousehold.id) && (
              <option value={justCreatedHousehold.id}>
                {justCreatedHousehold.addressLine || justCreatedHousehold.informalDescriptor} (just added)
              </option>
            )}
            <option value={NEW_HOUSEHOLD_VALUE}>+ Add new household…</option>
          </select>
          {!vdCode && (
            <p className="text-body-md text-maroon">
              No VD in your session scope yet — household lookup needs a live session. See BUILD-STATUS.md.
            </p>
          )}
        </label>

        {showHouseholdQuickAdd && vdCode && wardOptions.length > 1 && !resolvedVotingDistrict && (
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">
              VD {vdCode} is split across wards — which one is this household in?
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
                  {o.wardCode} ({o.registeredVoters.toLocaleString('en-ZA')} registered here)
                </option>
              ))}
            </select>
          </label>
        )}

        {showHouseholdQuickAdd && vdCode && (
          resolvedVotingDistrict ? (
            <HouseholdQuickAdd
              ctx={ctx}
              vdCode={vdCode}
              wardCode={resolvedVotingDistrict.wardCode}
              onCreated={(created) => {
                setJustCreatedHousehold(created);
                setHouseholdId(created.id);
                setShowHouseholdQuickAdd(false);
              }}
              onCancel={() => setShowHouseholdQuickAdd(false)}
            />
          ) : (
            wardOptions.length <= 1 && (
              <p className="text-body-md font-body text-maroon">
                {votingDistrictsLoading
                  ? 'Looking up ward for this VD…'
                  : `VD ${vdCode} isn't seeded yet — its ward can't be determined, so a household can't be created safely. See §6.1.`}
              </p>
            )
          )
        )}

        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Phone</span>
          <input
            type="tel"
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={voter?.phoneMasked || '082 123 4567'}
          />
          {phone.trim() && <p className="text-data-mono font-mono text-slate">Will display as {maskPhone(phone)}</p>}
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="text-label-caps font-display uppercase text-slate">Sentiment</h3>
        <div className="grid grid-cols-5 gap-1">
          {SENTIMENT_ORDER.map((tier) => {
            const meta = SENTIMENT_META[tier];
            const active = sentiment === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSentiment(tier)}
                className={`px-2 py-2 text-label-caps font-display uppercase rounded border transition-colors ${
                  active ? TONE_ACTIVE_CLASSES[meta.tone] : 'bg-white text-ink border-ink/20'
                }`}
                aria-pressed={active}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 border-l-4 border-gold bg-paper p-4">
        <h3 className="text-label-caps font-display uppercase text-ink">POPIA compliance</h3>
        <p className="text-body-md font-body text-slate">
          Confirm the voter has given consent for their information to be recorded, per POPIA. Writes are rejected
          server-side without this — see firestore.rules.
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} />
          <span className="text-body-md font-body">Consent given</span>
        </label>
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Method</span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={consentMethod}
            onChange={(e) => setConsentMethod(e.target.value as Voter['popiaConsentMethod'])}
          >
            {(Object.keys(CONSENT_METHOD_LABEL) as Voter['popiaConsentMethod'][]).map((m) => (
              <option key={m} value={m}>
                {CONSENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
      </section>

      {mutation.isError && (
        <p className="text-body-md text-maroon">
          {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit || mutation.isPending}
          className="flex-1 bg-ink text-paper rounded py-3 text-label-caps font-display uppercase disabled:opacity-40"
        >
          {mutation.isPending ? 'Saving…' : voter ? 'Save changes' : 'Add voter'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
