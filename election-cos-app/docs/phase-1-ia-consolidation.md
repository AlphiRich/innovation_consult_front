# Phase 1 — IA consolidation record

IC-ECOS-BUILD-2026-V2 §3. This is the Phase 1 gate deliverable set required
before Phase 2 could start (§3, "nothing in Phase 2 starts until this is
signed off"). Status: **partially satisfied** — see the gap below before
treating this gate as fully closed.

## Decisions applied (master index §5, defaults accepted)

No override was received during this build session for D1–D4, so the
stated defaults were applied. Revisit if that's wrong:

| # | Decision | Applied |
|---|---|---|
| D1 | Product name | **Election Campaign OS.** "Civic Architect", "Civic Authority", "SA Elections 2024" retired. |
| D2 | Navigation | The 9-item shell in build spec §3.2 — see `src/app/nav.ts`, tested in `nav.test.ts`. |
| D3 | Brand palette | Stated constants (`#1A2246` / `#B7913F` / `#7E1F2E` + the four supporting colours) — see `src/design/tokens.ts`. |
| D4 | Differentiator ordering | Not yet consumed by this build (commercial-material concern, artefact 02 — Fable 5's remit, not election-cos-app's). Noted here for traceability only. |

## Deliverables (§3.4)

1. **Screen inventory — BLOCKED, not done.** The build spec's Phase 1 gate
   requires mapping "every Stitch screen ... to a route ... or marked OUT
   OF SCOPE v1, or DUPLICATE OF." This build session had access to only
   the two governing markdown specs (`00-master-index...md`,
   `01-claude-code-build-spec...md`) — **not** the ~170 Stitch PNGs the
   master index describes as the primary UX specification (§6, "Inputs").
   The master index itself flags this as unresolved (§6, "Google Drive
   folder — unresolved"): the Drive connector returned empty, most likely
   authenticated to a different account than the one that owns the source
   folder (`neodlutu@gmail.com`).
   **Action needed:** re-supply the Stitch screens (upload directly, or
   fix the Drive connector auth) before Phase 1 can be formally signed off
   and before Phase 3 module UIs are built against real layouts rather
   than the `PagePlaceholder` stand-ins currently in place.
2. **`tokens.ts` + Tailwind theme** — done. `src/design/tokens.ts` +
   `tailwind.config.js`, kept in sync by `tokens.test.ts`.
3. **Shell component with conditional nav** — done. `src/app/Shell.tsx`,
   gated on capabilities per `src/app/nav.ts`.
4. **Route table with capability requirements** — done. `src/app/routes.tsx`
   implements the full §3.2 table including sub-views (seat calculator,
   threshold analyzer, scheduled reports, municipality config, permissions,
   ppfa-thresholds, gatherings advisory).
5. **Written list of screens with no home in the target IA** — not
   producible without item 1. No screens have been reviewed this session,
   so none can yet be marked out-of-scope or duplicate with any confidence.

## Copy corrections (§3.5)

Applied everywhere this session touched: no "Civic Architect" / "Civic
Authority" / "SA Elections 2024" strings were introduced; no `af-south-1`;
`Document Integrity Hash (SHA-256)` used in `src/dal/ports/documents.ts`
and `src/modules/analytics` comments, never "Blockchain Verified Hash";
PPFA defaults are R200,000 / R30,000,000 / R160,000 warning (see
`src/modules/finance/ppfaDefaults.ts` and its test). No gatherings permit
UI exists anywhere in this codebase — `src/modules/knowledge/GatheringsAdvisoryPage.tsx`
is static advisory content only, per §6.7.

Since none of the retired strings/values existed anywhere in this
greenfield build, there was nothing to "find and replace" — the
corrections table is satisfied by construction, not by a migration.
