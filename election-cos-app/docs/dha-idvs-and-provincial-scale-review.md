# Two uploads reviewed — DHA identity verification, and provincial scale

Session 27. `API and Integration Scheme for DoHA IDVS` and
`North West Provincial Scale Projection Model.docx`, audited under the
standing rule: take what is true and useful, refuse what is not verified,
and write down which is which.

---

## 1. The DHA identity verification scheme

### What was taken

**Local structural validation of a South African ID number**, and only
that: `src/lib/saIdNumber.ts`, with `saIdNumber.test.ts`.

It is the one part of the scheme that needs no accreditation, no SLA, no
network call, no third party and no new class of personal information. It
catches a mistyped candidate ID at the keyboard rather than when a list
comes back from the Commission, which is exactly what `prList.ts` already
is: a compliance aid for a human submission.

The scheme is right that this must happen before any remote call, and
right about the format — thirteen digits, `YYMMDD SSSS C A Z`, sequence
0000–4999 and 5000–9999 for the two sexes recorded on the document,
citizenship 0 or 1, Luhn check digit.

### Two errors in the scheme, both verified before rejecting them

**The stated algorithm is wrong as written.** Its §4 says to sum the odd
positions *excluding* the check digit, and then to test whether the total
modulo 10 is zero. Those cannot both hold. Implemented literally the rule
rejects valid numbers — `saIdNumber.test.ts` runs the scheme's own literal
rule against the published worked example `8001015009087` and shows it
failing. The correct form either includes the check digit in the
odd-position sum, or compares against `(10 − total mod 10) mod 10`.

**The scheme's own sample ID is structurally invalid.** `9001015800086`,
which appears in three of its example payloads, fails the very check the
document tells you to run first. Its check digit should be `8`. A
verification scheme whose worked example does not verify is a useful
reminder that a plausible document is not a checked one.

Both findings are executable assertions rather than prose, so neither can
be quietly reverted.

### What was refused, and why

- **DHA/SITA integration itself.** It is gated on formal accreditation, an
  SLA and a business case, none of which exist. Building an adapter
  against an interface nobody has seen would be fiction.
- **The biometric endpoint.** Facial images and NFC chip data are a new
  category of personal information and a DPIA-level decision, not a
  feature to add because a document suggested it.
- **Fallback to KYC aggregators** (the scheme names LexisNexis, TransUnion,
  Smile Identity). That is a procurement and POPIA operator decision, and
  it would put voter- or candidate-identifying data in a third party's
  hands. Not a build item.
- **Redis caching of verification results.** Wrong stack, and it would
  cache special personal information.
- **"Purge full demographic payloads after the transaction."** This
  product hard-deletes nothing — `firestore.rules` sets
  `delete: if false` on all fourteen tenant collections. Guidance that
  assumes purging cannot be followed here and must not be written into a
  policy as though it could.

### The distinction that matters most

`Candidate.verificationStatus` means *the Commission can confirm this
person is a registered voter in this municipality* — the thing section
14(5) of the Municipal Electoral Act turns on. Home Affairs answers a
different question: does this identity number exist, and does it belong to
a living person of these demographics.

Neither is the other, and **structural validity is neither of them**. A
number that satisfies the check digit may never have been issued —
`saIdNumber.test.ts` constructs one and shows it passing. Nothing in the
new module may set `verificationStatus`, and a test asserts that the
module exposes no field that could be mistaken for a verification outcome.

### A privacy defect found on the way

`ports/candidates.ts` carried `'771120 •••• 081'` as its example mask —
nine of thirteen digits revealed, including a full date of birth, with one
of the four hidden digits fixed by the check digit. That leaves on the
order of a thousand candidate numbers, which is not a mask.
`maskSaIdNumber()` reveals four digits and nothing else, and the comment
has been corrected. Nothing generated masks yet, so this was caught before
anything depended on the weak format.

### Still open, if identity verification is ever wanted

A decision, not a task: whether this product should hold verified identity
data at all. If yes, it needs a DPIA, an accreditation route, a rewrite of
the Privacy Notice (LEG-01) and the Residency Disclosure (LEG-02), and a
new entry in the capability model. The structural validator stands on its
own either way.

---

## 2. The North West provincial scale projection

### Infrastructure: settled, and not revisited

The document specifies Cloud SQL PostgreSQL with PostGIS, PgBouncer
connection pooling, read replicas and Cloudflare. This build settled on
Firestore, and that decision is closed. The cost model — R338 912/month
unoptimised against R37 534.74 optimised, R93.37 per ward at scale — is
priced against that stack and does not transfer.

What does transfer is the *shape* of the finding, and it corroborates a
decision already made: **the ward is the unit that scales and therefore the
unit that is bought.** `src/auth/modules.ts` already prices two modules at
`scope: 'WARD'` for exactly this reason. Independent arrival at the same
conclusion is worth recording.

Also corroborated: africa-south1 as the region, offline-first for deep
rural wards (it names Kagisano-Molopo and Greater Taung), and no PII at
the edge cache.

### The ward table — the real value, partly verified

The document gives ward counts for all 18 North West local municipalities
across 4 districts, totalling 402. This build holds gazette-sourced data
for one of them.

| | |
|---|---|
| **Verified against a primary source** | NW405 JB Marks = **34 wards**. Matches `seed-data/jb-marks-nw405-wards-vds.json`, parsed from the *North West Provincial Gazette Extraordinary* Vol 268 No. 8929, 18 November 2025 (Provincial Notice 1300 of 2025). |
| **Internally consistent** | District subtotals sum correctly (154 + 104 + 60 + 84 = 402), and 5 + 5 + 5 + 3 = 18 local municipalities. |
| **Not verified** | The other 17 ward counts. No gazette, notice number or date is cited for any of them. |

The municipality codes, names and seats (NW371–NW405) match the known
North West structure. The ward counts match the 2021 delimitation as far
as can be told without the notices.

**The claim that needs challenging:** the document presents these as "the
Municipal Demarcation Board framework for the 2026/2027 local governance
cycle". They are the counts from the previous cycle. The MDB re-delimits
before each election, and the JB Marks notice this build does hold is
dated November 2025 — that is, the 2026 re-delimitation was in progress
when the document was written. For JB Marks the count did not change. That
is one municipality out of eighteen, and it is not evidence about the
other seventeen.

**Therefore not seeded into the application.** Ward and voting-district
records in this build come from a gazette, parsed by a script, with the
totals reconciled against the gazette's own stated figures. A table typed
from a planning document does not meet that bar, and a ward count that is
silently wrong produces a seat projection that is silently wrong. The
table is recorded below as a research lead: the eighteen notices to
obtain, not eighteen numbers to trust.

### The North West, as the document states it

Recorded for whoever obtains the notices. **Unverified except NW405.**

**Bojanala Platinum (DC37) — 154** · NW371 Moretele (Makapanstad) 28 ·
NW372 Madibeng (Brits) 41 · NW373 Rustenburg 45 · NW374 Kgetlengrivier
(Koster) 6 · NW375 Moses Kotane (Mogwase) 34

**Ngaka Modiri Molema (DC38) — 104** · NW381 Ratlou (Setlagole) 14 ·
NW382 Tswaing (Delareyville) 15 · NW383 Mahikeng 35 · NW384 Ditsobotla
(Lichtenburg) 21 · NW385 Ramotshere Moiloa (Zeerust) 19

**Dr Ruth Segomotsi Mompati (DC39) — 60** · NW392 Naledi (Vryburg) 9 ·
NW393 Mamusa (Schweizer-Reneke) 9 · NW394 Greater Taung 24 · NW396
Lekwa-Teemane (Christiana) 7 · NW397 Kagisano-Molopo (Ganyesa) 11

**Dr Kenneth Kaunda (DC40) — 84** · NW403 City of Matlosana (Klerksdorp)
39 · NW404 Maquassi Hills (Wolmaransstad) 11 · **NW405 JB Marks
(Potchefstroom) 34 — verified**

### A functional gap this raises

The document is organised around districts, and this build has no district
concept. `MunicipalityProfile` carries a municipality code, name and
province; `GeoScope` runs TENANT → MUNICIPALITY → WARD → VD. A provincial
or district campaign structure — which is what a party running all 402
wards would have — has no scope between "one municipality" and "the whole
tenant".

Not built, because it is a real modelling decision with consequences for
`inScope()`, the token, the role table and the entitlement scopes, and
nothing has asked for it yet. Recorded as the first question to answer if
a tenant larger than one municipality is ever sold.

### Pricing

The per-ward figures are commercial input to **IC-ECOS-LEG-08 (Pricing &
Accounts Terms)**, whose drafting pack already lists "the price list
itself" as a decision only the company can make. They stay in this
document and out of the codebase: `ports/entitlements.ts` carries no price
field, and `legal.test.ts` fails on any rand figure appearing in the legal
set. Both of those remain true.

The figures are also, as above, priced against a stack this build does not
use. They are a starting point for a pricing conversation, not a cost
model for this product.

### Not taken

- **"4 000 canvassers sync simultaneously"** — an unsourced load
  assumption. Plausible as an order of magnitude, no basis given.
- **The 48-hour surge scaling and its ~R1 200 cost** — Cloud SQL specifics.
  The underlying operational point (registration weekends and election day
  are the load peaks) is already in the backlog as IEC-timetable work on
  the Campaign Diary.
- **FX at 16.40 ZAR/USD, August 2026 baseline** — not verified, and
  nothing in this build prices in dollars.
