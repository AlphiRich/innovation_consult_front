/**
 * Election Campaign OS — importing an existing membership register
 * IC-ECOS-BUILD-2026-V2 §6.2, §6.2.1. Capability: `voters.edit`.
 *
 * The screen for `bulkImport.ts`, which until now had none. Everything
 * that decides anything lives in that module and is tested there; this
 * collects a consent declaration, reads a file, shows the plan, and
 * commits it in the one order that is safe.
 *
 * THE ORDER MATTERS
 *
 * Households are written before the voters that reference them. A voter
 * whose household does not exist is a dangling reference that nothing in
 * this product reports — the person simply never appears on a door.
 *
 * NOTHING IS WRITTEN UNTIL THE OPERATOR HAS SEEN THE PLAN. The rejected
 * rows are shown with their reasons before the button that commits
 * appears, because "412 of 437 imported" is a sentence somebody has to be
 * able to act on, and they cannot act on it afterwards.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { SessionContext } from '@/dal/ports/session';
import {
  consentDeclarationProblem,
  existingVoterKey,
  parseCsv,
  planImport,
  toImportRows,
  type BulkConsentMethod,
  type ConsentDeclaration,
  type ImportPlan,
} from './bulkImport';

const METHOD_LABEL: Record<BulkConsentMethod, string> = {
  WRITTEN: 'Written — signed membership or consent forms',
  DIGITAL: 'Digital — an online sign-up or form submission',
};

async function commitPlan(ctx: SessionContext, plan: ImportPlan): Promise<number> {
  // Households first. See the header.
  for (const household of plan.households) {
    await dal.households.upsert(ctx, { ...household, tenantId: ctx.tenantId });
  }
  for (const voter of plan.ready) {
    await dal.voters.upsert(ctx, { ...voter, tenantId: ctx.tenantId });
  }
  return plan.ready.length;
}

export function BulkImportPage() {
  const session = useSession();
  const queryClient = useQueryClient();

  const [method, setMethod] = useState<BulkConsentMethod>('WRITTEN');
  const [declaredAt, setDeclaredAt] = useState('');
  const [reference, setReference] = useState('');
  const [defaultVdCode, setDefaultVdCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);

  const vdQuery = useQuery({
    queryKey: ['votingDistricts-all', session?.tenantId],
    queryFn: () => dal.wards.listAll(session!),
    enabled: Boolean(session),
  });

  const commitMutation = useMutation({
    mutationFn: (ready: ImportPlan) => commitPlan(session!, ready),
    onSuccess: (count) => {
      setCommitted(count);
      setPlan(null);
      queryClient.invalidateQueries({ queryKey: ['voters'] });
      queryClient.invalidateQueries({ queryKey: ['households'] });
    },
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/voters/import</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Import a register</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const consent: ConsentDeclaration | null =
    declaredAt && reference ? { method, declaredAt: new Date(declaredAt).toISOString(), reference } : null;
  const consentProblem = consentDeclarationProblem(consent);

  // Every (vdCode, wardCode) pair the tenant holds, from the seeded wards.
  const votingDistricts = (vdQuery.data ?? []).flatMap((ward) =>
    ward.vdCodes.map((vdCode) => ({ vdCode, wardCode: ward.wardCode })),
  );

  async function handleFile(file: File) {
    setCommitted(null);
    setFileName(file.name);
    const rows = toImportRows(parseCsv(await file.text()));
    // Existing keys are read from the districts this file could touch, so
    // "already on the roll" is a real answer rather than an optimistic one.
    const existingKeys = new Set<string>();
    const districts = new Set(rows.map((r) => (r.vdCode ?? '').trim() || defaultVdCode.trim()).filter(Boolean));
    for (const vdCode of districts) {
      const page = await dal.voters.listByVD(session!, vdCode, { pageSize: 1000 });
      for (const voter of page.items) {
        existingKeys.add(existingVoterKey(voter.firstName, voter.lastName, voter.phoneMasked));
      }
    }
    setPlan(
      planImport({
        rows,
        consent,
        votingDistricts,
        defaultVdCode: defaultVdCode.trim() || undefined,
        existingKeys,
      }),
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/voters/import</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Import a register</h1>
      </div>

      <section className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
        <h2 className="text-label-caps font-display uppercase text-slate">Consent declaration</h2>
        <p className="text-body-md font-body text-slate">
          Every person on this list needs a lawful basis that could be produced if it were ever questioned. A
          spreadsheet has no doorstep and no canvasser, so this declaration is the evidence.
        </p>

        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">How they consented</span>
          <select
            className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body bg-white"
            value={method}
            onChange={(e) => setMethod(e.target.value as BulkConsentMethod)}
          >
            {(Object.keys(METHOD_LABEL) as BulkConsentMethod[]).map((key) => (
              <option key={key} value={key}>
                {METHOD_LABEL[key]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">When</span>
            <input
              type="date"
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
              value={declaredAt}
              onChange={(e) => setDeclaredAt(e.target.value)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Default voting district</span>
            <input
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-data-mono font-mono"
              placeholder="used for rows with no VD column"
              value={defaultVdCode}
              onChange={(e) => setDefaultVdCode(e.target.value)}
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Where that consent is recorded</span>
          <input
            className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
            placeholder="Membership forms 001–112, Ikageng drive, 2 March 2026"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>

        {consentProblem && <p className="text-body-md font-body text-maroon">{consentProblem}</p>}
      </section>

      <section className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
        <h2 className="text-label-caps font-display uppercase text-slate">The file</h2>
        {votingDistricts.length === 0 && (
          <p className="text-body-md font-body text-maroon">
            No voting districts are loaded for this tenant yet, so there is nowhere to put anybody. Seed the wards
            and voting districts from the demarcation notice first.
          </p>
        )}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={Boolean(consentProblem) || votingDistricts.length === 0}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="text-body-md font-body"
        />
        {fileName && <p className="text-data-mono font-mono text-slate">{fileName}</p>}
      </section>

      {committed !== null && (
        <p className="text-body-md font-body text-green">{committed} record(s) imported.</p>
      )}

      {plan && (
        <section className="bg-white border border-gold/60 rounded-lg p-4 space-y-3">
          <h2 className="text-label-caps font-display uppercase text-slate">The plan — nothing has been written</h2>

          {plan.fileErrors.map((error) => (
            <p key={error} className="text-body-md font-body text-maroon">
              {error}
            </p>
          ))}

          <div className="grid grid-cols-4 gap-3">
            <Stat label="Rows read" value={plan.totalRows} />
            <Stat label="Ready" value={plan.ready.length} />
            <Stat label="Rejected" value={plan.rejected.length} />
            <Stat label="New doors" value={plan.households.length} />
          </div>

          {plan.withoutAddress > 0 && (
            <p className="text-body-md font-body text-slate">
              {plan.withoutAddress} record(s) carry no address. They are placed in a holding record that says so,
              and will not appear in a canvassing round until an address is added — they can still be phoned.
            </p>
          )}

          {plan.rejected.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {plan.rejected.map((rejection) => (
                <p key={`${rejection.row.lineNumber}-${rejection.code}`} className="text-body-md font-body text-slate">
                  <span className="text-data-mono font-mono">Line {rejection.row.lineNumber}</span> — {rejection.reason}
                </p>
              ))}
            </div>
          )}

          {commitMutation.isError && (
            <p className="text-body-md font-body text-maroon">
              The import stopped partway. Re-run it — people already written will come back as already on the roll.
            </p>
          )}

          <button
            type="button"
            disabled={plan.ready.length === 0 || commitMutation.isPending}
            onClick={() => commitMutation.mutate(plan)}
            className="px-4 py-2 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
          >
            Import {plan.ready.length} record(s)
          </button>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/10 rounded p-3">
      <p className="text-label-caps font-display uppercase text-slate">{label}</p>
      <p className="text-headline-md font-display text-ink">{value}</p>
    </div>
  );
}
