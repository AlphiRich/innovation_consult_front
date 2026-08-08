# Election Campaign OS — Build Status

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

**Verified green in this session:** `npm run check:all` (lint, typecheck,
`check:hex`, 59 unit tests) and `npm run build`, in `ecos-app/`. Cloud
Functions (`functions/`) compile clean via `npm run build`.

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
- `ecos-app/` Vite + React 18 + TypeScript + Tailwind scaffold, per §2.1.
- ESLint boundary rules (§2.2): `src/modules/**`, `src/app/**`,
  `src/offline/**`, and `src/dal/ports/**` cannot import `firebase/firestore`
  or `firebase/storage` — only `src/dal/adapters/firestore/**` can.
- `scripts/check-no-hex.mjs`: fails on any raw hex colour literal outside
  `src/design/tokens.ts` (ESLint alone can't reliably catch these in JSX
  template strings, so this is a source-text scan, run in CI).
- GitHub Actions CI (`.github/workflows/ci.yml`): lint → typecheck →
  hex-check → test → build, scoped to `ecos-app/**` changes.
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
   (Election Campaign OS as the product name, the 9-item nav, the stated
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
- `ecos-landing` and `ic-corporate` — separate repos/projects per §2;
  out of scope for an application-phase build session.

---

## Verification record

```
cd ecos-app
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
