/**
 * Election-COS1.0 — Gatherings advisory
 * IC-ECOS-BUILD-2026-V2 §6.7.
 *
 * "Build a single static page. No tracking, no alerts, no workflow, no
 * data model." This IS the whole feature — do not add a permit tracker,
 * a T-7/T-3 alert, or a status workflow to this file or anywhere else.
 * Capability requirement: `always` (see routes.tsx).
 */
export function GatheringsAdvisoryPage() {
  return (
    <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-3xl">
      <p className="font-mono text-xs text-slate">/knowledge/gatherings-advisory</p>
      <h1 className="font-display text-2xl text-ink mt-1">
        Advisory: Public gatherings and the Regulation of Gatherings Act 205 of 1993
      </h1>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink">
        <p>
          Campaign rallies, marches, and public meetings are regulated by the Regulation of
          Gatherings Act 205 of 1993. <strong>Section 3(2)</strong> requires the convener to give
          written notice to the responsible officer of the relevant local authority{' '}
          <strong>not later than seven days</strong> before the gathering. Where seven days'
          notice is not reasonably possible, notice must be given at the earliest opportunity,
          and reasons for late notice must be stated.{' '}
          <strong>
            Where notice is given less than 48 hours before the gathering commences, the
            responsible officer may prohibit it.
          </strong>
        </p>

        <p>
          This is a <strong>notice</strong> regime, not a permit regime — the convener notifies;
          the responsible officer may impose conditions or prohibit.
        </p>

        <p>
          In <em>Mlungwana and Others v S</em> [2018] ZACC 45, the Constitutional Court confirmed
          that section 12(1)(a), which criminalised convening a gathering of more than 15 people
          without notice, is unconstitutional and invalid.
        </p>

        <p className="font-medium">
          Election-COS1.0 does not file notices, track permits, or monitor compliance on
          your behalf. This advisory is general information, not legal advice. Consult your
          party's legal officer.
        </p>
      </div>
    </div>
  );
}
