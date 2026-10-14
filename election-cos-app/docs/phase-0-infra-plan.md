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

**Superseded 14 Oct 2026 — one registered domain, subdomains per
product, not two domains.** The table directly below this note is the
original `03-implementation-rollout-plan.md` draft and is kept for
the record, not deleted — see "What changed" underneath it.

| Domain (original draft — superseded) | Purpose | Target |
|---|---|---|
| `innovationconsult.co.za` | Corporate site | GitHub Pages (`ic-corporate`, separate project) |
| `www.electioncampaignos.co.za` | Product landing (`election-cos-landing`) | Firebase Hosting |
| `app.electioncampaignos.co.za` | Application (`election-cos-app`, this repo) | Firebase Hosting |
| `api.electioncampaignos.co.za` | API | Cloud Functions 2nd gen |

### What changed

The human confirmed directly: **`innovationconsult.co.za` is the one
registered domain** (transfer already completed — not a to-do item
anymore, unlike everything else in this file). There is no second
`electioncampaignos.co.za` domain; Election Campaign OS is one product
line among several the company will ship, and **every product and
application service gets a subdomain of `innovationconsult.co.za`**, not
its own domain. This is a real architecture change, not a renaming — it
collapses the four-row table above into one registered domain plus a
subdomain per product/service, confirmed in these words:

- **Company website** — primary customer-acquisition instrument (book a
  demo, research/analysis reports targeting specific customer pain
  points) — hosted on **GCP or Cloudflare** (Cloudflare Pages is the
  likely fit if going that route; GCP would mean Cloud Storage + Cloud
  CDN or Cloud Run, not Firebase Hosting, since Firebase Hosting is
  reserved for application services per the decision below). Which of
  the two is not yet decided — flagged as open, not guessed.
- **Every application service and Agentic/Generative AI product
  line** (Election Campaign OS being the first, not the only one) —
  hosted on **Firebase**, consistent with the `DECISION — Firestore is
  the database` section in `BUILD-STATUS.md`: that decision is about the
  datastore, not hosting, but Firebase Hosting + Firestore + Functions in
  one project is the natural pairing it implies, and nothing today
  revisits it.
- **Both** the website and every app service sit behind **Cloudflare**
  — DNS, WAF, and (per the original draft, still correct) TLS mode
  **Full (strict)**. This is Cloudflare as a proxy/edge/security layer in
  front of GCP-or-Cloudflare-hosted-pages and Firebase-hosted apps — it
  is **not** a revival of the declined `docs/infrastructure-blueprint-
  review.md` proposal to drop Firestore for Cloud SQL Postgres + Cloud
  Run + Cloudflare. That proposal was about replacing the datastore and
  was declined in the Firestore decision above; this is about what sits
  in front of DNS, which both predates and survives that decision
  independently. A future session should not read "Cloudflare" in this
  file as grounds to reopen that closed question.

### Subdomain naming — proposed, not decided

No subdomain name was specified for Election Campaign OS itself; this is
a **proposal** following the one pattern that's actually confirmed
(product-line subdomains off the one registered domain), not a decision
— flag it if any of this is wrong, the same as D1–D7 in `BUILD-STATUS.md`:

| Subdomain (proposed) | Purpose | Target |
|---|---|---|
| `innovationconsult.co.za` (apex) + `www` | Company website — book-a-demo, research/analysis reports | GCP or Cloudflare (open) |
| `ecos.innovationconsult.co.za` | Election Campaign OS application (`election-cos-app`, this repo) | Firebase Hosting, project `election2026-campaignms7-0` |
| `api-ecos.innovationconsult.co.za` *(or a Hosting rewrite to the same host — see `firebase.json`'s existing `/api/**` rewrite, which already avoids needing a separate API subdomain at all)* | Election Campaign OS API | Cloud Functions 2nd gen, `africa-south1` |
| `<product>.innovationconsult.co.za` | Each future application/Agentic/Generative-AI product line | Its own Firebase project, same pattern |

All managed through Cloudflare DNS / WAF, TLS mode **Full (strict)**.

`.env.example` and `.firebaserc.example` in this repo are annotated with
the original `electioncampaignos.co.za` names — those need updating once
the subdomain above is confirmed, not before; changing them on a proposal
would plant an unconfirmed name as if it were decided.

## Account register

1. Google Cloud + Firebase — **Blaze plan required** (Cloud Functions 2nd gen
   won't deploy on Spark). Budget alerts at R500 / R2,000. Not yet provisioned.
2. GitHub Organisation (three repos: `election-cos-app`, `election-cos-landing`,
   `ic-corporate` — see build spec §2). Not yet provisioned.
3. Cloudflare — **account exists and holds the domain's DNS**, confirmed
   14 Oct 2026 (see "What changed" above). Zone/WAF/TLS config against the
   actual subdomain plan is still a to-do once that plan is confirmed.
4. **`innovationconsult.co.za` — registered and transferred**, confirmed
   14 Oct 2026. No longer a to-do; superseded the `-domain registrar`
   provisioning step this line used to be (a `.co.za` TLD transfer still
   goes through a ZACR-accredited registrar, but that's done).
5. Sentry — separate project per environment, per build spec §1. Not yet provisioned.
6. Email provider with SPF, DKIM, DMARC configured. Not yet provisioned.

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
