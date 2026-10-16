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
import { BasisNote, Button, Card, DataLine, Field, PageHeader, SectionLabel, StatTile } from '@/components/ui';

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
      <Card className="max-w-lg">
        <PageHeader slug="/voters/import" title="Import a register" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
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
      <PageHeader slug="/voters/import" title="Import a register" />

      {/*
       * Five bare <label> wrappers before this, none of them associated —
       * on the one screen in the product that takes a POPIA consent
       * declaration. A form whose fields a screen reader cannot name is
       * not a form somebody can be held to.
       */}
      <Card className="space-y-3">
        <SectionLabel as="h2">Consent declaration</SectionLabel>
        <BasisNote>
          Every person on this list needs a lawful basis that could be produced if it were ever questioned. A
          spreadsheet has no doorstep and no canvasser, so this declaration is the evidence.
        </BasisNote>

        <Field label="How they consented">
          {(props) => (
            <select {...props} value={method} onChange={(e) => setMethod(e.target.value as BulkConsentMethod)}>
              {(Object.keys(METHOD_LABEL) as BulkConsentMethod[]).map((key) => (
                <option key={key} value={key}>
                  {METHOD_LABEL[key]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="When">
            {(props) => (
              <input
                {...props}
                type="date"
                value={declaredAt}
                onChange={(e) => setDeclaredAt(e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Default voting district"
            mono
            hint="Used for rows with no VD column."
          >
            {(props) => (
              <input {...props} value={defaultVdCode} onChange={(e) => setDefaultVdCode(e.target.value)} />
            )}
          </Field>
        </div>

        <Field label="Where that consent is recorded">
          {(props) => (
            <input
              {...props}
              placeholder="Membership forms 001–112, Ikageng drive, 2 March 2026"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          )}
        </Field>

        {consentProblem && <p className="text-body-md font-body text-maroon">{consentProblem}</p>}
      </Card>

      <Card className="space-y-3">
        <SectionLabel as="h2">The file</SectionLabel>
        {votingDistricts.length === 0 && (
          <p className="text-body-md font-body text-maroon">
            No voting districts are loaded for this tenant yet, so there is nowhere to put anybody. Seed the wards
            and voting districts from the demarcation notice first.
          </p>
        )}
        {/*
         * The file input had no label of any kind — a screen reader
         * announced "file upload button" and nothing else, on the control
         * that loads a membership register. Field's id is used and its
         * control classes are not: a bordered, padded box around the
         * browser's own file widget is not an improvement.
         */}
        <Field label="Register file (CSV)">
          {({ id, 'aria-describedby': describedBy }) => (
            <input
              id={id}
              aria-describedby={describedBy}
              type="file"
              accept=".csv,text/csv"
              disabled={Boolean(consentProblem) || votingDistricts.length === 0}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="text-body-md font-body"
            />
          )}
        </Field>
        {fileName && <DataLine>{fileName}</DataLine>}
      </Card>

      {committed !== null && (
        <p className="text-body-md font-body text-green">{committed} record(s) imported.</p>
      )}

      {plan && (
        <Card tone="accent" className="space-y-3">
          <SectionLabel as="h2">The plan — nothing has been written</SectionLabel>

          {plan.fileErrors.map((error) => (
            <p key={error} className="text-body-md font-body text-maroon">
              {error}
            </p>
          ))}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Rows read" value={plan.totalRows} />
            <StatTile label="Ready" value={plan.ready.length} />
            <StatTile label="Rejected" value={plan.rejected.length} />
            <StatTile label="New doors" value={plan.households.length} />
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

          <Button
            variant="secondary"
            disabled={plan.ready.length === 0 || commitMutation.isPending}
            onClick={() => commitMutation.mutate(plan)}
          >
            {commitMutation.isPending ? 'Importing…' : `Import ${plan.ready.length} record(s)`}
          </Button>
        </Card>
      )}
    </div>
  );
}
