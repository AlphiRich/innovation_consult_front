/**
 * Election-COS1.0 — 2026 LGE Election Timetable (reference)
 * IC-ECOS-BUILD-2026-V2 §6.7 pattern: a single static reference page, no
 * tracking, no alerts, no workflow, no data model — same discipline as
 * GatheringsAdvisoryPage.tsx. Capability requirement: `always`.
 *
 * Source: an Electoral Commission of South Africa website news article,
 * "Electoral Commission publishes the 2026 LGE Election Timetable",
 * supplied by the human (session 9, 9 Aug 2026) — elections.org.za, News.
 * This page transcribes it; it hasn't been independently re-fetched from
 * elections.org.za by this build. See docs/iec-election-timetable-2026.md
 * for the full provenance note, including why this source is treated with
 * materially more confidence than the three "digest" PDFs flagged in
 * docs/unverified-source-documents.md (named spokesperson + real contact
 * details, a real Minister's name, internally-consistent province-level
 * statistics that sum correctly) — while still not being independently
 * verified by this build against the live Government Gazette.
 */
export function ElectionTimetablePage() {
  return (
    <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-3xl">
      <p className="font-mono text-xs text-slate">/knowledge/election-timetable</p>
      <h1 className="font-display text-2xl text-ink mt-1">2026 Local Government Elections — Timetable</h1>
      <p className="mt-1 text-sm text-slate">
        Source: Electoral Commission of South Africa, "Electoral Commission publishes the 2026 LGE Election
        Timetable," elections.org.za News.
      </p>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink">
        <p>
          <strong>Election Day: Wednesday, 4 November 2026.</strong> Proclaimed by the Minister of Cooperative
          Governance and Traditional Affairs, commencing the 89-day Election Timetable published in the Government
          Gazette under the Local Government: Municipal Electoral Act 27 of 2000 and Regulations. All timetable
          activities must be completed by <strong>17h00</strong> on their respective cut-off dates.
        </p>

        <div>
          <h2 className="font-display text-base text-ink">Voters' roll</h2>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>Roll closed to new registrations/changes: midnight, 7 August 2026</li>
            <li>Provisional roll open for inspection: 11 August 2026</li>
            <li>Inspection / objection period closes: 18 August 2026</li>
            <li>Objectors notified of decisions by: 24 August 2026</li>
            <li>Chief Electoral Officer certifies the final roll: 26 August 2026</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base text-ink">Candidate nominations</h2>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>Nominations open: 7 August 2026 (21 calendar days)</li>
            <li>Nominations close: 17h00, 28 August 2026 — both the Online Candidate Nomination System (OCNS) and manual hand-delivery close at exactly this time</li>
            <li>Final list of successful candidates published: 16 September 2026</li>
            <li>Certificates of candidacy issued: 25 September 2026</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base text-ink">Special votes</h2>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>Applications open: 21 September 2026</li>
            <li>Applications close: 12 October 2026</li>
            <li>Home/institution visits or voting-station special votes: 2–3 November 2026</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base text-ink">Other key dates</h2>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>List of voting stations (incl. mobile station routes) published: 14 August 2026</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base text-ink">Nomination deposits</h2>
          <p className="mt-1">
            Refundable if the contestant obtains at least one PR seat, or ≥10% of valid votes in the applicable ward
            election; otherwise forfeited to the National Revenue Fund.
          </p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>Metro (all PR &amp; ward candidates of a party): R4,700</li>
            <li>Local Council (all PR &amp; ward candidates of a party): R2,800</li>
            <li>District Council (all PR candidates): R1,800</li>
            <li>Independent ward candidate, or a party ward candidate not contesting PR: R1,800</li>
            <li>Total if contesting every municipality: R693,600</li>
          </ul>
        </div>

        <div className="border-l-4 border-gold bg-paper p-3">
          <h2 className="font-display text-base text-ink">Kopanong Local Municipality — boundary stayed by court order</h2>
          <p className="mt-1">
            On 6 August 2026 the High Court of South Africa (Bloemfontein) stayed the Municipal Demarcation Board's
            2026 re-determination that split Kopanong Local Municipality (Free State) into two municipalities, until
            the 2031 election cycle. Kopanong remains a <strong>single</strong> municipality for the 2026 LGE, with
            its LGE2021 boundaries and 9 wards. Relevant if this build ever seeds Free State demarcation data —
            don't seed Kopanong as two municipalities from a 2026 MDB source without checking this stands.
          </p>
        </div>

        <p className="font-medium">
          This is a reference summary of a news article, not the Government Gazette itself, and not legal advice.
          Verify current dates directly at elections.org.za before relying on them for a filing deadline.
        </p>
      </div>
    </div>
  );
}
