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
