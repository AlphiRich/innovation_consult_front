# The manual and the legal instruments

Session 26. What the operations manual is for, beyond being a manual, and
what it deliberately is not.

## The direction of travel

The manual is the **operational source of truth**: it states what the
platform does, what it refuses to do, and how a subscriber is expected to
use it. The commercial and legal instruments are then drafted **against**
it, not the other way around.

That direction matters. A Terms of Use written first, from a sales deck,
will contain claims the code does not honour — and this project has spent
several sessions finding exactly that pattern in other people's material:
a "permanently purged post-election" promise against a system that
hard-deletes nothing; an "IEC export" that reads as automated filing; a
PPFA module described as enforcing a statutory cap it must never enforce.

An SOP that overstates the product propagates into a contract. So every
factual claim in `src/modules/manual/` is asserted against the code by
`manual.test.ts`, and the SOP quotes the real constants rather than round
numbers.

## What this is not

**Nothing in `src/modules/manual/` drafts a legal instrument, and nothing
here should.** The Terms of Use, Subscriber Tenancy Agreement, Pricing &
Accounts terms, Privacy Policy, Licence Agreement, and the disclaimer,
indemnity and limitation statements are attorney work, on South African
law, for a regulated political-funding and personal-information context.
This repository's standing rule — never assert legal content that has not
been verified — applies with more force here, not less, because these
documents are the assertion.

The manual's own cover says so (`MANUAL_STATUS_NOTE`): it is not a
contract, does not vary any agreement, and where the two differ the
agreement governs.

## What the instruments can safely be drafted against

Each row is a claim this build has established and guarded. An attorney
can rely on these as statements of fact about the product.

| Claim | Established in | Guarded by |
|---|---|---|
| Tenant isolation is enforced in three places: custom claims, security rules, DAL | `firestore.rules`, `src/dal/adapters/firestore/base.ts` | `geoScope.test.ts`, `roleModel.test.ts` |
| Permissions are capability-based; no rule checks a role name | `firestore.rules` | `roleModel.test.ts` |
| Ward roles see their ward; VD roles see their voting district only | `inScope()`, `geoScopeConstraints()` | `geoScope.test.ts` |
| A voter record cannot be created without consent recorded | `firestore.rules` voters block | `bulkImport.test.ts` |
| Bulk import requires a demonstrable consent basis, date and reference | `bulkImport.ts` | `bulkImport.test.ts` |
| Contact numbers are masked for display and never stored in the clear by the client | `phone.ts`, `bulkImport.ts` | `phone.test.ts`, `bulkImport.test.ts` |
| Nothing in the product hard-deletes; voters and households are suppressed | all 14 `allow delete: if false` | `dataSubjectErasure.test.ts` |
| Donation and donor-ledger records cannot be deleted at all | `firestore.rules` | `dataSubjectErasure.test.ts` |
| The PPFA module aggregates and alerts; it never blocks a donation and never files with the Commission | `ppfaDefaults.ts`, `modules.ts` | `ppfaDefaults.test.ts`, `entitlements.test.ts` |
| The PR list export is a compliance aid for human submission, not automated IEC filing | `prList.ts` | `prList.test.ts` |
| The gatherings module is advisory only and tracks no permit deadline | `GatheringsAdvisoryPage.tsx`, `modules.ts` | `entitlements.test.ts` |
| A referral is a party document addressed to a municipality, carrying no municipal or state authority | `referralDocument.ts` | `referralDocument.test.ts` |
| A household that asks not to be contacted again is never re-queued | `canvassQueue.ts` | `canvassQueue.test.ts` |
| Access codes never leave the device in an export, referral or printed page | `householdSafety.ts` | `householdSafety.test.ts` |
| Entitlements record what was bought and until when, never a price | `ports/entitlements.ts` | `entitlements.test.ts` |
| Every tenant is offered the same published modules on the same terms | `modules.ts` | `entitlements.test.ts` |

## What the instruments must NOT claim

These are the overclaims this build has already had to correct, in its own
material or in material handed to it. Each would be false if written into
a contract.

1. **That personal information is deleted, erased, purged or destroyed on
   request, or after the election.** It is suppressed. There is no
   de-identification routine. This is the single most likely sentence to
   appear in a draft Privacy Policy and the single most likely to be
   wrong. `dataSubjectErasure.ts` carries the accurate positions per
   subject type, all marked pending attorney review.
2. **That the platform files anything with the Electoral Commission**, or
   that any export constitutes a submission, certification or lodgement.
3. **That the platform ensures, guarantees or certifies PPFA compliance.**
   It aggregates, tracks thresholds and alerts. A donation is never
   blocked.
4. **That the platform tracks, manages or ensures compliance with
   gatherings permits.** The module is a static advisory page.
5. **That a POPIA response deadline is statutory.** POPIA prescribes no
   fixed window; `RESPONSE_TARGET_DAYS` is an internal working target and
   says so.
6. **That data never leaves South Africa.** Firebase Authentication
   processes an email address and an opaque identifier outside the
   Republic. This is a §72 matter and must be disclosed as one, not
   papered over with a broader claim. The subscriber identity policy
   already applies exactly this discipline and is the model.
7. **That the PR list gender requirement is a hard statutory threshold.**
   Schedule 1 asks a party to *seek to ensure*; a shortfall is lawful.

## Open items an attorney will need answered

- **The PR list length cap.** Reported as twice the PR seats; Item 11(1)
  could not be read from a primary source in this environment. Configured
  and hedged rather than hardcoded. Confirm against the Act.
- **PPFA retention period** for donation records, which drives how a donor
  erasure request is refused.
- **POPIA response target** — whether 30 days is defensible as a published
  commitment.
- **Whether `HOSTILE_RECEPTION_REPORTED`** on a household access note, and
  its free-text note, need specific treatment in the Privacy Policy. It is
  personal information about an identifiable household, retained for
  canvasser safety, and reachable by a data subject request. The product
  treats it as ordinary personal information; that position should be
  confirmed.
- **Whether the manual should be issued as a contractual schedule** or
  remain expressly non-contractual as it currently states.

## Sequence

1. SOP-01 through SOP-07 are issued (`src/modules/manual/sops/`).
2. SOP-08 … SOP-12 are written (`PLANNED_SOPS` carries the register).
3. The completed manual goes to an attorney **with this file**, which
   tells them what is safe to rely on and what must not be said.
4. The instruments are drafted against it.
5. Anything the instruments need that the product cannot do comes back as
   a build item — not as a sentence in a contract.

---

## The document set, as built (session 27)

The manual and the legal set are now produced as real files — PDF and
Word, from one model, on the Innovation Consult letterhead.

    npm run docs:emit -- --out dist-documents --role canvasser

Nine documents, eighteen files:

| Ref | Document | Status |
|---|---|---|
| IC-ECOS-MAN-2026 | Onboarding & Operations Manual (role-filtered) | Issued |
| IC-ECOS-LEG-01 | Privacy Notice | Draft — pending attorney review |
| IC-ECOS-LEG-02 | Data Processing & Residency Disclosure | Draft — pending attorney review |
| IC-ECOS-LEG-03 | Product Capability & Limitations Statement | Draft — pending attorney review |
| IC-ECOS-LEG-04 | Terms of Use | Drafting pack |
| IC-ECOS-LEG-05 | Subscriber Tenancy Agreement | Drafting pack |
| IC-ECOS-LEG-06 | Licence Agreement | Drafting pack |
| IC-ECOS-LEG-07 | Disclaimers, Indemnities & Limitation of Liability | Drafting pack |
| IC-ECOS-LEG-08 | Pricing & Accounts Terms | Drafting pack |

### Why the set splits in two

**LEG-01 to LEG-03 describe what the system does.** This repository is the
authority on that, so they are drafted here — and still marked draft,
because describing a system accurately is not the same as discharging a
statutory duty. POPIA §18 prescribes what a notification must contain,
§20–21 govern the operator relationship and §72 the transfer out of the
Republic; whether these say enough, to the right person, at the right
time, is counsel's call.

**LEG-04 to LEG-08 allocate risk.** They are not drafted here at all. Each
is a *drafting pack*: the instrument's purpose and scope, the commercial
decisions only the company can make, the questions for counsel, and the
three schedules — what the product does, what must never be claimed, what
remains open. No operative clauses, and `legal.test.ts` fails if one
appears.

### What the schedules are generated from

`src/modules/legal/facts.ts` holds the table above this line in
machine-readable form. Every entry names the source file that makes it
true and the test that fails if it stops being true, and `legal.test.ts`
asserts that every file and every test named actually exists — a schedule
citing a deleted test is worse than no schedule, because it looks
verified. That guard has already caught three stale citations in its own
first run.

### The letterhead

`src/modules/manual/letterhead.ts`. The uploaded design asset was a
transcript describing a corporate identity system, not the system itself —
the design canvas and the exported Word files were not in it, and the only
SVGs were the chat client's own interface icons. So the design *language*
is implemented (burgundy → gold → navy bar, logo top-left, contact block
top-right, services line in the footer, Poppins named for Word) and the
**logo itself is deliberately absent**: `LOGO_SLOT` sets the company name
where the mark belongs. Supply the artwork and it drops into one place.

### Open, and deliberately so

- No logo artwork, as above.
- Poppins is named for Word and approximated by Helvetica in the PDF.
  Embedding it means shipping a licensed font binary — a licensing
  decision, not a formatting one.
- SOP-02 … SOP-12 are listed in the manual's appendix as not yet issued.


---

## SOP-02, and what writing it found (session 27)

SOP-02 documents the administrator's first hour: record the municipality,
get people signed in, give each of them a role and a patch of ground, take
access away again when someone leaves.

Writing it against the code — the discipline this whole module runs on —
found that the path it documents did not work end to end. Three defects,
all on that path, all fixed before the SOP was written:

1. **The capability resolver stamped an empty token for every role.**
   `functions/src/resolveCapabilities.ts` held a placeholder role lookup
   returning `defaultCaps: []`, so a person's effective capabilities were
   their per-user overrides and nothing else. Assigning someone the Ward
   Lead role would have produced an account that signs in and sees an
   empty application, with no error anywhere to explain it. The role table
   is now generated into the functions package by `npm run gen:roles` and
   guarded by `src/auth/roleMirror.test.ts`.
2. **"Awaiting access" told a person to ask for access without telling
   them what to send.** A staff record is keyed by Firebase Auth UID and
   there is no way to resolve one from an email address without the Admin
   SDK. The screen now shows the sign-in ID.
3. **There was no way to add a person at all.** The Permissions page
   managed already-provisioned staff only. It now creates records too —
   not sign-in accounts, which would mean this product holding someone
   else's password, but the record that turns an account into a team
   member.

New in `src/modules/settings/staffProvisioning.ts`: the two refusals that
prevent the same silent failure from the other direction — a ward or VD
role saved with no scope (denied every record by `inScope()`), and a scope
set on a role that has none (recorded and never applied).

### One claim SOP-02 had to correct about itself

The first draft said the default roles keep apart the person who answers a
donor's data request and the person who sets disclosure thresholds. The
guard written alongside it failed: `party-hq-admin` holds both. The
settled rule in `roleModel.test.ts` is a three-way one — no role may
*record* donations, *set* thresholds and *answer* the donor's data request
— plus two specific exclusions (the Compliance Officer cannot set
thresholds; the Finance Officer cannot answer data requests). The SOP now
states that rule, and the guard asserts it.

### Noted, not fixed

`inScope()` narrows a VD-scoped user on `vdCode` alone. `VotingDistrict`
identity is the `(wardCode, vdCode)` pair precisely because a voting
station's roll can be split across wards — about 19% of NW405's are. A VD
user whose district is split may therefore be in scope for the other
ward's portion. Changing `inScope()` is a security-rules change with wide
blast radius and is not something to fold into an SOP commit. Recorded
here so it is not found twice.

---

## SOP-03, and the defect it had no way to describe (session 27)

SOP-03 covers seeding wards and voting districts — the foundation every
scope, coverage percentage and seat projection is computed over.

Its failure mode is why it needed code before it could be written
honestly: **a seed that stops one ward short raises no error anywhere.**
The ward list renders, the schematic map draws, coverage computes, and the
seat projection comes out confidently wrong. Nothing in the application was
asking whether the loaded wards matched the demarcation notice the operator
had already typed into Municipality Config.

`src/modules/wards/seedReconciliation.ts` asks it. Blocking findings are
contradictions between two numbers the tenant already holds — ward count
against expected ward count, ward seats plus PR seats against the council
total, a duplicated ward code, a ward carrying another municipality's code,
the same voting district twice inside one ward. Warnings are shapes that
usually mean unfinished: a ward with no voting districts, or none with
registered voters. It is surfaced on the Wards page, with the loaded count
shown against the expected one.

### What the check refuses to claim

`RECONCILIATION_BASIS` is quoted verbatim in the SOP: the comparison is
between two things the same tenant holds, so agreement means they are
consistent, **not that either is correct**. Only the Board's delimitation
notice can establish that, and a person has to read it. A test asserts the
module claims no verification against any external source — the same
discipline applied to the PPFA module and the PR list export.

### The split voting district, counted rather than quoted

About a quarter of NW405's voting stations are split across a ward
boundary, which is why `VotingDistrict.id` is the `(wardCode, vdCode)`
pair. SOP-03 states the figure — 26 of 108 station codes — and
`manual.test.ts` counts it from `seed-data/jb-marks-nw405-wards-vds.json`
rather than accepting the prose. The reconciliation deliberately does not
flag a code repeated across wards, and a test injects the opposite
behaviour to prove it would be caught: a check that flagged this would
flag a quarter of every real seed.

### Audience

`wards.view` is held by exactly two roles — Party HQ Admin and Municipal
Team Lead — and `wards.edit` by one. SOP-03 goes to both and says so: the
team lead is usually who notices the ward data is wrong, and the fix goes
through the HQ admin. A test asserts the SOP's audience equals the set of
roles that hold `wards.view`, so a role gaining that capability without
the SOP being reconsidered fails the build.

---

## SOP-04, and two defects on the import path (session 27)

SOP-04 covers importing an existing membership register — the first time
onboarding writes *people* rather than reference data, and therefore the
first time it can import a consent problem.

Two things had to change before it could be written truthfully.

**The import had no screen.** `bulkImport.ts` was a tested pure module
with no page anywhere in the application. `BulkImportPage.tsx` is that
page: consent declaration, file, plan, commit — and it writes households
before the voters that reference them, because a voter whose household
does not exist is a dangling reference nothing in this product reports.

**The planner put an entire register at one address.** `PlanOptions` took
a single `vdCode`, `wardCode` and `householdId` for the whole file. That
is fine for one street and wrong for a membership register — the case the
module's own header names. Rows now carry their own voting district, ward
and address, and the planner refuses rather than guesses:

- a voting district not loaded for this tenant is refused by code;
- a **split** voting district with no ward is refused, because a station's
  roll divided across a ward boundary does not say which ward a person is
  in, and ward is what every permission and coverage figure turns on;
- an absent address stays absent — the person goes into a per-district
  holding record whose address line says so. No street is invented,
  because a fabricated address is a canvasser sent to a door that is not
  there.

### A third defect, found while wiring the page

The duplicate check against people already on the roll could never have
matched. A stored voter has no plaintext number — `phoneMasked` keeps
three digits at each end — so keying the roll on a raw number and the
import row on its raw number compares two different things, and an entire
re-import would have reported as new people. `existingVoterKey()` masks
both sides. The cost is stated in its header and in the SOP: two numbers
sharing their visible digits key the same, so the check errs towards
holding a name back, which is recoverable, rather than duplicating a
person on the roll, which is not.

### Audience: exactly one role, and that is the finding

An import needs two permissions at once — `voters.edit` to write the
records, and `wards.view` to read the table it places them into. The
intersection is **`municipal-team-lead` alone**. The Party HQ Admin is
deliberately kept off the voter roll; a Ward Lead, VD Captain or Canvasser
can edit voters in their own ground but does not hold the municipality-wide
reference table. A test asserts the SOP's audience equals that
intersection.

### Noted, not fixed

`wards.view` is held by no field role, yet field flows read voting
districts — `VoterForm.tsx` resolves a household's ward from a VD code via
`findByVdCode`, which `firestore.rules` gates on `wards.view`. A ward lead
or canvasser would be denied. Ward and voting-district records are
reference data carrying no personal information, so the likely fix is to
grant `wards.view` to the field roles — but that changes the token for
four roles and touches `roleModel.test.ts` and `geoScope.test.ts`, which is
not something to fold into an SOP commit. Recorded here so it is not found
twice.

---

## SOP-05, and the queue that had no screen (session 27)

SOP-05 is the supervisor's counterpart to SOP-01: how to send a round out,
which doors the platform offers next and why, and what the coverage figure
counts.

**The whole canvassing queue was unreachable.** `canvassQueue.ts` was
complete and tested — six door states, two cool-offs, a deliberately
terminal refusal, a coverage definition that excludes refusals from the
denominator — and not one line of it was referenced from any component.
`Household.contactStatus` was written by no code path at all.

The consequences, none of which raised an error anywhere: every door read
as never contacted for ever, so the queue offered all of them on every
round; coverage was permanently zero; and a household asking not to be
contacted again could not be recorded, which is the one thing in that
module POPIA's objection right actually turns on.

It also means **SOP-01 was overclaiming**. It has told canvassers since it
was written that "every door ends in one of six states, and the state you
leave decides whether the next round offers it to someone again." Until
`RoundPage.tsx`, a door ended in one state and the next round offered it
regardless.

### What was built

`RoundPage.tsx` — queue summary, coverage, every door by state, the next
twenty-five doors with their access notes, and the four outcomes a
canvasser records. Transitions go through `canTransition()`, so the
refusal the module makes terminal stays terminal at the screen too.

`HouseholdRepository.listByWard()` — so a ward lead can read their own
ward's doors. Deliberately *not* a fix to the `wards.view` gap noted under
SOP-04: a ward lead reads households under `voters.view` with the
geographic narrowing the rules already apply, and the voting-district
codes come off those records rather than out of the reference table. A
VD-scoped caller gets their own district back, because
`geoScopeConstraints` narrows them further — the behaviour wanted, not a
limitation.

Reached from Voters rather than the primary nav: §3.2 specifies nine nav
items and `nav.test.ts` holds the build to them.

### A guard that was testing itself

The first version of the "lists the outcomes a canvasser can record" test
built its expectation from `CONTACT_STATUS_LABEL` — the same map the SOP
builds its list from. Deleting a label shortened both sides equally and
the test passed while the printed procedure silently lost a step. Found by
injection rather than by review. The outcomes are now named explicitly,
and a second test asserts the map still covers every state the queue can
be in.

---

## SOP-06, and two defects in the incident path (session 27)

SOP-06 is shared by four roles and is the only procedure whose output
leaves the campaign: a referral is a document addressed to a municipality,
carrying the party's name.

**A canvasser held a permission with nowhere to use it.** `incidents.create`
is a Canvasser default; `incidents.view` is not. That is the capability
model working — a canvasser reports what they see and is not given a
window onto every complaint in the district — but the Incidents nav item
is gated on `incidents.view`, so the only route to the incident form was
one they could not reach. `ReportIncidentPage.tsx` is a create-only route
linked from the round, and it says plainly what happens next, because a
canvasser who submits a report and then cannot find it has no way to tell
that from a report that went nowhere.

**Two of the six statuses could never be reached.** RESOLVED and CLOSED
were in `IncidentStatus`, in `STATUS_LABEL` and in `STATUS_ORDER` — so the
Incidents page rendered a tab for each — and no capability, repository
method or security rule could put an incident into either. An incident
referred to a municipality stayed referred for ever, which means a war
room's count of open incidents only ever goes up and the last two tabs are
permanently empty.

### The lifecycle now has one owner

`src/modules/incidents/incidentWorkflow.ts` says which move is legal and
who may make it. `resolve()` and `close()` exist on the port and the
adapter, and `firestore.rules` gained the two clauses to match.

- **Resolving** takes `incidents.triage`, from triaged onwards — a
  municipality sometimes fixes a thing before a referral is ever issued,
  and whoever triages is close enough to the ground to know.
- **Closing** takes `incidents.escalate`. It ends the record, so it sits
  with the authority that authorises escalation and referral.
- **CLOSED is terminal and is still not a deletion.** `delete: if false`
  holds on this collection like every other, and a test asserts it.

`incidentWorkflow.test.ts` reads `firestore.rules` from disk and checks
the model against it. A transition allowed in one and refused by the other
is a button that fails at the moment somebody presses it in a street, and
that is the class of defect the mirror exists to catch.

### Guards proven by injection

The rules dropping the resolve clause while the model kept it; closing
downgraded to the triage capability; SOP-06 rewritten to claim the
platform submits the referral automatically; and RESOLVED made unreachable
again.

---

## SOP-07, and a promise the document could not keep (session 27)

SOP-07 covers issuing a service delivery referral — the only procedure in
the manual whose output is read by somebody the campaign does not control.

The referral module was already complete and well guarded: the document,
the non-removable disclaimer, the deterministic PDF, the content hash, the
three ordered writes, the signatory read from a real staff record. Writing
the SOP found the one thing missing, and it was a claim rather than a
feature.

**Every referral prints an integrity hash and a sentence about it:** that
it "verifies that the particulars above match the record held in Election
Campaign OS". Nothing could perform that check.
`verifyReferralContentHash()` existed and needed a `ReferralDocument`, and
a `ReferralDocument` could not be rebuilt from anything stored — the
issuing organisation, the addressee, the covering note and the timestamps
went into the PDF and into the hash and nowhere else.

So the document asserted its own verifiability and the product could not
deliver it. That is the same defect as the fork's "SHA-256 Verified" badge
over nothing, made quietly rather than loudly, and worse here because this
hash is real: a campaign challenged on what it sent could produce a number
and no way to stand behind it.

### What changed

`CampaignDocument.canonicalPayload` stores the exact serialization the
hash was taken over. `issueReferral()` writes it.
`referral/verifyReferral.ts` recomputes it and reports one of four
outcomes — matches, differs, nothing issued, or issued before the
particulars were stored and therefore not checkable. The last one matters:
it says so, and says re-issuing is not a fix, because re-issuing would
produce a second authorised copy of the same referral.

The check is on the incident card, behind "Check against the record".

### What a passing check is careful not to claim

That the record has not been altered since issue. Not that the
photographs are attested, not that it is a signature, and not that the
referral was ever delivered — the platform sends nothing and notifies
nobody, by design. A test scans the operator-facing messages for the
vocabulary this project has already rejected once: blockchain, certified,
notarised, legally binding.

### A guard that did not guard

The first injection — removing `canonicalPayload` from the registry write
— passed every test. `issueReferral.test.ts` did not assert the
particulars were stored, and `verifyReferral.test.ts` built its own
registry entry rather than going through the issuing path, so neither saw
it. The end-to-end property is now asserted where it belongs: what issuing
stores must hash to what issuing records.