# NW_07_Repository_Manifest.xlsx — review

Supplied 30 September 2026. Document ref IC-ECOS-07-NW-MANIFEST-2026.
SHA-256 `e9ac6cb6…efc8`, 18,777 bytes, six sheets, compiled 23 September
2026 from the IEC's 2000–2021 North West voting-district results files and
the Municipal Demarcation Board's final 2026 ward layer.

**This is the best-sourced dataset supplied to this project.** It is
computed rather than asserted, it names every file it was computed from
with a retrieval date and a row count, and one of its own sheets audits an
earlier report and marks three of that report's claims wrong. It is the
first supplied asset here that needed no substantive correction.

## What was verified against data this build already holds

Everything below was checked against
`src/data/iec/circular-1-2025-annexure-a.json` — the proclaimed
delimitation — and asserted in
`src/modules/reference/municipalRegister.test.ts` and
`municipalCodeHistory.test.ts` rather than accepted.

| Manifest claim | Result |
|---|---|
| 402 wards in North West for 2026 | **Confirmed.** The delimitation's eighteen North West local municipalities total 402. |
| 18 local municipalities, 4 districts | **Confirmed.** DC37, DC38, DC39, DC40; eighteen warded codes. |
| Per-municipality 2026 ward counts (all 18) | **Confirmed, all eighteen, exactly.** |
| JB Marks (NW405) = 34 wards | **Confirmed.** |
| Moretele (NW371) = 25 wards | **Confirmed** — the municipality carrying the province's whole net −1. |
| Naledi is NW392, not NW395 | **Confirmed.** |
| Mamusa is NW393, not NW396 | **Confirmed.** |
| Lekwa-Teemane is NW396; NW398 does not exist | **Confirmed.** |
| Merafong City is now GT484, in Gauteng | **Confirmed.** |
| NW391, NW395, NW401, NW402, NWDMA37 are retired | **Confirmed** — none appears in the 2026 delimitation. |
| NW397 (Kagisano-Molopo) and NW405 (JB Marks) survive | **Confirmed.** |

The 402 figure is worth stating twice. The MDB layer is a geometry file
produced by the Demarcation Board; the annexure is a table consolidated by
the Electoral Commission. Two different artefacts, two different
production paths, the same 402 wards across the same eighteen codes. That
is the strongest corroboration the delimitation baseline has.

## What was taken on the manifest's word, and deliberately not imported

The **historical per-year ward counts**. This build holds none of the IEC
2000–2021 results files and cannot check them, so they are recorded here
as supplied figures and are *not* application data — nothing in the
product can quote them as ours.

| Municipality | 2000 | 2006 | 2011 | 2016 | 2021 | 2026 |
|---|---:|---:|---:|---:|---:|---:|
| NW371 Moretele | 22 | 24 | 28 | 26 | 26 | 25 |
| NW372 Madibeng | 30 | 31 | 36 | 41 | 41 | 41 |
| NW373 Rustenburg | 35 | 36 | 38 | 45 | 45 | 45 |
| NW374 Kgetlengrivier | 5 | 5 | 6 | 8 | 7 | 7 |
| NW375 Moses Kotane | 30 | 30 | 31 | 34 | 35 | 35 |
| NW381 Ratlou | 11 | 12 | 14 | 14 | 14 | 14 |
| NW382 Tswaing | 13 | 13 | 15 | 15 | 14 | 14 |
| NW383 Mafikeng | 28 | 28 | 31 | 35 | 35 | 35 |
| NW384 Ditsobotla | 19 | 19 | 21 | 20 | 20 | 20 |
| NW385 Ramotshere Moiloa | 17 | 17 | 20 | 19 | 19 | 19 |
| NW391 Kagisano | 9 | 12 | — | — | — | — |
| NW392 Naledi | 9 | 9 | 9 | 10 | 9 | 9 |
| NW393 Mamusa | 6 | 6 | 8 | 9 | 8 | 8 |
| NW394 Greater Taung | 20 | 22 | 26 | 24 | 24 | 24 |
| NW395 Molopo | 4 | 4 | — | — | — | — |
| NW396 Lekwa-Teemane | 6 | 6 | 7 | 8 | 7 | 7 |
| NW397 Kagisano-Molopo | — | — | 15 | 15 | 15 | 15 |
| NW401 Ventersdorp | 5 | 5 | 6 | — | — | — |
| NW402 Tlokwe / Potchefstroom | 20 | 21 | 26 | — | — | — |
| NW403 City of Matlosana | 30 | 31 | 35 | 39 | 39 | 39 |
| NW404 Maquassi Hills | 8 | 8 | 11 | 11 | 11 | 11 |
| NW405 (2006 = Merafong City) | — | 26 | — | — | — | — |
| NW405 JB Marks | — | — | — | 34 | 34 | 34 |
| NWDMA37 Pilanesberg DMA | 0 | — | — | — | — | — |
| **Province total** | **327** | **365** | **383** | **407** | **403** | **402** |
| **Municipalities with wards** | **20** | **21** | **19** | **18** | **18** | **18** |

Only the 2026 column is independently confirmed here.

## What was built from it

1. **`src/modules/reference/municipalCodeHistory.ts`** — the code
   discontinuities, as data. `NW405` is JB Marks today and was Merafong
   City in the IEC's 2006 North West file; `NW391 + NW395` became `NW397`;
   `NW401 + NW402` became `NW405`. `validateResult()` now blocks a 2006
   NW405 result labelled "JB Marks", and warns on one correctly labelled
   "Merafong City" so the next person to chart it by code is told.

   This is the one defect class in this area that arithmetic cannot catch:
   both records are correct, and only the join is wrong.

2. **Acquisition registry, rebuilt on real endpoints.** The manifest's
   `Source_Log` supplied the MDB ArcGIS item
   (`c59982d9f42a4b07929f3781883754e5`, updated 2026-09-01) and the five
   IEC results URLs with row counts. The two guessed IEC URLs are gone and
   the MDB row's human-facing "explore" page is replaced with the data
   endpoint. Six rows now read `CONFIRMED`, each naming the supplier's
   retrieval date and stating that *this* build has not fetched them.

3. **`expect.min_rows` in `acquire.py`.** `min_bytes` catches an empty or
   truncated download; it cannot catch a portal that answers with the right
   shape and a fraction of the data. The manifest's row counts make that
   checkable, and the self-test now includes an export silently truncated
   to 20 rows, which fails and does not land on disk.

4. **The provincial cross-check**, as a permanent test. If the shipped
   delimitation ever stops agreeing with the MDB layer's 402 wards across
   those eighteen codes, the suite fails.

## The manifest's own audit, and where it converges with ours

Its `Allow_Audit` sheet checks an earlier "Extraction Protocol Complete"
report and records: *"FALSE at the time. No files existed. The ETL script
it relied on has `pass` stubs and a commented-out API call."*

That is the same finding this project reached independently in session 33
(change register entry 33.1) from the script itself. Two reviews, no
contact between them, the same conclusion.

## Open items, and what the delimitation baseline changes about them

The manifest lists five. Two are now partly answerable:

- **±15% deviation check** (its #2, and its `Allow_Audit` #8, both marked
  "not possible yet" because the MDB layer carries no registration
  figures). The *band* is no longer missing: Annexure A publishes the norm,
  minimum and maximum for every warded municipality in the country, and
  the build applies it. What is still missing is **registered voters per
  2026 ward**, which the MDB ward information tables would supply. For
  NW405 alone we have it, from the provincial delimitation notice.
- **MDB gazette PDFs** (its #3). This build already holds and has parsed
  the North West one — Provincial Notice 1300 of 2025, see
  `docs/nw405-seed-data.md`. The gap is the other provinces.

Still fully open, and the largest remaining data gap in the product:

- **VD → 2026 ward assignment** (its #1). Shared ward IDs do not prove
  unchanged boundaries, so historical results cannot be restated on
  today's wards without a spatial join of 2026 voting districts to the
  2026 ward layer. Nothing in this build attempts that restatement, and
  nothing should until the join exists.
- **The other five provinces** (its #4). **Addressed as far as this build
  can** — see `docs/national-delimitation-baseline.md`. Ward counts,
  council sizes and district structure for all nine provinces are derived
  from the delimitation baseline and verified by 44 district
  reconciliations; `sources.json` carries results rows for all nine. What
  remains is fetching them: only North West's files have been retrieved,
  and only North West's code history has been reviewed.
- **Turnout denominators** (its #5): `RegisteredVoters` repeats on every
  party row in the IEC schema, so de-duplicate by voting district ×
  ballot before summing. Recorded in the ingest notes for whoever writes
  the VD-level mapping.
