# Functional extraction — AI Studio build (session 22)

Session 22 (13 Sep 2026). Five artefacts: a subscriber data & identity
policy, a financial/market positioning paper, a user tutorial with video
scripts, a councillor casework workbook, and a zip of settings-module
skills.

Read under a changed instruction: **extract function, do not re-audit
settled conflicts or defunct bugs.** So this file is a build backlog, not
a defect list. Where something was wrong it is noted only when it changes
what we should build.

The tutorial's role diagram, its `#722226`/`#1A253A` colours, its
Last-Write-Wins sync and its Postgres casework schema are all superseded
by decisions already taken here (seven roles; `src/design/tokens.ts`;
outbox + conflict table; Firestore). Not revisited.

---

## Built this session

### PR party list compliance aid — `src/modules/candidates/prList.ts`

The candidates port has carried `affiliation: 'PR'` and `listRank` since
Phase 3 with **nothing enforcing either**. The `ecos-pr-candidate-list-export`
skill in the zip supplies the missing rules, and they are good ones. Built
as pure logic with 24 tests.

What it now checks, and at what severity — the severities are the whole
point:

| Check | Severity | Why |
|---|---|---|
| List longer than the cap | **Blocking**, never truncated | Silently dropping a name the party meant to include is worse than refusing |
| Candidate with no list position | Blocking | Order of preference decides who takes a seat |
| Duplicated list position | Blocking | Same |
| Same person twice on one list | Blocking | |
| Candidate marked REJECTED | Blocking | s14(5) removal, better caught here |
| Position gaps (1,3,5…) | Warning | Usually a leftover from a removal |
| Candidate PENDING verification | Warning | |
| Fewer than half women | **Warning, never blocking** | See below |
| One sex clustered on the list | **Warning, never blocking** | See below |
| Gender not declared | Warning — "cannot assess" | Nothing inferred from names |

**The citation correction.** Party lists are governed by **s14** (submission)
and **s15** (certification) of the Municipal Electoral Act 27 of 2000, with
composition under **Schedule 1** of the Municipal Structures Act 117 of
1998. **Section 17 governs ward candidate nominations and is not the basis
for PR lists** — another build's UI cited it. Ours never did; a test now
keeps it out.

**Gender is a warning, deliberately.** Schedule 1's wording is a duty to
*"seek to ensure"* half the candidates are women and that the sexes are
*"evenly distributed"* — confirmed against the Act. That is a standard to
aim at, not a threshold to pass. Blocking an export on it would invent an
obligation and then refuse a lawful act on the strength of it — the same
error as manufacturing a PPFA certification. A test asserts no gender
issue can ever be raised at blocking severity.

**The list-length cap is configured, not hardcoded.** It is reported
elsewhere as 2× the PR seats, but SAFLII, lawlibrary.org.za and the gov.za
mirror were all egress-blocked from this environment, so Item 11(1) could
not be read from source. The multiplier is therefore a default with a
citation and an attorney-review hedge, overridable per tenant — the same
treatment `PPFAConfig` gives the funding thresholds, and for the same
reason: a wrong hard block rejects a lawful list. **Confirm it against the
Act.**

`Candidate.gender` was added to the port as optional and self-declared.
`UNDISCLOSED` is a real answer, not a gap.

---

## Worth building next, ranked

### 1. Tenant module entitlements — the architectural one

The positioning paper prices four add-on modules (Ward Sentiment
Intelligence, Incident Pro, PPFA disclosure, Campaign Diary). This build
has **no concept of what a tenant bought.** Capabilities answer *what may
this user do*; nothing answers *what did this tenant pay for*. They are
orthogonal and both are needed — a user can hold `ppfa.view` in a tenant
that never bought the PPFA module.

Shape: a tenant-level `entitlements` document, checked alongside
capabilities at the nav and route level. Small, and it unblocks the
commercial model. Highest leverage item here.

### 2. IEC timetable seeded into the Campaign Diary

The positioning paper's one new bundled module is a shared calendar
pre-populated with the official 2026 IEC timetable — proclamation,
voters'-roll inspection, nomination close, final candidate list,
certificates of candidacy, election day.

**We already hold the data** (`docs/iec-election-timetable-2026.md`) and we
already have the diary and `ElectionTimetablePage.tsx`. This is wiring two
existing things together.

One constraint the paper states plainly and we should honour: *"It is a
scheduling tool, not a compliance tool: it does not touch the Regulation
of Gatherings Act module, which remains a static advisory page only."*
Which means —

### 3. Do NOT build the tutorial's T-7 / T-3 gatherings engine

The tutorial describes an "Automated Public Gatherings Act Compliance
Engine" with a daily cron, a T-7 alert and a T-3 hard-stop that converts
an event into a compliance incident. The positioning paper, dated the same
day, says the gatherings module **remains advisory only** and warns that
implying the diary tracks permit deadlines "would be exactly the kind of
overclaim B1 and B2 have consistently avoided."

Our `GatheringsAdvisoryPage.tsx` is already the advisory version. Recorded
here so the tutorial's version is not built later by someone reading only
that document.

### 4. Canvasser safety notes on the household card

From the tutorial: a yellow-bordered notes field on the household card —
*"Large dog on property, usually fenced in backyard"*, *"Gate code
required: #4129"* — read before opening a gate. Genuine field-safety value,
small to build, and it belongs to the household record we already have.

Two things to get right: it is operational safety information, not voter
profiling, so it should not read as a note *about a person*; and a gate
code is access-control data that should not be exported.

### 5. Out-of-band escalation for critical incidents

The tutorial routes a CRITICAL incident to the Municipal Lead and Ward
Lead by WhatsApp with SMS failover, off a queue. The *function* — a
critical incident must reach a named human out-of-band, with a fallback —
is real and we have nothing for it. The form (Redis/BullMQ, Meta Graph
API) is a Postgres/Node design and is not our stack.

Note from the positioning paper, worth keeping: from 1 October 2026 Meta
charges for WhatsApp Business Platform API messages, landing mid-campaign.
Phase 1 support runs on the free manually-operated WhatsApp Business App,
so this only bites if the channel is automated.

### 6. Field diagnostic guidance for canvassers

The tutorial's five-check list — private browsing blocks IndexedDB,
clearing history destroys unsynced work, keep the tab active on
reconnection, grant camera/storage, don't hard-reload while offline. These
are true of **our** Dexie layer and we ship no guidance at all. Cheap, and
it prevents the one failure mode that loses a canvasser's entire shift.

---

## One claim to correct before it ships

The tutorial's doorstep POPIA script has the canvasser tell a voter her
details "will be **permanently purged** post-election." This build hard-
deletes nothing, suppresses voters via `deletedAt`, and has no
de-identification routine — established in session 21 and now guarded by
`dataSubjectErasure.ts`.

Said at the door, that is a promise to a data subject that the system
cannot keep. It needs rewording before it reaches a training video, which
is cheaper than it sounds: the substance the voter needs — her number is
masked, her data is held in South Africa, she may withdraw consent — is
all true and all deliverable. Only the purge sentence is not.

The subscriber identity policy, by contrast, already applies exactly this
discipline to itself, and says so: *"it is not the same claim as 'no data
leaves South Africa', and that broader claim is never made about this
Platform."* That document is the model; the tutorial should follow it.

---

# Second pass — master code stack + AI Studio transcript (session 23)

`MASTER_CODE_STACK_12_sept_2026.md` (a replication blueprint) and an AI
Studio session export. The transcript covers one build step — the
`FieldMapWidget` — and is the same content as the blueprint's §10.2, so
the two are read together.

## Built: the canvassing work queue

The blueprint's household point carries `contactStatus`, `lastContactedAt`
and `volunteerName`. Checking ours against it found the real gap: **this
build could record that canvassing happened but not which doors were
left.** The field diary logs a `CANVASS` entry with a `householdsVisited`
count — an aggregate written after the fact, carrying no per-door state.
Two canvassers in the same VD had no way to avoid the same gate.

`Household.contactStatus` and `src/modules/voters/canvassQueue.ts` close
that: statuses, legal transitions, cool-offs, a queue summary, and
`nextDoors()` which sweeps oldest-attempt-first rather than circling the
same few. 26 tests.

**Refusal is terminal, and that is the part worth keeping.** The status
set this is modelled on — CANVASSED / IN_PROGRESS / PENDING /
UNREACHABLE — has no way to record *"this household asked us not to come
back"*. Without it a refusal is indistinguishable from a no-answer and the
door returns to the queue next round. `REFUSED_RECONTACT` is terminal
here: no transition leads out of it, no cool-off expires it, and
`nextDoors()` will not offer it however short the queue. Reopening is a
deliberate act by someone holding `voters.edit`.

That is ordinary courtesy before it is anything else, and it is also the
safer reading of POPIA's objection right — a party that keeps knocking
after being told not to is processing information the subject objected
to, and losing the doorstep argument as well.

**Refusals are excluded from the coverage denominator.** Reporting a VD as
80% covered when the remaining 20% asked not to be visited misrepresents
both the work and the households. A test pins the arithmetic.

The cool-offs (6h for no-answer, 48h for an inaccessible door) are
campaign-operations defaults, overridable per tenant, and are never
described as statutory.

## Also taken

`DwellingType` gains `FLAT` and `CAMPUS_RES`. Not cosmetic: a block of
flats or a student residence is one structure holding many voters with
high turnover, canvassed and counted differently from a house — and
NW405's Ward 28 is the NWU campus, so `CAMPUS_RES` is a real local case.
TypeScript caught both consumers the moment the union widened, which is
the port discipline doing its job.

## Not taken, with reasons

**`JB_MARKS_STATIONS_GEO` — the eight voting-station coordinates.** This
is the one genuinely tempting data asset in the blueprint, and it is
declined on two independent grounds.

First, shape: it is a `Record` keyed on `vdCode` alone, with one
`wardCode` per station. This repository already found and fixed exactly
that bug — the real NW405 gazette flags **26 of 108 voting districts
(~19%)** as split across two or more wards, so a vdCode is not unique to
one ward. `VotingDistrict.id` is `${wardCode}::${vdCode}` for that reason
(`docs/nw405-seed-data.md`). Importing that map would silently drop one
ward's portion for a fifth of the municipality.

Second, provenance: our verified seed carries no VD register to check
those eight codes or their coordinates against, and they are not sourced
in the blueprint. Voting-station locations are not a place to accept
unverified data — sending a canvasser, or a voter, to the wrong place is
a real harm. Our `VotingDistrict.centroid` field already exists for
coordinates that arrive with a source.

**`MeteringClient.withMeteredAction`.** The *function* — meter an
expensive action, debit before it runs, reverse on failure — is real and
this build has no equivalent. The implementation is not adoptable: it
checks the balance and debits **client-side**, which is not enforcement,
and it reverses only when the action throws, so a debit is stranded if the
tab closes between debit and completion. If metering is built here it
belongs behind the same server-side line as the PPFA aggregation and the
ID unmask.

**The blueprint's `firestore.rules`.** It is a replication document that
instructs the reader to deploy them, so this is worth one line: the
version printed there opens `/test/{docId}` and `/field_diary/{entryId}`
with `allow read: if true` — outside tenant scoping, world-readable. Ours
are unaffected; do not deploy theirs.

**Its `seatCalculator`** uses a Droop quota (`floor(total/seats)+1`). Ours
does not, deliberately — see `seatCalculator.ts`, which was verified
against the real NW405 IEC result. Noted only because the blueprint would
reintroduce it as a regression.

## Still on the backlog from the first pass

Tenant module entitlements remains the highest-leverage unbuilt item, and
this blueprint reinforces it: the map widget prints
`map.household.geospatial • 25 tokens` on its own header, which is a
tenant-level commercial gate with nothing behind it here. Also still open:
seeding the Campaign Diary with the IEC timetable we already hold,
canvasser safety notes, out-of-band escalation, and field diagnostic
guidance.

---

# Third pass — commercial planning outputs; tenancy closed (session 24)

Five early planning notes: Incident-Pro pricing, an architecture/revenue
strategy, the commercial and operational architecture, the hierarchical
access model, and a field operations manual. Flagged on upload as possibly
redundant, and mostly they are — the five-tier role model with a
"Provincial Coordinator", PPFA at R80,000/R100,000, Postgres RLS tenancy,
and T-7 permit notifications are all superseded by decisions already
taken. Not revisited.

**But one insight in them was load-bearing, and would have been got wrong
without it.**

## Entitlements are not all tenant-wide

The commercial material prices **Ward-Sentiment Intelligence per ward per
cycle** and **Incident-Management Pro per party per cycle**, with casework
at **per ward per month**. The positioning paper read earlier is explicit
about why: à-la-carte ward pricing "is the market's buying behaviour, not
a pricing convenience layered on top of it" — South African parties buy
their strongest-support wards, not full municipal coverage.

An entitlement model that assumed every module was bought tenant-wide
would have been wrong on its first real sale. `EntitlementScope` is
therefore part of the module definition, `TenantEntitlement.wardCode`
carries the ward, and `resolveAccess` refuses to answer a ward-scoped
question without knowing which ward. A test pins the scope of each module
so the assumption cannot creep back.

That is the salvage, and it was worth the read.

## Built: the entitlement layer

- `src/auth/modules.ts` — the catalogue: key, label, scope, bundled, and
  the capabilities each module gates.
- `src/dal/ports/entitlements.ts` + Firestore adapter — read-only.
- `src/auth/entitlements.ts` — `isModuleActive`, `activeModules`,
  `subscribedWards`, `resolveAccess`.
- `firestore.rules` — `entitlements` readable by any tenant member,
  `allow write: if false`.
- 27 tests.

**Permission and subscription fail differently, and say so.** "Your role
does not include this" and "this campaign did not buy that module" are
different problems with different remedies. Collapsing them into one
"access denied" sends a Finance Officer to an administrator who cannot
help. `AccessOutcome` separates NOT_PERMITTED, MODULE_NOT_SUBSCRIBED,
MODULE_EXPIRED, WARD_NOT_SUBSCRIBED and TENANT_NOT_PROVISIONED, each with
a sentence the person can act on.

**Capability is checked first, deliberately.** Someone who was never
permitted near the donor ledger is told about their permissions, not
handed the campaign's billing position as the explanation. A test asserts
the NOT_PERMITTED reason mentions no commercial state at all.

**No price is stored against a tenant, anywhere.** The platform is sold to
competing parties in the same municipality on published, flat, identical
terms, and the commercial material is emphatic that packaging "must never
create even the appearance that one party gets better terms". A price on a
tenant record is that appearance whatever the number says. An entitlement
records what was bought and until when. A test fails on any price, cost,
amount, fee, discount or ZAR field.

**Entitlements are written server-side only.** A tenant admin who could
grant themselves a paid module would make the commercial model as
meaningless as a client-side capability check makes the security model.
The port has no write method and the rules deny client writes — the same
shape as `auditLog`.

**Modules can exist before their surfaces do.** `ward-sentiment`,
`incident-pro` and `casework` gate no capabilities today because the
features are not built here. Declaring the entitlement first is the right
order; listing capabilities they do not actually govern would be a claim
rather than a fact, and a test holds them empty and their descriptions
honest.

**An unprovisioned tenant is a distinct state.** Zero entitlement records
means the paid modules are off and the core platform and bundled diary
still work — not a dead application.

## Also salvaged, into the record rather than the code

- **Incident Pro is the out-of-band escalation tier.** Backlog item 5 now
  has a commercial home: per-message costs sit with the parties that
  generate them rather than being spread across every ward licence. When
  that feature is built it gates behind `incident-pro`.
- **No in-app advertising, ever.** Third-party ad SDKs would break the
  neutrality position, open unverified external connections, and consume
  memory and data on the low-RAM phones volunteers actually carry. Worth
  recording as a standing constraint so it is not re-proposed.
- **The low-RAM/metered-data constraint** is why `resolveAccess` is a
  synchronous function over an already-loaded array rather than a network
  check per render.

## One place we are already better

The access model describes canvassers caching photographs "encoded as
Base64 strings" on-device. Our Dexie `photoQueue` stores a `Blob`. Base64
is about a third larger for the same image, which cuts against that same
document's low-RAM, low-data argument. §6.4's "never Base64 in the
document" already covers the Firestore side; the offline side was already
right too.

---

# Fourth pass — the full AI Studio source tree (session 25)

282 files. Its own `.github/workflows/ci.yml` still declares
`working-directory: election-cos-app`, so this is a fork of this
repository that AI Studio then built on. Most of the large files are ones
already reviewed across sessions 13–23 and were not re-read.

## What the backlog probe actually found

Three of the six items still on the backlog are **not implemented there
either** — they exist only in the tutorial's narrative:

| Backlog item | In the source tree? |
|---|---|
| Canvasser safety notes | **No** — zero matches for safety note, gate code, dog on property |
| Field diagnostic guidance | **No** — the only hit was an unrelated `ThemeContext` |
| T-7/T-3 gatherings engine | **No** — consistent with the positioning paper's advisory-only scope, and with our decision not to build it |

Worth recording: the tutorial described aspirations, not shipped
features, so there is nothing to salvage for those items and no
implementation to compare ours against when they are built.

## Built: bulk voter import

The one genuinely new capability with day-one value. A campaign does not
start empty — it starts with a membership register in a spreadsheet, and
this build had no way to bring one in. Voters were captured one at a time
at a door; the only bulk path in the repository was the VD demarcation
seed, which is reference data rather than people.

`src/modules/voters/bulkImport.ts` — 26 tests.

**The compliance dimension is ours, not theirs.** Their
`CsvBatchImportModal.tsx` has **zero** occurrences of "consent" or
"POPIA"; it imports contacts, not voters, so the question never arose for
it. For us it is the whole question: `firestore.rules` refuses to create a
voter unless `popiaConsentGiven == true`, and that gate exists because
consent is captured at a door, by a canvasser, from the person. A
spreadsheet has neither door nor canvasser, so bulk import is the one
place the gate could be satisfied by simply asserting it — which would
make the gate decorative.

So the module will not produce an importable row without a **consent
declaration that could be shown to someone**: a lawful basis, a date, and
a reference identifying where the consent lives. POPIA puts the burden of
demonstrating consent on the responsible party, and "everyone on this list
agreed" demonstrates nothing. A reference shorter than eight characters is
refused, because "yes" is not a reference.

**A doorstep method cannot be expressed for a batch at all.**
`BulkConsentMethod` is `Extract<…, 'WRITTEN' | 'DIGITAL'>` — nobody
verbally consented four hundred people in a batch, so a file claiming it
is mislabelled or untrue, and the case cannot be constructed.

**Provenance travels on the record, not in a log.** `popiaConsentReference`
was added to the `Voter` port and is written onto every imported person.
An import log nobody can find two years later is not a demonstration of
consent.

**The module writes nothing.** It returns a plan: every row classified as
ready, rejected or already present, each with a reason and a line number
the operator can find in their spreadsheet. A half-finished import that
silently created some people and dropped others is worse than one that
refuses, because afterwards nobody can tell which happened. A test asserts
the module imports no repository at all.

Also: numbers are masked, never carried in the clear; sentiment defaults
to UNDECIDED rather than inventing support; the CSV reader handles quoted
fields, embedded commas, doubled quotes and CRLF; and header matching
accepts the spellings a real spreadsheet uses, Afrikaans included
(`Voornaam`, `Van`, `Selfoon`).

Proved by injection: proceeding without a consent declaration fails 2
tests, accepting any reference fails 1, widening the method to allow
doorstep fails 1, and silently dropping duplicates fails 2.

## Noted, not built

- `src/lib/googleWorkspace.ts` (54KB) plus eight `components/workspace/`
  surfaces — Gmail, Sheets, Tasks and Calendar integration. A real feature
  surface and a large one; it needs a product decision about OAuth scopes
  against tenant data before any of it is worth porting, not a quiet
  afternoon's work.
- `useMembershipOCR.ts` — OCR of membership forms. Interesting as the
  front end of the import built above: the same consent-provenance rule
  would apply, and a scanned form is a better reference than a typed one.
- `RbacVisualizer.tsx` (70KB) — a permissions visualiser. Our
  `PermissionsPage` covers the function; the value here would be in the
  visualisation, which is a design question.

