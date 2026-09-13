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

