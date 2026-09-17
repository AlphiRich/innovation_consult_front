# North West LGE 2026 candidate list — what it is, and what it is not

**Source supplied:** `nw-province-candidate-list-2026.xlsx`, two sheets
("Summary", "Full Candidate List"), 9,731 candidate rows across 22
municipalities and 82 parties. The workbook describes itself as derived
from the *Official IEC LGE 2026 Final Candidate List (Combined), published
16 September 2026*, ingested 16 September 2026. Produced by openpyxl; no
authoring provenance beyond that.

**Verdict: not a seed source for this product.** It is useful as a record
of which parties are contesting which municipality and how many candidates
each fielded. It cannot populate the candidates collection, and one figure
it reports must not be acted on.

Examined against the file itself, not against its summary sheet.

---

## 1. The column called a ward number is a per-party ordinal

`ward_or_list_order` on `WARD` rows is not a ward. It is each candidate's
position within their own party's list of candidates for that
municipality.

Three independent checks, all agreeing:

1. **Every party's numbers run exactly 1..N.** In NW405, 19 parties out of
   19. In DC37, 33 out of 33. A real ward list looks nothing like this — a
   party contesting eleven wards contests wards 3, 5, 7, 12, 14, 19…, not
   wards 1 through 11.
2. **District municipalities have the same shape.** DC37 Bojanala shows
   242 "ward candidacies" across 48 "unique wards". A district
   municipality has no wards at all. 48 is simply the longest list any
   single party filed.
3. **The summary's own arithmetic.** For all 22 municipalities, without
   exception, `unique wards contested` equals `max candidates fielded by
   any one party` equals `count of distinct values in the column`. That is
   what you get when you count distinct ordinals and call the result
   wards.

**Consequence: the file carries no ward association whatsoever.** No
candidate in it can be placed in a ward, which is the one thing a ward
candidate record needs.

## 2. The proposed correction to JB Marks' ward count is rejected

The workbook's closing note reads:

> "JB Marks (NW405) shows 32 contested wards in this 2026 list, not the 34
> used in prior project materials (sourced from the 2021 election result).
> This is a real discrepancy — flagged for correction in B1/B2/B3, not yet
> actioned there."

It is not a real discrepancy. 32 is the ANC's list length in NW405 — the
largest of the nineteen — surfacing through the artifact in §1 above. It
is not a count of wards and says nothing about how many wards NW405 has.

`seed-data/jb-marks-nw405-wards-vds.json` carries 34 wards from the
gazette. **It stays at 34.** `manual.test.ts` now asserts the seed length
so that this cannot be quietly changed to match the artifact later.

Had the note been actioned, every per-ward figure in the product — ward
seeding, coverage, the seat calculator, the war room's "wards seeded"
tile — would have been computed over a short roll that looked plausible.
That is precisely the silent-short-seed defect SOP-03 exists to catch,
arriving as a correction.

## 3. The party-list order has been destroyed

`ward_or_list_order` on `PR_LIST` rows is not a list position either. The
values are eight digits of the form `64005001`, `64005002`, … — a running
row counter whose prefix is the **district** code (6370 → DC37, 6380 →
DC38, 6390 → DC39, 6400 → DC40), with the fifth digit distinguishing local
municipalities within it. NW405's 447 PR rows run `64005001`–`64005447` as
one uninterrupted sequence spanning every party.

There is therefore no way to know any candidate's position on their
party's list. Order of preference is the thing that decides who takes a
seat; it is gone.

## 4. About a fifth of the rows are duplicates

2,170 of 9,731 rows province-wide are exact repeats of another row — same
municipality, party, type, masked ID and name. In NW405's PR rows alone,
67 duplicate rows across 42 distinct people. Four people appear under more
than one party.

Some of that may be real (a person may legitimately appear on both a ward
ballot and a list). Repeats of the *same* row within the same party and
type are not.

## 5. The identity-number mask discloses a date of birth

Every masked value has the shape `######****##*` — for example
`820826****08*`. Eight of thirteen digits are readable, and the six that
lead are the full date of birth. What is hidden is the four-digit
sequence and the check digit, and the check digit is derivable from the
other twelve.

This is the same mask shape `src/lib/saIdNumber.ts` was written to refuse:

> A mask that shows `771120 •••• 081` … reveals nine of thirteen digits,
> and one of the four it hides is determined by the other twelve through
> the check digit. … It also discloses a full date of birth, which is
> personal information in its own right and is exactly what a mask is
> supposed to withhold.

`maskSaIdNumber()` reveals the last four digits and nothing else.
Importing this file would move a weaker disclosure about 4,937
identifiable people into a subscriber's tenant.

A published candidate list is a public document, and none of this makes
holding a copy improper. It makes it opposition research about other
people, held as that, rather than candidate records.

## 6. `candidate_type` is unreliable for district municipalities

All four district municipalities show 100% `WARD` and zero `PR_LIST`
(DC37: 242/0; DC38: 148/0; DC39: 93/0; DC40: 147/0). District councils
are not elected on ward ballots. Combined with §1, those rows are almost
certainly district PR-list candidates carrying the wrong type.

Not corrected here — saying what the rows *are* would require the primary
source, which this build does not have.

---

## What the file is good for

Party-by-municipality contest data: 82 parties, which municipalities each
is contesting, and how many candidates each fielded. That is real
opposition-landscape intelligence and none of it depends on the three
broken columns.

It is not wired into the product. Doing so would need the primary IEC
publication rather than this extract, and a decision about whether
opposition candidate data belongs in a subscriber's tenant at all — which
is a POPIA question about people who never dealt with the campaign, not a
data-modelling one.

## What changed in the build because of it

Nothing was seeded. What the file did was make SOP-11 concrete: it is the
worked example behind that SOP's closing section, "Lists published by the
Commission are not a source for this", and behind the rule stated there —

> Counting distinct values in a column is not counting wards. … A number
> that arrives without the question it answers is not evidence.
