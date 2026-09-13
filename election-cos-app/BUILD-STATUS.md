# Election Campaign OS — Build Status

> **Naming note (added 7 Sep 2026, third naming directive):** "Election-COS1.0"
> — the product name Session 4 below documents renaming this codebase to —
> is itself now superseded. Canonical naming is **Election Campaign OS**
> (full) / **EC OS** (short), confirmed via a separate ecos-v2 build (a
> parallel Google AI Studio/Gemini fork of this same repo, diverged after
> Session 1) whose own `BUILD-STATUS.md` carries this instruction dated
> 6 Sep 2026, citing a `03-NAMING-SCHEMA.md` this session was not given
> directly. Applied here on that basis — every live "Election-COS1.0"
> string in code comments, UI text, README, and doc prose has been changed
> to "Election Campaign OS"; the session log below is left as an accurate
> historical record and is not rewritten, so read every "Election-COS1.0"
> reference below as superseded by this note, not as a live instruction.
> Not reverted: the `election-cos-app/` folder name and the
> `election-cos-app`/`election-cos-app-functions` package identifiers —
> those are infra identifiers, not product branding, and this instruction
> only speaks to the latter (the ecos-v2 fork itself left its own
> `functions/package.json` as `election-cos-app-functions`, consistent
> with that reading). `IC-ECOS-BUILD-2026-V2 §X.Y` spec citations are
> likewise untouched, per Session 4's own rule below.

**Governing spec:** `IC-ECOS-BUILD-2026-V2` (`01-claude-code-build-spec-v2.md`) +
`IC-ECOS-MASTER-2026-V2` (`00-master-index-work-partition-map-v2.md`)
**Session 1 (8 Aug 2026):** first build session, Phases 0–5 scaffolded
against the spec's ordering.
**Session 2 (8 Aug 2026, later):** received `02-commercial-rewrite-brief`,
`03-implementation-rollout-plan`, `04-legal-compliance-workstream`,
`05-project-schedule` for the first time, plus duplicate copies of 00 and
01 labelled V1, not V2, with a PPFA-removal instruction buried in that
batch. Flagged to the human; answer received: **PPFA stays in scope, as
V2 already has it.** See "Version conflict found in session 2 — RESOLVED"
below.
**Session 3 (9 Aug 2026):** received `CLAUDEHANDOFF.md`, a memory-dump from
a *separate* claude.ai Project conversation (its own header says so — "no
live sync between claude.ai Projects and Claude Code"). It describes a
different, older architecture: PostgreSQL+RLS as primary with AWS
`af-south-1` hosting, a Google ADK compliance agent
(`google_adk_campaign_agent.py`), and 5-role RBAC (`HQ_ADMIN`,
`LOCAL_HEAD`, `WARD_LEAD`, `VD_CAPTAIN`, `VOLUNTEER`) — all three
explicitly superseded by V2 (PostgreSQL is Phase-8-conditional behind
Firestore/GCP `africa-south1`; the ADK agent is on the master index's
Retired list; RBAC is the capability-grants model, 7 seed roles, already
built and tested). Flagged to the human; answer received: **stale — V2
governs, disregard the conflicting architecture.** Not dropped into the
repo or `CLAUDE.md` as the document itself instructs, since that would
plant contradictory guidance for a future session. Several of its
"corrections" (LWW conflict handling, the MMP seat-calculator overhang
bug, brand colour, PPFA thresholds) turned out to already be fixed
correctly in this codebase — good confirmation, no action taken. Its
Stitch-extraction status (229 screens, 47 usable, 178 outstanding
re-export, Mac salvaging screenshots in parallel) is kept as background
context only — it explains the delay, it doesn't supply the screens, so
blocker #1 below stands.
**Session 4 (9 Aug 2026):** received a final naming directive —
**`IC-Election_CampaignOperatingSystem1.0` (short form `Election-COS1.0`)
is the governing product name, superseding "Election Campaign OS."**
Confirmed split: `Election-COS1.0` for all display/branding (UI text, page
title, README, doc prose); the full name reserved for formal document
reference lines. Confirmed scope: renamed everything, not just branding —
`ecos-app/` → `election-cos-app/`, package name `ecos-app` →
`election-cos-app`, functions package `ecos-app-functions` →
`election-cos-app-functions`. Existing `IC-ECOS-BUILD-2026-V2 §X.Y` style
citations throughout the code comments were left untouched — those cite
the governing artefact's own self-declared reference code, not the
product's display name, and rewriting them would misattribute the
citation. `check:all` and `build` re-verified green after the rename (59
tests, both `election-cos-app/` and `functions/`).
**Session 5 (9 Aug 2026):** two things. (1) Attempted to create a dedicated
`election-cos-app` GitHub repo per the human's direction to migrate off
this monorepo — **blocked**: the GitHub App integration returned
`403 Resource not accessible by integration` on `create_repository`; it
can work within granted repos but can't create new ones. Waiting on the
human to create an empty repo by hand; migration (via `git subtree split`
on this folder, not the whole monorepo history) is queued once it exists.
A pull request (https://github.com/AlphiRich/innovation_consult_front/pull/1)
was subsequently opened against this branch from the Claude Code UI —
noted for continuity; it doesn't change the queued dedicated-repo
migration above, which is still pending the human creating that empty
repo.
(2) **Received the first real Stitch screen assets** —
`stitch_ic_election_management_suite.zip`, 66 screens — partially
resolving blocker #1 below. See `docs/screen-findings.md` for the full
account: a large share of the batch is the retired Civic Architect/SA
Elections 2024 shells (excluded); the genuine "ELECTION CAMPAIGN OS"
voter/household screens were used to build a real, working **Voters
module** (`src/modules/voters/`) — list + create/edit form wired to the
existing DAL (`dal.voters`, `dal.households`), phone display-masking
(`src/lib/phone.ts`), a 5-tier sentiment picker
(`src/modules/voters/sentiment.ts`), and the POPIA consent gate enforced
in the form (mirrors `firestore.rules`). Phone *encryption* is
deliberately not wired — `phoneEncrypted` needs real Cloud KMS key
management that doesn't exist without a live GCP project; writing a fake
encrypted field would be worse than omitting it, so it's left off with a
comment rather than faked. The reference screens show materially more
fields than the governing `Voter` type (demographics, engagement-history
timeline, service-delivery status per utility) — **none were added to the
data model**; `docs/screen-findings.md` has the comparison table and flags
it as an open decision rather than silent scope creep. Also adopted the
Stitch suite's documented typographic role scale
(`civic_authority/DESIGN.md`'s "Brand & Style" section — brand-neutral,
cites our real colours even though that file's own YAML palette is the
retired drift) into `tailwind.config.js`/`tokens.ts`, kept in sync by
`tokens.test.ts`. Verified: 67 tests, lint/typecheck/hex-check/build all
green (bundle is now 195KB gzipped JS — a `chunks larger than 500kB`
build warning appeared; not fixed this session, code-splitting is a
reasonable future pass, not urgent at this size).
**Session 6 (9 Aug 2026, late):** received the "Letterhead Options" Claude
Design canvas export (6 cover-page systems 3a–3f + matching back covers +
two standard letterhead layouts) plus a Claude Design app-shell HTML/JS/CSS
bundle (the latter is the Claude Design tool's own framework code, not a
usable asset — not acted on). `docs/innovation-consult-brand.md` records
the extracted Innovation Consult corporate identity — a colour/type system
distinct from the Election-COS1.0 product tokens, do not conflate them.
Built three real deliverables with `tools/docgen/` (a small, separately
`npm install`-able Node script using `docx`, kept out of the app bundle):
`docs/legal-drafts/privacy-policy-DRAFT.docx` and
`docs/legal-drafts/terms-of-use-DRAFT.docx` — both carry a maroon
"DRAFT — NOT FOR PUBLICATION — REQUIRES ATTORNEY REVIEW" banner on the
cover and inline `[ATTORNEY REVIEW NEEDED: ...]` markers at every point
requiring legal sign-off (consent basis under POPIA s26, the DSR
response-time commitment, retention periods, limitation-of-liability
wording) — consistent with the standing commitment elsewhere in this file
not to publish AI-drafted legal text for a system processing special
personal information; and `docs/app-user-guide.docx`, a complete,
non-gated guide to the actually-built application (roles/capabilities,
nav, the Voters workflow, offline behaviour, incidents, funding &
disclosure, gatherings advisory). The real Innovation Consult logo/icon
image files were not supplied with the canvas export — the documents use
a text wordmark placeholder; swap it for the real artwork per
`tools/docgen/README.md` once available. **Verification gap, disclosed
rather than hidden:** this sandbox's LibreOffice cannot convert *any*
docx to PDF (confirmed with a trivial one-paragraph test file, so it's an
environment issue, not a defect in these documents) — visual
render-and-inspect per the docx skill's own recommendation wasn't
possible. Verified instead via `python-docx` (opens cleanly, correct
paragraph/table/section counts and content) and the skill's OOXML XSD
validator (`validate.py` — all validations passed) on all three files.

Also closed a real gap noticed while continuing: `VoterForm` required
selecting an *existing* household with no way to create one.
`src/modules/voters/HouseholdQuickAdd.tsx` adds inline household creation
from the voter form's household picker — dwelling type, address/informal
descriptor, and a ward lookup via `dal.votingDistricts.getByCode` rather
than trusting `ctx.wardScope` (which a VD-scoped canvasser's token
typically doesn't carry — using it would have risked writing a wrong or
empty `wardCode`, breaking §4.2 geographic scoping on that household).

**Domain resolved:** the human confirmed `innovationconsult.co.za` is the
registered domain (the letterhead canvas's `.com` was design-tool
filler). `tools/docgen/build-docs.js`'s `COMPANY.email`/`COMPANY.web` and
`docs/innovation-consult-brand.md` updated; all three `.docx` files
regenerated and re-verified (XSD-valid, no `.com` text remaining).

**Verified green in this session:** `npm run check:all` (lint, typecheck,
`check:hex`, 67 unit tests) and `npm run build`, in `election-cos-app/`. Cloud
Functions (`functions/`) compile clean via `npm run build`.

**Session 7 (9 Aug 2026):** confirmed PR #1 merged into `main` (7 commits).
Found 3 commits from session 6 had landed on the branch only, after the
merge point — rebased them onto `origin/main` (clean, no conflicts) and
force-with-lease pushed, per this branch's standing "merged PR ⇒ rebase
follow-up work" instruction. Then built a real **Wards & Voting Districts
module** (`src/modules/wards/`), replacing the `WardsPage` placeholder —
the foundational module everything else geo-scopes to (§6.1). No
dedicated Stitch "Ward Mapping" screen exists in the 66-screen batch;
used `lge_war_room_local_head`'s "Ward/VD Voter Matrix" table as the
structural reference, trimmed to the columns the governing `Ward`/
`VotingDistrict` types actually have (VD code, name, registered voters —
no volunteer-assignment or coverage-performance columns, those belong to
a module that doesn't exist yet). See `docs/screen-findings.md` for the
full account, including a note that this screen (and
`vd_captain_dashboard_hyper_local`) render under a fifth transient
product name, "ElectoralOS" — same target shell, nothing to reconcile.

Shipped: `WardsPage.tsx` (summary stats + ward list + create/edit),
`WardDetailPage.tsx` (a ward's VDs + create/edit), `SchematicMap.tsx` (a
deliberately non-GIS proportional tile grid sized by registered-voter
count — the screen's real interactive Google-Maps-style map was
intentionally not reproduced, per §6.1's "schematic map first, no GIS
stack in v1"), `WardForm.tsx`, `VDForm.tsx`, `wardStats.ts` +
4 unit tests. Route `wards/:wardCode` added.

Two real bugs caught and fixed during the build, not from a failing
test — spotted by reasoning about the data model before writing the
code: (1) creating a VD without updating its parent `Ward.vdCodes` would
leave `wardStats.totalsFor()`'s VD count permanently wrong — `VDForm`'s
mutation now fetches and updates the parent ward. (2) deriving a new VD's
`wardCode` from `ctx.wardScope` would risk a wrong/empty value for a
VD-scoped user (same class of bug already fixed in `HouseholdQuickAdd`
last session) — derives it from the VD's own record via
`dal.wards.getByCode` instead. Also caught a raw-`rgba()` anti-pattern in
`SchematicMap.tsx` during creation (technically passes `check:hex`'s
hex-literal regex but violates the "only design tokens" intent) — fixed
to compute an alpha suffix off `tokens.color.ink` instead.

No IEC ward-demarcation source data (shapefiles/PDFs) has been supplied
to any session so far, so wards/VDs are manually captured through the new
forms — the practical fallback until that seed data exists, noted in both
`WardsPage.tsx`'s empty state and `docs/screen-findings.md`.

**Verified:** `npm run check:all` — 71 unit tests (up from 67),
lint/typecheck/`check:hex` all green; `npm run build` succeeds (same
pre-existing >500kB chunk-size warning, unchanged, still not addressed).

**Session 8 (9 Aug 2026):** received five more PDFs "to assist... complete
building the ward/VD function." Two are genuine, verified government/IEC
documents — the North West Provincial Gazette (Vol 268, No. 8929, 18 Nov
2025) publishing the MDB's real ward delimitation for **JB Marks Local
Municipality (NW405)**, and a real IEC "Seat Calculation Detail" report
for that municipality's actual 2021 LGE result — these are exactly the
`8929_18112025_NWestDemarcation.pdf` / `NW405.pdf` named but never
supplied since session 1. The other three ("Electoral Legislative
Framework Digest," "National Voters' Roll Audit," "Seat Allocation
Mathematical Conventions") were **not** treated as authoritative — see
`docs/unverified-source-documents.md` for the specific reasons (identical
to-the-minute publication timestamps across all three, a
self-referential "repository" citation style rather than any real gazette
identifier, a direct contradiction with this build's AWS-vs-GCP/PPFA-
purge decisions already made in session 3, a wrong acronym for the
National Population Register, and unverifiable precise statistics). None
of their specific figures (a council-size formula, national roll totals,
gazette numbers, the stated 4 Nov 2026 election date / 7 Aug 2026 roll
closure) were hardcoded anywhere in this codebase.

Built from the two genuine documents (`docs/nw405-seed-data.md` has the
full account):
- `tools/seed-data/parse-nw405-demarcation.mjs` — a real, working
  "repeatable ingest script" (the one build spec §6.1 calls for and every
  prior session's `WardForm.tsx` header flagged as missing). Verified
  against the actual gazette: 34 wards, 108 real voting districts,
  registered-voter sums matching both the gazette's own stated municipal
  total (122,059) and themselves.
- `tools/seed-data/load-seed-wards.mjs` — loads the parsed JSON into a
  live tenant via `firebase-admin`. **Not run end-to-end** — still no
  live Firebase project (blocker #2 below) — written and reviewed, not
  falsely claimed as tested.
- `seed-data/jb-marks-nw405-wards-vds.json` — the real parsed output,
  committed.

Two real, non-trivial bugs found and fixed by running real data through
existing code that had only ever been tested synthetically:
1. **Seat calculator quota formula was wrong.** `allocateSeats()` used a
   Droop quota (`totalSeats + 1` in the denominator) since session 1,
   passing every property-based test because those tests only check
   internal consistency, never a real result. Run against `NW405.pdf`'s
   actual 2021 result, it produced quota 1,492 against the report's own
   printed 1,515. Fixed to the real Schedule 1 formula the IEC report
   prints on its own page — `Q = floor(totalValidVotes / (totalSeats −
   independentWardSeats − noPRListWardSeats)) + 1` — which now reproduces
   every published figure in that real report exactly (all nine parties'
   entitlements, remainder ranking, both round-2 top-ups). New
   `seatCalculator.test.ts` "real-world regression" block locks this in.
   A second bug (independents'/no-list-parties' seats not reserved out of
   the largest-remainder pool) was caught and fixed alongside it.
2. **VD identity collides for split voting districts.** The real gazette
   flags ~19% of NW405's voting districts as split across 2+ wards (same
   physical station, each ward getting only its portion of
   `registeredVoters`) — `VotingDistrict.id` was `vdCode` alone, so the
   second ward's write would silently overwrite the first's document.
   Fixed: id is now `${wardCode}::${vdCode}`; `getByCode` requires a
   ward; a new `findByVdCode` returns every ward-portion of a code.
   `VoterForm.tsx`'s household-creation flow now surfaces an explicit
   ward picker when a canvasser's VD code turns out to be split, instead
   of guessing; `VDForm.tsx` shows a non-blocking note when a code being
   entered already exists in another ward.

**Verified:** `npm run check:all` — 72 unit tests (up from 71),
lint/typecheck/`check:hex` all green; `npm run build` succeeds
(functions/ compiles clean too).

**Session 9 (9 Aug 2026):** the human confirmed the session-8 seat-
calculator quota-formula fix is correct — retained as-is, no code change.
Also supplied an IEC website news-article printout ("Electoral Commission
publishes the 2026 LGE Election Timetable"), with materially stronger
authenticity signals than the session-8 "digest" batch (named
spokesperson + real contact line, a real Minister's name, internally
self-consistent province-level statistics) — see
`docs/iec-election-timetable-2026.md` for the full comparison. It
corroborates two of the session-8 digest's previously-unverified claims
(4 November 2026 election date, 7 August 2026 roll closure) without
validating the rest of that batch (council-size formula, national roll
totals, gazette number 51321, the AWS/hard-purge items all remain
unimplemented — `docs/unverified-source-documents.md` updated to record
this, not retract it). Built a new static reference page,
`src/modules/knowledge/ElectionTimetablePage.tsx`
(`/knowledge/election-timetable`), transcribing the article's statutory
timetable (roll certification, candidate nomination window and deposits,
special-vote windows) — same discipline as `GatheringsAdvisoryPage.tsx`
(§6.7): cited reference only, no tracking/alerts/data model. Also
recorded, for any future Free State demarcation-seeding session: a High
Court stay (6 Aug 2026) keeps Kopanong Local Municipality as a single
9-ward municipality for the 2026 LGE, not the two the MDB's 2026
re-determination would have created.

**Verified:** `npm run check:all` — 72 unit tests (unchanged, this
session added no logic to test — the new page is static reference
content, same as `GatheringsAdvisoryPage.tsx`), lint/typecheck/`check:hex`
all green; `npm run build` succeeds.

**Session 9, continued — Incidents module:** replaced the `IncidentsPage`
placeholder with a real build (`src/modules/incidents/`): status-tab list
(Logged/Triaged/Escalated/Referred/Resolved/Closed), a log-incident form
with the fixed taxonomy (category/severity selects, never free text —
matches `firestore.rules`' own category allow-list), and per-status
actions (Triage sets/confirms severity; Escalate moves it on). The
referral-PDF step (§6.4) is explicitly **not** built — it needs a
server-side generator with Storage write access and there's still no live
Firebase project to deploy one against (blocker #2) — `IncidentsPage.tsx`
says so in its own header rather than shipping a dead button. *(Session 18
built it, and the premise here turned out to be wrong: it needed no server
at all. See that entry.)*

Reused, rather than re-derived, the split-VD ward-resolution logic
`VoterForm.tsx` built in an earlier pass — extracted to
`src/lib/useVdWard.ts` and both `VoterForm.tsx` and the new
`IncidentForm.tsx` now share it, closing a real duplication risk (two
copies of scoping-correctness logic drifting apart over time). Also moved
`toneClasses.ts` from `src/modules/voters/` to `src/design/` since
Incidents needed the same static-Tailwind-class pattern for severity
pills — one shared lookup instead of a second copy.

Checked the Stitch batch for reference and found a real, worth-recording
discrepancy: `vd_captain_log_incident_modal` shows a *different* incident
taxonomy (Access Denied / Vandalism / Intimidation / Supply Shortage /
Other — canvasser field-safety issues) than the governing
`IncidentCategory` enum (water/electricity/roads/public-safety —
municipal service-delivery referrals). Not adopted; see
`docs/screen-findings.md` for the account. The same screen's
Severity/Description/Photo fields do match what was built.

Found and fixed a real security-rules gap while building this:
`firestore.rules`' incident `update` clause allowed the LOGGED→TRIAGED
and TRIAGED→ESCALATED transitions but had no clause for ESCALATED→
REFERRED — `IncidentRepository.markReferred()` has existed since Phase 3
and would have been silently rejected the first time anything called it.
Fixed: the same `incidents.escalate` capability that authorises
escalation now also authorises recording a referral.

**Verified:** `npm run check:all` — 78 unit tests (up from 72),
lint/typecheck/`check:hex` all green; `npm run build` succeeds.

**Session 9, continued — Field Diary module:** replaced the
`FieldDiaryPage` placeholder with a real build
(`src/modules/field-diary/`): entry list (newest first, filterable by VD
— same free-text-code fallback pattern as `VotersPage.tsx` for Ward/
Municipal Leads without a `vdScope`) and a log-entry form. Found a real
Stitch screen for this module for the first time —
`ward_field_app_mobile`'s actual "Field Diary" panel — and it showed a
type-tagged, titled, notes-only entry shape with **no household-count
field**, contradicting the port's provisional `streetName`/
`householdsVisited`-only shape. Since `DiaryEntry` had zero other
consumers yet and its own header explicitly invited this reconciliation
(unlike the already-shipped Voters/Incidents schemas, which stay
flag-only per `docs/screen-findings.md`), the schema itself was updated:
added `activityType` (`CANVASS`/`RALLY`/`OBSERVATION`/`OTHER`) and an
optional `title`, keeping `streetName`/`householdsVisited` for the
`CANVASS` case since War Room's future coverage-% derivation (§6.3) needs
that quantitative pair and the screen's version has nothing that serves
it. `firestore.rules`' diary `create`/`update` rule now also validates
`activityType` against the same four values, matching the defense-in-
depth already in place for incidents' category.

**Verified:** `npm run check:all` — 80 unit tests (up from 78),
lint/typecheck/`check:hex` all green; `npm run build` succeeds.

**Still placeholder, for the next session:** War Room, Logistics,
Finance, Analytics (+ its 3 sub-views), and most of Settings
(Municipality Config, Permissions, PPFA Thresholds, Data Subject
Requests) — a fuller list than "Field Diary and Logistics" as previously
stated in this file; corrected here rather than left inaccurate.

**Session 9, continued — War Room module:** replaced the `WarRoomPage`
placeholder with a real build, and — for the first time — the backend it
actually needs. §7.4/§8.1 require War Room to read pre-aggregated counter
documents only, never scan voters/incidents/diaryEntries live; a
`tenants/{tenantId}/counters/warRoom` doc and its `firestore.rules` entry
had existed since Phase 1 with nothing maintaining or reading it. Built
both sides:

- `src/dal/ports/warRoomCounters.ts` + its Firestore adapter — a single
  doc read, defaulting to a zeroed shape when the doc doesn't exist yet
  rather than erroring.
- `functions/src/warRoomCounters.ts` — three Firestore
  (`onDocumentWritten`) triggers, one each for voters, incidents, and
  diaryEntries, that keep the counter doc accurate via
  `FieldValue.increment()` deltas (no read-modify-write, no transaction —
  each field's increments serialise server-side on their own). The
  delta logic is pure and unit tested: 13 new tests covering voter
  create/sentiment-change/soft-delete/hard-delete, incident
  create/status-change, and diary create/edit/activity-type-change —
  this is `functions/`'s **first test file ever** (it had `vitest`
  wired since Phase 0 but nothing exercising it).
- `WarRoomPage.tsx` — stat tiles (voters captured, households canvassed,
  wards seeded, open incidents, sentiment breakdown, incidents by
  status) plus a registered-voter coverage % against the real Wards
  collection total, and quick links to Voters/Wards/Diary/Incidents.
  Reference: `lge_war_room_local_head`'s dashboard section (title
  literally "War Room") — its richer pieces (volunteer presence/online
  tracking, a "voters per minute" velocity metric, a high-activity-zone
  ranking, a live diary feed, a directives document repository) have no
  real, traceable data source in this codebase and were **not** faked;
  see `docs/screen-findings.md`.

Found and fixed two real cross-package test-runner bugs while adding
`functions/`'s first test: (1) `functions/`'s own `npm run test` picked
up its own `tsc` build output (`lib/warRoomCounters.test.js`) alongside
the source `.ts` file and crashed on the compiled CommonJS copy (vitest
is ESM-only) — fixed with a `functions/vitest.config.ts` excluding
`lib/**`. (2) the **app's** `npm run test` (run from `election-cos-app/`)
had no path restriction and was sweeping into `functions/` entirely —
redundantly re-running the same suite via the source files, and hitting
the exact same CommonJS crash via `functions/lib/**`. Fixed by adding an
explicit `exclude` (repeating vitest's own defaults, since setting
`exclude` replaces rather than appends them) plus `functions/**` to
`vite.config.ts`. Neither bug could have surfaced before this session —
`functions/` had zero test files until now.

**Verified:** `npm run check:all` in `election-cos-app/` — 80 unit tests
(unchanged — the new logic lives in `functions/`), lint/typecheck/
`check:hex`/build all green. `cd functions && npm run build && npm run
test` — 13 unit tests, build clean. The Cloud Functions themselves are
**not deployed** — same blocker #2 as everything else Firebase-shaped —
so War Room's tiles will read as zero/empty against a real project until
they are.

**Session 9, continued — Analytics' 3 sub-views:** replaced all three
placeholders with real builds, plus a real landing page at `/analytics`
linking to them.

- **Vote Calculator** (`SeatCalculatorPage.tsx`) — a standalone MMP
  what-if tool wired directly to the already-real, already-verified
  `allocateSeats()` (no DAL/session dependency; it's a scenario
  calculator). Opens on the real JB Marks/NW405 2021 result
  (`nw405Example.ts`) instead of a blank form. Adds a real "Coalition
  Builder": tick parties, see their combined seats against a computed
  majority threshold — genuine derived arithmetic on the calculator's own
  output, not invented data.
- **Threshold Analyzer** (`ThresholdAnalyzerPage.tsx`) — the ELECTORAL
  1% qualification threshold (Schedule 1 Step 2), kept strictly separate
  from `/settings/ppfa-thresholds` (statutory funding disclosure) per the
  naming discipline this file's stub already carried. New
  `electoralThreshold.ts`, tested against the real NW405 2021 figures —
  every party that won a seat in the real result clears 1%, the one that
  didn't (Abantu Batho Congress) doesn't. The 1% figure itself is flagged
  as an unverified working assumption, not a confirmed statutory fact —
  same treatment as the rest of `docs/unverified-source-documents.md`.
- **Sentiment Summary Report** (`ScheduledReportsPage.tsx`, née
  "Automated Reporting") — a real, on-demand, tenant-wide sentiment
  summary read from the same `warRoomCounters` doc War Room uses, with a
  CSV export. What the original "Automated Reporting" scope implied and
  this does NOT do: true cron-based scheduling (no Cloud Scheduler
  function exists), distribution lists/email delivery (no notification
  infrastructure exists), or a per-ward ranking (the counters this build
  maintains are tenant-wide only). All disclosed in the file's own header
  comment rather than faked.

The human supplied 9 more screenshots for this pass — 2 were directly
useful (both "Civic Authority," retired shell — structural patterns
reused, palette/branding/formula not), 2 were report mockups with a
fabricated signatory that was deliberately not reproduced, 2 were
entirely out of scope (a marketing landing page — `election-cos-landing`
territory — and a "Volunteer Rewards Configuration" screen matching no
capability or data model this build has), and 2 duplicated ground already
covered. Full account in `docs/screen-findings.md`.

**Verified:** `npm run check:all` — 92 unit tests (up from 80; 12 new —
7 for `electoralThreshold.ts`, 5 for `sentimentSummary.ts`; the
already-tested `seatCalculator.ts` is unchanged), lint/typecheck/
`check:hex`/build all green.

**Session 9, continued — Logistics module:** replaced the placeholder
with a real build (`src/modules/logistics/`): a request form ("Request
materials" — item, quantity, delivery urgency, drop-off instructions)
and a list with an Approve action, reading the whole tenant's logistics
collection unfiltered (deliberate — `firestore.rules` doesn't geo-scope
logistics reads, and it's a small, bounded collection, not millions of
voter records, so that's within §7.4's actual concern rather than a
violation of it).

Reference: Stitch's `vd_captain_request_materials_modal` — the first
real screen this port ever had. Same call as the session-9 Diary
reconciliation: `LogisticsItem`'s field list was provisional with zero
other consumers, so the schema was updated (added `urgency`,
`dropOffInstructions`, `vdCode`, `requestedBy`) rather than just flagged.
The screen's fixed 5-item material taxonomy was **not** adopted —
`itemName` stays free text.

Found and fixed two real gaps, neither from the screen:

1. `firestore.rules` gated logistics `create`/`update` on `logistics.view`
   alone — the only module in this codebase to gate a write on a `*.view`
   capability (every other module has a distinct edit/create capability).
   Added `logistics.edit` (`src/auth/types.ts`), split the rule so moving
   status to APPROVED additionally requires `logistics.approve` (a
   requester can't self-approve via a plain upsert), and while auditing
   who held what, found **VD Captain had zero logistics capabilities at
   all** — couldn't even view logistics, despite "Request Materials"
   being a VD Captain dashboard action in the very screen this pass used.
   Granted `logistics.view` + `logistics.edit` to VD Captain;
   `logistics.approve` stays Party-HQ-Admin-only.
2. `firestore.rules` already had a `logisticsApprovals` collection rule
   (client-writable, gated on `logistics.approve`) with nothing ever
   writing to it — dead code since whenever it was first added. Wired
   up: `approve()` now writes a `LogisticsApproval` record alongside the
   status change, a lightweight trail distinct from the server-only
   `auditLog`. No UI reads it yet — reasonable follow-up, not built now.

**Verified:** `npm run check:all` — 96 unit tests (up from 92; 4 new for
`logisticsMeta.ts`), lint/typecheck/`check:hex`/build all green.

**Session 9, continued — Funding & Disclosure (PPFA) module, and its
Settings companion:** replaced both the `FinancePage` placeholder and the
`/settings/ppfa-thresholds` placeholder with real builds. This is the
most consequence-sensitive module in the codebase (§6.8.3: "never block a
donation write"), so extra care went into keeping it strictly within the
already-established boundary:

- `FinancePage.tsx` — donor list + detail panel (`DonorForm.tsx`,
  `DonationForm.tsx`, `DonorDetail.tsx`). Recording a donation is never
  blocked by amount or threshold — the DAL already enforced this
  (`donationsRepository.ts`'s header); nothing added here changes that.
  `idNumberEncrypted`/`registrationNumberEncrypted` are deliberately
  absent from the donor form — same disclosed gap as phone encryption,
  no Cloud KMS key management provisioned.
- `DonorDetail.tsx` shows a **client-side, display-only** provisional
  status banner (`levelForAggregate` over the donor's current-financial-
  year donations, summed in the browser) — explicitly labelled as not
  the real aggregation. The real one
  (`functions/src/ppfaAggregation.ts`) stays deliberately unbuilt
  pending §6.8.1 Q1–Q3 legal confirmation; this banner writes nothing
  (`donationAlerts` create is `if false` for clients in firestore.rules
  regardless) and exists only so a compliance officer isn't flying blind
  in the meantime.
- New `financialYear.ts` (+ 8 tests) derives `Donation.financialYear`/
  `quarter` from the tenant's configured (provisional)
  `financialYearStartMonth` — donationsRepository.ts's header had asked
  for this "derived by the caller" and nothing had built it yet.
- `/settings/ppfa-thresholds` (`PPFAThresholdsPage.tsx`) — shows the
  current governing figures + source citation + effective date, a full
  history (append-only — every "edit" is a new effective-dated config,
  matching firestore.rules' `update, delete: if false`), and a create
  form seeded from the gazetted defaults (`ppfaDefaults.ts`).

Found and fixed a real Rules-of-Hooks bug while building
`PPFAThresholdsPage.tsx`: an early draft called several `useState` hooks
*after* an `if (!session) return` early return — a real bug (hook call
order isn't guaranteed stable if `session` changes), not just a style
issue. Restructured so every hook runs unconditionally before any return,
with a short header note explaining why, in case a future page copies
this file's structure without noticing.

**Verified:** `npm run check:all` — 104 unit tests (up from 96),
lint/typecheck/`check:hex`/build all green.

**Session 9, continued — the rest of Settings: every placeholder module
in this build is now real.** Replaced `SettingsPage` (index, links to all
five sub-pages), `MunicipalityConfigPage`, `PermissionsPage`, and
`DataSubjectRequestsPage`.

- **Municipality Config** — new `src/dal/ports/municipalityProfile.ts` +
  adapter, backing `tenants/{tid}/profile/municipality`. That collection
  had a `firestore.rules` entry since Phase 1 with **no DAL port at
  all** — same class of gap as `counters/warRoom` and
  `logisticsApprovals`, found and wired up in earlier session-9 passes.
  Captures municipality code/name/province, seat totals, and election
  day (defaulting to 4 Nov 2026 — the date corroborated across two
  independent sources this session, see
  `docs/iec-election-timetable-2026.md` — offered as an editable
  default, not asserted as certain). **Not** wired into
  `/analytics/seat-calculator` this session — that page is a standalone,
  already-shipped what-if tool; pulling its defaults from here instead
  is a reasonable follow-up.
- **Permissions** — real staff list (`dal.staff`) with role assignment
  and per-user capability-override editing (granted/revoked), plus a
  read-only reference table of the 7 seed roles. New
  `src/auth/allCapabilities.ts`: a runtime array of every `Capability`,
  built as `Record<Capability, true>` so TypeScript itself errors if the
  union and the array ever drift apart. **Not built:** provisioning a
  brand-new staff member — that needs a real Firebase Auth account via
  an invite Cloud Function that doesn't exist yet; this page only
  manages already-provisioned staff.
- **Data Subject Requests** — log + status workflow (Received → In
  Progress → Fulfilled/Rejected) over the data model and SLA helper that
  already existed, finally with a UI. Flags overdue requests using the
  existing (attorney-review-flagged, non-statutory) 30-day working
  assumption.

Checked the Stitch batch for Permissions specifically: five
"*_permissions_management" screens exist, all "Civic Architect" (retired
shell) and framed around a multi-metro "Team Command" concept that
doesn't fit this build's model — not adopted for palette or framing. One
pattern reused: a per-capability toggle list with human-readable
descriptions, confirming `PermissionsPage.tsx`'s general shape; this
build's version uses raw capability strings rather than authored
descriptions, a reasonable follow-up. No screens exist for Municipality
Config or Data Subject Requests. Full account in `docs/screen-findings.md`.

**Verified:** `npm run check:all` — 106 unit tests (up from 104),
lint/typecheck/`check:hex`/build all green.

Every module page in this build is now a real implementation, not a
`PagePlaceholder` stub. What's NOT real is unchanged from before this
session and disclosed throughout this file and `docs/screen-findings.md`
at the specific place each gap lives: no live Firebase project (blocker
#2, the big one — nothing here has been proven against a real Firestore
instance), the PPFA aggregation Cloud Function (held on purpose, §6.8.1),
`functions/src/sync.ts` (skeleton), incident referral-PDF generation
*(built in session 18)*, a dedicated `election-cos-app` repo (still blocked on the human creating an
empty one), and several smaller named gaps (phone/donor-ID encryption,
staff invite flow, per-ward sentiment segmentation, live activity feeds,
volunteer presence tracking). None of these were faked to look finished.

**Session 10 (9 Aug 2026, later) — real Firebase project confirmed; Google
Sign-in; the app's first-ever sign-in UI.** The human confirmed the real
GCP project (`election2026-campaignms7-0` — previously an unreconciled
guess, see `docs/phase-0-infra-plan.md`) and asked for Firebase
Auth/Firestore as the backend with Google Sign-in specifically. Checked
this sandbox for a Firebase agent skill and for `firebase`/`gcloud` CLIs
and Google Cloud credentials first, per the human's instruction to use
the appropriate skill — none exist here (no skill, no CLI, no
credentials, no interactive OAuth). Did everything that's actually
possible without them, and said so plainly rather than claiming more:

- Real `.firebaserc` (`election2026-campaignms7-0`), `.env.example`
  updated with the confirmed project ID, `docs/phase-0-infra-plan.md`'s
  "unreconciled" note marked resolved.
- `signInWithGoogle()` added to `firebaseAuth.ts` (`GoogleAuthProvider` +
  `signInWithPopup`). **A real tension with §4.3's minimal-footprint
  Auth rule, flagged rather than silently resolved:** Firebase's Google
  OAuth integration automatically populates `displayName`/`photoURL` on
  the Auth record as a side effect of linking the provider — that's
  Firebase's own behaviour, not something `assertMinimalAuthPayload` can
  intercept, since it only guards fields this module chooses to write.
  Mitigated by scrubbing both fields back to `null` via `updateProfile()`
  immediately after every Google sign-in — the best narrowing the Auth
  API surface allows, not a guarantee those values were never
  transiently present in Google's/Firebase's care during the handshake
  itself. If the real answer is "keep the profile photo," that's a
  deliberate policy change to make on purpose. 2 new tests (mock-based,
  `firebaseAuth.test.ts`'s first tests that aren't pure-function checks).
- **The app had no sign-in UI at all before this** — every module page
  independently showed "No active session" with no way to reach a
  signed-in state. Built `src/auth/SignInPage.tsx` (Google-only, per the
  ask) and refactored `Shell.tsx` to be the single place that branches on
  the three real auth states — `loading`, `signed-out` (renders
  SignInPage), and `signed-in` with `session === null` (a real Firebase
  user who exists but hasn't been assigned a tenant/role yet —
  previously indistinguishable from "not signed in" in every page's own
  message, now its own real "Awaiting access" screen with a sign-out
  escape hatch). Added a sign-out control to the main nav too — didn't
  exist anywhere either.
- `GoogleIcon.tsx`: the official Google "G" mark, reproduced at its
  fixed brand colours — a deliberate, narrow exception to §2.2's
  no-raw-hex rule (a third-party brand mark isn't this app's design
  decision to tokenise, same as a Visa mark on a payment button), isolated
  to one allow-listed file rather than loosening the hex guard generally.
- **Verified by actually running the app**, not just typecheck/build: started
  the dev server, drove headless Chromium against it (`playwright` isn't a
  project dependency — found and used the sandbox's global install via an
  explicit require path), confirmed no console errors and screenshotted
  the real sign-in page rendering correctly with no live config, which is
  exactly the state it should be in without `.env` filled in.

**What's still needed from the human** to actually reach a live signed-in
session — none of it is possible from this sandbox — is the numbered list
under blocker #2 above (register the web app, fill `.env`, enable the
Google provider, verify the Firestore region, deploy rules).

**Verified:** `npm run check:all` — 108 unit tests (up from 106),
lint/typecheck/`check:hex`/build all green. Dev server smoke-tested with
a real headless-browser screenshot (see above) — the first time in this
build's history a session has actually run the app rather than only
compiled/tested it.

Read this before doing anything else in this repo. It says plainly what's
real, what's a placeholder, and what's blocked on something only a human
can unblock.

**Session 11 (7 Sep 2026) — ecos-v2 fork received; naming-alignment pass;
real Google Maps household map.** The human sent a zip, `ecosv2appnamingfixed.zip`
(`ecos-v2/`), with no accompanying instructions the first time. Investigated
before acting rather than guessing:

- **What it is:** a separate fork of this exact repo (its `pr.json` etc.
  are this repo's own PR #1 metadata), built through **Google AI
  Studio/Gemini code-assist**, not Claude Code — confirmed by
  `metadata.json`'s `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, an
  `assets/.aistudio/` folder, `bun.lock`, and a Session-6 note citing
  platform attribution ID `gmp_mcp_codeassist_v1_aistudio`. It diverged
  right after this repo's Session 1 and continued independently.
- **Materially behind on the module build-out, not ahead:** its own
  `BUILD-STATUS.md` (as of its Session 5) says only Voters is real,
  everything else is still `PagePlaceholder` — this repo has every module
  built, DAL-wired, and tested. Confirmed by directory inspection, not
  just taken on its word.
- **A real security finding, not adopted:** its
  `src/lib/googleMapsConfig.ts` had a **hardcoded Google Maps API key**
  as a source-level fallback (`AIzaSyBTs4...`). Flagged to the human
  directly (recommended rotating/restricting it in Cloud Console
  regardless of anything done here) and not carried into this repo's
  version of that file, which reads only `VITE_GOOGLE_MAPS_API_KEY` —
  never a bundled key.
- **A real quality finding, not adopted:** its War Room
  (`patch_warroom.js`) has hardcoded, invented telemetry —
  `value: '2,482,901'` for "Total Voter Reach" with a fabricated
  channel breakdown — baked directly into JSX. Exactly the pattern this
  build has avoided throughout (real counters via
  `functions/src/warRoomCounters.ts`, or an honest "not built" note,
  never an invented number). Not ported.
- **Asked the human what to do, with findings attached** (a vague first
  question — "what should I do with this zip" — got "no preference" the
  one other time an ambiguous multi-choice was tried this project, so
  this time the options carried the analysis above). Answer: *"Integrate
  the zip into our build and effect the necessary layout and technical
  architecture changes."* Scoped that instruction against the findings
  above rather than importing the fork wholesale:
  1. **Naming-alignment pass — applied.** ecos-v2's `BUILD-STATUS.md`
     carries a "6 Sep 2026" naming note: "Election-COS1.0" (Session 4's
     rename, above) is itself superseded by **"Election Campaign OS"
     (full) / "EC OS" (short)**, citing a `03-NAMING-SCHEMA.md` this
     session was never given directly. Applied on the strength of it
     being a specific, dated instruction rather than treated as live —
     every "Election-COS1.0" string in code comments, UI text, README,
     and doc prose across this repo is now "Election Campaign OS" (see
     the naming note at the very top of this file). **Not** reverted:
     the `election-cos-app/` folder name or the
     `election-cos-app`/`election-cos-app-functions` package
     identifiers — those are infra identifiers, not product branding,
     and ecos-v2's own `functions/package.json` left its equivalent
     alone too.
  2. **Google Maps household map — built for real, not ported.** New
     `src/lib/googleMapsConfig.ts` (key from env only, no fallback),
     `src/components/GoogleMapsWrapper.tsx` (renders a "not configured"
     message instead of crashing when no key is set — same pattern as
     `dal/adapters/firestore/client.ts`), and
     `src/modules/voters/VoterHouseholdMap.tsx`: a real "Household map"
     view added to `VotersPage` (list/map toggle) that plots existing
     `Household.geo` pins for the current VD and lets a canvasser click
     the map to drop a pin for a new household, handing the exact
     coordinates to the existing, tested `HouseholdQuickAdd` form
     (extended with an optional `initialGeo` prop) rather than building
     a second household-creation path. Split-VD disambiguation reuses
     `useVdWard`, the same hook `VoterForm`/`IncidentForm`/etc. already
     use. No GIS boundary/demarcation data of any kind was copied from
     ecos-v2 — its "comprehensive GIS boundary benchmarks" for informal
     settlements had no cited source, which is exactly the kind of
     confident-sounding unverified geodata this build doesn't fabricate;
     the only coordinate carried over is Potchefstroom's public
     town-level centre, used purely to frame the map's initial view, not
     as ward/demarcation data (real ward/VD geography stays in
     `seed-data/jb-marks-nw405-wards-vds.json`). Added dependency:
     `@vis.gl/react-google-maps` (Google's own React wrapper for the
     Maps JS API). New env vars in `.env.example`:
     `VITE_GOOGLE_MAPS_API_KEY` (required for the map to render) and
     `VITE_GOOGLE_MAPS_MAP_ID` (optional, styling only).
  3. **Legal footer — adopted, corrected.** ecos-v2's
     `COPYRIGHT_LINE`/`COMPANY_REG_LINE` pattern was accurate but
     incomplete against `CLAUDEHANDOFF.md` §1's company detail. New
     `src/lib/legalText.ts` carries the full legal name, registration
     number, and trading-as detail (`Innovation Consult (Pty) Ltd t/a
     Just Be Trading 10 (Pty) Ltd · Reg. 2007/021390/07`) — flagged in
     that file's own header as sourced from `CLAUDEHANDOFF.md`, not
     independently verified against a company registry. Wired into
     `Shell.tsx`'s nav footer and `SignInPage.tsx`.
  4. **RAG status-colour tokens (`amberDeep`/`red`/`tint`/`tint2`) —
     evaluated, not adopted.** They exist in ecos-v2 to retrofit a
     status-colour system onto a codebase that had been reusing brand
     tokens (`gold`/`maroon`) for status. This repo already solved that
     with `src/design/toneClasses.ts`'s `Tone` system, in place since
     session 9 and used consistently for sentiment/severity/urgency
     everywhere — adding a second, parallel colour system would
     recreate the exact inconsistency `check:hex`/`tokens.test.ts` exist
     to prevent. Its base 7-colour palette values for `paper`/`teal`/
     `slate` also differ from this repo's (undocumented drift, no
     changelog) — not adopted for that reason too; this repo's tokens.ts
     is unchanged.
  5. **Not integrated, out of scope:** ecos-v2 contains a much larger,
     undocumented sprawl beyond what its own `BUILD-STATUS.md` describes
     — Gmail/Google Sheets/Google Tasks integration modals, a membership
     OCR capture flow, a persona-switcher modal, and an
     `RlsDiagnosticDashboard` (implying Postgres RLS, which V2's
     architecture retired behind Firestore). None of it is in
     `IC-ECOS-BUILD-2026-V2`'s scope, none of it was reviewed for
     fabricated content the way the two items above were, and importing
     dozens of unvetted Gemini-generated components wholesale would be
     a real regression in this build's discipline, not an integration.
     If any specific piece of that is actually wanted, it needs its own
     pass — flagged to the human rather than silently pulled in or
     silently dropped.

**Verified:** `npm run check:all` — 108 unit tests (unchanged count;
this session added map UI, not new pure-logic units to cover), lint/
typecheck/`check:hex`/build all green in `election-cos-app/`; `functions/`
build + its 13 tests unaffected (this session didn't touch `functions/`).

**Session 12 (7 Sep 2026) — the V2 bundle arrived; naming pass corrected
against its real source; four conflicts flagged, none silently resolved.**
The human sent the actual `IC-ECOS-BUILD-2026-V2` bundle (5–6 Sep 2026):
`00-MASTER-DECISIONS.md`, `01-HOSTING-COST-COMPARISON.md`,
`02-PRICING-V2-WEEKLY-METERED.md`, **`03-NAMING-SCHEMA.md`**,
`04-APP-REVIEW.md`, `05-ARTEFACT-INDEX.md`, `prisma/schema.prisma`, SQL
migrations `010`–`040`, both OpenAPI contracts, and the TS SDK client.
Session 11 applied that naming pass **secondhand**, from a citation in the
ecos-v2 fork's BUILD-STATUS; this session had the source document and
checked the work against it.

**Session 11's pass was directionally right and wrong in the details.**
`03-NAMING-SCHEMA.md` §2.3 fixes specific strings per surface, and session
11's blanket replace to the full product name overshot on four of them.
Corrected here:

| Surface | Session 11 had | §2.3 canonical — now applied |
|---|---|---|
| Nav-shell mark (`Shell.tsx`) | `Election Campaign OS` | **`EC OS`** (compact form) |
| Nav footer (`Shell.tsx`) | `Copyright © … All rights reserved.` | **`© Innovation Consult (Pty) Ltd · knowledge to action`** |
| Sign-in header (`SignInPage.tsx`) | eyebrow + `Sign in` | **`Sign in to Election Campaign OS`** |
| Error boundary (`ErrorBoundary.tsx`) | `Something went wrong` | **`Election Campaign OS encountered an error`** |
| `package.json` → `name` | `election-cos-app` (session 11 deliberately left it) | **`@innovation-consult/ecos-app`** per §2.1 |

The package-name call in session 11 ("infra identifier, not branding, so
don't touch it") was wrong — §2.1 names the node package explicitly.
§2.5 separately keeps the *repo/directory* as `election-cos-app`, so the
CI `working-directory:` paths are correct as they stand and were not
touched. Verified by running the app, not just building it: dev server +
headless Chromium, sign-in page renders both new strings, no console
errors. Strings now come from `src/lib/legalText.ts` constants
(`PRODUCT_NAME`, `PRODUCT_NAME_SHORT`, `NAV_FOOTER_LINE`) rather than
being retyped per file — the fourth naming directive won't need another
repo-wide sweep.

**Closed by this repo, contrary to the bundle:** `04-APP-REVIEW.md` §2 and
`01-HOSTING` §6.5 both flag the GCP project identity
(`innovation-consult-ecos-prod` vs `election2026-campaignms7-0`) as
unreconciled and needing a human. **It was resolved in session 10** — the
human confirmed `election2026-campaignms7-0`, and this repo has a real
`.firebaserc` for it. The bundle predates that. No action needed; the
bundle's next-step #3 is already done.

**Flagged, deliberately NOT resolved — each needs a human decision:**

> **RESOLVED 13 Sep 2026 (session 20), items 1 and 2 below, by the project
> owner: "Firestore is my final decision."** Firestore is the database.
> There is no Postgres migration — not deferred, not conditional,
> *decided*. Items 1 and 2 are kept in place below for the record of what
> was asked and when; do not re-open either. See the decision record at
> the end of this file.


1. **Where the metering engine runs.** The bundle's own `04-APP-REVIEW.md`
   §4 and `05-ARTEFACT-INDEX.md` next-step #1 name this as the blocking
   decision, and it is: `prisma/schema.prisma` + `020_metering_tokens_vouchers.sql`
   are Postgres-native (PL/pgSQL `debit_tokens()`/`reverse_debit()`), this
   app is Firestore-native, and `src/dal/adapters/postgres/` is empty by
   design until Phase 8's paying-subscriber trigger. Either metering gets a
   Firestore implementation or Postgres gets provisioned early. Not picked
   here.
2. **The bundle contradicts itself on that same point.**
   `00-MASTER-DECISIONS.md` §2 says V2's database is *"Firestore Standard"*
   and §4 says V2 is a *"Shared Firestore database"* — while the schema and
   migrations in the same bundle describe V2 as the Postgres shared-tenancy
   product. Worth resolving in the artefact before anyone builds against it.
3. **RBAC role model conflict — the previously-flagged defect class, again.**
   *(**RESOLVED 13 Sep 2026, session 21:** seven roles, `compliance-officer`
   stays. See the decision record at the end of this file. Kept below for
   the record of what was asked; do not re-open.)*
   `010_v2_shared_tenancy.sql` seeds **6** roles (`HQ_ADMIN`, `LOCAL_HEAD`,
   `FINANCE_OFFICER`, `WARD_LEAD`, `VD_CAPTAIN`, `VOLUNTEER`), and the
   `ecos-rbac-config` skill calls those six canonical, explicitly warning
   that a 7th like `COMPLIANCE_OFFICER` is usually a task-owner label
   leaking into login RBAC. This repo has **7** roles from
   `IC-ECOS-BUILD-2026-V2 §4.4`, and the 7th *is* `compliance-officer` —
   but it is not a leak: it holds `dsr.view`/`dsr.manage` for the POPIA
   data-subject-request workflow that `04-legal-compliance-workstream.md`
   action **LG10** required, which is a real product decision. Also
   divergent: id convention (`ward-lead` vs `WARD_LEAD`) and UI labels
   (this repo's "Ward Lead" / "Municipal Team Lead" vs the skill's "Field
   Coordinator" / "Local Election Head" — the skill itself flags that
   label mapping as worth confirming). **Not reconciled unilaterally**:
   dropping Compliance Officer would strip the POPIA workflow's owner.
4. **Capability catalogue divergence.** 25 capability keys here vs ~45 in
   the bundle's seed, with different conventions in places (`incident.read`
   vs this repo's `incidents.view`). The bundle's are metering-shaped
   (`diary.geospatial.review` at 25 tokens); this repo's are
   access-control-shaped. They must reconcile before any debit call is
   wired, or the two systems will disagree about what a capability *is*.
   `05-ARTEFACT-INDEX.md` records the bundle already hit this once — its
   OpenAPI examples cited keys that didn't match its own seeded table.

**Two real gaps this bundle surfaced in this repo:**

- **No PWA manifest exists at all.** §2.3 specifies `manifest.json`
  install names (`EC OS` short, `Election Campaign OS` long); there is no
  `manifest.json` and no `public/` directory in this repo, despite
  "offline-first PWA" being the architecture throughout. Not fabricated
  here — a real manifest needs real icon assets that don't exist yet.
- **§2.3's nav mark wants "tenant name below" — there is no tenant name
  to render.** `SessionContext` carries `tenantId` only (an opaque id);
  `Tenant.displayName` lives in the unbuilt Postgres store. The slot is
  left empty with a comment rather than filled with an id.

**One knowing exception to §4's cross-check.** That section says
`grep -R "Civic Architect\|Civic Authority\|..." src/` should return zero
hits. It returns four here — all of them comments *documenting the
retirement* ("reskinned to our tokens, not the retired Civic Authority
palette"). Removing them would delete the provenance trail explaining why
those screens look the way they do. Left in place deliberately; flagging
rather than quietly failing the check.

**Not acted on:** the metering/harvest SDK, OpenAPI contracts, and SQL
migrations are untouched — they are new integration surface gated behind
decision #1, not something to wire in on spec. A bare `x.com` link was
also supplied with no context and could not be opened from this sandbox.

**Verified:** `npm run check:all` — lint, typecheck, `check:hex`, 108
tests, all green; `npm run build` succeeds; sign-in page smoke-tested in
a real browser (see above).

**Session 13 (7 Sep 2026) — the rest of the bundle, and ecos-v2 source
read directly. No code changed; one real defect and one hard conflict
found.** The human supplied the bundle's three remaining artefacts
(`skills/ecos-v2-metering/SKILL.md`, its
`references/action-pricing-checklist.md`, and
`skills/ecos-electoral-data-harvest/references/source-manifest-starter.md`)
plus thirteen loose source files from the ecos-v2 fork. The bundle is now
complete as listed in `05-ARTEFACT-INDEX.md`; the metering skill and
checklist are reference material for work still gated behind session 12's
decision #1 (where the metering engine runs), so nothing was built from
them.

The fork files are the primary sources behind session 11's findings, which
had been made from patch scripts rather than the code itself. Full review
written up in **`docs/ecos-v2-fork-review.md`** — what was taken, what was
rejected, and why. Two items are worth surfacing here:

1. **A real defect in the fork's POPIA anti-fraud validator.**
   `validateSouthAfricanId()` enforces the SA ID checksum only when the
   caller opts in with `{ strictLuhn: true }`, and
   `validateAndVerifyMemberCapture()` — the anti-fraud capture path —
   calls it without that option, so a checksum-invalid ID is accepted as
   valid by the routine whose whole purpose is catching fraudulent
   captures. Its test suite cannot catch this because its own
   "valid" fixture (`8804150123183`) computes check digit 7 and carries 3.
   Verified by transcribing the algorithm and running it, not by reading:
   the algorithm itself is correct, and all six of its fabricated
   `SEED_CAPTURED_IDS` member records also fail the checksum. Nothing
   ported — there is no consumer for SA ID validation in this repo today
   (`Candidate.idNumberMasked` is written by nothing, Candidates has no UI
   or route, `DonorForm` deliberately doesn't capture ID numbers), so
   building one now would be speculative. The review doc records what to
   reuse and what to fix if Candidates ever gets a capture screen.
2. **The fork's RLS tests and the bundle's RLS migration contradict each
   other.** `tenantIsolationRls.test.ts` exists specifically to prove
   VARCHAR(36) tenant ids like `'tenant-jbm-anc-2026'` work without a
   UUID cast; `010_v2_shared_tenancy.sql` declares `tenant.id uuid` and
   every policy does `current_setting('app.current_tenant_id', true)::uuid`,
   which raises `invalid input syntax for type uuid` on exactly those ids.
   One of the two has to change. Neither applies to this Firestore-native
   repo yet, so it is flagged for whoever owns the bundle rather than
   resolved here.

Also confirmed from source rather than inference: the fork's
`metricsService.ts` defaults to a mock path built from hardcoded constants
(including **R15.45 m of fabricated donations** in a PPFA-regulated
product) with chart series synthesised by `Math.sin()`; and its
`index.css` regresses the brand navy to `#040c30`, the value
`CLAUDEHANDOFF.md` §5 records as already retired in favour of `#1A2246`.
Neither adopted. Its `tenantIsolationRls.test.ts` is also a third
independent source for the 6-role set, against this repo's seven — the
open conflict recorded in session 12's item 3.

**Verified:** no source changed this session, so the prior verification
stands; `check:all` re-run green regardless.

**Session 14 (7 Sep 2026) — offline DB made reopen-safe; the fork's UI
layer reviewed in full.** Sixteen more ecos-v2 files. Six are this repo's
own round-tripped back (one, `toneClasses.ts`, a *stale* pre-session-9
copy). The rest are the fork's UI layer, reviewed and added to
`docs/ecos-v2-fork-review.md`.

**One genuine improvement adopted — the first from this fork that is
better engineering than what was here.** Its `db.ts` handles IndexedDB
connection lifecycle; this repo had none. The failure mode was verified
against this repo's own Dexie rather than assumed: **a closed connection
rejects every subsequent operation with `DatabaseClosedError`; Dexie does
not transparently reopen it.** For an offline-first field app, the write
that fails is a canvasser's canvass result after backgrounding the app.
Added `offlineDb.ensureOpen()` and called it from `enqueue()`,
`drainOutboxBatch()` and `applySyncResponse()`. 5 new tests (113 total, up
from 108) — and the new tests were confirmed to **fail** with the guard
removed (`DatabaseClosedError`) and pass with it, so they protect
something real. One db.test.ts case asserts the Dexie premise itself, so a
future Dexie change surfaces instead of silently making the guard pointless.

**Not adopted from the same file:** the fork's
`on('versionchange', () => false)`. That event fires when *another tab* is
upgrading the schema; refusing to close blocks that upgrade indefinitely.
A closed connection is recoverable, a wedged upgrade is not. Its
`visibilitychange` reopener (redundant once every entry point guards, and
a never-removed global listener) and its error-swallowing `catch` in
`ensureOpen` were also left out.

**Two findings that raise the stakes on the fabrication issue**, both new
this session:

- **`SmartMembershipCaptureModal.tsx` states POPIA guarantees for
  processing that does not exist.** The flow is `setTimeout`-simulated
  OCR (hardcoded to `'Thabo Mofokeng'` / ID `8506125009087`, which also
  fails its checksum), a mock OTP `'123456'` with an on-screen hint, and a
  `Math.random()` audit reference. It tells the user images "are uploaded
  to a temporary, encrypted bucket (africa-south1) and deleted
  automatically after processing" — nothing is uploaded — and that details
  were "securely logged to the immutable append-only ledger" — nothing is
  logged. It collects a POPIA consent declaration and discards it.
- **`HouseholdAddressModal.tsx` mints its own `SessionContext`** with its
  own `caps` array and passes it to the DAL, inverting §4.4's server-side
  capability resolution. Real `firestore.rules` would reject the write
  (rules read `request.auth.token.caps`), so it is a pattern failure
  rather than a live hole — but it is the pattern the whole three-layer
  isolation model exists to prevent. Its "Validate with Google Maps"
  button calls nothing and then reports the address verified.

Also read in full and unchanged in assessment: the Bento War Room's
numbers are all literals (`142893` registered, `89.4` VPM, "312"
canvassers, 74/65/58 % sentiment bars), and its volunteer avatars are
Unsplash photographs of real people presented as field staff.

**Verified:** `npm run check:all` — lint, typecheck, `check:hex`, **113
tests** (up from 108), all green; `npm run build` succeeds.

**Session 15 (7 Sep 2026) — the fork's Settings layer: false statutory
claims found; this repo audited clean against the same defects.** Sixteen
more files (one, `LogisticsPage.tsx`, uploaded twice — byte-identical).
Three are this repo's own returned unchanged, including
`dataSubjectRequestSla.ts`, which matters below. Nothing was adopted;
there was nothing here worth adopting. Full detail in
`docs/ecos-v2-fork-review.md` §4d–4g.

**The most serious findings so far, because these are legal assertions
rather than invented metrics:**

1. **The superseded PPFA figures, on the settings landing page.** The
   fork's `SettingsPage.tsx` describes the PPFA module as "Political Party
   Funding Act limits (**R100,000 threshold, R15M annual ceiling**)" —
   the retired values. Current is R200,000 / R30,000,000 per Gazette
   53182, which the bundle's own harvest migration cites as superseding
   exactly those numbers. The fork contradicts itself: its
   `PPFAThresholdsPage.tsx` defaults the form to the correct figures. A
   party admin is shown the retired number on the index and the current
   one on the form beneath it.
2. **A hedged assumption converted into two conflicting "statutory"
   deadlines.** This repo's `dataSubjectRequestSla.ts` states that POPIA
   prescribes no fixed response window and that `RESPONSE_TARGET_DAYS` is
   "a working assumption (not a legal deadline)" pending attorney review.
   The fork renders that as "**21-day statutory** turnaround limit"
   (DSR page) and "**14-day SLA** enforcement" (Settings page) — two
   different numbers, neither the source's, one labelled statutory, for a
   window the source explicitly says is not.
3. **Two different gazette numbers for one demarcation.**
   `MunicipalityConfigPage.tsx` cites "Gazette No. 51892" where three
   other places cite "8929" — the number this project was actually
   supplied (`docs/nw405-seed-data.md`). A gazette citation is a
   provenance claim.

**The self-minted `SessionContext` is systemic.** Session 14 found it in
one modal; `PPFAThresholdsPage` and `DataSubjectRequestsPage` do it too.
The PPFA one grants itself `'ppfa.manage_thresholds'` — **a capability
that exists in no catalogue**, this repo's or the bundle's — with
`as any` suppressing the type error that would have caught it, on the one
screen where §6.8 separation of duties matters most.

**This repo audited against all of it, and is clean** — stated with
evidence rather than assumed: zero components construct a
`SessionContext` (every module takes `ctx` from `useSession()`), zero
`as any` anywhere in `src/`, no superseded PPFA figure in live code
(`ppfaDefaults.test.ts` actively asserts none can appear), and our DSR
page says "past a working 30-day target" pointing at the caveat rather
than calling it statutory.

Also: the fork's `PermissionsPage.tsx` invents a **fourth** role
vocabulary (`MUNICIPAL_LEAD`, `DATA_OFFICER`, `EXPORT_ALL` — in neither
the 6-role canonical set nor this repo's 7) and its permission toggles are
static JSX whose "Save Changes" only closes the modal. And
`telemetryData.ts` — the source behind session 13's test finding — is
frozen to `'Today (04 Sep)'` and ships `downloadTelemetryCSV()`, exporting
the invented figures as a CSV headed "Election Campaign OS — Campaign
Voter Outreach Telemetry Export" with no marking that it is synthetic.

*Not flagged, having checked:* the fork's 67 total / 34 ward / 33 PR split
for NW405 and its `Math.ceil(total / 2)` derivation are correct — they
match Schedule 1's rounding and this repo's own NW405 regression fixture.

**Verified:** no source changed this session; `check:all` re-run green
(113 tests).

**Session 16 (7 Sep 2026) — asked to fix the PPFA and DSR statutory claims
in this repo. There were none to fix; hardened them against the drift
instead.** The human's instruction followed session 15's findings, but
those defects are the *fork's*. Re-checked every user-visible string on
both surfaces before concluding anything:

- `PPFAThresholdsPage.tsx` says "Current governing figures", renders the
  tenant's own config with its `sourceCitation`, and flags the aggregation
  rule and financial-year month as provisional (§6.8.1 Q1/Q2). It invents
  no section numbers — unlike the fork, which captions the same fields
  "(§9)" and "(§8)".
- `SettingsPage.tsx` quotes no PPFA figure at all.
- `DataSubjectRequestsPage.tsx` said "past a working 30-day target — see
  this page's data helper for why that figure isn't a confirmed legal
  deadline". Never "statutory".

So nothing was wrong. What *was* missing is a guard: the fork's failure
began with this repo's own `dataSubjectRequestSla.ts` and ended as
"21-day statutory turnaround limit", which proves the drift is reachable
from here. Two gaps closed, both modelled on the existing
`assertNoFinancialTables` tripwire pattern:

1. **The caveat is now structural, not prose.** `RESPONSE_TARGET_BASIS`
   is exported from `dataSubjectRequestSla.ts` and rendered by the page,
   so the figure and the reason it is hedged travel together. A number
   that can be displayed without its caveat eventually will be.
2. **A prose guard for the superseded PPFA figures.**
   `ppfaDefaults.test.ts` guarded the seed *values* — it could not catch a
   retired figure typed into a screen, which is precisely how the fork
   failed (correct seed, `R100,000 / R15M` in the settings copy). Five
   PPFA-facing surfaces are now scanned for `R100,000` / `R15,000,000` /
   `R15m` / `R80,000`.

**Each guard was verified by breaking it**, not just by passing: injecting
the fork's literal "21-day statutory turnaround limit" into the DSR page
fails 2 tests; asserting a statutory window in the caveat constant fails 2;
pasting the fork's exact `R100,000 threshold, R15M annual ceiling` prose
into `SettingsPage.tsx` fails the surface scan. All revert clean. The tests
say plainly in-file that they are a tripwire on known phrasings, not proof
that every claim on the page is sound.

**Verified:** `check:all` green — **122 tests** (up from 113), lint,
typecheck, `check:hex`; `npm run build` succeeds.

**Session 17 (7 Sep 2026) — the fork's worst artefact: real named people
given fabricated ID numbers. This repo verified sound on the same
surface.** Sixteen more files (two pairs uploaded twice; four are this
repo's own returned unchanged — `ppfaDefaults.test.ts` again a *stale*
pre-session-16 copy, without the prose guard added that session). Nothing
adopted. Detail in `docs/ecos-v2-fork-review.md` §4h–4k.

**`PRCandidateListExportPage.tsx` is a different category of problem from
everything found so far.** Its ten-row candidate list does not use invented
personas — the names are **real, identifiable South African public
figures**, several former City of Johannesburg mayors and MMCs. Each is
given a full 13-digit `rawId` SA identity number, a gender, qualifications,
and a SARS tax-compliance status **including a negative one** ("AUDIT
REQUIRED"). Checked rather than assumed: **nine of the ten ID numbers fail
the DHA checksum**; the tenth is checksum-*valid*, which is worse — a
well-formed SA ID attached to a named real person passes validation
anywhere and may collide with an actual individual's identity number.
Fabricated identity numbers and fabricated adverse tax findings, attached
to identifiable people, then exported: `handleTriggerExport()` writes CSV
and XML under namespace `urn:iec:elections:sa:2026` with
`classification="OFFICIAL"`.

Its unmasking is `useState(false)` behind an eye icon, feeding raw IDs
straight into those exports — no capability check, no audit, no server.
**This repo was checked against that and is sound:**
`functions/src/unmaskCandidateIdNumber.ts` gates on
`caps.includes('team.manage')`, throws `permission-denied` otherwise, and
throws `unimplemented` rather than returning anything while its KMS
decrypt/audit body is still a TODO — it fails closed. `firestore.rules`
gates `candidates` read *and* write on `team.manage`, `delete: if false`.

**`ReferralPdfModal.tsx`** is the referral-PDF feature this file lists as
unbuilt, so it is worth naming what not to repeat: it renders "Republic of
South Africa · North West Province / JB MARKS LOCAL MUNICIPALITY (NW405)"
with an "OFFICIAL" seal as its **letterhead** — presenting a party's
referral *to* the municipality as if issued *by* it; its integrity hash is
`incident.id.slice(0, 8)`; it badges every photo "SHA-256 Verified" while
hashing nothing; it hardcodes "James Khumalo (Municipal Lead)" as the
signatory on every referral; and it is `window.print()`, not a PDF. The
DRAFT-watermark-until-authorised mechanic itself is a sound reading of
§6.4 and worth keeping when this does get built. *(Session 18 built it;
that mechanic is the one thing carried across.)*

**The self-minted session is now a user-facing control.** `IncidentsPage`
renders Canvasser / Ward Lead / Municipal Lead / HQ Admin buttons that
rebuild `caps` from local state, defaulting to `'admin'` — anyone can
click their way to `incidents.escalate`, the capability that authorises
stripping the DRAFT watermark off a document sent to a municipality. The
same page falls back to five fabricated `SEED_INCIDENTS` whenever the DAL
returns empty *or throws*, so a fresh tenant or a dropped connection shows
invented casework as live.

Two further invented capabilities behind `as any`, adding to session 15's
`ppfa.manage_thresholds`: `finance.view`/`finance.create` (FinancePage) and
`diary.create` (FieldDiaryPage) — none exist in this repo's union or the
bundle's seed. FinancePage also prints `donor.idNumberEncrypted` directly
as label text.

**Verified:** no source changed this session; `check:all` re-run green
(122 tests).

**Session 18 (7 Sep 2026) — the referral PDF, built.** §6.4's last step —
"Municipal Lead authorises → formal referral PDF generated (authorisation
strips the DRAFT watermark and appends signature + timestamp)" — is now
real, in `src/modules/incidents/referral/` and `src/lib/pdf/`.

**The deferral reason was wrong.** Session 9 held this back for wanting "a
server-side PDF generator with Storage write access" and a live Firebase
project. It needs neither. The document is text-only over the Adobe
standard-14 fonts, which every PDF reader is required to have, so no font
programme is embedded and no library is required: `src/lib/pdf/` is a
~350-line PDF 1.7 writer with **no new dependency**, and a Municipal Lead
can build and read a draft on a device with no connectivity. Only
*issuing* — Storage upload, registry entry, ESCALATED → REFERRED — needs
the live project (blocker #2 still stands for that half).

It is an actual PDF, verified against poppler (`pdfinfo`/`pdftotext`), not
a `window.print()` view wearing the name. Output is byte-for-byte
deterministic — no clock read, no random file id — because a document's
integrity hash has to be reproducible from the stored record months later.
Text is measured against the published Adobe AFM metrics so paragraphs
wrap at a real column width, and an over-long token (a Storage path) is
hard-split rather than run off the page.

**Every failure catalogued in `docs/ecos-v2-fork-review.md` §4i is
answered, and most are now guarded by a test rather than by care:**

| The fork's version | This one |
|---|---|
| "Republic of South Africa · North West Province / JB MARKS LOCAL MUNICIPALITY" letterhead with an "OFFICIAL" seal | The issuing campaign is named first and the municipality appears as an addressee. `STANDING_DISCLAIMER` is printed in the body: not a municipal or government document, no municipal or state authority, not a notice or demand made under any statute. Tests fail on that vocabulary reappearing, and on the disclaimer weakening. |
| `HASH: #NW405-${incident.id.slice(0, 8)}` | A real SHA-256 over a versioned canonical serialization of every field the reader sees, via `crypto.subtle`. `verifyReferralContentHash()` lets a holder of the paper and the record check they describe the same referral. `buildReferralPdfBytes` throws on anything that isn't 64 lowercase hex. The id prefix survives — as `reference`, labelled Reference, which is what it always was. |
| "SHA-256 Verified" badged beside every photo, nothing hashed | `EVIDENCE_BASIS` says the paths are for retrieval only, the images are not hashed, and the document makes no attestation about them. The word "verified" appears nowhere in the printed output — asserted by test. |
| "James Khumalo (Municipal Lead)" on every referral | Signatory read from the signed-in user's own staff profile. The model throws on a blank name and has no fallback; `issueReferral` refuses if the named signatory is not the session making the write. |
| A party name and municipality baked in | The municipality comes from the tenant's configured profile; if it is unset the screen says so and stops. The issuing campaign's name has **no default at all** — this codebase holds no tenant display name (`SessionContext` carries an id), and inventing one on a document addressed to a municipality is the exact fabrication class this build refuses. |
| `window.print()` | Real bytes. |

The DRAFT-watermark-until-authorised mechanic — the one sound idea in the
fork's version — is kept, as a rotated watermark repeated on every page,
alongside a printed line saying the draft must not be sent.

**Writes, in order, and the order is the point:** PDF to Storage → registry
entry in `documents` (§8.4: CONFIDENTIAL, FINAL, integrity hash, signatory)
→ `markReferred()`. A failure at step 2 or 3 leaves the incident ESCALATED
and the operator can retry; the retry is safe rather than duplicative
because everything is content-addressed — the same referral hashes to the
same value, so it resolves to the same Storage path and the same document
id. The failure this avoids is an incident marked REFERRED pointing at a
PDF that was never written.

**New DAL port.** `IncidentRepository.markReferred()` has taken a
`referralPdfPath` since Phase 3 with nothing in the DAL able to produce
one. `src/dal/ports/fileStore.ts` + its Storage adapter close that; module
code still reaches object storage through the DAL or not at all, and the
adapter refuses a path outside the caller's tenant before a byte leaves
the device.

**Security rules widened, narrowly.** A Municipal Lead holds
`incidents.escalate`, not `team.manage`, so neither the `documents`
collection nor Storage would have accepted their referral. Both now key a
narrower allowance off the `referral-` id prefix: `incidents.escalate` can
*create* a referral entry (classification CONFIDENTIAL, watermark FINAL)
and nothing else in that collection, cannot amend one afterwards, and in
Storage cannot overwrite or delete an issued file at all — an authorised
referral that left the building is a record, not a draft. Also fixed a
naming-alignment miss: `storage.rules` still said "Election-COS1.0".

**Two real defects found and fixed while building, both caught by
verification rather than by reading:** the byte builder was glyph-encoding
PDF *structure*, which has no glyph for a line feed and substituted `?` for
every newline — no reader could parse the file; and the document
information dictionary was written in WinAnsi, which PDF interprets as
PDFDocEncoding, so "Ward 12 Campaign Office — Tlokwe" reached the reader's
title bar as "Office Š Tlokwe". Metadata is now UTF-16BE with a BOM. Both
have regression tests.

**Verified:** `check:all` green — **197 tests** (up from 122; 21 PDF
writer, 26 document model, 17 layout, 10 issue workflow), lint, typecheck,
`check:hex`; `npm run build` succeeds; the DAL boundary holds (no
`firebase/*` import outside `src/dal/adapters/firestore/` and `src/auth/`).
Sample output opened and read back with poppler.

**Session 19 (12 Sep 2026) — infrastructure blueprint batch; architecture
unchanged; one guard adopted.** Sixteen files, no instruction text: a
3-page stack/hosting blueprint, a documentation-placement docx, a pypdf
encryption script, 13 CSVs (8 unique — five are byte-identical
duplicates), and an academic paper that was never readable. Plus, as
message text, a security review of a Postgres MFA/OTP spec. Full account
in `docs/infrastructure-blueprint-review.md`.

**Nothing in the batch changed the build.** The headline proposal — drop
Firestore for Cloud SQL Postgres + Cloud Run + Cloudflare — is a real
architecture decision and not one a session takes on an uploaded CSV. It
is now the **sixth** unresolved conflict held for a human, and it overlaps
the second (the V2 bundle contradicting itself on Firestore vs Postgres);
they should be decided together, once. Noted in its favour: the DAL was
built for exactly this swap and module code would not change. Noted
against the argument as written: "no RLS → tenant isolation moves to app
code" is not accurate for this repo — Firestore Security Rules are
enforced by Google server-side, not in app code. They are weaker and
harder to audit than Postgres RLS, which is the defensible form of the
claim.

**Verified errors, recorded because they would cause real harm if acted
on:**

- The blueprint names "the primary GCP region (e.g., Johannesburg
  **europe-west8**)". `europe-west8` is **Milan**. Johannesburg is
  `africa-south1`. Followed literally that puts SA personal information in
  the EU — POPIA §72, and the §0 rule 1 the whole build is pinned against.
  *This repo is clean:* every function pinned via `functions/src/region.ts`,
  no `europe-west` anywhere in the tree.
- The Firebase cost table's Cloud Functions row overstates compute by
  ~24,000× (`$0.40/GB-sec` against a real `$0.00001667`), inverts the free
  tier ("invocations after 2M are free" — the *first* 2M are), and gets
  both free-tier quotas wrong. The `$0.40` is the per-million-*invocations*
  price in the compute row. Its Firestore row is broadly accurate.
- The scenario comparison omits the 2.2 TB map-tile line from its own
  traffic table (~$264) while totalling egress at $36. The traffic
  projections themselves are unsourced — no user, ward or canvasser count
  appears anywhere in the batch.
- The blueprint and the CSVs cannot both be followed: one keeps Firestore
  for offline-sync, the other rejects it for canvassing data. Those
  overlap.
- "Firebase Storage NOT NEEDED, Cloud Storage covers it" conflates two
  access paths to the same bucket — relevant to the `fileStore` adapter
  and `storage.rules` built last session.

**The MFA/OTP security review targets a spec that is not in this
repository** — no MFA, no OTP, no `auth.*` schema, no Postgres. Its
findings look correct; there was nothing here to fix and nothing was
invented to fix. Its defect *classes* were audited against this repo the
same way every fork batch has been: phone stored encrypted not hashed
(sound), no credential material in IndexedDB (sound), region (sound),
tenant id on every path (sound). One applies by design and is flagged for
a human: capabilities ride in custom claims on a ~1h ID token, so a
revoked capability stays live until refresh.

**Adopted — one thing, and it lands on code written last session.** The
review's point that SHA-256 is built for speed and so protects nothing
when used to commit to a low-entropy secret is correct, and
`src/lib/hash.ts` is precisely where that mistake would be made:
`sha256Hex(canonicalPayload(doc))` and `sha256Hex(otpCode)` look identical
and only one is sound. `hash.ts` now states the distinction and
`hash.test.ts` enforces it — a scan that fails if either entry point is
handed something named like an OTP/PIN/password/secret/key, and a second
that fails if a password-hashing KDF appears without the note being
revisited.

**The guard was proved, and the first draft of it was broken.** Injecting
`sha256Hex(otpCode)` did *not* trip the first regex: it had a trailing
`\b`, and there is no word boundary between `otp` and `C`. It passed its
own tripwire proof by matching nothing. Fixed and re-proved against four
cases — `sha256Hex(otpCode)` fires, `sha256Hex(user.password)` fires, a
`bcrypt` import fires, and `sha256Hex(mapping)` correctly does not. Also
caught by its own tests: a SHA-256 vector for `"é"` written from memory in
the first draft and simply wrong. The implementation was right, the
expectation was invented; vectors are now computed and the line says so.

**Not reviewed:** the ProgramBench paper. The upload directory was cleared
before it could be opened; no content from it reached this session, and it
is not assessed in either direction.

**Verified:** `check:all` green — **206 tests** (up from 197), lint,
typecheck, `check:hex`; `npm run build` succeeds. `node_modules` had to be
reinstalled — the container was recycled between sessions.

**Session 20 (13 Sep 2026) — the database question is closed.** The
project owner decided: *"Firestore is my final decision."* Recorded as a
decision section at the end of this file, and reflected in three places a
future session or uploaded batch will actually hit:
`src/dal/adapters/postgres/README.md` (rewritten from "Phase 8,
conditional" to closed), `src/dal/index.ts` (the
`VITE_DAL_ADAPTER=postgres` throw now enforces a decision, not an unbuilt
phase), and `src/dal/dalAdapter.test.ts` — a new tripwire that fails if a
SQL client is added to `package.json`, if the Postgres adapter directory
acquires code, if the env-var guard is softened to a warning, or if a
module reaches past the DAL to the Firebase SDK.

Proved, not assumed: all four cases were injected and each failed the
suite, then reverted. The decision closes conflicts 1 and 2 from the
session-13 list; **three remain open** (role model, capability catalogue,
RLS key type) and are untouched by it, being about the V2 artefacts rather
than this app's datastore.

The DAL port/adapter pattern **stays**. Its migration justification is
gone; three live ones are not — it keeps the Firebase SDK out of
`src/modules/**`, forces `SessionContext` through every data call, and is
the seam the offline outbox sits against. The decision record says so
explicitly, and the tripwire's second half asserts the seam, so "the
migration is off, so the abstraction is pointless" cannot quietly become a
refactor.

The record also states what the decision *accepts* rather than only what
it rejects: Firestore's isolation primitives are genuinely weaker than
Postgres RLS (compensated by three-layer isolation), and read volume is
the real cost risk (compensated by §7.4 page-size discipline, which is now
load-bearing in review). Those were the two fair criticisms in the
uploaded batches. They are the terms of the choice, not grounds to
re-open it.

**Verified:** `check:all` green — **212 tests** (up from 206), lint,
typecheck, `check:hex`; `npm run build` succeeds.

---

## DECISION — Firestore is the database (13 Sep 2026)

**Decided by the project owner, in these words: "Firestore is my final
decision."** Recorded here because the question had been raised by four
separate uploaded batches across sessions 13–19 and re-litigating it each
time was costing more than the question was worth.

### What this settles

- **Firestore is the datastore for Election Campaign OS.** Not "for now",
  not "until Phase 8". Decided.
- **There is no Postgres migration.** The conditional Phase 8 migration in
  `IC-ECOS-BUILD-2026-V2` §10 is closed. `src/dal/adapters/postgres/`
  stays empty permanently, and `src/dal/index.ts` continues to throw on
  `VITE_DAL_ADAPTER=postgres` — that guard is now enforcing a decision
  rather than an unbuilt phase.
- **Conflicts 1 and 2 in the session-13 list are closed.** The metering
  engine, if it is built here, gets a Firestore implementation. The V2
  bundle's self-contradiction is resolved in favour of the reading its own
  `00-MASTER-DECISIONS.md` §2/§4 already gave — *"Firestore Standard"*,
  *"Shared Firestore database"*.
- **The infrastructure batch's central proposal is declined**
  (`docs/infrastructure-blueprint-review.md` §2). That batch's other
  findings stand on their own and are unaffected.

### What this does NOT change

The **DAL port/adapter pattern stays exactly as it is.** It was originally
justified as migration insulation, but that was never its only value and
is now not its main one:

- it keeps the Firebase SDK out of `src/modules/**` — the ESLint boundary
  that makes every module testable without a Firebase mock;
- it forces `SessionContext` through every data call (§5.2,
  non-negotiable #1), which is a third of the tenant-isolation story;
- it is the seam the offline outbox and the Dexie mirror already sit
  against.

Deleting the abstraction because the migration is off would throw away
three live benefits to remove one dead one. Nothing about this decision
licenses that, and a future session should not read it that way.

### What we are accepting by choosing Firestore

Recording this so the decision is held honestly rather than defended. Two
of the criticisms levelled at Firestore across those batches were partly
fair, and choosing Firestore means accepting them:

1. **Isolation primitives are weaker than Postgres RLS.** `firestore.rules`
   is enforced server-side by Google — the "isolation moves to app code"
   claim was wrong — but rules cannot join, cannot evaluate policy
   transactionally, and are harder to audit than a `USING` clause. The
   compensating control already in place is that isolation is not left to
   rules alone: custom claims → `firestore.rules` → DAL, three layers,
   with `tenantOK(tid)` on every path and `delete: if false` almost
   everywhere.
2. **Read volume is the real cost risk.** The uploaded cost table was
   badly wrong about Cloud Functions (§4 of the infrastructure review),
   but the underlying point about Firestore reads at scale is sound. The
   compensating control already in place is §7.4 free-tier discipline —
   `DEFAULT_PAGE_SIZE = 25`, no unbounded `listAll` on a hot path, and
   war-room counters maintained by Cloud Function triggers rather than
   recomputed by clients. That discipline now matters more, not less, and
   should be treated as load-bearing in review.

Neither is a reason to revisit the decision. They are the terms of it.

### Tripwire

`src/dal/dalAdapter.test.ts` fails if a Postgres/SQL client dependency is
added, if the Postgres adapter directory acquires an implementation, or if
the `VITE_DAL_ADAPTER=postgres` guard is softened. This exists because the
proposal arrived four times from outside the repo; the next arrival should
meet a failing test and this section, not a fresh debate.

---

## DECISION — seven roles; Compliance Officer stays (13 Sep 2026)

**Decided by the project owner.** With the standing instruction that came
with it, which is broader than this decision and is recorded here because
it now governs how this kind of finding gets handled:

> *"Exhaust rewording customer-facing marketing commitments first before
> scrapping genuinely valuable functions and application comparative
> advantages."*

That is the rule applied below: where a claim outran what the code does,
the **claim** was corrected. No capability, role or feature was removed.

### The conflict was never about a count

This repo's seven map one-to-one onto the six the `ecos-rbac-config` skill
calls canonical — `party-hq-admin`/HQ_ADMIN, `municipal-team-lead`/LOCAL_HEAD,
`ward-lead`/WARD_LEAD, `vd-captain`/VD_CAPTAIN, `canvasser`/VOLUNTEER,
`finance-officer`/FINANCE_OFFICER — plus `compliance-officer`. No naming
drift, no scope mismatch, one extra role. The skill permits a seventh
"unless a product decision explicitly adds them"; this is that decision,
and the role meets the carve-out rather than leaning on it: two real
capabilities, a built page, server-side enforcement.

### Why it is not folded into another role (POPIA/PPFA)

- Into **`party-hq-admin`**: it already holds `dsr.*` but deliberately not
  `ppfa.edit`. Folding POPIA duties there makes data-subject handling an
  HQ-admin-only function — the opposite of the separation POPIA's
  information-officer concept assumes.
- Into **`finance-officer`**: it holds the full PPFA set including
  `ppfa.manage_thresholds`. That would let the person answering a donor's
  data request also set the disclosure thresholds applied to that donor.
  **This is the one combination refused outright**, and
  `roleModel.test.ts` now fails if any role acquires
  `ppfa.edit` + `ppfa.manage_thresholds` + `dsr.manage` together.

Compliance Officer holds `ppfa.edit` because POPIA's correction right over
a donor record cannot be actioned without it — load-bearing, not
convenience. It holds neither `ppfa.export` nor `ppfa.manage_thresholds`.
The compensating controls are structural: `donations` and `donorLedger`
are `delete: if false` (amend, never remove) and `ppfaConfigs` is
append-only (history cannot be rewritten to match an amendment).

### Applying the mind to POPIA turned up a real defect — in the claim

Auditing the role's actual POPIA surface surfaced something wider than the
role, and it is the more important half of this session:

**Every one of the fourteen tenant collections is `allow delete: if false`.**
Voters and households carry `deletedAt` and are *suppressed*, not
destroyed. Donations say so in the rules themselves ("statutory record —
never deleted, only corrected"). **There is no de-identification routine
anywhere in this codebase.**

Against that, `DataSubjectRequestsPage` offered DELETION as a request type
and a **"Mark fulfilled"** button. Pressing it would have written *"this
erasure was completed"* into a compliance record the Information Regulator
may one day read, when nothing had been erased and nothing could be. That
is the same class of defect this build has repeatedly caught in other
people's work — a claim outliving the code behind it — found this time in
our own.

**Fixed by rewording, per the standing instruction. Nothing was removed:**

- `dataSubjectErasure.ts` states, per subject type, what a deletion
  request can actually achieve here: `RESTRICTED_BY_LAW` for donors
  (retention under the PPFA; POPIA §14(1) permits retention required or
  authorised by law), `SUPPRESSION_ONLY` for everyone else, and
  `canRecordFulfilled: false` throughout — kept as a field, not a
  constant, so building real de-identification flips one place.
- The request log renders that position on the request itself, and
  withholds **only** the button that would write a false outcome. The
  DELETION request type, the log, and the Compliance Officer's ability to
  action requests all stay. ACCESS and CORRECTION are untouched — this
  product can genuinely do both.
- A donor refusal offers a prefilled reason carrying the legal basis
  instead of a bare "rejected", and the button reads "Refuse — retention
  required". Offered, not auto-applied: a reason that writes itself is how
  a template ends up asserting something nobody checked.
- Every legal position is marked **pending attorney review**, the same
  discipline as `dataSubjectRequestSla.ts`. POPIA §14(1) was verified
  against the Act rather than recalled.

**Genuine gap now named rather than hidden:** de-identification is not
built. Until it is, this product cannot fulfil an erasure request in the
POPIA sense for any subject type. That is a real limitation and a real
roadmap item — not a reason to remove the request type, which is exactly
the "scrapping a valuable function" the instruction warns against.

### Tripwires

`src/auth/roleModel.test.ts` fails if the role count changes, if
`compliance-officer` loses its DSR capabilities or gains threshold
control, if any role concentrates funding *and* data compliance, or if
`firestore.rules` starts naming a role id instead of checking a
capability. `src/modules/settings/dataSubjectErasure.test.ts` fails if any
collection opens a hard delete, if a surface starts claiming erasure, or
if a legal position loses its attorney-review hedge.

Both were proved by injection, not assumed: removing `compliance-officer`
fails 5 tests, giving Finance Officer `dsr.manage` fails 2, and opening a
delete on `donations` fails 2. All reverted clean.

### Still open

One conflict remains from the session-13 list — the **25-vs-45 capability
catalogue**. The uuid-vs-VARCHAR(36) RLS key type is moot: it only ever
applied to the Postgres migration closed on 13 Sep.

---

## Version conflict found in session 2 — RESOLVED

Session 2 supplied `02`/`03`/`04`/`05` for the first time (useful — see
below) but also re-supplied `00` and `01` as **`IC-ECOS-MASTER-2026-V1`**
and **`IC-ECOS-BUILD-2026-V1`** — the version the governing V2 build spec
(§ header) explicitly says to discard. Some of that V1-labelled batch (a
Compliance Claims Register entry in `04`, action **LG8 "Verify PPFA
excision"**, and `05`'s task **1.5 "PPFA & gatherings excision verification
sweep"** with no PPFA line anywhere in its Phase 5) reads as if PPFA had
been removed — directly contradicting both the governing V2 spec's rule 4
and this same V1 bundle's own 00/01 text, which describes PPFA as fully
"REINCORPORATED."

**Human decision, received:** *"PPFA compliance SHOULD REMAIN IN SCOPE as
set out by V2."* This matches what was already built — no code changed as
a result. Confirmed and closing this out:

- V2 remains the governing spec for 00/01. The V1 copies and any
  PPFA-removal instructions inside the V1-labelled batch (LG8, schedule
  task 1.5, the "Module removed" claims-register row) are **disregarded**.
- The PPFA data model, capability wiring, escalation ladder, and seed
  roles stay exactly as built (V2's shape — `donorType`
  `NATURAL_PERSON`/`JURISTIC_PERSON`/`FOREIGN`/`ANONYMOUS`, append-only
  effective-dated `PPFAConfig` with evidential `configIdApplied`, §6.8.1's
  "hold the aggregator pending Q1–Q3" still in force). V1's differing PPFA
  shapes (from `01`'s V1 copy) were never adopted.

**What I did fold in from the V1-batch, because it's genuinely new,
additive, and doesn't conflict with anything:** the infrastructure/DNS/
account detail from `03` (below), and a POPIA data-subject-request
workflow from `04`'s action LG10 / `05`'s task 3.8 (also below). Neither
touches PPFA.

## What session 2 added

- **`docs/phase-0-infra-plan.md`** — real domain names
  (`app.electioncampaignos.co.za` etc.), GCP project IDs
  (`innovation-consult-ecos-{dev,prod}`), the account register, and the
  pre-launch checklist, sourced from `03-implementation-rollout-plan.md`.
  `.env.example` and `.firebaserc.example` updated to match. This partially
  addresses blocker #2 below — naming is decided, nothing is provisioned.
- **POPIA data subject request workflow** (access/correction/deletion,
  Condition 8) — `src/dal/ports/dataSubjectRequests.ts` +
  Firestore adapter + `firestore.rules` entry + new capabilities
  (`dsr.view`, `dsr.manage`, granted to Party HQ Admin and Compliance
  Officer) + route `/settings/data-requests`. This was not in the original
  build spec; it's `04-legal-compliance-workstream.md` action **LG10** and
  `05-project-schedule.xlsx` task **3.8**, both assigned to Claude Code.
  `dataSubjectRequestSla.ts`'s `RESPONSE_TARGET_DAYS = 30` is **my working
  assumption, not a cited statutory deadline** — POPIA Condition 8 doesn't
  set a fixed window the way GDPR does; flag this for the attorney review
  already scheduled for the consent-basis questions (LG2/LG3).
- **`02-commercial-rewrite-brief.md`** — read, not acted on. It's addressed
  to Fable 5, not Claude Code (master index routing rule), and has no code
  implications. Noted here only so it's clear it was reviewed.
- **`05-project-schedule.xlsx`** — read for calendar/gate context (schedule
  starts 2026-08-10, gates through Phase 8). Its consumer is PM, not
  Claude Code, per the same routing rule; no code changes came from it
  beyond confirming the PPFA conflict above and the DSR workflow task.

---

## What actually shipped this session

### Phase 0 — Foundations
- `election-cos-app/` Vite + React 18 + TypeScript + Tailwind scaffold, per §2.1.
- ESLint boundary rules (§2.2): `src/modules/**`, `src/app/**`,
  `src/offline/**`, and `src/dal/ports/**` cannot import `firebase/firestore`
  or `firebase/storage` — only `src/dal/adapters/firestore/**` can.
- `scripts/check-no-hex.mjs`: fails on any raw hex colour literal outside
  `src/design/tokens.ts` (ESLint alone can't reliably catch these in JSX
  template strings, so this is a source-text scan, run in CI).
- GitHub Actions CI (`.github/workflows/ci.yml`): lint → typecheck →
  hex-check → test → build, scoped to `election-cos-app/**` changes.
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`,
  `storage.rules` — written and internally consistent with the data model,
  but **not deployed anywhere** — see "What's blocked," below.
- `functions/` — Cloud Functions 2nd gen skeleton, TypeScript, compiles
  clean. All functions pinned to `africa-south1` via `functions/src/region.ts`.

### Phase 1 — IA consolidation
- `src/design/tokens.ts` + `tailwind.config.js`, the stated palette from
  §3.3, kept in sync by a test (`tokens.test.ts`) since Tailwind can't load
  a `.ts` config directly.
- `src/app/Shell.tsx` + `src/app/nav.ts`: the one 9-item nav from §3.2,
  capability-gated, tested in `nav.test.ts`.
- `src/app/routes.tsx`: full route table including the sub-views absorbed
  under Analytics and Settings (seat calculator, threshold analyzer,
  scheduled reports, municipality config, permissions, ppfa-thresholds) and
  the standalone gatherings advisory route.
- **Gate not fully closed** — see "What's blocked" #1. `docs/phase-1-ia-consolidation.md`
  has the full account.

### Phase 2 — Tenancy, identity, capabilities
- `src/auth/types.ts`: the full `Capability` union, `Role`, `StaffProfile` —
  the grants model from §4.4, not a fixed role enum.
- `src/auth/capabilities.ts` + tests: `resolveEffectiveCapabilities` —
  `(role.defaultCaps ∪ overrides.granted) \ overrides.revoked`.
- `src/auth/seedRoles.ts`: the seven seed roles from §4.4, with the
  Finance Officer / separation-of-duties note honoured in the seed data.
- `src/auth/firebaseAuth.ts` + `firebaseAuth.test.ts`: the §4.3
  minimal-footprint rule, enforced at both the type level (function
  signatures only accept `email`/`password`) and at runtime
  (`assertMinimalAuthPayload`, unit-tested — this is the CI-enforced test
  §4.3 explicitly asks for).
- `firestore.rules`: deny-by-default, per-collection rules including the
  POPIA consent gate on voter writes, the incident-status state machine,
  and PPFA's append-only config + separation-of-duties capabilities.
- `src/dal/`: full port layer (16 repository interfaces,
  `src/dal/ports/*.ts`) and Firestore adapters for all of them
  (`src/dal/adapters/firestore/*Repository.ts`), wired through
  `src/dal/index.ts`. The Postgres adapter directory
  (`src/dal/adapters/postgres/`) is intentionally empty — see Phase 8.

### Phase 3 — Functional modules
- Every nav item and sub-route renders a real, routed, capability-gated
  page. Most render `PagePlaceholder` (see "What's blocked" #1) rather than
  a built-out screen, because no Stitch screen assets were available this
  session.
- Data types for every module (voters, households, wards, VDs, incidents,
  diary, logistics, staff, tasks, documents, candidates) are complete per
  §6.1–§6.6, with the informal-settlement household model, the fixed
  incident taxonomy, and masked-SA-ID candidate handling all present.

### Phase 4 — Offline layer
- `src/offline/db.ts`: the exact Dexie schema from §7.2 — voters,
  households, incidents, diaryEntries, photoQueue, outbox, conflicts.
  **No donor/donation/PPFA table** — enforced by
  `assertNoFinancialTables()`, which is called at module load and covered
  by a test that also proves it *would* catch a violation.
- `src/offline/syncTypes.ts` + `openapi/sync.yaml`: the sync contract,
  written before `functions/src/sync.ts`'s implementation, per §7.3's
  explicit instruction.
- `src/offline/outbox.ts` + tests: `enqueue`, `drainOutboxBatch`,
  `applySyncResponse` — covers the §7.5 "conflicts must be visible" and
  §7.6 "rejections must be actionable" requirements end-to-end at the data
  layer (accepted → outbox cleared; non-retryable rejection → `REJECTED`
  state, stops retrying; conflict → written to the `conflicts` table,
  never silently discarded).
- `functions/src/sync.ts`: skeleton only — validates shape/size, returns
  `501`. Every remaining piece (token verification, idempotency dedup,
  per-field last-write-wins) is a named `TODO` in that file, not faked.

### Phase 5 — PPFA + seat calculator + gatherings advisory
- `src/dal/ports/{donors,donations,ppfaConfig,donationAlerts}.ts`: full
  data model from §6.8.2, integer-cents money, append-only config.
- `src/modules/finance/ppfaDefaults.ts`: the gazetted R200,000 /
  R30,000,000 / 80% (R160,000) defaults, tested against the superseded
  R100,000 / R15,000,000 / R80,000 figures to guard against drift.
- `src/modules/finance/escalation.ts` + tests: the four-level escalation
  ladder from §6.8.3 (`WARNING` → `DISCLOSURE_REQUIRED` →
  `CAP_APPROACHING` → `CAP_EXCEEDED`), pure and unit-tested.
- **The aggregation Cloud Function is deliberately not built** —
  `functions/src/ppfaAggregation.ts` throws if called and is not exported
  from `functions/src/index.ts`. This is per §6.8.1's explicit instruction:
  three statutory questions (Q1 per-donation vs cumulative, Q2 financial
  year boundary, Q3 per-party vs aggregate cap) are unresolved, and the
  spec says hold the aggregator, not guess.
- `src/modules/analytics/seatCalculator.ts` + property-based tests
  (`fast-check`): the MMP allocation fix from §8.2 — quota, entitlement,
  overhang (council expands, never caps a party's ward wins), and
  largest-remainder tie handling that flags rather than guesses. Verified
  against the exact "35 ward wins vs 34 seats" class of bug the prior spec
  had, plus a property suite (PR seats never negative; no seat is ever
  silently dropped; overhang never shrinks the council; ties are never
  auto-resolved).
- `src/modules/knowledge/GatheringsAdvisoryPage.tsx`: the full mandated
  static text from §6.7, verbatim, including the closing paragraph the
  spec says must not be softened. No permit tracking, no alerts, no data
  model — matches "this is the whole feature."

---

## What's blocked — needs a human before it can go further

1. **No Stitch screen assets.** The master index describes ~170 Stitch
   PNGs as "the primary UX specification," and flags its own Google Drive
   connector as broken (returns empty, likely wrong authenticated
   account — the folder is under `neodlutu@gmail.com`). This session had
   access only to the two governing markdown specs, uploaded directly.
   Every module page in `src/modules/**` is a `PagePlaceholder`
   (route + capability wiring real, visual design absent) as a direct
   result. **Action:** upload the screens, or fix the Drive connector auth,
   then run the Phase 1 screen-inventory deliverable
   (`docs/phase-1-ia-consolidation.md` §1) for real.

2. **No live Firebase project — partially unblocked session 10, still not
   deployed.** The human confirmed the real GCP project ID
   (`election2026-campaignms7-0`) and asked for Google Sign-in wired up.
   Done from this sandbox: real `.firebaserc` (no longer just
   `.firebaserc.example`), `.env.example`'s `VITE_FIREBASE_PROJECT_ID`
   filled in, `signInWithGoogle()` added to `firebaseAuth.ts`, and —
   because none had existed at all — a real sign-in UI
   (`src/auth/SignInPage.tsx`) plus `Shell.tsx` now branching on all
   three real auth states (loading / signed-out / signed-in-but-
   unprovisioned) instead of every page independently guessing. Verified
   by actually running the dev server and screenshotting the sign-in
   page (no live Firebase config, so it correctly falls through to
   signed-out) — see this session's entry below for the full account,
   including a real tension this surfaced between Google Sign-in and the
   §4.3 minimal-footprint Auth rule.

   **Still cannot be finished from this sandbox** — no `firebase`/`gcloud`
   CLI, no Google Cloud credentials, and no interactive OAuth are
   available here. **Action, exact remaining steps:**
   1. In the Firebase Console for `election2026-campaignms7-0`: Project
      Settings → General → Your apps → **Add app → Web**. Register it
      (any nickname), and do **not** enable Firebase Hosting from that
      dialog if hosting is being set up separately later.
   2. Copy the resulting `firebaseConfig` object's six values into a
      local `.env` (copy from `.env.example` first) —
      `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_STORAGE_BUCKET`,
      `_MESSAGING_SENDER_ID`, `_APP_ID` (project ID is already filled in).
   3. Authentication → Sign-in method → enable **Google** as a provider,
      and confirm a support email is set (Google requires one).
   4. Authentication → Settings → Authorized domains — add whatever
      domain the app will actually be served from for local dev
      (`localhost` is usually pre-authorized) and, later, the real
      `app.electioncampaignos.co.za` once that's live.
   5. Verify Firestore exists in **`africa-south1`** — build spec §0 rule
      1, and irreversible once set. If Firestore hasn't been created at
      all yet, create it there now, before anything writes to it.
   6. Once `.env` is filled in: `cd election-cos-app && npm run build`
      still needs to be re-verified against the real config, then
      `firebase deploy --only firestore:rules,firestore:indexes,storage`
      (and `hosting`/`functions` when those are ready) — none of this has
      been run from this session; only the CLI-free code changes have.

   Alternative to steps 1–4 if a future session should do this instead of
   the human: supply a service-account JSON key with Firebase Admin
   rights on this project (as `GOOGLE_APPLICATION_CREDENTIALS`, never
   committed), which would let `firebase-tools` and the Firebase
   Management API run non-interactively. Not requested this session — the
   human did the console clicks route implicitly by asking for this to be
   "set up," which reads as the lower-privilege, faster path; flagging
   the alternative here rather than assuming.

3. **PPFA aggregation held on purpose**, per §6.8.1 — Q1/Q2/Q3 need legal
   confirmation before `functions/src/ppfaAggregation.ts` gets built out
   and wired up. Do not treat the placeholder as a bug; treat the three
   open questions as the actual blocker.

4. **Open decisions D1–D7** (master index §5): no override was received
   this session, so the stated defaults were applied throughout
   (Election-COS1.0 as the product name, the 9-item nav, the stated
   palette, "accept + disclose + minimise" for Firebase Auth's offshore
   staff identity). If any of these defaults are wrong, say so — D3
   (palette) and D2 (nav) in particular are load-bearing for a lot of
   what's already built.

5. **`sync` Cloud Function is a skeleton.** Token verification, idempotency
   dedup, and per-field conflict resolution are named TODOs in
   `functions/src/sync.ts`, not implemented. The client side
   (`src/offline/outbox.ts`) is fully built and tested against the
   contract; the server side needs a real implementation session against
   the Firestore emulator before Phase 4 can be called done end-to-end.

6. **Not reviewed:** `04-legal-compliance-workstream-v2.md`,
   `05-project-schedule-v2.xlsx`, `03-implementation-rollout-plan-v2.md`,
   `02-commercial-rewrite-brief-v2.md` — none were supplied this session.
   Nothing in this codebase should be read as satisfying those artefacts'
   scope (privacy policy, ToU, POPIA pack, DNS/account provisioning,
   commercial materials).

---

## What was deliberately NOT built (per spec, not an oversight)

- Gatherings permit tracking, T-7/T-3 alerts, any compliance workflow for
  the Regulation of Gatherings Act — §6.7 is explicit that the static
  advisory page *is* the entire feature.
- Ward Intelligence (CTR, local search volume, multilingual sentiment
  beyond a lexicon tagger) — §8.3 calls this a v2 spike, not a v1 build.
- PostgreSQL adapter — Phase 8 is conditional on a signed paying
  subscription, not a date (§10). `src/dal/adapters/postgres/` holds only
  a README explaining what happens when that trigger fires.
- `election-cos-landing` and `ic-corporate` — separate repos/projects per §2;
  out of scope for an application-phase build session.

---

## Verification record

```
cd election-cos-app
npm install        # 425 packages, 0 install failures
npm run check:all  # lint + typecheck + check:hex + test — all green
npm run build      # vite build — succeeds, dist/ ~140KB gzipped JS

cd functions
npm install
npm run build       # tsc — succeeds, no errors
```

59 unit tests across 11 files, all passing (54 from session 1 + 5 for the
new data-subject-request SLA helper). Coverage highlights:
capability resolution (5 cases incl. revoke-wins-over-grant), Auth
minimal-footprint guard (11 cases), nav visibility (4 cases), offline
schema anti-PPFA guard (3 cases incl. a deliberately-broken schema to
prove the guard fires), outbox accept/reject/conflict handling (5 cases),
PPFA defaults vs superseded values (5 cases), escalation ladder (6 cases),
seat calculator (6 cases: 4 property-based, 1 overhang, 1 tie), design
token/Tailwind sync (3 cases), money/integer-cents handling (3 cases).

No test was written to pass trivially — the seat-calculator and outbox
suites in particular caught two real implementation bugs during this
session (a tie-distribution edge case in `allocateSeats`, and a dropped
`entityId` field in the sync contract), both fixed before this report was
written.
