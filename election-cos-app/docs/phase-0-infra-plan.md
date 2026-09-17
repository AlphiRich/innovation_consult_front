# Phase 0 — infrastructure plan (source: `03-implementation-rollout-plan.md`, IC-ECOS-ROLLOUT-2026-V1)

This was supplied in a later session than the initial build and fills a gap
flagged in `BUILD-STATUS.md` #2 ("no live Firebase project"). It's still not
provisioned — nobody has run these steps yet — but it gives the concrete
names and account list Phase 0 needs, so recording them here rather than
leaving them to re-derive later.

## Irreversible decisions

- **Firestore database location:** `africa-south1` (Johannesburg). Verify in
  the console before the first write — this cannot be changed after data
  exists.
- **GCP project ID — RESOLVED session 10.** The human confirmed directly:
  use **`election2026-campaignms7-0`** (name `Election2026-CampaignMSv7`,
  project number `549685402486`). `.firebaserc` now points at it for real
  (no longer just `.firebaserc.example`); `.env.example`'s
  `VITE_FIREBASE_PROJECT_ID` is filled in. `innovation-consult-ecos-prod`/
  `-dev` from `03`'s original plan are superseded — this project is the
  one, not a same-environment-different-name question anymore.
  **Still cannot inspect this project myself** — no `gcloud` or `firebase`
  CLI, and no Google Cloud credentials, are available in this build
  session; nothing here confirms whether Firestore/Storage/Functions/Blaze
  are actually configured, or what region was picked. That still needs a
  human (console or CLI) to verify against the §1.1 checklist in the build
  spec — see the "What you need to do" list in BUILD-STATUS.md's session
  10 entry for the exact remaining steps.

## Domain and DNS architecture

| Domain | Purpose | Target |
|---|---|---|
| `innovationconsult.co.za` | Corporate site | GitHub Pages (`ic-corporate`, separate project) |
| `www.electioncampaignos.co.za` | Product landing (`election-cos-landing`) | Firebase Hosting |
| `app.electioncampaignos.co.za` | Application (`election-cos-app`, this repo) | Firebase Hosting |
| `api.electioncampaignos.co.za` | API | Cloud Functions 2nd gen |

Managed through Cloudflare DNS / WAF, TLS mode **Full (strict)**.

`.env.example` and `.firebaserc.example` in this repo are annotated with
these names — fill them in once the accounts below exist.

## Account register (none provisioned yet)

1. Google Cloud + Firebase — **Blaze plan required** (Cloud Functions 2nd gen
   won't deploy on Spark). Budget alerts at R500 / R2,000.
2. GitHub Organisation (three repos: `election-cos-app`, `election-cos-landing`,
   `ic-corporate` — see build spec §2).
3. Cloudflare.
4. ZACR domain registrar (`.co.za` TLD).
5. Sentry — separate project per environment, per build spec §1.
6. Email provider with SPF, DKIM, DMARC configured.

## Compliance & PPFA dependencies

- IEC Quarterly Disclosure Specification — needed to format the CSV export
  correctly (`donations.markDisclosed` / the export function, both still
  unbuilt pending §6.8.1 in the governing build spec — see
  `BUILD-STATUS.md`).
- Penetration testing & security audit partner (ISO 27001 pathway — not
  currently held; commercial material must say "pathway commencing", never
  "certified").
- Information Regulator registration for the Information Officer (POPIA —
  human/legal task, not a code task).

## Pre-launch checklist (abridged — full list in the source PDF)

Infrastructure & security: Firestore location verified · budget alerts
active · Firestore rules deny-by-default and cross-tenant isolation tested
· Auth minimal-footprint rule enforced (all four already built and tested
in this repo — see `src/auth/firebaseAuth.test.ts`, `firestore.rules`).

POPIA & legal: Privacy Policy + ToU published · Information Officer
designated and registered · POPIA Operator Agreement template ready ·
doorstep consent script finalised in EN/Setswana/Afrikaans. All human/legal
tasks, not code — see `04-legal-compliance-workstream.md`'s action table
(owners: Mac, Attorney).

Product & operations: offline capture/sync tested on real mobile networks
· seat calculator property tests pass (done — `seatCalculator.test.ts`) ·
gatherings advisory published (done — `GatheringsAdvisoryPage.tsx`) ·
pricing and contract templates ready (commercial/legal, not code).
