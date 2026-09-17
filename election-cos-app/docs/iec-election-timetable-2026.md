# 2026 LGE Election Timetable — provenance

Session 9 (9 Aug 2026). The human supplied a PDF printout described as
"from the IEC website newsletter" — a news article, "Electoral Commission
publishes the 2026 LGE Election Timetable," attributed to
elections.org.za's News section. Transcribed into
`src/modules/knowledge/ElectionTimetablePage.tsx` following the same
static-reference-page discipline as `GatheringsAdvisoryPage.tsx` (§6.7):
no tracking, no alerts, no data model, just a cited reference.

## Why this is treated with more confidence than the session-8 "digest" PDFs

`docs/unverified-source-documents.md` flagged three PDFs from the prior
session as not authoritative, for specific reasons (identical
to-the-minute timestamps, a self-referential "repository" citation style,
an architecture contradiction, a wrong acronym, unverifiable precise
statistics). This document doesn't share those red flags:

- A named spokesperson with a real-looking direct contact line and a
  `spokesperson@elections.org.za` address, not a generic internal
  reference code.
- A named sitting Minister (Cooperative Governance and Traditional
  Affairs) attributed to the proclamation.
- Real IEC social-media handles and a `Home > About Us > News` breadcrumb
  consistent with an actual website page, not a "Repository Location"
  label.
- Internally consistent statistics: every province row in both the
  registration-drive and WhatsApp-registration tables sums correctly to
  its stated grand total.
- It **corroborates**, rather than merely repeats, one specific fact from
  the previously-unverified digest — the 4 November 2026 election date —
  from an independent-looking source with a materially different
  presentation. Two documents agreeing on a fact isn't proof, but it's a
  meaningfully different situation from one uncorroborated claim.

None of this amounts to independent verification — this build did not
fetch elections.org.za directly to confirm the article exists as
described. It's a step up in credibility from the session-8 batch, not a
certification. The specific dates transcribed onto the new page should
still be checked against the live Government Gazette or elections.org.za
before anyone relies on them for an actual filing deadline — the page
itself says so.

## What this does NOT change

The session-8 skepticism toward the *other* claims in the three flagged
digest PDFs stands as written — this article doesn't corroborate the
council-size formula, the national voters'-roll totals, gazette number
51321, or the "AWS af-south-1 / 48-hour hard-purge" compliance items. One
corroborated fact (the election date) doesn't retroactively validate
unrelated claims in a different, separately-untrustworthy document.

## Kopanong Local Municipality — noted for future demarcation work

The article reports a High Court stay (6 August 2026, Bloemfontein) of
the Municipal Demarcation Board's 2026 re-determination that would have
split Kopanong Local Municipality (Free State) into two. For the 2026
LGE, Kopanong remains the single municipality it was for LGE2021, with 9
wards. Recorded here so that if this build ever ingests Free State
demarcation gazettes (the same `tools/seed-data/parse-nw405-demarcation.mjs`
pattern used for JB Marks/NW405 — see `docs/nw405-seed-data.md`), it
doesn't seed Kopanong as two municipalities from a 2026 MDB source without
checking whether this stay is still in effect.

## Seat calculator — confirmed correct, no further action

The human separately confirmed the session-8 seat-calculator quota-formula
correction (real NW405 IEC data vs. the prior Droop-quota guess) is
correct and should be retained as-is. No code change this session; noted
here only to close the loop — see `docs/nw405-seed-data.md` for the fix
itself.
