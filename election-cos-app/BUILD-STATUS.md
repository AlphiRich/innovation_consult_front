# Election-COS1.0 — Build Status

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
says so in its own header rather than shipping a dead button.

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

Read this before doing anything else in this repo. It says plainly what's
real, what's a placeholder, and what's blocked on something only a human
can unblock.

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

2. **No live Firebase project.** Nothing in this session was deployed —
   no `firebase init`, no live `africa-south1` Firestore/Storage/Functions,
   no `.firebaserc` (only `.firebaserc.example`). `npm run check:all`
   and `npm run build` both pass without one, by design (see
   `src/dal/adapters/firestore/client.ts` — throws only when a consumer
   actually calls it, not at import time), but nothing here has been
   proven against a real Firestore instance, real security rules
   evaluation, or a real Cloud Function. §1.1's "verify before building"
   checklist (Firestore in `africa-south1`, Functions 2nd gen region
   support, Storage bucket region, Blaze plan, free-tier quotas) is
   **entirely unconfirmed** — it requires GCP console/CLI access this
   session does not have. **Action:** provision per
   `03-implementation-rollout-plan-v2.md` §2 (not available this session
   either — only 00 and 01 were supplied).

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
