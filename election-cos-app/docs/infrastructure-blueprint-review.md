# Infrastructure blueprint batch — review

Session 19 (12 Sep 2026). Sixteen files, no accompanying instruction.
Reviewed under the standing rule used for every uploaded batch: adopt what
is verifiable and better, reject what is wrong, record why, change nothing
in the build on the strength of an unsourced claim.

**Nothing in this batch changed the architecture.** One thing was adopted
(§5). Everything else is recorded here.

## 1. What was in it

| File | Subject |
|---|---|
| `App_Code_Stack__Infrastructure_Blueprint_S2.pdf` | 3-page stack + hosting + contingency blueprint |
| `Basedonthearchi.docx` | Where documentation subdomains should live |
| `python_data_encryption_schema.txt` | pypdf AES-256 PDF password guardrail for Cloud Run |
| 13 × `qwentable*.csv` | 8 unique tables — 5 are exact duplicates |
| `ProgramBench…pdf` | **Not reviewed** — see §8 |

Duplicate pairs/triples: the Firebase-product table appears twice, the
pilot cost table twice, the document-security table three times. Same
bytes, different filenames.

A separate security review of a Postgres MFA/OTP specification also
arrived as message text. That spec is **not in this repository** — see §6.

## 2. The headline proposal: drop Firestore for Postgres — DECLINED

> **RESOLVED 13 Sep 2026 by the project owner: "Firestore is my final
> decision."** Firestore is the database; there is no Postgres migration.
> The analysis below is kept as written — it is the record of what was
> proposed and what was wrong with how it was argued — but the question is
> closed. See `BUILD-STATUS.md`, "DECISION — Firestore is the database",
> for the decision record, including the two criticisms of Firestore that
> were fair and are now the accepted terms of the choice.


The CSVs argue Cloud Firestore should be **rejected for tenant and
canvassing data** ("No RLS → tenant isolation moves to app code"), with
Cloud SQL Postgres as the only source of truth, Cloud Run for compute, and
Cloudflare in front.

This is a real architectural decision and **not one this session can
make.** Recording the position rather than acting on it:

- The DAL exists for exactly this. `src/dal/ports/*` is adapter-agnostic,
  `src/dal/adapters/postgres/` is deliberately empty pending Phase 8, and
  the ESLint boundary already prevents Firebase imports leaking outside
  `src/dal/adapters/firestore/**`. Module code would not change.
  *(Superseded: that directory is now permanently empty and Phase 8 is
  closed. The seam stays for its other three reasons — see the decision
  record.)*
- What *would* change and is not free: `firestore.rules` is currently a
  real enforcement layer (three-layer isolation — custom claims → rules →
  DAL). Moving to Postgres RLS replaces one of those layers with a
  different one; it does not automatically preserve the other two.
- The premise "no RLS → isolation moves to app code" is **not accurate as
  stated** for this repository. Firestore Security Rules are enforced
  server-side by Google, not in app code. They are a weaker and clumsier
  tool than Postgres RLS — no joins, no transactional policy evaluation —
  but they are not client-side. The honest version of the argument is
  "Firestore's isolation primitives are weaker and harder to audit than
  RLS," which is defensible. The version in the CSV is not.

This was the sixth unresolved architecture conflict carried for a human
decision, alongside the five logged in `BUILD-STATUS.md` (where the V2
metering engine runs; Firestore-vs-Postgres in the V2 bundle; 6-vs-7
roles; 25-vs-45 capabilities; uuid-vs-VARCHAR(36) in RLS). It overlapped
the second, and both were closed together by the decision above. The role
model was then resolved on 13 Sep (seven roles, Compliance Officer stays —
see `BUILD-STATUS.md`), and the RLS key type went moot with the Postgres
migration it belonged to. **One remains open:** the 25-vs-45 capability
catalogue.

## 3. Verified errors in the blueprint PDF

**The region is wrong, and it is the kind of wrong that breaches POPIA.**
Section IV names "the primary GCP region (e.g., Johannesburg
europe-west8)". `europe-west8` is **Milan, Italy**. Johannesburg is
`africa-south1`. Acted on literally, this puts South African personal
information in the EU — the exact thing POPIA §72 restricts and the thing
`IC-ECOS-BUILD-2026-V2` §0 rule 1 pins the whole build against.

*This repository is clean on this.* `functions/src/region.ts` pins every
Cloud Function, `firebase.json` carries the note, and a grep for
`europe-west` across the tree returns nothing.

**The blueprint and the CSVs disagree about Firestore.** The blueprint
keeps it for "real-time war room activity feeds, notification states, and
mobile app offline-sync". The CSV rejects it "for tenant/canvassing
data". Those overlap: canvasser offline-sync *is* tenant data. The two
documents cannot both be followed.

**The proposed stack is not the stack that exists.** Next.js + SSR,
Flutter or React Native, Node/Express + Python. This build is a React 18 +
Vite PWA with Cloud Functions. SSR is also a poor fit for the actual
requirement — §7 of the build spec is offline-first field use, which wants
a service worker and a local store, not server rendering.

**"Firebase Storage / Functions — NOT NEEDED; Cloud Storage and Cloud Run
already cover both"** conflates two access paths to one product. Firebase
Storage *is* Google Cloud Storage — the same bucket, reached through a
client SDK governed by Security Rules instead of through IAM and signed
URLs. The choice is real but it is not the choice the table describes, and
it bears directly on `src/dal/adapters/firestore/fileStoreRepository.ts`
and `storage.rules` built last session.

Sound in the blueprint, for the record: Cloudflare in front for WAF and
DDoS, Cloud SQL HA with automatic failover, PITR, and WORM backups to
archive storage are all sensible and none are contentious.

## 4. Verified errors in the cost tables

The Firebase pricing table is being used to conclude Firestore is
"Prohibitively Expensive". Its Firestore row is broadly right. Its Cloud
Functions row is badly wrong, in a way worth naming precisely:

| Claim | Actual | Note |
|---|---|---|
| Compute `$0.40 / GB-sec` | `$0.00001667` per GB-second | Overstates by ~24,000× |
| "Invocations after 2M are free" | The **first** 2M are free; beyond that you pay | Exact inversion |
| Free tier `125,000 GB-sec` | 400,000 GB-sec | Understates by 3.2× |
| Free tier `800k CPU-sec` | 200,000 CPU-sec | Overstates by 4× |

The `$0.40` figure is real — it is the price per *million invocations*,
placed in the compute row with the compute unit. Two of these four errors
push the same way (Firebase looks costlier), which is the direction the
table's conclusion needs.

**The scenario comparison does not reconcile with its own traffic
table.** Egress in Scenario A is `$36.00`, which at `$0.12/GB` is 300 GB —
the manifesto line only. The same batch's traffic typology puts canvassing
maps at **2.2 TB/month**, another ~$264 unaccounted. Either maps are
assumed to be on Cloudflare in both scenarios (in which case Scenario A is
not "Pure Firebase"), or the largest single line was dropped. The
arithmetic that *is* shown adds up ($100.44 + $36.00 = $136.44); the
inputs do not.

**The traffic projections are unsourced.** 2.2 TB of map tiles implies
~146,000 downloads/month; 504 GB of photos implies ~126,000 uploads. No
user count, ward count, or canvasser count is given anywhere in the batch
to support either. They may be right. Nothing here shows it, and they are
load-bearing for the whole cost argument.

**The CSVs are structurally malformed.** Several rows put two values in
one field separated by a pipe, so column alignment is lost — the
"Scenario A / Scenario B" table cannot be parsed as a table without
guessing.

## 5. The MFA/OTP security review — and the one thing adopted

The security review that arrived as message text is a careful, largely
correct critique of a Postgres MFA specification: missing `salt` column,
`failed_attempts` incremented on a local object, `gen_random_text_uuid()`
which does not exist, a phone number stored as a hash that the same code
then tries to send an SMS to. Those findings look right.

**None of them are in this repository.** There is no MFA, no OTP, no
`auth.*` schema, no Postgres. The spec being reviewed is one of the V2
migration artefacts that live outside this codebase. There is nothing here
to fix, and this session did not invent something to fix.

What was done instead — the same audit pattern used for every fork batch —
is to check whether each defect *class* applies to what is here:

| Defect class | This repo |
|---|---|
| Phone stored as a hash, then SMSed | **Sound.** `Voter.phoneEncrypted` is AES-256 (reversible) with `phoneMasked` for display. We never hashed a phone number. |
| Credential material cached long-term client-side | **Sound.** The Dexie schema holds voters, households, incidents, diary, photo queue, outbox, conflicts. No token, no caps, no session. |
| Wrong region / residency | **Sound.** §3 above. |
| Tenant id missing from a table that claims tenant isolation | **Sound.** Every collection is under `tenants/{tid}/`, enforced by `tenantOK(tid)` in rules. |
| Stolen bearer token valid until expiry | **Applies, by design.** Capabilities ride in Firebase custom claims on a ~1h ID token. A revoked capability is live until the token refreshes. Worth a human decision if elevated actions (PPFA export, referral issue, ID unmask) should re-check server-side; not changed unilaterally here. |

**Adopted: finding 5, which lands on code written last session.**

The review's point that SHA-256 is built for speed and therefore useless
for committing to a low-entropy secret is correct, and `src/lib/hash.ts` —
added last session as the product's single hash function — is exactly
where that mistake would be made. `sha256Hex(canonicalPayload(doc))` and
`sha256Hex(otpCode)` are indistinguishable at a glance and only one is
sound.

So `hash.ts` now carries the distinction explicitly, and
`hash.test.ts` enforces it: a source scan over `src/` that fails if either
hash entry point is ever handed something named like an OTP, PIN,
passcode, password, secret, credential or key, plus a second scan that
fails if a password-hashing KDF is introduced without this note being
revisited.

The guard was proved against four injected cases rather than assumed:
`sha256Hex(otpCode)` fires, `sha256Hex(user.password)` fires, a `bcrypt`
import fires, and `sha256Hex(mapping)` correctly does **not** (the string
"pin" inside "mapping" must not trip it). The first draft of that regex
had a trailing `\b` and caught none of them — `otp` and `C` have no word
boundary between them — so it passed its own proof by doing nothing. The
asymmetric boundaries are commented in place for that reason.

Also corrected while writing those tests: a SHA-256 vector for `"é"` that
this session wrote from memory and got wrong. The implementation was
right; the expectation was invented. Vectors are now computed, and the
line says so.

## 6. The PDF encryption script — not adopted

`python_data_encryption_schema.txt` password-protects generated PDFs with
pypdf AES-256 inside Cloud Run. Not adopted, for reasons that are about
this product rather than about the script:

- **The user password is the client's account number.** An account number
  appears on every invoice and in every email that references it. It is an
  identifier, not a secret, and it is low-entropy — the same class of
  mistake §5 is about.
- **It presumes a server-side render pipeline** (Jinja/WeasyPrint on Cloud
  Run). This build's referral PDF is generated on the device, with no
  dependency, specifically so a Municipal Lead can produce one offline.
  Routing it through Cloud Run would give that up.
- **It would break the integrity hash.** Encryption is keyed and
  non-deterministic; a document's hash has to be reproducible from the
  stored record months later.
- `datetime.now().isoformat()` is not a valid PDF date — the format is
  `D:YYYYMMDDHHmmSS`. Readers will show the field as malformed or ignore
  it.

The underlying concern — that an issued referral should not be readable by
anyone who obtains the file — is legitimate and is already answered a
different way: `storage.rules` restricts reads to `incidents.view` within
the tenant, refuses overwrite and delete outright, and objects are served
through time-limited URLs. That is access control at the store rather than
a password travelling alongside the document it protects.

## 7. The document-placement docx

Its statutory citations check out: POPIA §14 (retention), §19 (security
measures), §72 (transfers outside the Republic) are correctly identified,
and its core argument — legal/public documentation on static hosting,
billing and CRM behind an authenticated origin — is sound.

Its own summary table then contradicts it. The table places **Financial
Records** on "Firebase Hosting or Cloudflare Pages … no backend compute"
with "restricted read access", four paragraphs after the prose says never
to host billing material on a static host because static hosts cannot
enforce row-level security. It also lists the database at a public
subdomain `db.innovationconsult.co.za` as "Firestore or DynamoDB" — an AWS
product in an otherwise all-GCP stack — while the same cell says "no
direct public access".

Treat the prose as the position and the table as unreviewed generated
filler.

## 8. Not reviewed

`ProgramBench__Can_Language_Models_Rebuild_Programs_From_Scrat….pdf` was
never read. The upload directory was cleared before it could be opened and
no content from it reached this session. It is not assessed here in either
direction — re-upload it if it matters.
