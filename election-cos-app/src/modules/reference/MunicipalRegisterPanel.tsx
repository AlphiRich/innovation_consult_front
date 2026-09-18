/**
 * Election Campaign OS — the tenant's figures beside the IEC's
 * IC-ECOS-BUILD-2026-V2 §6.1.
 *
 * Every other check on the Wards page compares this tenant against
 * itself. `reconcileSeed()` can tell you the ward count matches
 * Municipality Config; it cannot tell you either of them is right, and
 * says so. This panel is the first one that can, because the figures on
 * the other side of the comparison come from outside: Annexure A to IEC
 * Circular 1 of 2025.
 *
 * It shows agreement as prominently as disagreement. A campaign that has
 * seeded 34 wards and 122,059 voters and can see the IEC publishing the
 * same two numbers has something no amount of internal consistency gives
 * it, and burying that under a green tick would waste it.
 *
 * No route of its own — §3.2 fixes the navigation at nine items, and this
 * belongs beside the wards it is checking.
 */
import { BAND_BASIS, VINTAGE_BASIS, checkAgainstRegister } from './municipalRegister';

const fmt = (n: number) => n.toLocaleString('en-ZA');

export interface MunicipalRegisterPanelProps {
  municipalityCode: string;
  wardCount: number;
  registeredVoters: number;
  totalCouncilSeats?: number;
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
    wards: props.wards,
  });

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-label-caps font-display uppercase text-slate">
          Against the IEC&rsquo;s published figures
        </h2>
        <p className="text-data-mono font-mono text-slate">
          Annexure A · Circular 1 of 2025 · {check.entry ? `${check.entry.code} ${check.entry.name}` : code}
        </p>
      </div>

      {check.entry && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">IEC wards</p>
            <p className="text-headline-md font-display text-ink">
              {check.entry.wards === undefined ? '—' : fmt(check.entry.wards)}
            </p>
          </div>
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">MEC councillors</p>
            <p className="text-headline-md font-display text-ink">{fmt(check.entry.councillors)}</p>
          </div>
          <div className="border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">IEC voters (2024)</p>
            <p className="text-headline-md font-display text-ink">{fmt(check.entry.registeredVoters)}</p>
          </div>
        </div>
      )}

      {check.band && (
        <p className="text-data-mono font-mono text-slate">
          Published band · norm {fmt(check.band.norm)} · {fmt(check.band.minNorm)} to {fmt(check.band.maxNorm)}{' '}
          registered voters per ward
        </p>
      )}

      <ul className="space-y-1">
        {check.findings.map((finding) => (
          <li
            key={finding.code}
            className={`text-body-md font-body ${
              finding.outcome === 'DISAGREES'
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
              {ward.position === 'BELOW' ? 'below the published minimum' : 'above the published maximum'}
            </p>
          ))}
          {check.outsideBand.length > 8 && (
            <p className="text-body-md font-body text-slate">
              … and {check.outsideBand.length - 8} more.
            </p>
          )}
        </div>
      )}

      <p className="text-body-md font-body text-slate">{VINTAGE_BASIS}</p>
      {check.band && <p className="text-body-md font-body text-slate">{BAND_BASIS}</p>}
    </div>
  );
}
