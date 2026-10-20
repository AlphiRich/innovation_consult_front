# LGE2026 candidate database — provenance and extraction notes

`seed-data/lge2026-candidate-database.csv` — the full national candidate
list for the 4 November 2026 Local Government Elections, consolidated
from the Electoral Commission's own certified candidate lists.

## Source

Nine provincial PDFs, each titled `LGE2026 Certified Candidate List -
<XX>.pdf` (EC, FS, GP, KZN, LP, MP, NC, NW, WC), human-supplied as a 7z
archive (`IEC - LGE 2026 PUBLICATIONS/LGE2026 - CANDIDATE LISTS - 16 SEPT
2026/`). These are IEC-generated tabular exports — real text layer, not
scans, carrying the IEC's own pagination footer on every page. A tenth
file in the same archive, `LGE2026 Certified Candidates List_16092026.pdf`
(the single national consolidated PDF, 2,137 pages), was **not** used as
the extraction source: it would need a separate municipality-code→province
lookup to tag rows by province, where the nine per-province files give that
for free from the filename. It was not cross-checked against this output
either, since its page count doesn't cleanly equal the sum of the nine
provincial files' page counts (2,137 vs 2,531) and reconciling that gap
wasn't judged worth it for a lower-trust secondary check.

A NotebookLM-generated sample (`Candidate-database-schema-...csv`, 51 rows
covering only a handful of municipalities) was supplied separately and
used **only** for its column-naming convention, not as source data — see
"What the NotebookLM sample got right and wrong" below.

## Schema

| Column | Meaning |
|---|---|
| `province` / `province_code` | From the source filename, not parsed from content. |
| `district` | Derived, not published directly — see below. Blank never occurs (0 of 136,722 rows). |
| `municipality_code` / `municipality_name` | Split from the PDF's `Municipality` column on `" - "`. |
| `party` | As published. |
| `candidate_type` | `Ward Candidate` / `PR List Candidate` / `UNKNOWN` — derived from the raw value's own digit-length, not assumed. |
| `ward_or_list_order` | The raw published value, unmodified — a plain ward number for ward candidates, an 8-digit PR list code for list candidates (e.g. `64005011`). Not decoded further; carried through as-is. |
| `fullname` / `surname` | Split from the PDF's `Fullname`/`Surname` columns. The source's own "Fullname" column holds given names only; the actual surname is a separate, further-right column. |
| `id_number_masked` | As published — POPIA-masked, e.g. `680423****08*`. |

## How `district` was derived — mechanically, not by lookup

Local-municipality codes embed their parent district council's number as
the first two digits of their own 3-digit numeric suffix: `NW405` → `40`
→ `DC40` ("Dr Kenneth Kaunda"). This was verified directly against the
source data itself (not assumed): every `DCnn` entry and every local
municipality code appear in the *same* province file, so the match was
checked province by province before being trusted — confirmed for NW
(DC37/38/39/40 ↔ NW37x/38x/39x/40x), NC (DC6/7/8/9/45 ↔ NC06x/07x/08x/09x/45x,
including DC6's un-padded single digit), GP, and WC. Metro codes are
alphabetic only (`JHB`, `CPT`, `NMA`, `TSH`, `EKU`, ...) and have no parent
district; their `district` is set to `"<name> Metro (<code>)"`.

Result: **0 of 136,722 rows have an unresolved district**, across all 257
municipality codes found (which independently matches South Africa's real
total of 257 municipal entities — 8 metros + 205 local + 44 district
councils — a cross-check this extraction didn't target but landed on).

## Two real extraction bugs found and fixed while building this

1. **EC's ward-number and ID-number render with no gap and merge into one
   PDF word token** (e.g. `83870617****08*` instead of `83` and
   `870617****08*` as separate tokens) — every other province's PDF keeps
   them as separate tokens. Fixed by regexing the ID's fixed 13-character
   mask pattern out of the concatenation of both columns' raw text, rather
   than trusting pdfminer's word boundaries. Verified against both EC (the
   glued case) and NW (the already-separated case) to confirm one method
   handles both.
2. **Column-boundary floating-point precision**: a data word's x-position
   can land a fraction of a point left of the column boundary derived from
   that page's own header row (e.g. `AL` of the party `AL JAMA-AH` at
   x=108.51 against a `Party` header at x=108.546 — sub-pixel font-metric
   noise, not a real column difference). Without a tolerance margin, this
   silently split party names like `AL JAMA-AH` → municipality-leak `AL` +
   party `JAMA-AH`, and `DEMOCRATIC ALLIANCE` → municipality-leak
   `DEMOCRATIC` + party `ALLIANCE`. Fixed with a 3pt margin on every column
   boundary (safe given real column gaps are tens of points). This dropped
   the unique-party count from 566 to **519** and the blank-surname count
   from 17 to 4 — both counts now believed accurate, not just smaller.

## Known, bounded gaps — not silently dropped, not guessed

- **228 rows (0.17%) have a blank `ward_or_list_order` and
  `id_number_masked`** (`candidate_type: UNKNOWN`), almost all in EC (227
  of EC's 15,031 rows — roughly one per page of EC's 228-page file). Cause:
  the IEC PDF's own "Page N of M" footer sits at the same y-coordinate as
  that page's last data row and overlaps it in the text layer. Rather than
  guess the real value from a corrupted token, both fields are left blank
  and the row is otherwise kept (name and party are unaffected, since the
  footer doesn't reach those columns).
- **4 rows have both `fullname` and `surname` blank** (out of 136,722) —
  the same class of rendering collision, too rare to be worth chasing
  further. Listed in full in the build log; not removed from the CSV.

Neither gap was patched by inference. If these 232 rows need resolving,
the fix is locating the affected candidate in the relevant province's
source PDF by name/party/municipality and reading the value by eye — the
extraction script does not currently track which source page each output
row came from, so that lookup is manual, not automated. Adding page
tracking would be a small, real change to the script if this becomes a
recurring need; it is not implemented today, and this note says so rather
than implying it is.

## What the NotebookLM sample got right and wrong

Its column schema (`province`, `district`, `municipality_code`, `party`,
`candidate_type`, `ward_or_list_order`, `fullname`, `surname`,
`id_number_masked`) was good and is what this file follows. Its example
value for JB Marks/ActionSA's PR list (`64005011` at list rank 11) turned
out to be **real** — verified directly against the source PDF, not a
fabricated figure like several other numbers this project has had to catch
from the same material elsewhere (see the electoral-generator and
electoral-CI work). Its Nelson Mandela Bay example, by contrast, printed
plain ranks (`83`, `84`, `85`) where the real EC source actually has the
same 8-digit-code format as NW — that specific sample value does not match
the source and was not carried into this build; it's mentioned here so a
future session doesn't re-introduce it.
