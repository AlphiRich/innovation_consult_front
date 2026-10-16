# Election Campaign OS — state of the build

Written 16 October 2026, at the end of the session that routed the deploy
through CI. One page, so that picking this up cold does not require
reading forty sessions of change log.

Governing spec `IC-ECOS-BUILD-2026-V2`. Branch
`claude/election-campaign-os-jlzsw3` in `AlphiRich/innovation_consult_front`;
the application is the `election-cos-app/` subtree.

**Read `.claude/skills/ecos-build-discipline/SKILL.md` before changing
anything.** It holds the twelve rules this build arrived at the hard way,
including the standing instruction on the proclaimed delimitation.

---

## Where it stands in one line

The beta is built, verified and runnable; it has been driven end to end
against the emulator with real NW405 seed data; it is **not deployed**,
and the only thing standing between it and a live URL is two values that
only the account holder can supply.

## Verification, as of this commit

| | |
|---|---|
| `npm run check:all` | green — 965 tests, 60 files (lint, typecheck, hex guard, type-scale guard, font guard) |
| `cd functions && npm test` | green — 52 tests, 2 files |
| `npm run build` | green, with service-worker precache manifest |
| `npm run preflight` | 2 failures, both the account holder's to clear (below) |

## What is built

- **The nine-item nav and all its routes**, 27 page components across 16
  modules, driven signed-in at phone and desktop width with no console
  errors.
- **Capability RBAC** — 26 capabilities, 7 seed roles, enforced in
  `firestore.rules` against `request.auth.token.caps`, not in the UI. Nav
  visibility is a convenience; it is never the access check.
- **The proclaimed 2026 delimitation, hardwired.** Annexure A to IEC
  Circular 1 of 2025: 258 municipalities, 214 warded, 4,488 wards,
  27,723,675 voters (metros and locals). Extracted behind a SHA-256 gate
  with five per-row relations and a whole-table roll identity verified;
  all 44 districts reconcile against their locals.
- **Seat calculation** — Municipal Structures Act Schedule 1 Item 12
  quota and Item 16, Schedule 2 for category C, routed by category. PR
  seats are **derived** (`councillors − wardSeats`), never stored.
- **Offline-first sync** — per-field last-write-wins over an
  `_fieldUpdatedAt` map, in pure functions with 33 tests, behind an
  idempotent endpoint that takes the tenant from the verified token and
  runs one transaction per operation.
- **PWA shell** — manifest, service worker that caches the app and never
  the data, update banner, 18 self-hosted woff2 faces.
- **Design system** — tokens plus the shared primitives in
  `src/components/ui`, with 26 of 27 pages migrated onto them.
  `check-no-hex.mjs` fails the build on a raw hex in product source and
  `check-type-scale.mjs` on an off-token font size; both exist because
  `tailwind.config.js` extends its theme rather than replacing it, so
  off-token values otherwise keep working silently.
- **The deploy path** — `npm run deploy` (checks → build → preflight →
  `firebase deploy`), and `.github/workflows/deploy-ecos.yml` for the
  route that does not need a credential in this container.
- **The corporate landing page launch card** — probes the application and
  becomes a real link on its own. Needs no second deploy and cannot show
  a dead link.

## What is blocked, and on whom

**Deployment — the account holder.** Two values, both documented with
exact IAM roles in `docs/deploy-credentials-request.md`:

1. A deploy credential — a service-account JSON as
   `GOOGLE_APPLICATION_CREDENTIALS`, or `FIREBASE_TOKEN`. **Not in chat.**
2. The six `VITE_FIREBASE_*` web-config values. These are public by
   design and may go in chat or in Actions variables.

Three routes, in `docs/deploy-credentials-request.md`: deploy from your
own machine, deploy via GitHub Actions (one repository secret, six
variables, **Run workflow**), or add the credential to this environment.

No Google credential can reach this container —
`gcloud auth print-access-token` returns the literal string
`proxy-injected`. That is why the Actions route exists. Retrying the
deploy from here cannot work.

**One thing nobody can check for you:** that Firestore and Storage were
created in `africa-south1`. Fixed at creation, unreadable without
authenticating, unchangeable once data exists. If either is elsewhere the
remedy is a new project — cheap today, impossible after a campaign has
loaded a roll.

## What is deliberately unbuilt, and why

Not a backlog. Each of these is a decision.

- **`ppfaAggregation.ts`** — written, not exported, will not deploy. Held
  pending the §6.8.1 legal confirmation.
- **`unmaskCandidateIdNumber`** — deploys and fails closed. Throws
  `unimplemented` as its entire body pending a Cloud KMS key, so it
  cannot return a wrong answer.
- **Binding legal instruments** — Terms of Use, licence, tenancy
  agreement, indemnities, limitation of liability. Attorney work. Briefs
  only, under `docs/legal-drafts/`.
- **The three concept screens** from the session-39 design reference —
  Field Performance, Ward Sentiment Summary, Ward Sentiment Drilldown.
  Volunteer identity, hours and per-ward sentiment segmentation have no
  data model here. The reference itself says so. Building them means
  shipping invented numbers.
- **War Room's fuller dashboard** — volunteer presence, campaign
  velocity, live diary feed. No traceable data source yet.
- **Dark mode** — a field tool that must stay legible on a cracked
  Android screen in direct sun does not get one for free.

## Real work remaining, in rough order of value

1. **Deploy**, once the two values land, and confirm the region.
2. **Registered voters per 2026 ward** — the annexure gives municipal
   totals, not per-ward. Needed before the ward-level figures mean
   anything outside NW405.
3. **The VD → 2026-ward spatial join.** 26 of 108 NW405 station codes
   split across wards, which is why `VotingDistrict.id` is
   `${wardCode}::${vdCode}`. The rest of the country needs the same
   treatment and it needs the shapefiles.
4. **Results history and code history for the other eight provinces.**
   NW is complete; `provinceReviewStatus()` reports the gap honestly and
   `unreviewedProvinces()` lists it.
5. **Migrate the last page component onto the UI primitives.**
   26 of 27 are done (session 44). What is left is `PermissionsPage`,
   the largest file in the build at 452 lines.

   **Do it by hand, not by `sed`.** The first twenty-six turned up ~125
   buttons with no distinguishing accessible name, 5 files off the type
   scale, 3 selection states that existed only in colour, 3 checkbox
   groups with no `fieldset`/`legend`, 3 headings a naive substitution
   would have demoted to paragraphs, 2 tables with proportional figures
   in numeric columns, 2 duplicate copies of `StatTile`, 2 genuinely
   unlabelled controls, 2 accessible names polluted by hint text, and a
   real shared-mutation defect in Logistics. None of it was visible in a
   test run.

   One finding is a correction rather than a defect, and it is the most
   useful of the lot: the claim that these pages had "unlabelled inputs"
   was **wrong**. A control nested inside its `<label>` is implicitly
   associated. That claim had sat in `src/components/ui/index.tsx` since
   session 38 and was repeated instead of checked. See changelog entry
   44.2. **An existing comment asserting a defect is not evidence of the
   defect.**

   Also: reach for a **prop**, not `className`, when a primitive does
   not offer what a call site wants. Appending `text-ink`,
   `text-data-mono` or `p-0` races the primitive's own class in the same
   Tailwind group, and the winner is decided by stylesheet order rather
   than by the class attribute. `SectionLabel` takes `tone` and `as`,
   `Field` takes `mono`; nothing takes a padding override.
6. **A Cloud Function to resolve an email to a Firebase uid**, so an
   administrator can grant access without the new user reading their own
   uid off the "Awaiting access" screen.
7. **A Firestore TTL policy** on `tenants/{tid}/_syncIdempotency`
   (`expiresAt`). Not urgent; the records are small but accumulate
   forever.

## Branding, settled 16 October 2026

Three palettes were in circulation. The letterheads-and-covers artifact
(7 Oct) and `docs/innovation-consult-brand.md` (from the 9 Aug canvas)
agree exactly: **`#13244A` / `#C9A227` / `#7B1E30` / `#F4EFE2`** is the
canonical corporate identity. The EC OS product tokens
(`#1A2246` / `#B7913F` / `#7E1F2E` / `#F7F4EE`) are a **separate
namespace and stay as they are**. The corporate landing page carried a
third set that matched neither; it was drift and has been corrected.

## Where the reasoning lives

| | |
|---|---|
| `.claude/skills/ecos-build-discipline/SKILL.md` | the twelve working rules |
| `docs/design-decision-and-change-log.md` | every decision, by session, with what it cost |
| `docs/deploy-credentials-request.md` | the three deploy routes, exact IAM roles |
| `docs/running-locally.md` | emulators, seed, claims, signed-in local run |
| `docs/national-delimitation-baseline.md` | the proclaimed baseline per province |
| `docs/innovation-consult-brand.md` | corporate identity, and why it is separate |
| `docs/unverified-source-documents.md` | what has not been verified against a primary source |
