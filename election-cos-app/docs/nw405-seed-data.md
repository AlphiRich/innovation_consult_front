# NW405 (JB Marks) seed data — provenance and a real data-model fix

Session 8 (9 Aug 2026). The human supplied five PDFs "to assist... complete
building the ward/VD function." Two of them are genuine, verifiable,
government-sourced documents and are the subject of this note. The other
three are treated separately and with active skepticism — see
`docs/unverified-source-documents.md`, not this file.

## The two genuine documents

1. **`892918112025NWestDemarcation.pdf`** — North West Province
   *Provincial Gazette, Extraordinary*, Vol 268, No. 8929, 18 November
   2025. Provincial Notice 1300 of 2025: the Municipal Demarcation
   Board's delimitation of wards for **JB Marks Local Municipality
   (NW405)**, published under Item 5(1) of Schedule 1 to the Local
   Government: Municipal Structures Act, 1998 — signed by the MDB
   chairperson, carries a real ISSN, Government Printing Works contact
   details and ordering info, ward-by-ward voting-station schedules, and
   full boundary maps. This is exactly the `8929_18112025_NWestDemarcation.pdf`
   named (but never supplied) in every session back to session 1's
   `WardForm.tsx` header comment.

2. **`NW405.pdf`** — an IEC-generated "Seat Calculation Detail" report
   for the same municipality's actual 2021 Local Government Election
   result (printed 2021/11/22 15:43:44): 9 contesting parties, 101,439
   total valid votes, 67 council seats, real IEC letterhead. This is the
   `NW405.pdf` named in the same header comment.

Both bear the hallmarks of genuine government/IEC output — official
letterheads, real contact/registry details, an actual signatory, GPW
boilerplate, and (for the seat-calculation report) numbers that are
internally self-consistent to the last integer. Treated as authoritative.

## What was built from them

- `tools/seed-data/parse-nw405-demarcation.mjs` — parses the gazette's
  ward schedule into `Ward`/`VotingDistrict` records. Output:
  `seed-data/jb-marks-nw405-wards-vds.json` — **34 real wards, 108 real
  voting districts** (136 ward-scoped VD records — see split-VD note
  below), sums verified against the gazette's own stated municipal total
  (122,059 registered voters, March 2024) and against itself
  (ward-level sum === VD-level sum, both 122,059).
- `tools/seed-data/load-seed-wards.mjs` — loads that JSON into a live
  tenant via `firebase-admin`. **Not run end-to-end** — no live Firebase
  project exists yet (BUILD-STATUS.md blocker #2); written and reviewed,
  disclosed as unverified rather than claimed as tested.
- A real regression test added to `seatCalculator.test.ts` using
  `NW405.pdf`'s actual 2021 result — see the next section, this is where
  the real fix was.

## A real bug the seat calculator had — found and fixed

`allocateSeats()` used a Droop quota — `floor(totalValidVotes / (totalSeats
+ 1)) + 1` — since session 1. It had only ever been checked against
property-based tests (internal consistency: no negative seats, no seat
silently dropped) and one synthetic overhang scenario. It had never been
checked against a real result.

Running `NW405.pdf`'s actual 9-party, 67-seat 2021 result through it
produced the wrong quota: 1,492 instead of the report's own printed 1,515.
The real IEC report prints its own formula on the page: **"Q = (A / (B -
C - D)) + 1"**, where B is total council seats and C/D are independent and
no-PR-list ward winners (both deducted from the denominator, not
`totalSeats + 1`). Fixing the divisor to `totalSeats - independentWardSeats
- noPRListWardSeats` (both new, optional, default-0 inputs) makes the
calculator reproduce every published figure in the real report exactly:
quota 1,515, all nine parties' round-1 entitlements, the real remainder
ranking, and the two real round-2 top-up seats (ANC and Patriotic
Alliance). That reproduction is now `seatCalculator.test.ts`'s
"real-world regression" block — it will fail loudly if this regresses.

A second, smaller bug was caught while fixing the first:
`independentWardSeats`/`noPRListWardSeats` are real council seats already
counted in `totalSeats`, but weren't reserved out of the largest-remainder
redistribution pool — without the fix, the algorithm would have handed a
seat that legitimately belongs to an independent to whichever party had
the next-highest remainder. NW405's own C=D=0 case doesn't exercise this,
so it's not covered by the real-data regression test; it follows directly
from reading Schedule 1's own definition of B−C−D and is defensive rather
than independently re-verified against a second real gazette.

## A real bug the VD/Ward data model had — found and fixed

The gazette's own "VD SPLIT" column flags **26 of this single
municipality's 108 voting districts (~19%)** as split across two or more
wards — the same physical voting station's roll divided, each ward
getting only its own portion of `registeredVoters`. `VotingDistrict.id`
was `vdCode` alone (`VDForm.tsx`'s original `id: vdCode.trim()`), which
silently collides for any split VD — the second ward's write would
overwrite the first's document.

Fixed across the DAL: `VotingDistrict.id` is now `${wardCode}::${vdCode}`;
`getByCode(ctx, wardCode, vdCode)` requires the ward; a new
`findByVdCode(ctx, vdCode)` returns every ward-portion of a code (usually
length 1). `VoterForm.tsx`'s household-creation flow — which looks up a
VD's ward starting from just a vdCode — now handles the length-1 case
exactly as before, and surfaces an explicit ward picker rather than
guessing when a canvasser's VD code turns out to be split. `VDForm.tsx`
shows a non-blocking "also in: <other wards>" note when the code being
entered already exists elsewhere, so this isn't a silent surprise for
whoever's capturing the data either.

This was found by using real data, not by writing a test first — the
synthetic single-ward examples used in every prior session never had a
reason to produce a colliding vdCode.
