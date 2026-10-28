# ECOS data extracted from the 28 October business asset batch

Seventeen files uploaded 28 October 2026. This records what is
ECOS-specific and usable, what conflicts with the build, and what must
not be carried forward.

Written at **T−7** (election day 4 November 2026). The 20-week plan's
production code freeze window is 28–31 October — it opened today.

Provenance marks follow the uploaded accounting spec's own convention:
**[E]** established by a primary source or by a check run here ·
**[P]** proposed in a source document · **[U]** unverified.

---

## 0. What was in the batch

| File | Status |
|---|---|
`ic-accounting-agent-spec.md` (×2) | Byte-identical duplicates of each other |
`ic-chart-of-accounts-vat-config.json` | IC group accounting, not ECOS product |
`nw-province-candidate-list-2026.xlsx` | **Real IEC data, 9,731 records — see §1** |
`ecos-financial-model-2026.xlsx` | **Live workbook, 9 sheets — see §3** |
7 × `ecos-*.docx` | Business/technical documents — see §2, §4 |
`package_security.json`, `pipeline.yml`, `0001_security_baseline.sql`, `modsecurity-crs-custom.conf`, `security-gate.py` | **Byte-identical re-uploads** of the 26 Oct files. Verified with `cmp`. The review of 26 Oct stands unchanged; not re-reviewed |

---

## 1. BLOCKING — the 2026 ward counts do not reconcile

**This must be settled before the voters roll is loaded.** A roll keyed
to the wrong ward set joins silently and wrongly; it does not error.

`nw-province-candidate-list-2026.xlsx` is the official IEC LGE 2026
Final Candidate List (Combined), published 16 September 2026: 9,731
records, 22 North West municipalities, 82 parties. Its municipality
codes and names match `src/data/iec/circular-1-2025-annexure-a.json`
**exactly**, all 22, including the `Mafikeng` spelling.

Its **ward counts do not.** 14 of the 18 local municipalities disagree
with the proclaimed baseline, in both directions:

| | baseline wards | candidate list | |
|---|---|---|---|
| NW392 Naledi | 9 | **16** | more wards contested than exist |
| NW396 Lekwa-Teemane | 7 | **11** | more wards contested than exist |
| NW373 Rustenburg | 45 | 36 | |
| NW405 JB Marks | 34 | 32 | our seed municipality |
| …10 others | | | |

The two rows at the top cannot be a sampling artefact — you cannot
contest more wards than exist. And the raw rows rule out partial
coverage: **[E]** every municipality's `ward_or_list_order` values for
`candidate_type = WARD` form a contiguous run `1..N` with no gaps
(checked for NW392, NW396, NW405, NW373, DC40). These are complete ward
sets as that source sees them, not subsets.

### What settles it

**[E]** Municipal Structures Act Schedule 1 fixes ward seats at half the
councillors, rounded up. Tested against the councillor counts in the
proclamation:

```
proclaimed Annexure A satisfies ceil(councillors/2):  18/18
candidate-list ward counts satisfy it:                 4/18
```

The proclaimed baseline is coherent with the statute for every North
West local. The candidate list's ward counts are not. **The baseline
stands and remains the authority for seat calculation.** Nothing here
impugns the proclamation.

### The note that must not be actioned

The candidate list's Summary sheet carries this:

> "JB Marks (NW405) shows 32 contested wards in this 2026 list, not the
> 34 used in prior project materials (sourced from the 2021 election
> result). This is a real discrepancy — flagged for correction in
> B1/B2/B3, not yet actioned there."

**The provenance in that note is wrong.** 34 is what the proclaimed 2026
Annexure A says for NW405 — extracted here behind a SHA-256 gate with
five per-row relations and a whole-table roll identity verified. It is
not a 2021 figure. Acting on that note would replace verified
proclaimed data with a figure that fails the statutory ward-seat test.

**[U]** What the candidate list's ward numbering actually enumerates is
unresolved. Possibilities: a different numbering basis, a
post-proclamation amendment, or a derivation fault in the sheet. This
needs the IEC's own answer, not a guess.

### Also in that file

9,731 real people's names with partially masked ID numbers
(`820826****08*`). The mask leaves **date of birth fully readable** and
one citizenship-sequence digit. Candidate lists are published documents,
so processing is lawful, but these are DOB-bearing personal records and
belong under the same handling as voter data — not in the accounting
system, per that spec's own §3 rule.

---

## 2. Two architectures are described, and only one matches the build

| Source | Datastore it describes |
|---|---|
`ecos-technical-infrastructure-whitepaper-2026.docx`, log entry **2026-08 (early)** | "Superseded: primary datastore moved from PostgreSQL/RLS to **Firebase/Firestore (africa-south1)**, with Cloud SQL deferred until the first paying subscriber" |
`ecos-two-version-build-plan-2026.docx` (4 Sep) | Treats **AWS RDS PostgreSQL af-south-1** as the live production system, to be relocated to GCP Cloud SQL; "the 2026 live pilot stays exactly where it already is — AWS af-south-1, unchanged" |
`ecos-membership-capture-2026.docx` | Postgres DDL, `ENABLE ROW LEVEL SECURITY`, `rls-tenancy-migrations.sql` conventions |
**This repository** | React 18 + Vite + **Firebase Auth/Firestore/Storage**, Cloud Functions pinned `africa-south1`, Dexie offline cache, capability RBAC in `firestore.rules`. No AWS anything |

**[E]** The whitepaper's own August entry agrees with this repository.
The two-version plan's premise — a live AWS Postgres production system —
does not correspond to any build in this repo. Those two documents
contradict each other about where production runs, and the whitepaper is
the one that matches reality.

Consequence for the uploaded security package: it targets
MySQL + Prisma + Hono. That is a third stack, matching neither the
whitepaper nor the two-version plan nor this repo. Its own SQL file
raises this as an open question; this is the answer — **it is not EC OS's
stack.**

### The go-live date has passed

`ecos-compressed-golive-plan-2026.docx` sets a hard schedule:

- 2 Oct — soft-launch go/no-go, 1–2 real Independent accounts
- **16 Oct — wider go-live**, Independent tier only
- 16 Oct–4 Nov — live operation, same-working-day support

**[E]** Today is 28 October. This build has never been deployed; it waits
on two values only the account holder can supply (#4, #5), the
`africa-south1` confirmation (#6) and the domain connection (#16). The
wider go-live date passed 12 days ago. The plan states it has "no buffer
beyond what's shown."

The plan also names, in its own words, a risk it accepted: "There is no
time for an external security penetration test before go-live… a
deliberate, named exception."

---

## 3. The financial model — three defects, verified

`ecos-financial-model-2026.xlsx`, ref IC-ECOS-COMM-2026-V2 / B3, v2.0,
30 August 2026. Nine sheets, genuinely formula-driven back to a single
Assumptions sheet. Construction is sound; three figures are not.

### 3.1 PSP fees are understated 40% **[E]**

`Infra & Payment Costs!C20` blends the fee as
`0.35 × 2.0% + 0.25 × 3.2% = 1.50%`. Those weights are **absolute shares
of total revenue**, so 1.50% already applies to total revenue. The model
then multiplies by the 60% paid-channel share *again*:

| | bear | base | bull |
|---|---|---|---|
| model computes | R2,124 | **R7,515** | R20,894 |
| correct | R3,540 | **R12,525** | R34,824 |

The rate that would be right to apply to the 60% paid share is **2.50%**,
not 1.50%. Fix either by applying 1.50% to gross revenue or 2.50% to the
paid-channel share.

Knock-on: `ecos-financial-market-positioning-2026.docx` §6 says PSP cost
is "roughly R7,500 … under 1%". Corrected, it is R12,525 = **1.50%**.
The conclusion ("not a material risk at pilot scale") survives; the
figure and the percentage do not.

### 3.2 Ten Assumptions cells feed no formula **[E]**

The workbook's stated construction rule is that no calculation sheet
hardcodes a value. The converse is unchecked. Unreferenced anywhere:

- `C35` PayFast Instant EFT **minimum fee R2**
- `C37` PayFast Card **fixed fee R2/txn**
- `C8` founder rate R350/hr · `C33` · `C38` manual EFT · `C39` voucher
- `C40`/`C41` WhatsApp per-message USD rates

The two per-transaction fees matter most: at R2,900 for an Independent
ticket the fixed R2 is trivial, but the model claims to cost the payment
channel and does not cost it fully.

### 3.3 The December cash-dip claim is the wrong line **[E]**

Market Positioning §7 says "Cumulative cash position dips slightly
negative in December before recovering in January." It does not:

```
Nov 26  monthly R 118,877.00   cumulative R 594,385.00
Dec 26  monthly R  -1,294.16   cumulative R 593,090.84   <- monthly negative
Jan 27  monthly R  33,205.84   cumulative R 626,296.68
```

The **monthly net flow** goes negative (−R1,294.16). The cumulative
position never does — minimum R89,158, and above R593,000 from November
on. The underlying point (hold a buffer through Nov–Dec, because AM
payroll lands before casework MRR ramps) is right; the stated figure
isn't.

### 3.4 Verified correct

- Independent tier margin **−27.7%**, disclosed by the workbook itself
  as an unresolved founder decision, not hidden
- Bear-case Independent exposure: R803.65/unit × 20 = **R16,073** ✓
- Casework bear case **−R15,005.76/month** (6 wards @ R2,500 against one
  R30,000 AM salary) ✓ — the 1:120 step function quantified
- Payment mix sums to 100% ✓
- Cash-flow dates are real serial values, not text ✓ (r6 = 46235 ≈ 1 Aug 2026)
- Break-even sheet r8 returns **−5 wards** — arithmetically "already
  profitable", but presented as a ward count. Needs `MAX(0, …)`

---

## 4. ECOS-specific data worth carrying into the application

Extracted from the uploaded documents. **[P]** throughout — these are
the source documents' proposals, not verified commitments.

### 4.1 Pricing (Market Positioning §3–§4, = B3 Sheet 3)

| Tier | Price | Margin |
|---|---|---|
| Independent, 1 ward, shared tenant | R2,900 / cycle | −28% |
| Party base: platform + 2 wards | R12,000 / cycle | 69% |
| Additional ward, à la carte | R1,800 / ward | 99.8% |
| Municipal bundle, to 30 wards | R45,000 / cycle | 91.5% |
| Casework, post-election | R2,500 / ward / month | 90.0% |

Add-ons: Ward Sentiment R3,500/ward/cycle (English only at launch) ·
Incident Pro R6,000/party/cycle · PPFA module R3,500/party/cycle ·
Campaign Diary & IEC Timetable Sync **bundled R0**, party tiers only.
Membership Capture R8.00/verified member (provisional, cost ≈R0.29).

### 4.2 Account numbering (Payments & Accounts SOP §3.1)

```
ECOS-{province}-{MDB municipality code}-{tenant type}-{5-digit sequence}
ECOS-NW-405-P-00001
```

Tenant type: `I` Independent · `P` Party base · `M` Municipal bundle ·
`C` casework-only. A campaign account converting to casework **keeps its
number and appends `–CW`**. Sequences are per (municipality, type), in
onboarding order, never reused.

**[E] Implementation constraint the whitepaper gets right:** Firestore
has no concurrency-safe auto-increment. This needs a transaction-guarded
counter document per (municipality, type) key. A client-computed "next
number" collides under concurrent onboarding.

### 4.3 Ledger model (SOP §3.2, whitepaper §2.2)

Collections: `accounts`, `ledger_transactions` (append-only),
`ward_cycle_tokens`, `casework_seats`, `ecos_vouchers`.

- **Ward-Cycle Token** = right to run one ward for one 2026 cycle.
  Issued at purchase, **consumed at ward activation**, not transferable
  between municipalities.
- **Prepaid-first.** Usage gates on positive balance or unconsumed
  token; no credit by default. Stated reason is neutrality, not just
  cash flow — a debt-collection conversation with a party during an
  election is itself the risk.
- Net-30 only for established-party/municipal buyers, only against a
  signed agreement naming the term.
- A lapsed Net-30 **does not revoke live tokens mid-cycle**; it blocks
  further purchases. Casework seats pause on failed charge rather than
  accruing debt.

### 4.4 Payments (SOP §2.1)

PayFast Phase 1, no monthly fee: Instant EFT 2.0% (min R2) · Card 3.2%
+ R2 (carries Google Pay / Apple Pay as checkout buttons — no separate
integration) · Manual EFT founder-verified R0 · WhatsApp Pay Link.

**[E] The build requirement the whitepaper states correctly:** an ITN
webhook receiver that validates the signature against the shared
passphrase before crediting, idempotent on PayFast's payment ID. Never
credit on the client-side redirect — that is spoofable.

ECOS Voucher: ≥12-char alphanumeric from a CSPRNG, **hashed at rest**,
single-use, checked-and-locked atomically at redemption. A bearer
instrument once issued.

### 4.5 Roles — a conflict to resolve

Membership Capture §3.5 names "the canonical six":
`HQ_ADMIN`, `LOCAL_HEAD`, `WARD_LEAD`, `VD_CAPTAIN`, `VOLUNTEER`,
`FINANCE_OFFICER`.

**[E] This repository has seven seed roles and 26 capabilities**,
including Compliance Officer, and authorisation is checked against
`request.auth.token.caps` in `firestore.rules` — not against a role
string. The document's own non-negotiable agrees with the repo's
approach: "no hardcoded role list duplicated per policy." The *count and
names* differ and need reconciling before any SOP is wired in.

### 4.6 Two things the documents get right and are worth keeping

- **No party name may be hardcoded** anywhere a competing tenant could
  share the code path (Membership Capture §3.6). Structural, not
  stylistic.
- **ID numbers encrypted at rest, with a separate one-way hash** used
  for the duplicate-capture fraud check, so the fraud job never
  decrypts anyone's ID number.

---

## 5. Entity and identity discrepancies — for the accounting build

**[E]** These conflict across the batch and all three matter for
invoicing and VAT:

| | |
|---|---|
| Accounting spec + COA config | `Innovation Consult (Pty) Ltd`, Reg. 2007/021390/07 |
| All seven .docx copyright blocks | `Just Be Trading 10 (Pty) Ltd t/a Innovation Consult (Pty) Ltd`, **same** Reg. 2007/021390/07 |
| Policies Part A §A.1 | `Innovation Consult (Pty) Ltd`, Reg. 2007/021390/07 |
| .docx footers | `info@innovationconsult.com` · `www.innovationconsult.com` |
| Accounting spec §5.6 | `finance@innovationconsult.co.za` |
| This build | `electioscos.co.za` (app), `innovationconsult.co.za` (corporate) |

A tax invoice must carry the **registered** legal name. If the
registered entity is Just Be Trading 10 (Pty) Ltd trading as Innovation
Consult, the COA config's `legal_name` and every invoice template are
wrong. **[U]** Confirm against the CIPC record before any invoice is
issued.

`.com` versus `.co.za` is a second, separate correction.

---

## 6. What must not be carried forward

- **The NW405 "correction" from 34 to 32 wards** (§1). Wrong provenance,
  fails the statutory test.
- **The two-version build plan's premise** that production runs on AWS
  Postgres (§2). It does not.
- **PSP cost figures of R7,515 / "under 1%"** (§3.1). Understated 40%.
- **"Cumulative cash dips negative in December"** (§3.3). It is the
  monthly flow.
- **Part A §A.6 liability limitation and Part D §D.4 VAT clause.** The
  document says so itself: attorney review required before publication,
  VAT status unconfirmed. Standing rule here — no binding legal
  instrument gets drafted or relied on from this side.
- **The uploaded security package** as EC OS infrastructure (§2). Wrong
  stack, and the 26 Oct review found the gate blocks every build and the
  pipeline can never go green.

---

## 7. Open items

1. **The ward-count conflict (§1).** Blocking for the voters roll.
   Needs the IEC's answer on what the candidate list's ward numbering
   enumerates.
2. Registered legal name (§5) — CIPC record.
3. Role model reconciliation: six documented versus seven built (§4.5).
4. SMS OTP gateway: not selected. R0.25/msg is a checked market range,
   not a quote.
5. VAT registration status. IC is not registered; ECOS and Legal-OS were
   not incorporated as of 27 Oct.
6. PSP fee arithmetic fix and the ten dead Assumptions cells (§3).
