# LGE2026 candidate list extraction

Builds `../../seed-data/lge2026-candidate-database.csv` from the IEC's
nine provincial "LGE2026 Certified Candidate List" PDFs. See
`../../../docs/lge2026-candidate-database.md` for provenance, the
derivation logic, two real extraction bugs this found and fixed, and the
known (bounded, documented, not guessed-at) gaps in the output.

## Usage

```bash
cd tools/seed-data/lge2026-candidates
pip install -r requirements.txt

python3 build_candidate_database.py \
  "/path/to/LGE2026 - CANDIDATE LISTS - 16 SEPT 2026" \
  ../../seed-data/lge2026-candidate-database.csv
```

The input directory must contain the nine files named exactly
`LGE2026 Certified Candidate List - <XX>.pdf` for XX in EC, FS, GP, KZN,
LP, MP, NC, NW, WC (the national consolidated PDF, if present alongside
them, is ignored — see the provenance doc for why).

The script prints per-province row counts and two gap counters
(`unresolved_district`, `unresolved_ward_id`) to stderr; both should read
`0` for `unresolved_district` and a small number for `unresolved_ward_id`
(a PDF page-footer rendering collision, not a bug in this script — see
the provenance doc).

## Re-running against a later certified list

The column-boundary detection (`extract_common.rows_from_page`) reads
each page's own header row rather than hardcoding x-coordinates, so it
should tolerate the layout shifting slightly between IEC publication
runs. It has only been verified against the 16 Sep 2026 certified lists.
Before trusting a re-run against a different publication date:

1. Check `unresolved_district` is still `0` — a real layout change would
   most likely show up as newly-unresolved local municipality codes.
2. Check the unique municipality-code count against South Africa's known
   total (257: 8 metros + 205 local + 44 district councils) — a
   mismatch means the municipality/party column split broke somewhere.
3. Spot-check a party name known to be multi-word and alphabetically
   early (e.g. "AL JAMA-AH") — that's exactly the case the 3pt column
   margin exists to protect; if it reappears split, the margin may need
   adjusting for the new layout.
