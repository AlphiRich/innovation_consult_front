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

1. SOP-01 and SOP-02 are issued
   (`src/modules/manual/sops/`).
2. SOP-03 … SOP-12 are written (`PLANNED_SOPS` carries the register).
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