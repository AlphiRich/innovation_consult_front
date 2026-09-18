# Source acquisition — MDB gazettes and IEC results

An operator utility. It downloads published source datasets, verifies
what arrived, and records it. **It is not part of the application build**
— nothing in `src/` imports it, `npm run build` does not touch it, and it
is Python because it runs on somebody's laptop next to their file sync,
not in the browser.

## Why it exists

It replaces a supplied ETL script that looped over six provinces and five
election years, printed a `> Fetching …` line for each of the thirty
pairs, and then `pass`. Every network call in it was commented out. Run as
given it printed thirty progress lines and `ETL Pipeline complete. The
local folder is ready for Drive synchronization.` — and downloaded
nothing.

The code being unwritten was the smaller problem. The larger one is that
it *announced success*. A run that prints per-item progress and then
declares completion is one somebody runs, sees green, walks away from, and
believes. Every rule below follows from that.

## What it guarantees

- **Nothing is reported as fetched unless bytes were written and
  verified.** Downloads land in a `.part` file and are renamed only after
  they pass; a rejected payload never occupies the real filename.
- **A failed run says so and exits non-zero.** There is no completion
  message on a run with failures. Exit `0` only when every selected source
  succeeded, `1` when any failed, `2` when the configuration or the
  destination was unusable and nothing was attempted.
- **Every run writes a manifest** to `_runs/`, naming each source, its
  outcome, byte count and SHA-256. "What did we actually get" is
  answerable later from a file, not from memory.
- **Verification is cheap and blunt**: minimum size, content type, and
  leading bytes (`%PDF-`, `PK\x03\x04`). It also rejects an HTML document
  where a dataset was expected — which is what a portal returns for an
  unknown path, with HTTP 200 and a plausible filename.

## Usage

```bash
python3 acquire.py --self-test              # prove the verifier; no network
python3 acquire.py --probe                  # reachability only; writes nothing
python3 acquire.py --fetch                  # download and verify
python3 acquire.py --fetch --province NW
python3 acquire.py --fetch --only mdb-nw405-gazette-8929
python3 acquire.py --fetch --out ~/campaign-data --force
```

Python 3.9+, standard library only. The original needed `requests`,
`pandas` and `beautifulsoup4`, and used `pandas` for nothing.

Run `--self-test` first on any new machine. It starts a local HTTP server,
serves six payloads — a good PDF, an HTML error page wearing a `.pdf`
name, an empty response, a truncated one, a right-sized file with wrong
bytes, and a 500 — and asserts that exactly one is accepted and none of
the rejects land on disk. It needs no network and no credentials, so it
gives the same answer anywhere.

## The registry

`sources.json` holds the URLs, so correcting one is a data edit and the
diff shows what moved.

Every entry carries a `status`:

| status | means |
|---|---|
| `CONFIRMED` | somebody fetched this URL and checked that what came back is what the entry says |
| `UNCONFIRMED` | it came from a planning note and has never been tested |

Both download. Both are labelled in the console output and in the
manifest, and the summary always states how many unconfirmed sources were
involved. This is not a warning to click past: it is the difference
between a dataset you can cite and one you cannot.

**Every entry currently ships `UNCONFIRMED`**, including the North West
gazette whose *contents* this build does use. The session that wrote this
was on a network that denies those hosts at CONNECT, so no URL here has
ever been fetched from inside this project. The filename
`8929_18112025_NWestDemarcation.pdf` is confirmed; the path it sits at is
not.

To promote an entry: `--probe`, then `--fetch`, open the file, satisfy
yourself it is the right document, then set `"status": "CONFIRMED"` with a
note saying when and by whom.

### Two things the registry does on purpose

**It carries four rows, not thirty.** The supplied plan asked for six
provinces × five election cycles. A registry of thirty rows nobody has
ever fetched is a list of guesses wearing the shape of a plan. Add rows as
URLs are confirmed.

**It keeps a row for the ward boundary shapefiles**, pointing at the MDB
portal's human-facing page rather than a download link, because nobody has
found the real one yet. That row is the build's largest outstanding data
gap — see the change register, entry 32.1: the ward GeoJSON supplied in
session 32 carried generated lattice coordinates rather than centroids, so
this product still holds no ward geometry at all. The gap gets a row so it
is visible, rather than being absent and therefore forgotten.

## What it does not do

**It does not transform anything.** Extract only. Turning a gazette PDF or
an IEC results file into this product's seed format is a separate job with
its own verification, and `docs/nw405-seed-data.md` records how that was
done by hand for the one municipality this build holds.

**It does not invent endpoints.** The supplied note gave
`api.elections.org.za/results/{year}/LGE/{prov}`. That line was commented
out in the script it came from and has never been called by anyone, so it
is not repeated here as though it were known.

**It holds no credentials.** Where a source needs one, `auth_env` names an
environment variable. Tokens are never written to this repository and
never printed.

**It has no hardcoded destination.** The original wrote to
`C:\Users\<name>\Desktop\…`. This defaults to the working directory and
takes `--out`.
