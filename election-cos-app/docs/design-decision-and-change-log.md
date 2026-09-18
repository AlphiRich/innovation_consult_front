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

---

## Session 32 — NW405 ward/VD GeoJSON export

### Entry 32.1 — The payload is our own seed; the geometry is generated

**What arrived.** A GeoJSON `FeatureCollection` for JB Marks (NW405):
34 wards claimed in the metadata, each feature carrying ward number,
code, registered voters, a voting-district list with per-VD voter counts
and `split` flags, and a `Point` geometry. Metadata cites *North West
Provincial Gazette No. 8929*. The paste truncated partway through ward 21,
so wards 1–20 were compared in full.

**Decision.** No re-seed. Geometry rejected. Nothing imported.

**Reason 1 — the data is already ours, exactly.** Every ward total, every
VD code, every per-VD voter count and every `split` flag in wards 1–20
matches `seed-data/jb-marks-nw405-wards-vds.json` byte for byte. The
per-ward totals are also internally consistent: each ward's
`registeredVoters` equals the sum of its VDs' counts, in all twenty. This
is a re-export of the seed this build already parsed from Gazette 8929,
with geometry added. The gazette citation is likewise already recorded, in
`docs/nw405-seed-data.md` and `docs/dha-idvs-and-provincial-scale-review.md`.

**Reason 2 — the geometry is a lattice, not a set of centroids.** Every
one of the twenty points satisfies, exactly:

```
lon = 27.097 + 0.05 × (wardNumber mod 6)
lat = −26.7145 + 0.05 × floor(wardNumber / 6)
```

Six distinct longitudes, four distinct latitudes, 0.05° spacing on both
axes, no exceptions. Real ward centroids do not fall on a grid derived
from the ward's own number. These are placeholder positions generated from
the index.

They are also geographically wrong, which is the part that matters if
anybody were tempted to use them as "close enough". The lattice spans
roughly 25 km × 17 km east and north of Potchefstroom. JB Marks is the
merged Tlokwe–Ventersdorp municipality; Ventersdorp sits roughly 60 km
north-west and falls outside the box entirely. Ikageng and Promosa wards
land in a neat row out in open country.

**Consequence for the map.** Three of last session's supplied designs had
map panels, and each was refused for want of real geometry (entries 31.3,
31.4). This file would have been that geometry. It is not, so the map
stays unbuilt and the reason is now specific rather than general: **this
build has no ward boundaries and no ward centroids.** `Household.geo`
holds real GPS captured at doors by canvassers, which is the only true
coordinate data in the product, and it is not a boundary set.

**What would actually close this.** The Municipal Demarcation Board
publishes ward boundary shapefiles. Nothing short of those, or a
comparable primary source, should populate a ward geometry field — and
when one arrives, the lattice test above is worth running on it first.

---

### Entry 32.2 — Split voting districts: an isolation hole closed

**What the file prompted.** Its `split` flags are the whole subject of the
export, and they pointed at a defect this register had carried as
noted-but-unfixed since the ward seed was built.

**The defect.** `inScope()` in `firestore.rules` narrowed a
voting-district-scoped user on `data.vdCode == token.vdScope` **alone**.
A voting district is a polling station's roll, and a station's roll can be
split across wards — **26 of NW405's 108 station codes are** (corrected
in session 33; this entry originally read 24 of 95 — see entry 33.2), and
code `86910239` (Lesego Primary School) across **three** wards: 8, 12
and 16.

So a canvasser assigned to ward 8's portion of Lesego Primary matched, and
could read, every voter at that station in wards 12 and 16 as well. For
close to a quarter of this municipality's stations the VD code was not a
narrowing at all. `VotingDistrict.id` has been `${wardCode}::${vdCode}` since the seed
was built for exactly this reason; the access rule had not followed.

**What made it unfixable until now.** `staffProvisioning.ts` actively
*refused* a ward code on a VD role — *"A voting-district role is narrowed
on the VD, not the ward. Clear it."* That rule was written before the
significance of split stations was understood, and it was enforced by a
test and repeated in SOP-02.

**The fix, at all three layers.**

| Layer | Change |
|---|---|
| `firestore.rules` | The VD branch of `inScope()` now requires `data.vdCode == token.vdScope` **and** `data.wardCode == token.wardScope`. A token with no `wardScope` fails against every real record — fail-closed, which is what a stale token should do. |
| `src/dal/adapters/firestore/base.ts` | `geoScopeConstraints` mirrors it, and keeps the district constraint alone when a token carries no ward rather than dropping its only narrowing. |
| `staffProvisioning.ts` | A VD role now requires both codes; the "clear the ward" rule is gone; `toStaffProfile` carries the ward through to the record, which is what the Cloud Function stamps onto the token. |
| `PermissionsPage` | Shows the ward field for VD roles and explains why. |
| SOP-02 and SOP-12 | Both carry `SPLIT_VD_BASIS` verbatim. A procedure still telling an administrator to leave the ward blank would produce accounts the rules deny. |

**The original concern is preserved.** The rule this replaced existed to
stop a VD role being *widened* to its whole ward, and `geoScope.test.ts`
still asserts the district test is present. Adding the ward is a further
narrowing, not a substitution.

**Guard proven by injection.** Reverting all three layers to
district-only fails four tests across the adapter, the rules scan, the
provisioning validator and the manual.

**Honest limit.** This narrows what a VD-scoped user may *read*. It does
not retroactively change what anyone has already read, and there is no
audit record of past reads to check against — ordinary reads are not
logged (see entry 31.5).


---

## Session 33 — Computational Source Item Control Sheet & Repository Index

### Entry 33.1 — A source-acquisition plan, and an ETL script that fetches nothing

**What arrived.** A planning document for a data-acquisition exercise: six
provinces (NW, GP, FS, LP, EC, KZN) × five LGE cycles (2000, 2006, 2011,
2016, 2021) of IEC ward- and VD-level results, plus Municipal Demarcation
Board delimitation gazettes and shapefiles for the 2024/2026 cycle. A
folder nomenclature (`07_Geospatial_&_Electoral_Historical_Data_Repository`,
`{PROV}_07_Electoral_Data/{MDB_Gazettes,IEC_Results}`), a target data
schema, and a Python ETL script.

**Decision.** Nothing built from the pipeline. One idea extracted and
built — entry 33.2. The plan itself is a data-acquisition programme for a
person to run, not a build task, and it is recorded here so it is not
mistaken for one.

**The script does not do what it prints.** `setup_directory_structure()`
creates folders and works. `scrape_iec_historical_data()` and
`scrape_mdb_gazettes()` each loop over the provinces and years, print a
`> Fetching …` line per item, and `pass`. Every network call is commented
out. Run as given, it prints thirty "Fetching" lines and
`ETL Pipeline complete. The local folder is ready for Drive
synchronization.` — and downloads nothing at all.

That shape matters more than the missing code. A pipeline that announces
per-item progress and then declares completion is one somebody runs, sees
green, and believes. Anyone picking this up should treat the two scrape
functions as unwritten, because they are.

**Unverified in it, and left unverified.**

- `https://api.elections.org.za/results/{year}/LGE/{prov}` — commented
  out, never called, and the script's own note says the IEC API needs
  credentials. This build did not confirm the endpoint exists or has that
  shape, and does not repeat it as fact.
- The MDB "Spatial Hub" as a programmatic source. Plausible; unconfirmed
  from here.
- **The "15% maximum deviation norm"** — extracted and used, but as a
  configured and cited default rather than an asserted rule. See 33.2.

**One objective refused outright.** The plan gives its purpose as a
historical baseline "for the Election Campaign OS sentiment and seat
projection mathematical algorithms."

- **Sentiment.** Past election results are not sentiment and must never be
  blended into it. SOP-08 is explicit that sentiment in this product is
  the sum of doorstep conversations, with no sampling frame and no
  weighting. Feeding results into it would produce a number that looked
  like a poll, was neither, and could not be defended. Refused.
- **Seat projection.** Genuinely useful — but as *inputs a person
  chooses*, not as an automatic baseline. `seatCalculator.ts` is a
  what-if tool that takes party vote figures and shows the allocation; it
  deliberately does not forecast. Historical results would be good
  starting values for that form. That is a data-entry convenience, and it
  needs the data first.

**Scope note.** Six provinces of historical results is a much larger
undertaking than this build's reference municipality, and none of it is
personal information (election results are public aggregates), so there is
no POPIA question here. There is a provenance question: whatever arrives
needs the same treatment the NW candidate list and the ward GeoJSON got.

**Not added to the repository.** The script targets a hardcoded Windows
desktop path on a named user's machine. It is a local utility, and the
repo is not where it belongs.

---

### Entry 33.2 — The deviation norm, built as a real check

**What was extracted.** The document's "Control Metric: Verification
against the 15% maximum deviation norm from the municipal average." It is
the one computational idea in the file, and it is arithmetic over data the
tenant already holds — which is exactly the standard
`seedReconciliation.ts` is built to.

**Why it was worth building.** `reconcileSeed()` checks the ward *count*
and the ward *codes*. It says nothing about ward *sizes*. A seed can have
all 34 wards, no duplicates and correct codes while one ward carries four
times another's voters — which is either a transcription error or a real
fact about the municipality, and a campaign needs to know which, because
it decides how many canvassers a ward needs.

**How the threshold is treated.** The 15% figure is taken from the
supplied note and has **not** been confirmed against the Municipal
Structures Act or the Demarcation Board's published delimitation
methodology; those sources were not reachable from this environment. So it
is a parameter with a stated default and a stated basis, every finding is
a warning, and nothing blocks. Same treatment `prList.ts` gives the party
list-length cap, for the same reason: a wrong hard threshold that flagged
a lawful demarcation would be worse than no check.

**What it found in our own seed, reported without a conclusion.** Run
against `seed-data/jb-marks-nw405-wards-vds.json`:

- 34 wards, 122,059 registered voters, mean **3,590.0** per ward.
- Range **3,052 to 4,127**. The ±15% band is [3,051.5, 4,128.5].
- **Every ward passes**, and the two extremes sit **0.5 and 1.5 voters
  inside the bounds**.
- Three wards share a total of 4,121 (W2, W3, W23) and two share 3,380
  (W15, W28).

That tightness is worth a second look by whoever holds the gazette. It is
what a demarcation drawn to a norm looks like; it is also what generated
figures look like. The module reports the arithmetic and draws no
conclusion about which — the same restraint applied to the ward geometry
in entry 32.1. The distribution across the band is lumpy rather than flat,
which argues against a naive uniform draw, so this is flagged as a
question and not as a finding.

**Where it landed.** `src/modules/wards/wardSizeDeviation.ts`,
`wardSizeDeviation.test.ts` (16 guards), and a panel on the Wards page
beside the seed check.

**Guard proven by injection:** the boundary comparison flipped from `>` to
`>=`, so a ward drawn exactly to the norm's limit reads as a breach.

---

### Entry 33.3 — Correction: the split-station figures shipped wrong

**What was wrong.** Session 32's `SPLIT_VD_BASIS`, the `inScope()` comment
in `firestore.rules`, and entry 32.2 above all said **"24 of 95 station
codes"**. The seed actually holds **108 distinct station codes, of which
26 are split** across wards.

**How it happened, because the mechanism is the useful part.** The figure
was read off a test failure message during the session-32 injection run —
at a moment when the seed had been deliberately truncated to 32 wards to
prove a different guard. The truncated seed really did contain 24 of 95.
SOP-03's own text was never wrong: it says 26 of 108, and
`manual.test.ts` computes both numbers from the seed rather than trusting
the prose, which is why it stayed right while the hand-written strings
drifted.

**Corrected**, in all three places, and the lesson applied:
`wardSizeDeviation.test.ts` now recomputes the counts from the seed and
asserts that `staffProvisioning.ts` and `firestore.rules` both quote them.
A figure quoted in prose is a figure that drifts; a figure a test derives
is not.

**Guard proven by injection:** the strings reverted to "24 of the 95".
Fails.

**No behaviour changed.** The rule fixed in 32.2 is unaffected — the
narrowing was always on both codes, and only the sentence describing how
common the problem is was wrong. It was understated, not overstated.
