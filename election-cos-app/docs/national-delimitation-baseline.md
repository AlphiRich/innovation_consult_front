# The proclaimed delimitation, province by province

Derived from `src/data/iec/circular-1-2025-annexure-a.json` — Annexure A to
IEC Circular 1 of 2025, the consolidated delimitation for the local
government election of **4 November 2026**. Every figure here is computed
from that file by `src/modules/reference/provinceDelimitation.ts` and
re-checked on every test run; none is transcribed.

Registered voters are the roll the delimitation was drawn against. Ward
counts and council sizes are the proclaimed structure and are final for
this cycle.

| Province | Metros | Locals | Districts | Wards | Council seats | PR seats | Registered voters |
|---|---:|---:|---:|---:|---:|---:|---:|
| Eastern Cape | 2 | 31 | 6 | 703 | 1,394 | 691 | 3,439,320 |
| Free State | 1 | 19 | 4 | 311 | 613 | 302 | 1,456,927 |
| Gauteng | 3 | 6 | 2 | 526 | 1,049 | 523 | 6,541,978 |
| KwaZulu-Natal | 1 | 43 | 10 | 921 | 1,798 | 877 | 5,738,249 |
| Limpopo | 0 | 22 | 5 | 568 | 1,126 | 558 | 2,779,657 |
| Mpumalanga | 0 | 17 | 3 | 408 | 806 | 398 | 2,025,070 |
| North West | 0 | 18 | 4 | 402 | 795 | 393 | 1,768,576 |
| Northern Cape | 0 | 26 | 5 | 233 | 440 | 207 | 656,826 |
| Western Cape | 1 | 24 | 5 | 416 | 810 | 394 | 3,317,072 |
| **National** | **8** | **206** | **44** | **4,488** | **8,831** | **4,343** | **27,723,675** |

Council seats and registered voters exclude district councils: a district
row repeats the voters of the locals inside it, so adding all 258 rows
double counts everyone outside a metro. District council seats total 1,701
and are reported separately.

Four provinces have no metropolitan municipality: Limpopo, Mpumalanga,
North West and Northern Cape. The eight metros are BUF, CPT, EKU, ETH, JHB,
MAN, NMA and TSH.

## The containment check

A district municipality's registered voters are the sum of the local
municipalities inside it. The annexure carries no column linking the two —
but the codes do: the two digits after the province prefix are the district
number, so `NW371` sits in `DC37`, `EC441` in `DC44`, `WC011` in `DC1`
(leading zero dropped), `KZN212` in `DC21`.

That is an inference, so it is nowhere asserted. It is proved by
consequence: derive membership for all 206 locals, sum each district, and
compare against the district figure the annexure publishes.

**All 44 districts reconcile, every one to the voter.** Two things follow —
the code-to-district mapping is right, and the annexure's district rows and
local rows agree across the whole country. The check is sensitive enough
that adding one voter to one municipality's figure breaks exactly one
district and names it, which is how it was verified.

Metros are excluded rather than assigned: a category A municipality has
exclusive authority over its area and belongs to no district, and its code
carries no district digits.

## Cross-source confirmation, by province

| Province | Ward count confirmed against | Status |
|---|---|---|
| North West | MDB final 2026 ward layer, 402 features, via `NW_07_Repository_Manifest.xlsx` | **Confirmed** — all 18 municipalities individually |
| The other eight | — | Delimitation baseline only |

North West is the one province whose ward counts have been checked against
a second, independently produced artefact. For the other eight the baseline
is a single primary source — which is the Commission's own consolidation of
the delimitation, not a secondary figure, but it is one document. The
national MDB layer should carry 4,488 ward features; that number is this
build's, from the baseline, and nobody has counted the layer.

## Historical results: what is in place and what is not

The delimitation baseline is a 2026 document. It carries no election
results, so none of the per-province history the repository manifest's
pipeline was built for is here.

What is in place is the acquisition path. `sources.json` now carries
results rows for all nine provinces:

- **North West** — five cycles, `CONFIRMED`, fetched by the supplier on
  23 September 2026 with row counts recorded and asserted as
  `expect.min_rows`.
- **The other eight** — 2011, 2016 and 2021 each, `UNCONFIRMED`. The event
  id in each URL is confirmed (it is the id North West was fetched from for
  that cycle); the province token is inferred from that one confirmed URL.
  No row count is known, so none is claimed.
- **2000 and 2006** — single national archives, one row each, confirmed.
  Note that in 2006 the code `NW405` is Merafong City, not JB Marks; see
  `src/modules/reference/municipalCodeHistory.ts` before joining across
  cycles.

To close a province: `python3 tools/source-acquisition/acquire.py --fetch
--province GP`, open the file, confirm it is that province and that cycle,
put the row count in `expect.min_rows`, promote the row and say who and
when in the note.

## Municipal code history: reviewed for one province

`municipalCodeHistory.ts` holds the discontinuities that break a join
across election years. They have been reviewed for **North West only**,
from the repository manifest. `provinceReviewStatus()` returns all nine
provinces with a review flag, and the Wards page tells an operator in an
unreviewed province what that means for them, because silence there would
read as "no code changes in this province" — which nobody has established.

Reviewing a province means obtaining its IEC results files for 2000–2021,
listing the codes present in each, and identifying every code whose
municipality changed. North West produced six such changes from twenty-four
codes.
