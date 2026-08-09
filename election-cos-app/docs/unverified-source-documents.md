# Unverified source documents — not treated as authoritative

Session 8 (9 Aug 2026). Of the five PDFs supplied to assist the Wards/VDs
build, two are genuine government/IEC documents (see
`docs/nw405-seed-data.md`) and three are treated here with active
skepticism. This isn't a claim that they're fabricated — it's a record of
why they weren't trusted as statutory sources, so a future session doesn't
have to re-derive the same judgement call or, worse, silently absorb them
as fact.

## The three documents

1. `Electoral_Legislative_Framework__Government_Gazette_Digest.pdf`
2. `National_Voters_Roll_Amended_Audit__Registration_Drive_Analysis.pdf`
3. `Municipal_Council_Seat_Determination__Seat_Allocation_Mathematical_Conventions.pdf`

## Why they weren't treated as authoritative

- **Identical publication timestamps to the minute** — all three say
  "Publication Date: 7 August 2026 (13:38 SAST)", despite claiming to
  digest unrelated source material (legislation, a voters'-roll audit,
  and mathematical conventions) that a real government/IEC process would
  not publish in the same minute.
- **Self-referential "repository" framing, not a citation of a real
  publication** — each carries a `Repository Location: 03 Election
  Campaign OS / Government Gazette & Regulatory Data Repository` line and
  a `Document Reference: IEC-LGE2026-...-V1` code. That's the shape of an
  internal working-folder label, not an IEC or Government Printing Works
  document identifier — nothing in this batch is a scan or a
  government-issued PDF with the letterhead/ISSN/GPW markers the two
  genuine documents both carry (see `docs/nw405-seed-data.md`).
- **A direct architecture contradiction.** Document 1's compliance
  checklist calls for "AWS Cape Town af-south-1" data residency and a
  "48-hour hard-purge compliance daemon." Both conflict with this
  codebase's actual, already-decided architecture (GCP `africa-south1`,
  Firestore/Storage — IC-ECOS-BUILD-2026-V2 §0 rule 1) and with the
  POPIA retention design already built (per-record consent + deletion
  reason, not a blanket 48-hour purge). This is the same category of
  conflict as `CLAUDEHANDOFF.md`'s stale AWS architecture in session 3 —
  **not acted on**, for the same reason: it contradicts the governing
  spec and there's no way to verify which one is actually current.
- **A factual slip that a real scrape of Home Affairs/IEC material
  wouldn't make.** Document 2 refers to "the Department of Home Affairs
  National Population Register (NPA)" — the acronym is NPR, not NPA.
  Minor on its own, but consistent with a generated summary rather than a
  transcription of a real source.
- **Precise-looking statistics with no verifiable source.** Document 2's
  national voters'-roll totals (29.1 million, 754,332 net additions,
  27,912,415 pre-registration baseline, per-province percentages to one
  decimal place) and document 3's council-size formula (piecewise, with
  specific break points at 20,000/120,000 registered voters and
  divisors of 2,200/8,600) read as plausible but are not independently
  checkable against anything supplied to any build session.

## What's genuinely useful here, and was adopted (with independent verification)

Document 3's **Schedule 1 PR-seat-allocation methodology** (quota = total
votes ÷ (total seats − independent ward winners − no-PR-list ward
winners), then largest remainder) is **not** taken on this document's own
authority — it happens to match, term for term, the formula printed
directly on the genuine `NW405.pdf` IEC report, which was independently
used to fix a real bug in `seatCalculator.ts` (see
`docs/nw405-seed-data.md`). That the digest's summary of Schedule 1 turned
out accurate is a point in its favour for that one section, not a reason
to trust the rest of the batch — the council-size formula in the same
document has no such independent confirmation and was **not** implemented
anywhere in this codebase.

## What was, and wasn't, done with the rest

**Not implemented, not hardcoded, not cited as fact anywhere in the app
or its docs:**
- The council-size determination formula (document 3, §1).
- The national voters'-roll totals, registration-drive numbers, and
  demographic breakdown (document 2).
- The specific gazette numbers (51321, the proclamation gazette), the 4
  November 2026 election date, and the 7 August 2026 roll-closure
  date/time (document 1 and 2) — none of these appear anywhere in
  `election-cos-app`'s code, config, or generated legal documents.
- The "AWS af-south-1" / "48-hour hard-purge daemon" compliance items —
  explicitly contradicted, not adopted.

If any of these turn out to be real (the election date and roll-closure
date in particular are the kind of fact a human can straightforwardly
confirm against the actual Government Gazette or iec.org.za), say so
explicitly and they can be wired in with a citation to the real source —
the same standard already applied to the PPFA thresholds (Gazette No.
53182, confirmed in an earlier session) and the domain name
(confirmed by the human directly, session 6).
