/**
 * Election Campaign OS — the disclosure register, on screen
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3. Capability: `ppfa.view`.
 *
 * One read of the financial year, assembled by `disclosureRegister.ts`.
 * It answers the question the funding module exists for and could not
 * previously answer without a spreadsheet: which donors have reached the
 * threshold, and what is still undisclosed.
 *
 * It files nothing and it computes nothing official. The real aggregation
 * is held pending §6.8.1, and this says so rather than letting a tidy
 * table imply otherwise.
 */
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';
import { formatZAR } from '@/lib/money';
import { buildDisclosureRegister } from './disclosureRegister';
import { deriveFinancialYear } from './financialYear';
import { Q1_UNRESOLVED, RESTRICTED_DONOR_BASIS, RULE_BASIS } from './donorExposure';

const LEVEL_LABEL: Record<string, string> = {
  WARNING: 'Approaching disclosure',
  DISCLOSURE_REQUIRED: 'Disclosure threshold reached',
  CAP_APPROACHING: 'Approaching annual cap',
  CAP_EXCEEDED: 'Annual cap exceeded',
};

interface DisclosureRegisterPanelProps {
  ctx: SessionContext;
  config: PPFAConfig;
  onSelectDonor: (donorId: string) => void;
}

export function DisclosureRegisterPanel({ ctx, config, onSelectDonor }: DisclosureRegisterPanelProps) {
  const financialYear = deriveFinancialYear(new Date(), config.financialYearStartMonth);

  const donationsQuery = useQuery({
    queryKey: ['donations', ctx.tenantId, 'fy', financialYear],
    queryFn: () => dal.donations.listByFinancialYear(ctx, financialYear),
  });
  const donorsQuery = useQuery({
    queryKey: ['donors', ctx.tenantId],
    queryFn: () => dal.donors.listAll(ctx),
  });

  if (donationsQuery.isLoading || donorsQuery.isLoading) {
    return <p className="text-body-md font-body text-slate">Loading the register…</p>;
  }

  const register = buildDisclosureRegister(
    donorsQuery.data ?? [],
    donationsQuery.data ?? [],
    config,
    new Date(),
  );

  return (
    <section className="space-y-3 border border-ink/10 bg-white rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-headline-md font-display text-ink">Disclosure register — {register.financialYear}</h2>
        <p className="text-data-mono font-mono text-slate">
          {formatZAR(register.totalZAR)} recorded · {register.undisclosedCount} not marked disclosed
        </p>
      </div>
      <p className="text-body-md font-body text-slate">{RULE_BASIS[config.aggregationRule]}</p>

      {register.rows.length === 0 && (
        <p className="text-body-md font-body text-slate">
          No donations recorded in this financial year. That is an empty register, not a nil return — nothing
          here files anything.
        </p>
      )}

      {register.needingDisclosure.length > 0 && (
        <div className="border-l-4 border-maroon pl-3 space-y-1">
          <p className="text-label-caps font-display uppercase text-maroon">
            {register.needingDisclosure.length} donor(s) at or above the disclosure threshold
          </p>
          <p className="text-body-md font-body text-slate">
            Reaching the threshold is not the same as having filed. Marking a donation disclosed here records
            what your campaign did with the IEC; the platform submits nothing.
          </p>
        </div>
      )}

      {register.orphaned.length > 0 && (
        <div className="border-l-4 border-maroon pl-3 space-y-1">
          <p className="text-label-caps font-display uppercase text-maroon">
            {register.orphaned.length} donation(s) with no donor record
          </p>
          <p className="text-body-md font-body text-slate">
            {formatZAR(register.orphaned.reduce((sum, d) => sum + d.amountZAR, 0))} is recorded against a donor
            this account cannot read. It is counted in the year&apos;s total above and belongs to nobody in the
            table below. Find out whose it is before you file anything.
          </p>
        </div>
      )}

      {register.restricted.length > 0 && (
        <div className="border-l-4 border-maroon pl-3 space-y-1">
          <p className="text-label-caps font-display uppercase text-maroon">
            {register.restricted.length} flagged donor(s) with money in this year
          </p>
          <p className="text-body-md font-body text-slate">{RESTRICTED_DONOR_BASIS}</p>
        </div>
      )}

      {register.rows.length > 0 && (
        <table className="w-full text-left">
          <thead>
            <tr className="text-label-caps font-display uppercase text-slate">
              <th className="py-1">Donor</th>
              <th className="py-1">Cumulative</th>
              <th className="py-1">Largest single</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {register.rows.map((row) => (
              <tr key={row.donor.id} className="border-t border-ink/10">
                <td className="py-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectDonor(row.donor.id)}
                    className="text-body-md font-body text-ink underline text-left"
                  >
                    {row.donor.displayName}
                  </button>
                  {row.restricted && (
                    <span className="ml-2 text-label-caps font-display uppercase text-maroon">Flagged</span>
                  )}
                </td>
                <td className="py-1.5 text-data-mono font-mono text-ink">
                  {formatZAR(row.exposure.cumulativeZAR)}
                </td>
                <td className="py-1.5 text-data-mono font-mono text-slate">
                  {formatZAR(row.exposure.largestSingleZAR)}
                </td>
                <td className="py-1.5 text-body-md font-body text-ink">
                  {row.exposure.level ? LEVEL_LABEL[row.exposure.level] : '—'}
                  {row.exposure.rulesDisagree && (
                    <span className="block text-body-md font-body text-teal">
                      The other reading of the rule disagrees
                    </span>
                  )}
                  {row.exposure.undisclosed.length > 0 && (
                    <span className="block text-data-mono font-mono text-slate">
                      {row.exposure.undisclosed.length} not marked disclosed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-body-md font-body text-slate border-t border-ink/10 pt-3">{Q1_UNRESOLVED}</p>
    </section>
  );
}
