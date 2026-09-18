# Design Decision & Change Log — Audit Register

One place recording what was supplied, what was adopted, what was rejected,
and why. Open from session 31 onward; earlier sessions are recorded in
`BUILD-STATUS.md` and `docs/manual-and-legal-instruments.md`, which this
does not duplicate.

Each entry carries: **what arrived**, **the decision**, **the reason**, and
**where it landed in the code**. A rejection is an entry like any other —
the register exists so that a rejected asset does not arrive again looking
new.

---

## Session 31 — screen designs, edge/config guidance, security review

Sixteen files arrived in one batch. They are three different kinds of
thing and were triaged as three.

### Intake triage

| # | Asset | Kind | Decision |
|---|---|---|---|
| 1 | `ward_sentiment_comparison_dashboard.html` | Screen design | **Rejected as drawn**, one idea adopted |
| 2 | `3294d616-code.html` — Voter Profile (mobile) | Screen design | Adopted in part |
| 3 | `f40a509d-code.html` — Constituency Seat Allocation | Screen design | Adopted in part |
| 4 | `65f637e8-code.html` — Municipal Incident Report Export | Screen design | **Adopted** — built |
| 5 | Firebase Remote Config norms (17 Sep 2026) | Ops guidance | Deferred, recorded |
| 6 | Cloudflare Edge Worker script | Ops guidance | Deferred, recorded |
| 7–9 | Security Architecture Review (.md/.pdf) | Review of another build | One finding adopted |
| 10–12 | `README` (.md/.docx/.pdf) — security asset package | Another build's manifest | Not applicable |
| 13–15 | `1a09ae76-…` cursor rules (.md/.docx/.pdf) | Agent rules for another build | **Rejected** |
| 16 | `CLAUDE.docx` — security context | Agent rules for another build | **Rejected** |

### The brand on the screen designs is not this product

All four designs are branded **CIVIC ARCHITECT / "SA Elections 2024" /
"Municipal Command"**, with their own Material-3 token set
(`primary #040c30`, `secondary #795907`, `surface #f8f9ff`), Archivo
Narrow + Public Sans, and a `CIVIC_ARCH_v4.2.1` version string in a
footer.

This product is **Election Campaign OS** by Innovation Consult, with a
settled token set in `src/design/tokens.ts` (ink `#1A2246`, gold
`#B7913F`, paper `#F7F4EE`, maroon, teal, green, slate) enforced by
`scripts/check-no-hex.mjs` in CI.

Two of the designs' type tokens are already ours by name —
`display-lg`, `headline-md`, `body-md`, `label-caps`, `data-mono` are the
same scale this build uses. The colour palette is not. **Decision: take
the information architecture, leave the palette.** Nothing from these
files introduces a hex literal; every screen built from them uses the
existing tokens, which is also the only way they would pass `check:hex`.

### What the designs claim that this build will not

Recorded once, because these claims recur across the batch and each was
refused at the point it would have been implemented:

- **"IEC DATABASE CONNECTED"**, "IEC Portal Synchronization", "IEC
  VERIFIED CANDIDATES 218". There is no Commission integration and none
  is possible — SOP-11 says so and `prList.ts` has said so since it was
  written. Verification status in this build is *the party's own record
  that a person checked*.
- **"ENCRYPTION ACTIVE (AES-256)"** in a footer. Not provisioned. The
  build writes no ciphertext rather than a plausible-looking fake, and
  says so on every form that captures an identity number.
- **`840312 **** 082`** as an ID mask, in the candidate roll. Eight of
  thirteen digits, leading with a full date of birth. This is the exact
  mask `src/lib/saIdNumber.ts` was written to refuse, and the same one
  found in the North West candidate list last session
  (`docs/nw-candidate-list-2026-review.md` §5). Not adopted anywhere.
- **"WIN PROBABILITY INDEX 68.4%"**, "100% NOMINATION COVERAGE",
  "TARGET MET". Derived figures with no stated basis. The build's
  standing rule is that a number travels with the sentence that says what
  it is.
- **A click-to-sign signature box** on the incident report. Referrals are
  signed from the signed-in person's own staff record, never from a box
  anybody can click. Carried over to the report.

---

### Entry 31.1 — Ward Sentiment Comparison dashboard: rejected as drawn

**What arrived.** A full ward-comparison dashboard: a sentiment
leaderboard with an index from `+88` to `-91`, a 42-ward heat map, a
"volatility index", a "STRATEGIC ALERT" reading *"Shift identified in
Ward 18 from Neutral to Negative over last 48h — immediate field presence
recommended"*, and a "MUNICIPAL PULSE" feed citing *"increased social
media activity regarding infrastructure delays"*.

**Decision.** Rejected as drawn. Not built.

**Reason.** Three independent grounds, any one of which is sufficient:

1. **It is the thing SOP-08 exists to forbid.** The war-room SOP's
   closing warning is that sentiment here "is the sum of doorstep
   conversations, not a survey of the ward. It has no sampling frame, no
   weighting and no margin of error, and presenting it as a projection is
   the single easiest way to lose an argument about this platform." A
   signed ward index of `-91`, a "volatility" score and a 48-hour trend
   are precisely that presentation. `manual.test.ts` would fail on a
   screen that shipped them.
2. **The data source does not exist.** The design's inputs are social
   media activity and keyword trends. This build holds doorstep sentiment
   recorded by canvassers and nothing else. There is no ingestion, and
   inventing one is out of scope for a screen.
3. **It belongs to a module nobody has.** Ward Sentiment Intelligence is
   `ward-sentiment` in `src/auth/modules.ts` — ward-scoped, not bundled,
   `gatedCapabilities: []`, and documented there as "Not built here yet —
   the entitlement exists ahead of the surface." Building its flagship
   screen without the entitlement gate that landed last session would
   hand every tenant a paid module.

**Adopted from it.** One idea: *comparison across wards is a real need,
and the war room only shows one municipality-wide figure.* Recorded as a
candidate for the `ward-sentiment` module when it is built, gated on the
entitlement, sourced from door records, and labelled as SOP-08 requires.
Not built this session.

---

### Entry 31.2 — Municipal Incident Report Export: adopted and built

**What arrived.** A two-column screen: report configuration on the left
(date range, multi-select wards, four category checkboxes, an official
remarks box), a rendered "paper" document on the right with a letterhead
reading *Innovation Consult — ElectoralOS Civic Infrastructure Division*,
summary blocks (142 total / 28 high priority / 05 wards), an incident
ledger, a click-to-sign signature box, and "Page 1 of 8".

**Decision.** Adopted. Built as `/incidents/report`, reached from the
Incidents page (the primary nav is fixed at nine items by §3.2 and
`nav.test.ts` holds it there — same arrangement as the canvassing round
off Voters).

**Reason.** The information architecture is right and the gap was real.
The design's four categories are *exactly* this build's
`IncidentCategory` enum — Water & Sanitation, Electricity, Roads &
Transport, Public Safety — which is a strong signal the design was drawn
against this data model. The document pipeline
(`PrintDocument` → PDF/DOCX), the letterhead and the ward/severity
metadata all already existed. What did not exist was a way to ask the
question: `IncidentRepository` had `listByStatus` and nothing else, which
answers *what is waiting on us now* (the incidents board's question).
*What did this ward live with last month* had no read at all.

**What changed from the design, and why.**

| Design | Built | Reason |
|---|---|---|
| "+ 136 additional records truncated for preview", "Page 1 of 8" | Every incident in the range is printed | A total that stops describing the table beneath it is the one failure this report cannot survive. `incidentReport.test.ts` prints 40 incidents and asserts all 40 appear. |
| Click-to-tap signature box | "Prepared by", from the signed-in person's staff record | Referrals are signed from a real staff record and never from a box anybody can click. The report is prepared, not signed. |
| "FOR OFFICIAL REVIEW" stamp | `REPORT_BASIS` as the first block | It is a campaign record of faults its own people logged; nothing in it has been verified by the municipality. |
| Free-text "Official Remarks" appended to the footer | Not built | An "official remarks" box on a document a reader may take as official is an invitation to write something the campaign cannot stand behind. The description fields already carry what was recorded at the time. |
| Photographs implied in the ledger | Noted, never reproduced | §6.4 keeps images out of generated documents. The report says which incidents carry them so they can be retrieved. |

**Where it landed.**
- `src/dal/ports/incidents.ts` + adapter — `listByDateRange`, narrowed by
  geographic scope like every other read.
- `src/modules/incidents/report/incidentReport.ts` — the selection, the
  counts and the document.
- `src/modules/incidents/report/IncidentReportPage.tsx` — the screen.
- `src/modules/incidents/report/incidentReport.test.ts` — 14 guards.
- Link added to `IncidentsPage`.

**Guard proven by injection:** the row loop capped at six, exactly as the
design drew it. Fails.

---

### Entry 31.3 — Voter Profile (mobile): adopted in part, most fields refused

**What arrived.** A mobile voter profile: name, address, sentiment pill
("Lean Support"), registration status, quick actions, a demographics
block (`VOTER ID ZA-992-0481`, `54 / Male`, full phone `+27 82 555 0192`,
full email), tagged "primary concerns", an engagement-history timeline
(canvass / phone / SMS) and a map thumbnail.

**Decision.** Not built this session. Recorded with the specific reasons,
because most of what makes this screen look useful is data this build
deliberately does not hold.

**Reason, field by field.**

- **Sentiment pill, name, ward, household address** — real. This build
  holds all of it, and `VoterCard` already shows most.
- **Full contact number** — refused. Numbers are stored masked
  (`phoneMasked`), and unmasking is a server operation that writes an
  audit event. A profile screen printing `+27 82 555 0192` would undo
  that.
- **Email address** — not held. `Voter` has no email field and adding one
  to match a mockup would be collecting personal information for a
  screen's sake.
- **`54 / Male`** — not held, and not to be derived. Age and sex are not
  on the voter record. The only place a date of birth or sex marker could
  come from is an identity number, and `saIdNumber.ts` exists partly to
  refuse exactly that inference.
- **`VOTER ID ZA-992-0481`** — not a real identifier in this build, and
  not one the IEC issues in that form.
- **"Registered" status pill** — refused. This platform cannot check
  anybody against the voters roll. A green "Registered" tick would be the
  same false claim as the candidate screen's "IEC VERIFIED".
- **Engagement history timeline** — the genuinely valuable idea, and the
  one real gap. This build holds `contactStatus` and `lastContactedAt` on
  the household and diary entries on the shift, but no per-voter
  interaction log. Building one is a data-model change, not a screen, and
  is recorded here as a candidate rather than improvised.

**Adopted.** Nothing built. The engagement-history gap is the item worth
carrying forward.

---

### Entry 31.4 — Constituency Seat Allocation: the ward roll adopted, the rest refused

**What arrived.** A dashboard with a ward candidate roll table, four
summary tiles (242 wards contested / 218 IEC verified / 68.4% win
probability / campaign ACTIVE), a "Ward Coverage Index" dial reading
**100% — TARGET MET**, an incumbent-vs-new ratio, a filing compliance
audit trail with a "VIEW FULL AUDIT LOG" button, and a geospatial ward
map with "SECURE SEATS / BATTLEGROUND / AT RISK" counts.

**Decision.** One part adopted and built — the ward candidate roll, in
honest form. The rest refused.

**Reason.**

- **The ward roll is a real gap.** SOP-11 shipped last session with ward
  candidates as a flat list under the party list. That separation is
  correct, but a flat list cannot answer the question a party actually
  has before nominations close: *which wards do we not have a candidate
  for.* `wardRoll.ts` answers it.
- **"100% — TARGET MET" is the tile rebuilt.** Coverage is now counted
  against the wards actually loaded for the tenant, wards with nobody
  standing are **listed by code rather than summarised as a
  percentage**, and a ward with two candidates is reported as a finding
  rather than counted as covered. A candidate whose ward code is not one
  the tenant has loaded is shown as unplaceable rather than silently
  dropped.
- **"IEC VERIFIED CANDIDATES 218" / "IEC DATABASE CONNECTED"** — refused.
  There is no Commission integration. Verification here is the party's
  own record that a person checked.
- **"WIN PROBABILITY INDEX 68.4%"** — refused. No model, no basis, no
  inputs.
- **`840312 **** 082`** — refused. See the intake note above.
- **"Criminal record checks finalized for all 242 candidates"** in the
  audit trail — refused. This build performs no such check and holds no
  such record.
- **The geospatial map with secure/battleground/at-risk counts** — not
  built. It is the seat calculator's territory (`seatCalculator.ts`,
  property-tested) and would need a projection this build does not make.
- **"VIEW FULL AUDIT LOG"** — adopted, as entry 31.5.

**Where it landed.** `src/modules/candidates/wardRoll.ts`,
`wardRoll.test.ts` (10 guards), and a rebuilt ward section on
`CandidatesPage`.

**Guard proven by injection:** `covered` widened to `>= 1` so a doubled
ward counts as covered, and the orphan branch dropped. Five tests fail.

---

### Entry 31.5 — Audit log viewer: built, and it says what it is not

**What arrived.** Two things pointing at the same hole from opposite
directions: a "FILING COMPLIANCE AUDIT" panel with a "VIEW FULL AUDIT
LOG" button on the Constituency design, and a security review
recommending hash-chained, tamper-evident audit tables.

**Decision.** Built as `/settings/audit`.

**Reason.** `dal.auditLog.listRecent()` has existed since Phase 3, with a
Firestore adapter and a security rule allowing the read to
`settings.permissions` holders. **No screen ever called it.** Three
modules promise an audit event in their own headers — unmasking a
candidate's identity number, exporting the donor ledger, changing a PPFA
threshold — and an administrator asking *who unmasked that number* had no
way to find out and no way to learn that they could not find out. This is
the same shape as the entitlement gate found last session: a port, an
adapter, a rule, and nothing that reads it.

**What the screen says about itself, and why that is the point.** A page
headed "Audit log" makes a claim by its title; outside software the word
means the entries cannot have been altered. So:

- It states the property the rules actually give it — append-only from
  inside the application, because `firestore.rules` denies every client
  write — and `auditTrail.test.ts` checks that claim against the rules
  file itself.
- It states plainly that it is **not** tamper-evident: no hash chain,
  and somebody with server credentials could alter it without the record
  showing it. The security review's recommendation is right and is not
  built here.
- It states that ordinary reads are not logged, where the question gets
  asked.
- An empty log explains itself: the functions that write it need a live
  Firebase project, which this build does not have. An empty page that
  says why beats a page that merely looks quiet.
- An action with no plain-language description shows its raw identifier
  rather than a guessed sentence.

**Where it landed.** `src/modules/settings/auditTrail.ts`,
`AuditLogPage.tsx`, `auditTrail.test.ts` (9 guards), route and Settings
index entry.

**Guard proven by injection:** the integrity sentence rewritten to
"Entries are immutable and cannot be altered once written… a complete and
trustworthy record". Two tests fail.

**Open item.** A hash-chained audit log is a real improvement and is not
built. It belongs with the Cloud Functions work, not with a screen.

---

### Entry 31.6 — Firebase Remote Config norms: deferred, with the reasoning kept

**What arrived.** A well-argued optimisation note: "fetch for next
session" (activate from cache at 0 ms, fetch in the background on a
12–24 hour interval), no fetches bound to generic lifecycle events, and
realtime `addOnConfigUpdateListener` only inside flows that need instant
kill switches, with explicit teardown.

**Decision.** Deferred. Nothing built.

**Reason.** This build uses no Firebase Remote Config at all, and there is
no live Firebase project to configure. Adding the dependency and a
`remoteConfig.ts` now would be writing an optimisation for a system that
does not run — and the emergency-broadcast and kill-switch examples the
note is built around describe features this product does not have.

**What is worth keeping.** The advice is sound and the reasoning is the
kind this build already applies elsewhere (the war room reads one
pre-aggregated counter rather than scanning; SOP-08 explains why). If
Remote Config is ever introduced, the three rules — background fetch,
domain-triggered refresh only, bounded realtime listeners with teardown —
should be adopted as written. Recorded here so the note does not have to
be rediscovered.

**One thing that does not carry over.** The note's example config keys
include `threat_lockdown_level` and `emergency_broadcast_active` driving
UI. A remotely-flipped switch that changes what a campaign's field
workers see, with no record in the tenant, would sit badly beside this
build's discipline that every consequential act is attributable. If it is
built, it needs an audit event.

---

### Entry 31.7 — Cloudflare Edge Worker: deferred, one item flagged as wrong

**What arrived.** A reverse-proxy Worker in front of Firebase Hosting:
cache rules (30 days for static assets, bypass for `/api/*` and
`/auth/*`), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, and a CSP tuned for Firebase
Auth/Firestore. Plus a note to do rate limiting in Cloudflare's WAF
rather than in the Worker.

**Decision.** Deferred — it is deployment configuration, not a screen, and
this build has no deployment target configured. Recorded in full because
the header set is good and should be used when there is one.

**One correction for whoever implements it.** The script sets
`X-XSS-Protection: '1; mode=block'`. That header is deprecated, is
ignored by current Chrome and Firefox, and in its filtering mode has
itself been a source of vulnerabilities; the CSP in the same script is
what actually provides the protection. Do not carry it over.

**Also worth noting.** The CSP includes `script-src 'unsafe-inline'`.
That is a real weakening and is not required by this build — the Vite
output has no inline scripts. Tighten it before deploying rather than
copying it as given.

---

### Entry 31.8 — Security Architecture Review and asset package: not this codebase

**What arrived.** A layer-by-layer efficacy review of a 7-layer
defence-in-depth architecture, plus a README manifest for the asset
package it reviews, plus `CLAUDE.md` and cursor-rules files instructing a
coding agent how to work on it.

**Decision.** Not adopted. One finding taken (entry 31.5). The agent
rules files are **rejected and must not be added to this repository.**

**Reason.** The review is competent and it is about a different system.
Its subject has Prisma and Postgres, `src/middleware/validate.ts`,
ModSecurity WAF rules, a `cicd/security-gate.py`, gVisor sandboxing and
LLM agent tool registries. This build is a Firebase/Firestore
offline-first PWA with no server middleware, no ORM, no Postgres, no AI
agents and no WAF. None of the seven layers maps onto it.

**Why the agent rules are rejected rather than merely inapplicable.**
`CLAUDE.docx` instructs, as always-do rules: *"Update
`prisma/schema.prisma` + a migration for any new data model"*, *"Never
parse XML with @xmldom/xmldom"*, *"Merge if `cicd/security-gate.py` exit
code != 0"*. None of those files exist here. Dropping this in as
`CLAUDE.md` would give every future session a set of instructions whose
subject is absent — and the specific danger is the PII rule: *"Never
return voter/donor PII without field-level encryption path
(AES-256-GCM)."* This build has documented, deliberately and repeatedly,
that AES-256 is **not provisioned** and that it writes no ciphertext
rather than a plausible-looking fake. An agent told that rule, in this
repository, would either believe encryption exists or invent it. Both are
worse than the honest gap.

**The findings, assessed against this build.**

| Review finding | Applies here? |
|---|---|
| Hash-chained tamper-evident audit | **Yes.** Real gap, screen built, chaining not built — entry 31.5. |
| AES-256-GCM PII encryption | Already the documented position and the known gap. Not re-litigated. |
| FIDO2/WebAuthn over TOTP | Plausible, but this build has no MFA at all and no live Auth project. An infrastructure decision for provisioning, not a screen. |
| DDoS / Anycast / bot management | Infrastructure. See entry 31.7. |
| mTLS for east-west traffic | No microservices. There is no east-west traffic. |
| Least-privilege SQL roles, SQL budgets | No SQL. Firestore rules are the equivalent and are already capability-gated. |
| Zod strict schemas at handlers | No request handlers. Validation sits in the DAL and in pure modules, tested. |
| Prompt firewall, ToolRegistry, gVisor | No AI agents in the product. |

---

## Standing decisions confirmed this session

These were already settled and each was re-applied against a supplied
asset that would have broken it. Recorded once so the next batch does not
reopen them.

1. **Tokens, not palettes.** Supplied designs bring their own colours;
   this build has `src/design/tokens.ts` and a CI guard. Take the
   information architecture, leave the palette.
2. **The nine-item nav is fixed** (§3.2, `nav.test.ts`). New screens hang
   off a parent page or off Settings.
3. **No IEC integration, in any screen, ever, until one exists.**
4. **No fabricated ciphertext**, and no field named "encrypted" holding
   something that is not.
5. **No identity-number mask wider than four digits.**
6. **A figure travels with the sentence that says what it is.** No
   indices, coverage dials or probability scores without a stated basis.
7. **Nothing truncates silently.** Reports print everything or say what
   was excluded.

## Carried forward

- Per-voter engagement history (entry 31.3) — a data-model change.
- Hash-chained audit log (entry 31.5) — Cloud Functions work.
- Ward sentiment comparison (entry 31.1) — when `ward-sentiment` is built,
  gated on the entitlement, sourced from door records.
- Remote Config rules (entry 31.6) and edge headers (entry 31.7) — when
  there is a project and a deployment target.
