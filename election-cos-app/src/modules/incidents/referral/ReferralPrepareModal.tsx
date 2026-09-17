/**
 * Election Campaign OS — prepare and authorise a service delivery referral
 * IC-ECOS-BUILD-2026-V2 §6.4.
 *
 * The last step of the incidents workflow: an ESCALATED incident becomes a
 * referral addressed to the responsible municipal department, downloadable
 * as a draft and — once the Municipal Lead authorises it in their own name
 * — issued, stored, registered and marked REFERRED.
 *
 * The preview below shows the same fields, in the same order, that
 * referralPdf.ts prints. Nobody should have to open a PDF to find out what
 * they are about to put their name on.
 *
 * Two things this screen deliberately will not do, both of them failures
 * of the ecos-v2 fork's version (docs/ecos-v2-fork-review.md §4i):
 *  - it never fills in the recipient municipality or the signatory from a
 *    constant. The municipality comes from the tenant's own configured
 *    profile and the signatory from the signed-in user's staff record; if
 *    either is missing the screen says so and refuses to proceed rather
 *    than supplying a plausible name;
 *  - the issuing campaign's name has no default at all, because this
 *    codebase does not yet hold one (BUILD-STATUS.md — SessionContext
 *    carries a tenant id, not a display name).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Incident } from '@/dal/ports/incidents';
import { SEED_ROLES } from '@/auth/seedRoles';
import { hasUnrepresentableCharacters } from '@/lib/pdf/pdfWriter';
import { CATEGORY_LABEL, SEVERITY_META } from '../incidentMeta';
import {
  buildReferralDocument,
  EVIDENCE_BASIS,
  INTEGRITY_HASH_BASIS,
  STANDING_DISCLAIMER,
  type ReferralDocument,
  type ReferralInput,
} from './referralDocument';
import { referralFileName, renderReferralPdf } from './referralPdf';
import { issueReferral } from './issueReferral';

interface ReferralPrepareModalProps {
  ctx: SessionContext;
  incident: Incident;
  onClose: () => void;
}

/**
 * A starting suggestion for the addressee department, from the incident's
 * fixed category. Editable — municipalities name their departments
 * differently and the preparer knows which one they deal with.
 */
const DEPARTMENT_SUGGESTION: Record<Incident['category'], string> = {
  WATER_SANITATION: 'Water & Sanitation',
  ELECTRICITY: 'Electricity',
  ROADS_TRANSPORT: 'Roads & Transport',
  PUBLIC_SAFETY: 'Public Safety',
};

function downloadBytes(bytes: Uint8Array, fileName: string): void {
  // Copied into a fresh Uint8Array so the Blob gets a plain ArrayBuffer
  // rather than the possibly-shared buffer type the writer returns.
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReferralPrepareModal({ ctx, incident, onClose }: ReferralPrepareModalProps) {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', ctx.tenantId],
    queryFn: () => dal.municipalityProfile.get(ctx),
  });
  const staffQuery = useQuery({
    queryKey: ['staff', ctx.tenantId, ctx.uid],
    queryFn: () => dal.staff.getByUid(ctx, ctx.uid),
  });

  const [issuingOrganisation, setIssuingOrganisation] = useState('');
  const [department, setDepartment] = useState(DEPARTMENT_SUGGESTION[incident.category]);
  const [coveringNote, setCoveringNote] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [issued, setIssued] = useState<{ contentHash: string; storagePath: string } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const staff = staffQuery.data ?? null;
  const profile = profileQuery.data ?? null;
  const signatoryName = staff ? `${staff.firstName} ${staff.lastName}`.trim() : '';
  const seededRoleLabel = SEED_ROLES.find((r) => r.id === staff?.roleId)?.label ?? '';
  const effectiveRole = roleLabel.trim() || seededRoleLabel;

  const canEscalate = ctx.caps.includes('incidents.escalate');

  /**
   * The draft document, rebuilt on every keystroke. `buildReferralDocument`
   * throws on anything incomplete, which is exactly the validation this
   * form wants — the form cannot construct a document the model would
   * reject.
   */
  const draft = useMemo<{ doc: ReferralDocument | null; error: string | null }>(() => {
    if (!profile) return { doc: null, error: null };
    const input: ReferralInput = {
      incident,
      issuingOrganisation,
      recipient: {
        municipalityName: profile.municipalityName,
        municipalityCode: profile.municipalityCode,
        department,
      },
      coveringNote,
      preparedByUid: ctx.uid,
      preparedAt: new Date().toISOString(),
      authorisation: null,
    };
    try {
      return { doc: buildReferralDocument(input), error: null };
    } catch (error) {
      return { doc: null, error: error instanceof Error ? error.message : 'Incomplete referral.' };
    }
  }, [ctx.uid, coveringNote, department, incident, issuingOrganisation, profile]);

  const substitutionWarning = [issuingOrganisation, department, coveringNote, incident.description].some(
    hasUnrepresentableCharacters,
  );

  const downloadDraft = useMutation({
    mutationFn: async () => {
      const { bytes } = await renderReferralPdf(draft.doc!);
      downloadBytes(bytes, referralFileName(draft.doc!));
    },
    onError: (error) => setDraftError(error instanceof Error ? error.message : 'Could not build the draft.'),
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const authorisedDoc = buildReferralDocument({
        incident,
        issuingOrganisation,
        recipient: {
          municipalityName: profile!.municipalityName,
          municipalityCode: profile!.municipalityCode,
          department,
        },
        coveringNote,
        preparedByUid: ctx.uid,
        preparedAt: new Date().toISOString(),
        authorisation: {
          signatory: { uid: ctx.uid, fullName: signatoryName, roleLabel: effectiveRole },
          authorisedAt: new Date().toISOString(),
        },
      });
      const result = await issueReferral(ctx, authorisedDoc);
      downloadBytes(result.bytes, referralFileName(authorisedDoc));
      return result;
    },
    onSuccess: (result) => {
      setIssued({ contentHash: result.contentHash, storagePath: result.storagePath });
      queryClient.invalidateQueries({ queryKey: ['incidents', ctx.tenantId] });
    },
  });

  const blockingReason =
    !canEscalate
      ? 'Preparing a referral needs the incidents.escalate capability (§6.4). Yours does not include it.'
      : profileQuery.isLoading || staffQuery.isLoading
        ? null
        : !profile
          ? 'No municipality is configured for this tenant yet. Set it in Settings → Municipality Config — a referral must name a real addressee, and this screen will not invent one.'
          : !staff
            ? 'Your staff profile could not be loaded, so this referral has no signatory. A referral is signed in a named person’s name or it is not issued.'
            : signatoryName === ''
              ? 'Your staff profile has no name on it. Add one before authorising a referral in your own name.'
              : null;

  const canIssue =
    !blockingReason && draft.doc !== null && confirmed && effectiveRole !== '' && !issueMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 overflow-y-auto p-4 flex items-start justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl my-8 border border-ink/10">
        <div className="p-5 border-b border-ink/10 flex items-start justify-between gap-4">
          <div>
            <p className="text-label-caps font-display uppercase text-slate">/incidents/referral</p>
            <h2 className="text-headline-md font-display text-ink mt-1">Prepare service delivery referral</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-5">
          {blockingReason && <p className="text-body-md font-body text-maroon">{blockingReason}</p>}

          {issued ? (
            <div className="space-y-3">
              <p className="text-body-md font-body text-ink">
                Referral issued and the incident marked <strong>Referred</strong>. The signed PDF has been
                downloaded and stored.
              </p>
              <div className="border border-ink/10 rounded p-3 space-y-2 bg-paper">
                <p className="text-label-caps font-display uppercase text-slate">Document integrity hash (SHA-256)</p>
                <p className="text-data-mono font-mono text-ink break-all">{issued.contentHash}</p>
                <p className="text-label-caps font-display uppercase text-slate">Stored at</p>
                <p className="text-data-mono font-mono text-slate break-all">{issued.storagePath}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-ink text-paper rounded text-label-caps font-display uppercase"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* ---- what the preparer supplies ---- */}
              <label className="space-y-1 block">
                <span className="text-label-caps font-display uppercase text-slate">Issuing campaign or office</span>
                <input
                  className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                  value={issuingOrganisation}
                  onChange={(e) => setIssuingOrganisation(e.target.value)}
                  placeholder="The name this referral is sent under"
                  disabled={Boolean(blockingReason)}
                />
                <span className="text-body-md font-body text-slate block">
                  Printed at the top of the document. There is no default — the referral is issued in this name.
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-label-caps font-display uppercase text-slate">Addressed to</span>
                  <input
                    className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-paper text-slate"
                    value={profile ? `${profile.municipalityName} (${profile.municipalityCode})` : '—'}
                    readOnly
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-label-caps font-display uppercase text-slate">Department</span>
                  <input
                    className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={Boolean(blockingReason)}
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-label-caps font-display uppercase text-slate">Covering note (optional)</span>
                <textarea
                  className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                  rows={3}
                  value={coveringNote}
                  onChange={(e) => setCoveringNote(e.target.value)}
                  placeholder="Anything the department should know beyond the logged particulars."
                  disabled={Boolean(blockingReason)}
                />
              </label>

              {substitutionWarning && (
                <p className="text-body-md font-body text-maroon">
                  Some characters here cannot be printed in this document’s font and will appear as “?”. Rewrite
                  them before issuing.
                </p>
              )}

              {/* ---- the document, as it will read ---- */}
              <div className="border border-ink/10 rounded">
                <p className="text-label-caps font-display uppercase text-slate px-4 py-2 border-b border-ink/10">
                  Preview {draft.doc && <span className="text-maroon">· DRAFT, not authorised</span>}
                </p>
                {draft.error && <p className="px-4 py-3 text-body-md font-body text-maroon">{draft.error}</p>}
                {draft.doc && (
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-body-md font-body text-ink font-semibold">{draft.doc.issuingOrganisation}</p>
                    <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1">
                      {[
                        ['To', `${draft.doc.recipient.municipalityName} (${draft.doc.recipient.municipalityCode})`],
                        ['Attention', draft.doc.recipient.department],
                        ['Reference', draft.doc.reference],
                        ['Category', CATEGORY_LABEL[incident.category]],
                        ['Severity', SEVERITY_META[incident.severity].label],
                        ['Ward', incident.wardCode],
                        ['Voting district', incident.vdCode],
                      ].map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-label-caps font-display uppercase text-slate">{label}</dt>
                          <dd className="text-body-md font-body text-ink">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div>
                      <p className="text-label-caps font-display uppercase text-slate">Description of the fault</p>
                      <p className="text-body-md font-body text-ink">{incident.description}</p>
                    </div>
                    {draft.doc.coveringNote !== '' && (
                      <div>
                        <p className="text-label-caps font-display uppercase text-slate">Covering note</p>
                        <p className="text-body-md font-body text-ink">{draft.doc.coveringNote}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-label-caps font-display uppercase text-slate">Photographic evidence</p>
                      {draft.doc.evidencePaths.length === 0 ? (
                        <p className="text-body-md font-body text-slate">
                          No photographs were attached to this incident.
                        </p>
                      ) : (
                        <>
                          <p className="text-body-md font-body text-slate">{EVIDENCE_BASIS}</p>
                          {draft.doc.evidencePaths.map((path) => (
                            <p key={path} className="text-data-mono font-mono text-slate break-all">
                              {path}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                    <p className="text-body-md font-body text-slate border-t border-ink/10 pt-3">
                      {STANDING_DISCLAIMER}
                    </p>
                    <p className="text-body-md font-body text-slate">{INTEGRITY_HASH_BASIS}</p>
                  </div>
                )}
              </div>

              {/* ---- authorisation ---- */}
              <div className="border border-gold/40 bg-paper rounded p-4 space-y-3">
                <p className="text-label-caps font-display uppercase text-ink">Authorisation</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-label-caps font-display uppercase text-slate">Signing as</span>
                    <input
                      className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white text-slate"
                      value={signatoryName || '—'}
                      readOnly
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-label-caps font-display uppercase text-slate">Role as it should read</span>
                    <input
                      className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
                      value={roleLabel || seededRoleLabel}
                      onChange={(e) => setRoleLabel(e.target.value)}
                      disabled={Boolean(blockingReason)}
                    />
                  </label>
                </div>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    disabled={Boolean(blockingReason)}
                  />
                  <span className="text-body-md font-body text-ink">
                    I authorise this referral to be issued to {profile?.municipalityName ?? 'the municipality'} in
                    my name. Authorising removes the draft watermark, stores the signed PDF, and marks the
                    incident Referred.
                  </span>
                </label>
              </div>

              {(draftError || issueMutation.isError) && (
                <p className="text-body-md font-body text-maroon">
                  {draftError ??
                    (issueMutation.error instanceof Error ? issueMutation.error.message : 'Could not issue the referral.')}
                </p>
              )}

              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  disabled={!draft.doc || downloadDraft.isPending}
                  onClick={() => {
                    setDraftError(null);
                    downloadDraft.mutate();
                  }}
                  className="px-4 py-2.5 border border-ink/30 rounded text-label-caps font-display uppercase text-ink disabled:opacity-40"
                >
                  {downloadDraft.isPending ? 'Building…' : 'Download draft PDF'}
                </button>
                <button
                  type="button"
                  disabled={!canIssue}
                  onClick={() => issueMutation.mutate()}
                  className="px-4 py-2.5 bg-maroon text-white rounded text-label-caps font-display uppercase disabled:opacity-40"
                >
                  {issueMutation.isPending ? 'Issuing…' : 'Authorise & issue'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
