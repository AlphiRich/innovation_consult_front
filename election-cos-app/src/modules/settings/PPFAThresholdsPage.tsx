/**
 * Election Campaign OS — PPFA Threshold Config
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.5.
 *
 * NAMING DISCIPLINE (§3.2): this is the STATUTORY FUNDING settings screen
 * (R200k / R30m). /analytics/thresholds is the ELECTORAL vote-threshold
 * tool. They must never share a label, icon, or breadcrumb.
 *
 * Capability: `ppfa.manage_thresholds` — deliberately separate from
 * `ppfa.edit` (§4.4 separation of duties: this changes what the law is
 * understood to require, not what was donated). Append-only: `create()`
 * is the only write path; firestore.rules denies update/delete on
 * ppfaConfigs entirely, so "editing" a threshold means creating a new
 * effective-dated config, never rewriting history.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { AggregationRule, PPFAConfigDraft } from '@/dal/ports/ppfaConfig';
import { defaultPPFAConfig, PPFA_GAZETTE_CITATION } from '@/modules/finance/ppfaDefaults';
import { randToCents, formatZAR } from '@/lib/money';
import { Button, Card, DataLine, Field, PageHeader, SectionLabel } from '@/components/ui';

const MONTH_LABEL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Static seed for form defaults — a pure function of no session state, so
// it's safe to call once at module scope rather than inside the
// component (keeps every hook below unconditional; see the Rules of
// Hooks note in the component body for why that matters here).
const SEED = defaultPPFAConfig('', '');

export function PPFAThresholdsPage() {
  const session = useSession();
  const queryClient = useQueryClient();

  // Every hook below runs unconditionally, before any early return —
  // this page originally put form useState calls after an `if (!session)
  // return`, which violates the Rules of Hooks (a session becoming
  // available mid-session would change hook call order). Caught and
  // fixed while building this page, not by a lint failure someone else
  // hit later.
  const [showForm, setShowForm] = useState(false);
  const [disclosureRand, setDisclosureRand] = useState(String(SEED.disclosureThresholdZAR / 100));
  const [capRand, setCapRand] = useState(String(SEED.annualDonorCapZAR / 100));
  const [warningPct, setWarningPct] = useState(String(SEED.warningPercentage * 100));
  const [aggregationRule, setAggregationRule] = useState<AggregationRule>(SEED.aggregationRule);
  const [fyStartMonth, setFyStartMonth] = useState(SEED.financialYearStartMonth);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceCitation, setSourceCitation] = useState('');

  const historyQuery = useQuery({
    queryKey: ['ppfaConfigHistory', session?.tenantId],
    queryFn: () => dal.ppfaConfig.listHistory(session!),
    enabled: Boolean(session),
  });

  const mutation = useMutation({
    mutationFn: (draft: PPFAConfigDraft) => dal.ppfaConfig.create(session!, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppfaConfigHistory', session?.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ppfaConfig', session?.tenantId] });
      setShowForm(false);
    },
  });

  if (!session) {
    return (
      <Card className="max-w-lg">
        <PageHeader slug="/settings/ppfa-thresholds" title="PPFA Threshold Config" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
    );
  }

  const history = historyQuery.data ?? [];
  const now = new Date().toISOString();
  const current = history.find((c) => c.effectiveDate <= now) ?? null;
  const canSubmit = sourceCitation.trim().length > 0 && Number(disclosureRand) > 0 && Number(capRand) > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      tenantId: session!.tenantId,
      disclosureThresholdZAR: randToCents(Number(disclosureRand)),
      annualDonorCapZAR: randToCents(Number(capRand)),
      warningPercentage: Number(warningPct) / 100,
      aggregationRule,
      financialYearStartMonth: fyStartMonth,
      effectiveDate: new Date(effectiveDate).toISOString(),
      sourceCitation: sourceCitation.trim(),
      createdBy: session!.uid,
    });
  }

  function openForm() {
    // Pre-fill the citation only when there's no current config (first-ever
    // setup, the gazetted default applies); a follow-up config should force
    // a deliberate new citation, not silently reuse the old one.
    setSourceCitation(current ? '' : PPFA_GAZETTE_CITATION);
    setShowForm(true);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader slug="/settings/ppfa-thresholds" title="PPFA Threshold Config" />

      {current ? (
        <div className="bg-ink text-paper rounded-lg p-4 space-y-1">
          <p className="text-label-caps font-display uppercase text-gold">Current governing figures</p>
          <p className="text-display-lg-mobile font-display">{formatZAR(current.disclosureThresholdZAR)} disclosure</p>
          <p className="text-body-md font-body text-paper/80">
            {formatZAR(current.annualDonorCapZAR)} annual cap · warning at {Math.round(current.warningPercentage * 100)}%
            · FY starts {MONTH_LABEL[current.financialYearStartMonth - 1]} · aggregation:{' '}
            {current.aggregationRule === 'PER_DONATION' ? 'per donation' : 'cumulative per donor per year'}
          </p>
          <p className="text-body-md font-body text-paper/80">
            Effective {new Date(current.effectiveDate).toLocaleDateString('en-ZA')} · {current.sourceCitation}
          </p>
        </div>
      ) : (
        !historyQuery.isLoading && (
          <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
            No PPFA configuration exists for this tenant yet — create one below before /finance can evaluate
            donations against a real threshold.
          </p>
        )
      )}

      <div className="border-l-4 border-gold bg-paper p-3">
        <p className="text-body-md font-body text-ink">
          <strong>The aggregation rule and financial-year start month are provisional</strong> (build spec §6.8.1
          Q1/Q2, unresolved) — set here as tenant configuration, not hardcoded, so answering them later is a new
          config entry, not a rewrite. See docs/unverified-source-documents.md.
        </p>
      </div>

      <div>
        <Button onClick={() => (showForm ? setShowForm(false) : openForm())} aria-expanded={showForm}>
          {showForm ? 'Cancel' : current ? '+ New configuration' : '+ Create configuration'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          {/*
           * Seven bare <label> wrappers before this, none associated —
           * on the screen that records what the law is understood to
           * require, with a source citation attached. The citation field
           * in particular had a placeholder standing in for a label, and
           * a placeholder vanishes the moment somebody types.
           */}
          <Card tone="accent" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Disclosure threshold (ZAR)" required>
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="0"
                    value={disclosureRand}
                    onChange={(e) => setDisclosureRand(e.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Annual donor cap (ZAR)" required>
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="0"
                    value={capRand}
                    onChange={(e) => setCapRand(e.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Warning at (%)">
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="0"
                    max="100"
                    value={warningPct}
                    onChange={(e) => setWarningPct(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Financial year starts">
                {(props) => (
                  <select {...props} value={fyStartMonth} onChange={(e) => setFyStartMonth(Number(e.target.value))}>
                    {MONTH_LABEL.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Aggregation rule">
                {(props) => (
                  <select
                    {...props}
                    value={aggregationRule}
                    onChange={(e) => setAggregationRule(e.target.value as AggregationRule)}
                  >
                    <option value="CUMULATIVE_PER_DONOR_PER_YEAR">Cumulative per donor per year</option>
                    <option value="PER_DONATION">Per donation</option>
                  </select>
                )}
              </Field>
              <Field label="Effective date" required>
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                  />
                )}
              </Field>
            </div>

            <Field
              label="Source citation"
              required
              hint="For example: Government Gazette No. XXXXX, DD Month YYYY."
            >
              {(props) => (
                <input
                  {...props}
                  value={sourceCitation}
                  onChange={(e) => setSourceCitation(e.target.value)}
                  required
                />
              )}
            </Field>

            {mutation.isError && (
              <p className="text-body-md font-body text-maroon">
                {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
              </p>
            )}

            <Button type="submit" variant="secondary" disabled={!canSubmit || mutation.isPending} className="w-full">
              {mutation.isPending ? 'Saving…' : 'Create configuration'}
            </Button>
          </Card>
        </form>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <SectionLabel as="h2">History</SectionLabel>
          {history.map((c) => (
            <Card key={c.id}>
              <p className="text-body-md font-body text-ink">
                {formatZAR(c.disclosureThresholdZAR)} disclosure / {formatZAR(c.annualDonorCapZAR)} cap
              </p>
              <DataLine>
                Effective {new Date(c.effectiveDate).toLocaleDateString('en-ZA')} · {c.sourceCitation}
              </DataLine>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
