# Postgres adapter — CLOSED, not pending

**This directory stays empty. Decided 13 Sep 2026 by the project owner:
"Firestore is my final decision."**

Firestore is the datastore for Election Campaign OS. The conditional
Phase 8 Postgres migration described in `IC-ECOS-BUILD-2026-V2` §10 is
**closed** — not deferred, not waiting on a paying subscriber, not
conditional. See the decision record in `BUILD-STATUS.md`
("DECISION — Firestore is the database").

Do not implement an adapter here. `src/dal/index.ts` throws on
`VITE_DAL_ADAPTER=postgres`, and `src/dal/dalAdapter.test.ts` fails if
this directory acquires an implementation or if a SQL client is added to
`package.json`.

## Why the DAL still exists

The port/adapter pattern in `src/dal/` was originally justified as
insulation against exactly this migration. It stays, because that was
never its only job:

- it keeps the Firebase SDK out of `src/modules/**`, which is what lets
  every module be tested without a Firebase mock (enforced by the ESLint
  boundary rule, not by convention);
- it forces `SessionContext` through every data call — §5.2,
  non-negotiable #1 — which is a third of the tenant-isolation story;
- it is the seam the offline outbox and the Dexie mirror already sit
  against.

The migration argument is gone. The other three reasons are not, so the
abstraction is not up for removal either.

## If someone asks again

The proposal to move to Cloud SQL Postgres arrived from outside this
repository four times between sessions 13 and 19, most fully in the
infrastructure blueprint batch. That batch's analysis is reviewed in
`docs/infrastructure-blueprint-review.md` — including which of its
criticisms of Firestore were fair (weaker isolation primitives than RLS;
read volume as the real cost risk) and which were not ("no RLS → tenant
isolation moves to app code" is false; Firestore Security Rules are
enforced server-side).

The fair criticisms are the accepted terms of the decision, recorded in
`BUILD-STATUS.md`. They are not grounds to re-open it.
