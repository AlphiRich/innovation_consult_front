/**
 * Election Campaign OS — Gatherings advisory
 * IC-ECOS-BUILD-2026-V2 §6.7.
 *
 * "Build a single static page. No tracking, no alerts, no workflow, no
 * data model." This IS the whole feature — do not add a permit tracker,
 * a T-7/T-3 alert, or a status workflow to this file or anywhere else.
 * Capability requirement: `always` (see routes.tsx).
 *
 * Session 44: this page was setting its own type scale — Tailwind's
 * `text-sm`, 14px — so a statutory advisory rendered two points smaller
 * than every other screen in the product. Small print is precisely the
 * wrong signal for the one page that quotes an Act and a Constitutional
 * Court judgment. Now on `text-body-md`, like everything else.
 */
import { Card, PageHeader } from '@/components/ui';

export function GatheringsAdvisoryPage() {
  return (
    <Card className="max-w-3xl">
      <PageHeader
        slug="/knowledge/gatherings-advisory"
        title="Advisory: Public gatherings and the Regulation of Gatherings Act 205 of 1993"
      />

      <div className="mt-4 space-y-4 text-body-md font-body leading-relaxed text-ink">
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
          Election Campaign OS does not file notices, track permits, or monitor compliance on
          your behalf. This advisory is general information, not legal advice. Consult your
          party's legal officer.
        </p>
      </div>
    </Card>
  );
}
