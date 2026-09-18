/**
 * Election Campaign OS — the tenant's figures against the proclaimed delimitation
 * IC-ECOS-BUILD-2026-V2 §6.1.
 *
 * Every other check on the Wards page compares this tenant against
 * itself. `reconcileSeed()` can tell you the ward count matches
 * Municipality Config; it cannot tell you either of them is right, and
 * says so.
 *
 * This panel can. The figures on the other side are the delimitation
 * proclaimed for 4 November 2026 — wards delimited by the Demarcation
 * Board, council sizes determined by the provincial MECs, consolidated by
 * the Electoral Commission. A campaign whose ward count disagrees with it
 * is working from wrong data, and everything downstream — coverage
 * percentages, canvassing targets, seat projections — is wrong with it.
 * So a contradiction is shown as a contradiction, not as a note.
 *
 * Agreement is shown just as plainly. A campaign that can see its 34
 * wards and 122,059 voters matching the proclaimed structure has
 * confirmation it is running against the real election, which is worth
 * more than a green tick.
 *
 * No route of its own — §3.2 fixes the navigation at nine items, and this
 * belongs beside the wards it is checking.
 */
import {
  BAND_BASIS,
  BASELINE_AUTHORITY,
  DELIMITATION_VERSION,
  checkAgainstRegister,
} from './municipalRegister';

const fmt = (n: number) => n.toLocaleString('en-ZA');

export interface MunicipalRegisterPanelProps {
  municipalityCode: string;
  wardCount: number;
  registeredVoters: number;
  totalCouncilSeats?: number;
  prSeats?: number;
  wards: { wardCode: string; registeredVoters: number }[];
}

export function MunicipalRegisterPanel(props: MunicipalRegisterPanelProps) {
  const code = props.municipalityCode.trim();
  if (code === '') return null;

  const check = checkAgainstRegister({
    municipalityCode: code,
    wardCount: props.wardCount,
    registeredVoters: props.registeredVoters,
    totalCouncilSeats: props.totalCouncilSeats,
    prSeats: props.prSeats,
    wards: props.wards,
  });

  const { baseline } = check;

  return (
    <div
      className={`bg-white rounded-lg p-4 space-y-3 border ${
        check.alignedToBaseline ? 'border-ink/10' : 'border-maroon'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-label-caps font-display uppercase text-slate">
          Proclaimed delimitation{check.alignedToBaseline ? ' · aligned' : ' · does not match'}
        </h2>
        <p className="text-data-mono font-mono text-slate">
          {DELIMITATION_VERSION.electoralEvent} · {baseline ? `${baseline.code} ${baseline.name}` : code}
        </p>
      </div>

      {baseline && (
        <div className="grid grid-cols-4 gap-3">
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">Wards</p>
            <p className="text-headline-md font-display text-ink">
              {baseline.wardSeats === undefined ? '—' : fmt(baseline.wardSeats)}
            </p>
          </div>
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">Council</p>
            <p className="text-headline-md font-display text-ink">{fmt(baseline.councillors)}</p>
          </div>
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">PR seats</p>
            <p className="text-headline-md font-display text-ink">
              {baseline.prSeats === undefined ? '—' : fmt(baseline.prSeats)}
            </p>
          </div>
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">Category</p>
            <p className="text-headline-md font-display text-ink">{baseline.category}</p>
          </div>
        </div>
      )}

      {check.band && (
        <p className="text-data-mono font-mono text-slate">
          Delimitation band · norm {fmt(check.band.norm)} · {fmt(check.band.minNorm)} to{' '}
          {fmt(check.band.maxNorm)} registered voters per ward
        </p>
      )}

      <ul className="space-y-1">
        {check.findings.map((finding) => (
          <li
            key={finding.code}
            className={`text-body-md font-body ${
              finding.severity === 'BLOCKING'
                ? 'text-maroon'
                : finding.outcome === 'CONFIRMS'
                  ? 'text-green'
                  : 'text-slate'
            }`}
          >
            {finding.message}
          </li>
        ))}
      </ul>

      {check.outsideBand.length > 0 && (
        <div className="border-l-4 border-gold pl-3 space-y-1">
          {check.outsideBand.slice(0, 8).map((ward) => (
            <p key={ward.wardCode} className="text-data-mono font-mono text-slate">
              {ward.wardCode} · {fmt(ward.registeredVoters)} · {fmt(ward.marginToBound)}{' '}
              {ward.position === 'BELOW' ? 'below the minimum' : 'above the maximum'}
            </p>
          ))}
          {check.outsideBand.length > 8 && (
            <p className="text-body-md font-body text-slate">
              … and {check.outsideBand.length - 8} more.
            </p>
          )}
          <p className="text-body-md font-body text-slate">{BAND_BASIS}</p>
        </div>
      )}

      <p className="text-body-md font-body text-slate">{BASELINE_AUTHORITY}</p>
    </div>
  );
}
