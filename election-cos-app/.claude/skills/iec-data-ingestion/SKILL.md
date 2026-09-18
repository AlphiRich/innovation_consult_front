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
- **A figure bounded suspiciously tightly.** Run
  `analyseWardSizes()`; report the arithmetic and draw no conclusion about
  why (entry 33.2).
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
