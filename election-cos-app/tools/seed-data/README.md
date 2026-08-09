# Seed data — IEC/MDB ward demarcation ingest

Repeatable ingest scripts for turning a Municipal Demarcation Board ward
delimitation gazette into `Ward`/`VotingDistrict` seed records, per
IC-ECOS-BUILD-2026-V2 §6.1. Kept as a separately-`npm install`-able tool
directory, out of the app bundle — same rationale as `tools/docgen/`.

## Provenance

`../seed-data/jb-marks-nw405-wards-vds.json` was generated from a real,
human-supplied source document: **North West Province Provincial Gazette,
Extraordinary, Vol 268, No. 8929, 18 November 2025** — Provincial Notice
1300 of 2025, Municipal Demarcation Board delimitation of wards for **JB
Marks Local Municipality (NW405)**, published under Item 5(1) of Schedule
1 to the Local Government: Municipal Structures Act, 1998. See
`docs/nw405-seed-data.md` for the full account, including a real
discrepancy this data surfaced in our own data model (split VDs) and how
it was fixed.

## Usage

```bash
cd tools/seed-data
npm install

# 1. Parse a gazette PDF into seed JSON (requires poppler-utils' pdftotext on PATH)
node parse-nw405-demarcation.mjs /path/to/gazette.pdf NW405 ../../seed-data/output.json

# 2. Load it into a live tenant (requires a real Firebase project + service account —
#    NOT run end-to-end in any build session so far, see the script's own header)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
  node load-seed-wards.mjs ../../seed-data/output.json <tenantId>
```

## Re-using the parser for another municipality's gazette

The parser was verified only against NW405's own gazette layout. Before
trusting its output for a different municipality:

1. Run it and read the `Sum of ward.registeredVoters` /
   `Sum of VD.registeredVoters` lines it prints — they must match. The
   script throws if they don't.
2. Compare the parsed ward count against the gazette's own stated ward
   count (printed in its preamble, e.g. "delimited the municipality into
   34 wards").
3. Spot-check a handful of individual wards' voting-station names against
   the source PDF by eye — OCR/layout artefacts in a scanned gazette can
   silently corrupt a name without breaking the numeric sanity check.
