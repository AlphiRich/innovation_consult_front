---
name: iec-data-ingestion
description: >
  Acquire and ingest published Electoral Commission (IEC) and Municipal
  Demarcation Board (MDB) datasets into Election Campaign OS. Use when
  asked to fetch, rag, harvest, scrape, download or ingest election
  results, ward or voting-district reference data, candidate lists, or
  demarcation gazettes — from elections.org.za, the MDB portal, or a file
  somebody supplies. Also use when adding a column mapping, when an
  ingest fails, or when deciding whether a supplied dataset may be
  trusted. Covers the acquisition tool, the result schema, the mapping
  registry, and the refusals that keep an unverified figure out of a
  campaign's mouth.
---

# Ingesting IEC and MDB data

Two stages, deliberately separate: **acquire** (get the file, verify it
arrived intact) and **ingest** (read it into a record, verify it holds
together). Neither stage trusts the other, and neither marks anything
confirmed — that is a person, at the end.

## The rule that governs all of this

**Nothing is reported as done unless it was done.** This whole area exists
because a supplied ETL script printed thirty `> Fetching …` lines and
`ETL Pipeline complete` while every network call in it sat commented out
(change register, entry 33.1). A run that announces progress and declares
success is one somebody runs, sees green, walks away from, and believes.

Every refusal below follows from that. When in doubt, fail loudly and
leave the operator a sentence they can act on.

## Stage 1 — acquire

`tools/source-acquisition/acquire.py`. Standard library only, Python 3.9+.

```bash
python3 acquire.py --self-test                      # prove the verifier; no network
python3 acquire.py --discover URL --suggest-to rows.json
python3 acquire.py --probe                          # reachability; writes nothing
python3 acquire.py --fetch --province NW
python3 acquire.py --fetch --only mdb-nw405-gazette-8929
```

**Always run `--self-test` first on a new machine.** It serves six
payloads from localhost — a good PDF, an HTML error page wearing a `.pdf`
name, an empty response, a truncated one, a right-sized file with wrong
bytes, and a 500 — and asserts exactly one is accepted and none of the
rejects land on disk. It needs no network and no credentials.

**`--discover URL`** scans one page for dataset links and proposes
registry rows. It is a link scan, not a crawler: a crawler turned loose on
a government portal is a way to get a campaign's IP blocked during an
election, and the operator only needs the download index. It downloads
nothing. Every proposed row comes out `UNCONFIRMED` with `REPLACE_ME`
where a person must decide province and category — guessing `NW` from a
filename is the class of inference that put generated coordinates in a
ward file (entry 32.1).

**`sources.json`** is the registry. Each entry carries `status`:

- `CONFIRMED` — somebody fetched it and checked what came back.
- `UNCONFIRMED` — it came from a note or a discovery run, never tested.

Both download. Both are labelled in the output and in every run manifest.
Promote an entry only after fetching it and looking at the file, and say
who and when in the note.

Every run writes a manifest to `_runs/` with each source's outcome, byte
count and SHA-256. Exit `0` only when every selected source succeeded,
`1` on any failure, `2` when nothing was attempted.

### If the network blocks you

Report it and stop. Do not substitute a plausible URL, and do not mark
anything `CONFIRMED` to make a run go green. The build environment denies
`elections.org.za`, `demarcation.org.za` and the MDB ArcGIS portal at
CONNECT — that is why every registry entry ships `UNCONFIRMED` and why the
ingester is mapping-driven rather than format-aware.

### When a document is handed over instead

That is not a lesser path — it is how the only primary IEC source in this
build arrived. Record it under `suppliedDocuments` in `sources.json` with
its SHA-256, byte count and the date it came in, and **do not invent the
URL it was published at**. A guessed URL in a registry is indistinguishable
from a confirmed one six months later.

## Stage 1b — extracting a published reference table

For a table rather than a results file: `tools/annexure/extract-annexure-a.py`,
which reads Annexure A to IEC Circular 1 of 2025 into
`src/data/iec/circular-1-2025-annexure-a.json`.

```bash
python3 tools/annexure/extract-annexure-a.py --self-test
python3 tools/annexure/extract-annexure-a.py --pdf Annexure-A.pdf
```

The pattern to copy for the next table:

1. **Check the SHA-256 against a recorded one.** Re-running against a
   different document must fail, not silently produce a different dataset.
2. **Verify the document against its own arithmetic before writing
   anything.** Annexure A prints four derived columns; the extractor
   recomputes all four, plus `wards == ceil(councillors / 2)`, on every
   row, and writes nothing if one fails. A published table that does not
   close has been read wrong.
3. **Find a whole-table identity and assert it.** Here, every local's
   voters appear again on its district, so the two columns must total the
   same roll — which is what catches a dropped page.
4. **Re-verify in the test suite, over the shipped JSON.** The extractor
   protects the extraction; `municipalRegister.test.ts` protects the file
   anybody could hand-edit afterwards.
5. **Never sum a column without checking for double counting.** Adding
   all 258 rows of Annexure A gives a 44.3-million "national roll". The
   real figure is 27.7 million; districts repeat their locals.

Consuming it: `src/modules/reference/municipalRegister.ts`.
`checkAgainstRegister()` reports agreement as well as disagreement — it is
the only check in the build whose other side is outside the tenant. Its
findings are never blocking: the table is 2024 and a tenant's roll is
today's.

## Stage 2 — ingest

`src/modules/ingest/`.

| File | Holds |
|---|---|
| `electionResultSchema.ts` | `ElectionResult`, provenance, `validateResult` |
| `ingestResult.ts` | delimited parsing, `ingestResultFile` |
| `mappings.ts` | one `ColumnMapping` per publication format |

### Adding a mapping

1. Ingest the file. With no mapping it stops and prints **every column
   heading the file carries**.
2. Add an entry to `MAPPINGS` naming which headings hold the party code,
   party name, PR votes and ward seats.
3. `requiredHeaders` must include all four and be specific enough to
   identify the format — not one generic heading like `Party`.
4. Ingest again, compare against the published figures, sign it off.

**Never match a column by name similarity.** `VOTES` and `VOTES_PCT` are
one keystroke apart and mean entirely different things. A file whose
format is unmapped reports its columns and stops; that is the correct
outcome, not a failure to work around.

### What the ingester refuses

- A file with no mapping — reads nothing, lists the columns.
- A cell that is not a number. `Number('')` is `0`, which is how a blank
  cell becomes a party with no votes that validates and is false.
- A result whose party votes miss the published total by more than 0.5%.
  A total that stops describing the rows beneath it is the failure this
  cannot survive. Smaller gaps are normal in published tables.
- More ward seats than the council has.
- A record marked `CONFIRMED` with nobody named. Confirmation is a
  person, not a flag.
- A stored result that does not say what it may be used for.

### What an ingested result may be used for

Exactly two things, and the list is closed in code:

- `SEAT_CALCULATOR_INPUT` — starting figures a person chooses.
- `REFERENCE_RECONCILIATION` — cross-checking ward and VD reference data.

**Never sentiment.** A past election result is not sentiment and is never
combined with it. Sentiment here is the sum of doorstep conversations,
with no sampling frame and no weighting (SOP-08). A supplied plan asked
for historical results as a baseline "for the sentiment and seat
projection algorithms"; the first half was refused (entry 33.1). If asked
again, refuse again and say why.

## Judging a supplied dataset

Before trusting anything handed over rather than fetched, check for the
failure modes this project has already met:

- **Generated geometry.** Fit the coordinates to a lattice —
  `lon = a + step × (n mod k)`. Ward centroids never sit on a grid derived
  from the ward number (entry 32.1).
- **Ordinals sold as identifiers.** If every party's "ward numbers" run
  `1..N`, that column is a per-party position, not a ward
  (`docs/nw-candidate-list-2026-review.md` §1).
- **A figure bounded suspiciously tightly.** Run `analyseWardSizes()` and
  `compareToPublishedBand()`; report the arithmetic and draw no conclusion
  about why. NW405's wards sit inside the IEC's published band with the
  largest exactly on its ceiling, which looked like generated data in
  session 33 and turned out to be a demarcation drawn to the norm — the
  restraint was right and so was waiting for a second document
  (entries 33.2, 35.1).
- **An over-wide ID mask.** Anything showing more than the last four
  digits, and especially anything leading with a date of birth, is refused
  — `src/lib/saIdNumber.ts`.
- **Arithmetic that does not close.** Do the sums. Three of the four
  supplied datasets in this project failed one of the checks above.

## Where to record what you did

`docs/design-decision-and-change-log.md`, as a numbered entry: what
arrived, the decision, the reason, where it landed. **A rejection is an
entry like any other** — the register exists so a rejected asset does not
arrive again looking new.

## Verify before you claim

```bash
npm run check:all            # lint, typecheck, hex guard, tests
python3 tools/source-acquisition/acquire.py --self-test
```

Prove a new guard by injecting the defect it describes, watching it fail,
then reverting clean. A guard that has never failed has not been shown to
guard anything.
