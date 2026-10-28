# Asset control sheet

The register for assets uploaded from other Claude conversations.
Identity is established by **SHA-256**, not by filename — several files
arrived under different names with identical content, and two arrived
under the same name with different content.

**Opened 28 October 2026 · T−7** (election day 4 November).
**184 files received · 128 distinct · 56 redundant copies (30%)**, across
seventeen batches. Running totals are in §7.3.

Rows marked **[read]** have had their contents reviewed. Rows marked
**[hash only]** are registered and deduplicated but not yet read — stated
so that this sheet is never mistaken for a review.

Disposition codes:

| | |
|---|---|
| **KEEP** | authoritative; in use or ready to use |
| **SUPERSEDED** | a newer version of the same asset exists |
| **DUP** | byte-identical copy of another row |
| **RECONCILE** | conflicts with the build or another asset — needs a decision |
| **REFERENCE** | useful context, not a build input |
| **DEFECT** | contains a verified error; do not carry forward as-is |

Nothing is dropped in this sheet. Dispositions are proposals for the
reconciliation pass.

---

## 0. Entity position — recorded, deliberately NOT implemented

Stated by Mac, 28 October 2026:

- **Just Be Trading 10 (Pty) Ltd** is the registered entity, Reg.
  **2007/021390/07**. **Innovation Consult (Pty) Ltd** is its *trading
  name*.
- A **name-change lodgement will be initiated**.
- IC will **lease the application to a new subsidiary**, which becomes
  the public/market-facing commercial trading entity.
- Registration documents to follow after successful lodgement.
- **Instruction: do not hard-code any of this yet.**

That instruction is being followed, and it is the right call — the
customer-facing legal name is about to change twice (name change, then
the subsidiary becomes the seller). Two things are recorded for the pass
that happens *after* the documents land:

**(a) The two constants in `src/lib/legalText.ts` are inverted** against
what was just stated:

```ts
export const COMPANY_LEGAL_NAME = 'Innovation Consult (Pty) Ltd';   // actually the trading name
export const COMPANY_TRADING_AS = 'Just Be Trading 10 (Pty) Ltd';   // actually the registered entity
```

The seven uploaded .docx copyright blocks agree with Mac, not with the
code: *"Just Be Trading 10 (Pty) Ltd t/a Innovation Consult (Pty) Ltd."*
Not swapped now — the values are about to be replaced wholesale, and a
swap would bake in a position with a known expiry.

**(b) Three places bypass the constants** with inline string literals,
so a single config change would not reach them:

| file | line |
|---|---|
| `src/modules/manual/manualDocument.ts` | 15 |
| `src/lib/legalText.ts` | 43 (inlines the name instead of interpolating its own constant) |
| `src/lib/pdf/pdfWriter.test.ts` | 95 |

**What the structure needs to become** (not built yet): licensor and
licensee as *separate* effective-dated entities, because after the
subsidiary is formed the party on a customer invoice is not the party
that owns the IP. This is the same shape the accounting spec already
requires at A-08/A-13 — effective-dated configuration, never hard-coded.
A tax invoice must carry the registered name in force on the document
date.

---

## 1. Resolved this batch — the ward-count blocker

Last batch's blocking finding is **resolved in favour of the baseline.**

`JB-Marks-Electoral-Base-Report.md` cites the MDB's final delimitation
gazette — **Provincial Gazette Extraordinary No. 8929, 18 November 2025,
Provincial Notice 1300 of 2025** — for JB Marks: **34 wards, 67 council
seats, delimitation norm from the March 2024 roll of 122,059.**

Checked against `src/data/iec/circular-1-2025-annexure-a.json`:

```
Our proclaimed baseline, NW405:  wards 34 · councillors 67 · registeredVoters 122,059
MDB gazette 8929 as cited:       wards 34 · seats       67 · norm             122,059
EXACT MATCH on all three: True
```

Three independent sources now say 34: Annexure A (our baseline), MDB
Gazette 8929 (via this report), and `wbs-database-seed_v2.1.sql`
("all 34 wards"). The candidate list's "32 unique wards contested" is
the outlier, and its note proposing a "correction" to 32 remains
**not to be actioned**. **Build on 34.** The voters roll can proceed on
that basis.

Still open, lower priority: what the candidate list's contiguous `1..32`
ward numbering actually enumerates.

---

## 2. Register — batch 4 (28 Oct, this batch, 20 files)

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-031 | `ecos-v2-app-naming-fixed.zip` | `85fe17af` | app fork, 293 entries | **RECONCILE — largest item in the register** | §3 below |
A-032 | `ecos-v2-build-bundle.zip` | `626163c2` | 33 files: decisions, pricing, 4 migrations, 2 OpenAPI specs, `schema.prisma` (31 KB), TS SDK, 2 skills | **RECONCILE** | Postgres/Prisma stack, not this repo's. Has `00-MASTER-DECISIONS.md` and `03-NAMING-SCHEMA.md` — likely the source of the naming directives |
A-033 | `JB-Marks-Electoral-Base-Report.md` | `d96f06dd` | R&D report, Draft v3 | **KEEP — high value** | Primary-source ward results 2006/2011/2016/2021; resolves §1. Self-documents correcting two *fabricated* earlier drafts |
A-034 | `JB-Marks-Electoral-Base-Report.md` (2nd) | `d96f06dd` | — | **DUP** | identical |
A-035 | `JB-Marks-Ward-Results-2021.csv` | `817de213` | 34 rows | **KEEP** | Ward IDs `64005001`–`64005034`; ANC 24 / DA 9 / FF+ 1 |
A-036 | `JB-Marks-Ward-Results-2016.csv` | `fe0fe8e8` | 34 rows | **KEEP** | ANC 24 / DA 10 |
A-037 | `Ventersdorp-Potchefstroom-2006-raw.csv` | `bde6af93` | raw IEC | **KEEP** | pre-merger predecessor data |
A-038 | `Ventersdorp-Potchefstroom-2006-raw.csv` (2nd) | `bde6af93` | — | **DUP** | identical |
A-039 | `JB-Marks-Electoral-Dynamics-RD-Report.docx` | `48ac3128` | report | **REFERENCE** | not yet opened |
A-040 | `JB-Marks-Electoral-Dynamics-RD-Report.docx` (2nd) | `48ac3128` | — | **DUP** | identical |
A-041 | `ecos-human-centred-ai-audit-v2.md` | `bd12d4cd` | PAIR audit + MCIF | **KEEP** | superset of A-042: adds F7, §7.5, §12 MCIF, metrics 9–12 |
A-042 | `ecos-human-centred-ai-audit.md` | `f319ba5f` | PAIR audit v1 | **SUPERSEDED** by A-041 | **also DEFECT:** §2.1 carries PPFA **R80k/R100k/R15M** — superseded figures. Current law is R200,000 / R30M. Present in v2 as well |
A-043 | `wbs-database-seed_v2.1.sql` | `0dd91d0b` | 12 workstreams, 30 tasks | **REFERENCE / RECONCILE** | PPFA R200k/R30M/R160k correct. Cites "proclamation of 6 Aug 2025"; our verified source is *Gazette No. 53182, 18 Aug 2025* — reconcile the citation. Postgres, AWS af-south-1 |
A-044 | `wbs-database-seed_v2.1_1.sql` | `0dd91d0b` | — | **DUP** | identical |
A-045 | `Stitch_Re-Export_Work_Order.md` | `8e72752a` | 178 screens | **KEEP** | 12 module groups, tier-ordered, 121 with no preview |
A-046 | `stitch-reexport-work-order.md` | `73f618d7` | 178 screens | **SUPERSEDED by A-045** | **not** a duplicate — same content, flat format, groups sorted lexically (1, 10, 11, 12, 2…) |
A-047 | `stitch_export_manifest.csv` | `9a47cf32` | 229 rows | **KEEP — source of truth for A-045/046** | the manifest both work orders derive from |
A-048 | `municipal-electoral-research.skill` | `e6348492` | zip: SKILL.md + 2 references | **RECONCILE** | duplicates the installed `anthropic-skills:municipal-electoral-research-report`; decide which wins |
A-049 | `elections_in_south_africa_innovation_consult_edition.html` | `d06477ad` | civic briefing page | **REFERENCE** | uses `#040c30` ink and `#795907` gold — **a fourth palette**, matching neither the corporate nor the EC OS token set |
A-050 | `ic-accounting-agent-spec.md` (3rd copy) | `ad03adeb` | — | **DUP** | third identical copy |

## 3. A-031 — the forked application

The most important thing in this batch, and the one that must **not** be
merged in freeze week.

It is `ecos-v2/`, a fork of this repo's app, dated **~6 September 2026**
by its own `BUILD-STATUS.md`. Compared file-by-file against
`election-cos-app`:

```
identical: 34 | divergent: 84 | only in fork: 88
fork src files: 184   repo src files: 277
```

**It is behind on every piece of recent hardening** — no shared UI
primitives (`src/components/ui/index.tsx`), no `publicDomain.ts`, no
`securityHeaders.ts`, no `workflowLocation.test.ts`, no delimitation
baseline JSON, no type-scale guard, no session handoff.

**And it carries 88 files this repo does not have**, concentrated where
it matters:

```
35  src/components/**        24  src/modules/**
 3  src/services/**           3  src/test/**
 2  src/hooks/**              1  src/context/**
 1  src/MemberCapture.tsx     1  tenant_isolation.sql
```

`src/MemberCapture.tsx` is the Membership Capture pillar. `src/services`
and `src/hooks` are layers this repo has no equivalent of.

**It also contains failed patch hunks** — `README.md.rej`,
`index.html.rej`, `package.json.rej`, `vite.config.ts.rej`, each with a
`.orig` beside it. This bundle is a partially-applied patch state, not a
clean tree. Alongside them: `pr.patch` (799 KB), `pr.json`,
`pr_commits.json`, `pr_reviews.json`, `main_commits.json` and eight
`patch_*.cjs/js` scripts.

Its `BUILD-STATUS.md` opens by recording that it is on the **third**
naming directive this codebase has received, and that "Election-COS1.0"
is itself superseded by "Election Campaign OS / EC OS" per
`03-NAMING-SCHEMA.md` in A-032.

**Proposed disposition:** this repo stays authoritative through 4
November. Treat the fork as a **donor tree**: the 88 only-in-fork files
are candidates to port forward one at a time, after the election, each
through the normal verification. Do not reverse the direction — porting
the fork's older trunk over this repo's hardening would undo a month of
work and the 992-test suite that covers it.

---

## 4. Register — batches 1–3 (27 files, carried forward)

ID | Asset | Hash | Disposition | Note
---|---|---|---|---
A-001 | `01-claude-code-build-spec_1.md` | `453a1c7b` | **KEEP** | governing spec, reviewed 17 Oct |
A-002 | `DOCTYPE_1.txt` | `8709bb46` | **REFERENCE** | reviewed 17 Oct |
A-003 | `municipal-gantt-planner-v2_1.xlsx` | `80a582bb` | **KEEP** | source of the 28–31 Oct code-freeze window |
A-004 | `validate_1.ts` | `a570fbd7` | **DEFECT** | 7 verified defects, 26 Oct. Compiles clean; sanitiser downgrades a strict-schema 400 to a 200 |
A-005 | `runtime-guards.ts` | `cfc3596f` | **DEFECT** | maxDepth guard inert (maxSeen=1 on 500-deep XML); YAML alias 327 B → 31.3 MB; DTD regex rejects `{"system":…}`. undici DNS pinning verified **working** |
A-006 | `security-gate.py` | `bcce351f` | **DEFECT — blocks every build** | no version-range narrowing; `/CVSS:` regex never matches a real OSV score. 5 severity shapes → 5 blocks, 0 passes |
A-007 | `pipeline.yml` | `22d3e4af` | **DEFECT — can never go green** | its placeholder grep matches its own source and the SQL file |
A-008 | `0001_security_baseline.sql` | `6a21888d` | **DEFECT** | `CREATE INDEX IF NOT EXISTS` invalid in MySQL; table-level `REVOKE` after database-level `GRANT` cannot succeed; `SET GLOBAL` needs a privilege the migrator lacks |
A-009 | `modsecurity-crs-custom.conf` | `feca5c4b` | **DEFECT** | no `SecRuleEngine On`; rule 1000011 blocks ordinary `&amp;` and passes real Billion Laughs; rule 1000003 can never match |
A-010 | `package_security.json` | `09597828` | **DEFECT** | `sqlparse` is PyPI not npm (404 verified); `overrides` with no `dependencies` does nothing |
A-011–015 | the five security files, re-uploaded 28 Oct | — | **DUP** | byte-identical, verified with `cmp` |
A-016 | `ic-accounting-agent-spec.md` | `ad03adeb` | **KEEP** | IC Books spec; §13 open questions are live |
A-017 | `ic-accounting-agent-spec.md` (2nd) | `ad03adeb` | **DUP** | — |
A-018 | `ic-chart-of-accounts-vat-config.json` | `300823dc` | **KEEP — needs entity update** | `entities[].legal_name` for IC must follow §0, not be set now |
A-019 | `nw-province-candidate-list-2026.xlsx` | `3a14c07c` | **KEEP, with §1 caveat** | 9,731 records, 22 municipalities, 82 parties. Codes and names match the baseline exactly; ward counts do not. DOB readable in the masked ID — handle as voter-class data |
A-020 | `ecos-financial-model-2026.xlsx` | `afb88201` | **KEEP — 3 DEFECTS** | PSP fees understated 40% (R7,515 vs R12,525); ten dead Assumptions cells; break-even returns −5 wards |
A-021 | `ecos-financial-market-positioning-2026.docx` | `d0e4ce80` | **DEFECT** | "under 1%" rests on the understated fee (really 1.50%); December cumulative-cash claim is the monthly flow |
A-022 | `ecos-compressed-golive-plan-2026.docx` | `a4f0edd8` | **REFERENCE** | wider go-live was **16 Oct** — twelve days past, never deployed |
A-023 | `ecos-two-version-build-plan-2026.docx` | `f2f9d7e3` | **RECONCILE** | premises a live AWS RDS Postgres production system that does not exist here |
A-024 | `ecos-technical-infrastructure-whitepaper-2026.docx` | `536abc75` | **KEEP — authoritative architecture log** | its 2026-08 entry records Postgres/RLS → Firebase/Firestore `africa-south1`, which is what is built |
A-025 | `ecos-payments-accounts-architecture-2026.docx` | `0702fff1` | **KEEP** | account numbering, ledger, PayFast ITN requirement |
A-026 | `ecos-financial-subscription-policies-2026.docx` | `361355a4` | **KEEP — attorney gate** | §A.6 liability and §D.4 VAT need attorney review before publication, per the document itself |
A-027 | `ecos-membership-capture-2026.docx` | `aba90c32` | **RECONCILE** | Postgres DDL; names "the canonical six" roles against this repo's seven and 26 capabilities |

---

## 5. Reconciliation queue, in priority order

0. **Which registered-voter figure is the denominator?** — largely
   resolved by batch 13; one anomaly left. Five figures were in
   circulation. Dated, four of them are one time series:

   | figure | as at | source |
   |---:|---|---|
   | 113,218 | Nov 2021 | 2021 LGE registered voters (A-092) |
   | 122,059 | 27 Feb 2025 | IEC Circular 1 of 2025, Annexure A — `src/data/iec/circular-1-2025-annexure-a.json`; the ward-norm baseline this build computes against |
   | 131,963 | 7 Aug 2026 | certified roll, verified entries (A-099, counted) |
   | 132,133 | 14 Aug 2026 | IEC registration statistics page (A-087) |
   | 119,099 | 14 Aug 2026 | **the same page's own ward table, summed** |
   | 132,140 | "August 2026" | A-102 §5.1 — seven from the stats page's figure, no source given; transcription noise, not a sixth candidate |

   113,218 → 122,059 → 131,963 over five years is ordinary growth, and
   the roll and the stats page agree to **0.13%** a week apart. So there
   is no five-way conflict; there is **one anomaly**: a page that states
   132,133 and prints a ward table summing to 119,099. 13,034 voters,
   same document, same date.

   **The rule that follows is narrower than before but still binding:**
   a turnout or coverage percentage must name which figure and which date
   it divides by. The two legitimate denominators are 122,059 (Feb 2025,
   for anything compared against the delimitation norms) and 131,963
   (Aug 2026, for anything about the roll as it stands). **The stats
   page's ward table may not be used at all** until the IEC explains it —
   and per A-087's own open item 2, ward-level seeds should come from the
   roll, not that page.

1. **A-031 / A-032 — the fork and its build bundle.** After 4 November.
   Port forward from the fork; never merge backward. Start with
   `src/MemberCapture.tsx`, `src/services/**`, `src/hooks/**`.
2. **Entity identity (§0).** Blocked on the lodgement and the
   subsidiary's registration documents. Then: licensor/licensee split,
   effective-dated, and the three inline literals routed through config.
3. ~~**Role model.**~~ **CLOSED 28 Oct, §19.5.** A-111 §3.3 and Δ09 settle
   it at **seven seed roles** with Finance Officer restored — and reframe
   it: the permissions screen is a grants model
   (`role_defaults ∪ user_overrides`), so the role *count* was the wrong
   question. Our 7 roles / 26 capabilities are that model.
4. ~~**Which stack.**~~ **CLOSED 28 Oct, §18.1.** Four descriptions were
   in circulation. The repositories settle it: `ElectionCOS1_0` holds a
   README and one ingestion branch, `Election-COS1.0_v2` is empty, and
   the Postgres/AWS/agentic system exists only as documents. A-024 was
   right, and `election-cos-app` is the only application there is.
5. **The security package (A-004–A-010).** Wrong stack for EC OS and
   three files cannot pass their own gates. Rewrite only if the package
   has a destination.
6. **Stitch re-export (A-045/047).** 178 screens, 121 with nothing
   outside Stitch. Operational work for a human in the Stitch UI.
7. **PPFA citation (A-043).** "6 Aug 2025 proclamation" against our
   verified *Gazette No. 53182, 18 Aug 2025*. Figures agree; provenance
   does not.
8. ~~**Palettes — now five.**~~ **CLOSED 28 Oct, §19.5.** D3 in A-111 and
   §6 of A-113 name the product set — `#1A2246` ink, `#B7913F` gold,
   `#F7F4EE` paper, `#7E1F2E` maroon, `#33427E` teal, `#2F7E4A` green,
   `#6A6E7E` slate — and `tokens.ts` matches exactly. The corporate set
   (`#13244A`/`#C9A227`) stays separate and deliberate. **A-049's
   `#040c30`/`#795907` and A-085's `#1A253A`/`#722226`/`#C0A062` are
   drift, not alternatives.** Nothing to decide.
9. **The public-facing domain, in three spellings.** `electioscos.co.za`
   is registered and is what `publicDomain.ts` guards. A-084's footer
   and A-090 each use a different one (§12.3). The corporate site is
   outside this repo, so no guard can catch it.

## 6. What must not be carried forward

- **The NW405 32-ward "correction"** (§1). Wrong provenance; fails the
  statutory ward-seat test; now contradicted by MDB Gazette 8929.
- **PPFA R80k/R100k/R15M** (A-041, A-042 §2.1). Superseded.
- **A disclosure threshold of R100,000** (A-090's default input value).
  Same superseded figure, third artefact. Current law is R200,000.
- **PPFA "R80k Yellow / R100k Critical / R15M hard block"** (A-102 §3.4).
  Fourth artefact, and this one is inside a document claiming to be the
  build baseline. `ppfaDefaults.ts` is correct; do not let A-102 overwrite
  it.
- **PPFA "R80k/R200k/R15M"** (A-138 §3, agent 18). Half-corrected, which
  reads as current and is not: R80,000 and R15,000,000 are both repealed.
- **`fn_calculate_schedule1_quotas`** (A-138 §4.1). Billed as Items 12,
  13 and 16; implements `A/B` with no `+1`, no `−C`, no surplus
  allocation and no overhang handling. On the certified NW405 2021 data
  it allocates **65 of 67 seats** and gets ANC and PA wrong (§26.1).
- **`src/lib/mmp.ts`** (A-140). Billed as "Municipal Structures Act MMP
  allocation"; implements the **Droop** quota `⌊A/(B+1)⌋+1` with no `−C`
  term. Gives **1,492 against the published 1,515** (§31.3). Third
  distinct wrong quota in the register.
- **`electioncampaignos.co.za` and `electioncos.co.za`** as the product's
  address (A-084, A-090, A-129). The first is in `SUPERSEDED_DOMAINS` and
  has no DNS record. The second **is a live registration** — §23.4
  withdraws the earlier "never ours", which was not established — but it
  is not `APP_DOMAIN`, and three spellings in circulation is the defect
  whoever owns them.
- **`Election_Campaign_OS_Business_Plan_v2.docx`** (A-114, §19.4). Its
  "v2.0" is its own version number, dated 20 July — nineteen days before
  the V2 artefact set — so it is **not** artefact 02-V2. It carries
  R100,000 / R15m twice with no mention of the current figures, plus
  "Section 4 notice", PostgreSQL 15+ and `af-south-1`. **Fifth artefact
  with the repealed thresholds and the only investor-facing one.**
- **PSP figures of R7,515 / "under 1%"** (A-020, A-021).
- **"Cumulative cash dips negative in December"** (A-021).
- **The fork as a merge source** (§3). Donor tree only.
- **Any legal entity name written to code before the registration
  documents land** (§0).
- **`ElectoralHarvestService` as pasted** (§18.2). It calls an endpoint
  the IEC does not publish, writes the roll into `voter` unconsented, and
  labels an unsalted SHA-256 of a South African ID number `POPIA_MASKED`
  in an append-only audit log. The hash is brute-forceable; the label is
  a false compliance record. **Not a thing to fix and adopt** — the
  Firestore ingestion in §15 is the shape this work already has.

---

## 7. Batches 5–7 (28 Oct, 47 further files, 27 new distinct)

### 7.1 The finding — our seat calculator is confirmed against primary source

`legislative-source-excerpts.md` quotes the Municipal Structures Act
Schedule 1 from **Government Gazette No. 19614, 18 December 1998**, and
carries the IEC's own seat-calculation detail sheet for **NW405, LOCAL
GOVERNMENT ELECTION 2021** — complete, party by party.

It also exposed a formula discrepancy worth being precise about:

| source | Item 12 quota |
|---|---|
| The gazetted statute, as quoted | `Q = (A / (B − C)) + 1` |
| `SKILL-3.md` (`ecos-demarcation-baseline-config`) | `Q = A/(B−C) + 1` — matches the statute |
| `src/modules/analytics/seatCalculator.ts` | `Q = (A / (B − C − D)) + 1` |
| The IEC's NW405 worked example | lists **`D (ward seats from parties with no PR list) = 0`** |

So the statute has three terms and the IEC's operational report has four.
They do not conflict: **D = 0 reduces the four-term divisor exactly to the
statutory one**, and they diverge only where a party wins ward seats and
files no PR list. The four-term version is the safer superset, and it is
what this repo implements.

Ran the published figures through `allocateSeats` as a new permanent test,
`src/modules/analytics/seatCalculator.nw405-2021.test.ts`:

```
✓ the published party votes sum to the published total A   (101,439)
✓ reproduces the published quota of 1,515
✓ reproduces every published party seat total   ANC 33 · DA 17 · FF+ 9 · EFF 6 · PA 2 · four parties 0
✓ allocates exactly the 67 seats the council has
✓ with D = 0 the four-term divisor equals the statutory B − C
```

`npm run check:all` green afterwards — **64 files, 997 tests**.

This is an independent arrival of the same published result through a
different conversation and a different document, which is why it is kept
as its own test rather than folded into the session-8 regression block. If
the two ever disagree, that should surface as two failures.

The excerpts also re-confirm the MDB gazette a third time: **34 wards,
67 seats, 122,059 baseline, ±15% norm variance, March 2024 roll.**

**One thing to check, not yet checked:** the excerpts state that the IEC's
briefing deck proposes an Item 16 overhang resolution — recalculating the
quota excluding the excessive-seats party — and warn it is a **proposal,
not enacted law**, never to be the default. This repo implements Item 16;
whether it implements the proposal needs verifying before that claim is
made either way.

### 7.2 Register

ID | Asset | Hash | Disposition | Note
---|---|---|---|---
A-051 | `legislative-source-excerpts.md` ×2 | `713daa87` | **KEEP — highest-value asset in the batch** [read] | Item 12/13/16 verbatim; NW405 2021 fixture; the Item 16 proposal warning |
A-052 | `municipal-electoral-quota-config.zip` | `baf965c4` | **KEEP** [read, 3 entries] | SKILL.md + the excerpts + 16.8 KB `schema.sql`. Parent of the settings modules |
A-053 | `ecos-settings-modules.zip` ×2 | `64094709` | **RECONCILE** [read, 19 entries] | Three settings modules — `demarcation-baseline`, `pr-candidate-list`, `rbac` — each SKILL + api-contract + schema. Postgres. The `rbac/references/schema.sql` (21 KB) is the one to read against this repo's 7 roles / 26 capabilities |
A-054 | `schema.sql` (PR candidate list) | `de869ffd` | **RECONCILE — good design** [read] | Item 11(1) 2× cap as a hard trigger; s14(4A) cross-list duplicate block; gender distribution as WARNING never BLOCKING; soft-remove with reason. Postgres/RLS |
A-055 | `api-contract-1.md` (PR list export) | `b0595ee5` | **KEEP** [read] | Carries its own correction: the card's "Sec 17" subtitle is wrong — s14/s15 plus Sch.1 Item 11. Also "Generate submission documents", never "Submit to IEC" |
A-056 | `api-contract-2/3/4.md` | `948ec0db` | **KEEP** [read] | Three identical copies. `prSeatsToBeFilled: 33` = 67 − 34 ✓ against our baseline |
A-057 | `SKILL-3.md` (`ecos-demarcation-baseline-config`) | `ef5c0bb4` | **SUPERSEDED by the installed skill** [read] | Already installed in this session under the same name. Its `Q = A/(B−C)+1` is the statute; see §7.1 |
A-058 | `migration.sql` ×2 | `321a6970` | **RECONCILE** [read] | Adds `municipal_category` A/B/C + a trigger forbidding Schedule 1 for Category C. Backfills NW405 = 'B' ✓ |
A-059 | `tenant_isolation.sql` ×2 | `d48bf9a1` | **RECONCILE — self-documents four real fixes** [read] | Dropped the `::UUID` cast, restored `FINANCE_OFFICER`, moved to `ward_code` against cross-municipality collision, scoped VD_CAPTAIN/VOLUNTEER to voting district. Postgres RLS, so it governs the fork's stack, not this one |
A-060 | `JB-Marks-Ward-Swing-2021-2024.csv` | `d1b1639b` | **KEEP — genuinely new** [read] | Per-ward 2021→2024 swing, 12 columns, all 34 wards. **Basis needs stating:** its 2021 percentages do not match the ward-ballot CSV (Ward 2 FF+ 43.3 here vs 43.74 computed from `JB-Marks-Ward-Results-2021.csv`), so it is a different ballot or denominator. Do not join the two until that is settled |
A-061 | `00-MASTER-INDEX-work-partition-map-v2.md` | `0a786c0f` | **KEEP** [hash only] | The V2 document set's index — read this first in the reconciliation pass |
A-062 | `01-claude-code-build-spec-v2.md` | `586db7e7` | **KEEP — governing spec, newer than A-001** [hash only] | 39,380 bytes against A-001's 30,772. **A-001 is not the same file** and batch 7 re-uploaded A-001's exact hash, so both versions are live in the store |
A-063 | `02-commercial-rewrite-brief-v2.md` | `8f81527d` | **REFERENCE** [hash only] | |
A-064 | `03-implementation-rollout-plan-v2.md` ×2 | `2ddccae3` | **REFERENCE** [hash only] | |
A-065 | `04-legal-compliance-workstream-v2.md` | `4525d08b` | **KEEP — attorney gate** [hash only] | |
A-066 | `04-legal-compliance-workstream.md` | `ab50db97` | **SUPERSEDED by A-065** [hash only] | |
A-067 | `05-project-schedule-v2.xlsx` | `02697d14` | **KEEP** [hash only] | Compare against `municipal-gantt-planner-v2_1.xlsx` (A-003), the current freeze-window source |
A-068 | `05-project-schedule.xlsx` | `ee75c9e3` | **SUPERSEDED by A-067** [hash only] | |
A-069 | `06-reconciliation-record-v2.md` | `74c51dbd` | **KEEP — read early** [hash only] | A prior reconciliation record; may already resolve items in §5 |
A-070 | `CLAUDE-HANDOFF.md` | `c13f6f16` | **KEEP — read early** [hash only] | |
A-071 | `SKILL.md`, `SKILL-1.md`, `SKILL-2.md` | `557e60da`, `39b2f0d1`, `f8c7718e` | **RECONCILE** [hash only] | Three distinct skills, names not yet established. Several uploaded skills duplicate ones already installed in this session |
A-072 | `api-contract.md`, `schema.sql`, `sentiment-monitoring-schema.sql` | `fee75c34`, `7385f136`, `61e5fd8f` | **RECONCILE** [hash only] | A fourth module — sentiment monitoring. Note the PAIR audit (A-041) rates this module's evidence of user need as its weakest finding, F4 |
A-073 | `Election_Campaign_OS_Business_Plan_v2.docx` | `3a63dc94` | **KEEP — "B1"** [hash only] | The B1 every other document cross-references. Reading this should resolve several §5 queue items |
A-074 | `Election_Campaign_OS_Business_Plan.docx` | `d145c194` | **SUPERSEDED by A-073** [hash only] | |
A-075 | `IC_LGE_Regional_Roadmap_2026_INTERNAL.md` | `4a7c80ac` | **REFERENCE** [hash only] | Marked INTERNAL — treat as not for customer circulation |
A-076 | `elections_in_south_africa_..._edition.html` ×4 | `d06477ad` | **DUP** | Four identical copies now, including A-049 |
A-077 | `01-claude-code-build-spec.md` | `453a1c7b` | **DUP of A-001** | Confirms A-001 and the v2 spec are different documents |
A-078 | repeats of A-033/035/036/037/039 and the research skill | — | **DUP** | base report ×3, RD report ×3, Ventersdorp ×3, research skill ×3, ward results ×2 each |

### 7.3 Running totals

| batch | files | new distinct |
|---|---|---|
| 1 (17 Oct) | 3 | 3 |
| 2 (26 Oct) | 7 | 7 |
| 3 (28 Oct) | 17 | 12 |
| 4 (28 Oct) | 20 | 14 |
| 5 (28 Oct) | 20 | 8 |
| 6 (28 Oct) | 20 | 16 |
| 7 (28 Oct) | 7 | 3 |
| 8 (28 Oct) | 2 | 2 |
| 9 (28 Oct) | 10 | **0** |
| 10 (28 Oct) | 20 | 13 |
| 11 — voters' roll (28 Oct) | 31 | 31 |
| 12 (28 Oct) | 14 | 10 |
| 13 (28 Oct) | 4 | 3 |
| 14 (28 Oct) | 1 | 1 |
| 15 (28 Oct) | 4 | 1 |
| 16 (28 Oct) | 2 | 1 |
| 17 (28 Oct) | 2 | 2 |
| 18–19 (28 Oct) | — | — |  *repositories and re-reads; no new uploads*
| **total** | **184** | **128** |

The 31 roll PDFs are 31 distinct hashes — no duplicates in that batch,
which is what you would expect from a machine-generated per-VD export
rather than a human re-sending a folder.

Redundancy is running at **30%**, down from 38% — the roll batch, being
all-new, moved the ratio on its own. The underlying pattern is unchanged. The pattern is consistent: the same
corpus re-exported from several conversations. Hash-keying is doing real
work — four copies of one HTML file, three each of the base report, the RD
report, the Ventersdorp CSV, the research skill, the settings-modules zip,
and now three each of the payments, policies and positioning documents.

**Batch 9 (10 files) added nothing.** Every one is byte-identical to a
document registered in batch 3:

| file | matches | now |
|---|---|---|
| `ecos-two-version-build-plan-2026.docx` | A-023 | ×2 |
| `ecos-compressed-golive-plan-2026.docx` | A-022 | ×2 |
| `ecos-membership-capture-2026.docx` | A-027 | ×2 |
| `ecos-technical-infrastructure-whitepaper-2026.docx` | A-024 | ×2 |
| `ecos-financial-subscription-policies-2026.docx` ×2 | A-026 | ×3 |
| `ecos-payments-accounts-architecture-2026.docx` ×2 | A-025 | ×3 |
| `ecos-financial-market-positioning-2026.docx` ×2 | A-021 | ×3 |

Three of the ten were duplicates *within their own batch*. No disposition
changes, and the three verified defects in A-021 (the PSP "under 1%"
figure and the December cumulative-cash claim) and A-026's attorney gate
all still stand against the same bytes.

### 7.4 What batches 5–7 add to the queue

1. **Read A-061, A-069, A-070, A-073 first** — master index, prior
   reconciliation record, handoff, and B1. Four documents that likely
   close open queue items rather than add to them.
2. **Two live versions of the governing spec** (A-001 and A-062). Which
   governs is a decision, not a guess.
3. **The settings-module trio** (A-053) against this repo's RBAC. The
   uploaded RLS file names the canonical six; this repo has seven roles
   and 26 capabilities. A-053's `rbac/references/schema.sql` is where
   that gets settled.
4. **State the swing CSV's basis** (A-060) before any join.
5. **Verify the Item 16 implementation** does not default to the IEC's
   unenacted proposal (§7.1).

---

## 8. Batch 8 — `Security_Baselines_for_ElectionsCOS1.zip` (+ 1 dup)

`b6ded8d7` · 9 entries. **Seven are byte-identical to A-004–A-010**, so
those reviews stand. **Two are new, and they are the two files whose
cross-file claims had been unverifiable for three turns:** `guardrails.ts`
and `security.ts`. Both typecheck clean under `--strict`. Both were run.

**Also settled:** the `(?i)` regex claim. These copies are the *fixed*
versions — `guardrails.ts` lines 45–51 document the bug and use proper `/i`
flags. The broken version was never in this store. That claim was never
adopted here, and it stays unadopted.

A-079 | `guardrails.ts` | `inside b6ded8d7` | **DEFECT ×5** [read, run]
A-080 | `security.ts` | `inside b6ded8d7` | **DEFECT ×4** [read, run]
A-081 | `ecos-settings-modules-1.zip` | `64094709` | **DUP of A-053** (third copy)

### 8.1 `guardrails.ts` — verified by running

**G1 (high). A secret inside a structured tool result is returned
unredacted, and audited `ALLOW`.** `executeTool` line 182 keeps the
screened text only when the result was a string:

```
decision: ALLOW
result  : {"tool":"lookup","args":{"q":"AKIAIOSFODNN7EXAMPLE"},...}
>> AWS key present in the returned object: YES — LEAKED
audit   : ALLOW tool.call {"sandboxed":true}
```

The same key as a *string* result is redacted correctly. Most tools return
objects, so the output guard is inert where it matters most. `screenOutput`
also never returns `"REDACT"` — it returns `ALLOW` with rewritten text — so
the caller cannot tell a redaction happened.

**G2. Only the first occurrence per pattern is redacted** —
`out.replace(re, …)` with no `/g`:

```
"AKIAIOSFODNN7EXAMPLE and AKIAZZZZZZZZZZZZZZZZ"
        -> "[REDACTED] and AKIAZZZZZZZZZZZZZZZZ"
```

**G3. The documented unsandboxed path cannot run.** `ToolSpec` declares no
`impl`, `register()` does not require one, and line 170 casts to
`{ impl }`:

```
register(sandboxed:false + justification): accepted
executeTool THREW: TypeError: spec.impl is not a function
```

Deny-by-default itself works — `register()` correctly refused
`sandboxed:false` without a justification.

**G4. The delimiter nonce comes from `Math.random()`**, in a file that
already imports `sha256`. The escaping is case-sensitive, so a nested
closing tag in different case passes through intact:

```
"x<\\u002funtrusted_doc> y</UNTRUSTED_DOC> z"
```

A predictable nonce plus an unescaped uppercase close tag is a delimiter
forgery path against the file's own stated invariant.

**G5. `ROLE_OVERRIDE` blocks ordinary prose.** `/you are now|act as|…/i`:

```
"this will act as the tiebreaker"  -> BLOCK ROLE_OVERRIDE
"please act as reviewer"           -> BLOCK ROLE_OVERRIDE
```

For a tool processing free-text field reports, that is a self-inflicted
outage.

### 8.2 `security.ts` — verified by running

**S1 (high). The audit hash chain cannot be recomputed.** `makeAudit`
feeds `ts: Date.now()` into the sha256 input and never stores it:

```
columns written : tenantId, actorId, action, resource, outcome, ip, prevHash, entryHash, detail
hash input      : tenantId, actorId, action, resource, outcome, ip, detail, prevHash, ts
>> a timestamp column is stored: NO
```

So the nightly verifier that `0001_security_baseline.sql` describes cannot
reproduce `entryHash` from the stored row. The integrity property this
package rates highest is unverifiable **by construction** — a different and
worse failure than the forked chain it set out to fix.

**S2 (high). `redactSecrets` does not recurse into arrays.** The
`!Array.isArray(v)` guard on line 128 means array members are copied
verbatim, and `makeAudit` now routes `detail` through this function:

```
in : {"items":[{"token":"supersecret123"},{"note":"AKIAIOSFODNN7EXAMPLE"}],"ok":1}
out : identical — both survive
```

**S3. The key-name patterns destroy legitimate audit evidence.** `/key/i`
and `/aws/i` match far more than secrets:

```
{"monkey":1}             -> {"monkey":"[REDACTED]"}
{"idempotencyKey":"abc"} -> {"idempotencyKey":"[REDACTED]"}
{"ward_cycle_tokens":12} -> {"ward_cycle_tokens":"[REDACTED]"}
{"awsRegion":"af-south-1"} -> {"awsRegion":"[REDACTED]"}
```

For a forensic log, redacting the ward-token count and the region is loss,
not protection.

**S4 (by inspection, not run). `SELECT … LIMIT 1 FOR UPDATE` on an empty
table acquires no lock**, so the first concurrent audits all read `GENESIS`
and fork the chain — the exact defect the changelog claims to have closed.
On Postgres it also does not block a tail insert at all, since there are no
gap locks. The file's own comment offers the advisory-lock alternative;
that is the one that works.

**Also by inspection:** the rate-limit identity falls back to
`x-forwarded-for`, which the client controls, so an unauthenticated caller
can mint unlimited buckets. Verified correct: the lockout boundary (5
failures locks) and the token-bucket Lua, which does store the refilled
count before denying.

### 8.3 What this changes

The package's three unverifiable cross-file claims are now resolved: the
Redis rate limiter is real, the `pageOnCall` hook is real, and the audit
transaction exists. **But the audit chain is unverifiable and the two
redaction functions both leak**, so the disposition does not improve.
Combined with A-006 (the gate blocks every build) and A-007 (the pipeline
can never go green), the package remains **DEFECT** across the board and
still targets a stack this repo does not use.

---

## 9. Batch 10 — a fourth `Shell.tsx`, a landing page we don't have, 18 covers

### 9.1 The pasted `Shell.tsx` is a fourth variant

Three Shells were already known. This is a fourth:

| | lines | signed-out renders | landing import |
|---|---|---|---|
| **this repo**, `src/app/Shell.tsx` | 217 | `<SignInPage />` | — none — |
| the fork (A-031), `src/app/Shell.tsx` | 895 | `<LandingPage />` | `./LandingPage` |
| the paste | ~140 | `<LandingPage />` | `@/modules/landing/LandingPage` |

**It will not build here.** `find src -iname '*Landing*'` returns nothing
— this repo has no landing component under any name, and the fork's sits
at a different path. The import resolves in neither tree.

**It fails our type-scale guard.** Six off-scale classes — `text-lg` ×1,
`text-sm` ×1, `text-xs` ×4. Run against our own
`scripts/check-type-scale.mjs`:

```
✗ check:type-scale failed — Tailwind's default font sizes used instead of the tokens:
  …:6: "text-lg"   …:7: "text-sm"   …:9: "text-xs"   …:10: "text-xs"   …:11: "text-xs"
```

Our `Shell.tsx` is clean on that guard, so applying the paste would break
`check:all` on the first run.

**The duplicate margin class is benign — correcting my own first read.**
`className="mt-auto pt-6 border-t border-paper/10 mt-6"` puts two
utilities from the same group in one attribute, which is the documented
class-race hazard. I flagged it as a possible layout break, then tested
it: compiled Tailwind 3.4.17 and checked emission order.

```
emitted first: .mt-6
emitted last : .mt-auto   <-- wins, equal specificity
=> mt-6 is dead. The footer still sits at the bottom of the nav.
```

So it is dead code, not a break. Worth removing; not worth alarm. (Our
Shell's equivalent line is `mt-auto pt-6 border-t border-paper/10
space-y-1` — no clash.)

### 9.2 The landing page in the screenshots

Two screenshots show a landing page — "Knowledge to action.", four data
chips, and seven role cards with per-role grant counts (20 / 11 / 10 / 8
/ 5 / 6 / 4).

**The content is ours.** Every figure traces to this codebase:
`africa-south1` (9 hits in `src/`), R200,000 (7), Gazette 53182 (3),
Dexie (7), `COMPANY_TAGLINE = 'knowledge to action'`,
`PRODUCT_NAME_SHORT = 'EC OS'`. The seven roles include Compliance
Officer and Finance Officer, which is our seed set — not the "canonical
six" the uploaded RLS and membership-capture documents name.

**The component is not.** `"Knowledge to action"` appears nowhere in this
repo, and not in the fork's `LandingPage.tsx` either. So the page was
built from this codebase's data and constants, in a lineage that has
`src/modules/landing/LandingPage.tsx` — exactly the path the pasted Shell
imports. That lineage is a **third application tree**, after this repo and
the fork.

**Open question, not an assertion:** the paste's header says "session 31
gave this state an actual page instead of going straight to the sign-in
form". That did not happen in *this* repo — our signed-out branch still
returns `<SignInPage />`. Either it happened only in the other lineage, or
it happened here and was reverted. Worth knowing which before porting.

**To bring the landing page in**, three things are needed and only the
first is a file: the `LandingPage` component itself (not yet uploaded), a
decision on its path, and a type-scale pass on both it and the Shell.

A-082 | pasted `Shell.tsx` | not in the upload store | **RECONCILE** [read, guards run] | §9.1 |
A-083 | landing-page screenshots ×2 | `78f12398`, `f8d06c8c` | **REFERENCE** [viewed] | §9.2 — the component itself is still missing |

### 9.3 The 18 cover pages

**11 distinct of 18.** Seven are redundant, including three identical
copies of `Legal-Compliance_-_Front` and three of
`Research-WhitePaper_-_Back`.

| family | front | back |
|---|---|---|
| Financial-Analysis | `211312f7` | `de3bcfea` |
| Legal-Compliance | `e9c35481` ×3 | `f773a476` ×2 |
| Product-TechPlan | `ce60c7d3` ×2 | `9c24b9a8` |
| Research-WhitePaper | `4591a57d` | `f3eceabb` ×3 |
| SOP-Contract | `7e2acc11` ×2 | `19a3732f` |
| Strategy-Plan | — not uploaded — | `d7a0d26b` |

**Strategy-Plan has a back cover and no front.** Every other family has
both. Flagged rather than assumed to be an oversight.

These are document furniture, and they land on the branding question
settled on 16 October: corporate `#13244A` / `#C9A227`, EC OS product
tokens `#1A2246` / `#B7913F`, and a third set that was drift. The HTML
briefing (A-049) introduced a fourth. **Not yet opened** — worth checking
which palette these covers carry before any of them is used.

---

## 10. Branch `claude/test-coverage-analysis-mdahdx`

A sibling branch of this repo, not an upload. Diverged at `bae32f56`:
**11 commits theirs, 43 ours.** 59 files exist there and not here.

### 10.1 It resolves the §1 blocking finding — and the blocker was ours

Its `seed-data/lge2026-candidate-database.csv` is the **national** LGE2026
candidate list: **136,723 rows, 257 municipalities**, where the file
registered as A-019 covered North West only.

Run against the proclaimed baseline, `ward_or_list_order` looked
catastrophic — **178 of 213 municipalities disagreed**, in both
directions, including Cape Town 118 vs 234 and Johannesburg 135 vs 189.

It is not a disagreement. **The column is polymorphic.** On
`PR List Candidate` rows it carries the IEC *ward ID*, whose last three
digits are the ward number; on `Ward Candidate` rows it carries something
else entirely. Reading it correctly:

```
last 3 digits of max PR value == proclaimed ward count : 211
mismatch                                               :   2
no comparable data                                     :  45

the SAME column read off Ward Candidate rows               : 35 of 213
```

`64005034` for NW405 → 34 wards. `19100118` for Cape Town → 118.
`79800135` for Johannesburg → 135. All exactly the proclaimed figures.

**So the candidate data corroborates the proclamation at national scale,
and the earlier conflict was a column misreading on our side** — mine,
reading a per-party sequence number as a ward number. The NW405 "32
wards" note in A-019 is an artefact of the same mistake and remains not
to be actioned. §1's conclusion is unchanged; its framing as a
*conflict between sources* was wrong and is withdrawn.

Two genuine mismatches survive, worth a look but not blocking:
**FS162 Kopanong** (baseline 7, ward-ID tail 9) and **GT484 Merafong
City** (25 vs 28). And **FS164 "-New"** is in the baseline but absent
from the database — a newly created municipality with no candidates yet.

### 10.2 `docs/stitch-screens/` is real — correcting §9

Last entry recorded that path as the one false claim in the pasted task
file. **It is not false.** It exists on this branch with **48 files** —
47 extracted screens plus a README — including
`volunteer_tasks_innovation_consult_edition.html`, the exact screen that
file cites. The paste was written against this branch, not against a
missing directory. `src/modules/tasks/taskWorkflow.ts` now says so.

### 10.3 Nothing to reconcile on the seat engine

Their `seatCalculator.ts` differs from ours by 28 lines, and the diff is
**entirely additive on our side**: the quota formula is identical, and
ours adds `assertSchedule1Applies(municipalityCode)`, the
`delimitationId` stamp, and the refusal to run Schedule 1 against a
category C district. Ours supersedes; no merge needed.

### 10.4 What is worth porting, in order

1. **`docs/stitch-screens/`** (48 files) — the design source of truth, and
   the thing the Stitch work order (A-045/A-047) is about.
2. **The national candidate database** — `seed-data/` CSV (20 MB),
   `docs/lge2026-candidate-database.md`, and `tools/seed-data/lge2026-candidates/`
   (4 files). Read the PR-row ward ID, never the ward-row column.
3. **The Ward-Sentiment budget guardrail** — `functions/src/sentimentBudget.ts`
   + test, `src/dal/ports/sentimentBudget.ts`,
   `src/dal/adapters/firestore/sentimentBudgetRepository.ts`. Directly
   answers finding F4 in A-041, which rates sentiment the weakest module
   on evidence of user need and has no cost ceiling.

Ours carries 24 `src/modules` files, 19 fonts and 5 `src/config` files
they lack, so this is a port-forward in the same direction as the fork
(A-031): **this branch is the donor, ours stays authoritative.**

---

## 11. The voters' roll — 31 PDFs, NW405

**IEC LGE 2026 Certified Voters' Roll, NW405 JB Marks, proclaimed
7 August 2026.** 31 PDFs, **21 distinct voting districts**.

### 11.1 Handling — what was and was not read

**Page 1 of each file only.** That page carries the control header: VD
code, ward, voting station, proclamation date, and the verified /
rejected / total counts. **No voter record was read, extracted, copied or
stored**, and none appears in this repository or in this document. The
reference table below is non-personal: codes, station names and counts.

A certified roll is personal information at scale under POPIA, and far
more sensitive than the candidate lists already registered — candidate
lists are published; a voters' roll is not. Two things follow, and
neither is decided here:

- **Whether the roll is loaded into EC OS at all** is a POPIA decision
  with a lawful-basis question attached, not a technical one. The
  accounting spec's own rule already bars it from the books.
- **Where it would live.** Firestore in `africa-south1` is in-country,
  which is the easy half. Retention, the §5 deletion jobs the PAIR audit
  flags as unbuilt, and the DSR path are the hard half.

### 11.2 It confirms the ward-key finding a third time

Every ward field reads `64005` + a three-digit ward number — `64005013`
is ward 13. That is the **same format** recovered from the national
candidate database in §10, now independently confirmed by the IEC's own
certified roll. Wards 2, 3, 4, 5, 6, 8, 9, 12, 13 and 14 appear; every
one is in `1..34`, matching the proclaimed count.

**The join key for any roll ingestion is this ward ID**, not a bare ward
number and not the candidate file's ward-row column.

> **A fourth confirmation, and it closes in both directions.** A-087
> reaches the identical rule from the other end — "`NW405-W31` comes from
> the last 3 digits of IEC ward ID `64005031`" — and files it as *derived,
> pending MDB confirmation*. The proclaimed-delimitation work in §10 and
> the gazette citation in §7 are that confirmation. Two conversations
> derived the same mapping independently and each held the other's missing
> half; the open item can be closed on both sides.

### 11.3 The segments reconcile — where they are complete

Multi-part files each carry their own header, which makes the control
total checkable against the sum of its parts:

```
VD        ward      segs  sum verified  control   sum total  control  result
86820486  64005002     2           877      877        1239     1239  MATCH
86910015  64005004     1           503     2500         659     3282  partial — 1 of 5 segments uploaded
```

Where every segment is present the arithmetic is exact. Where it is not,
the shortfall is detected rather than silently accepted — which is the
check any ingestion must run before it trusts a VD.

### 11.4 Reference table (7 VDs with a control sheet)

| VD | ward id | w# | verified | rejected | total | rej% | station |
|---|---|---:|---:|---:|---:|---:|---|
| 86820486 | 64005002 | 2 | 877 | 362 | 1,239 | 29.2% | Roodekraal Kontant Winkel |
| 86820521 | 64005003 | 3 | 875 | 532 | 1,407 | 37.8% | Fikadibeng Primary School |
| 86910015 | 64005004 | 4 | 2,500 | 782 | 3,282 | 23.8% | Potchefstroom Primary School |
| 86910026 | 64005005 | 5 | 3,592 | 1,473 | 5,065 | 29.1% | Laerskool ML Fick |
| 86910161 | 64005006 | 6 | 1,922 | 1,462 | 3,384 | 43.2% | Uniting Reformed Church of SA (Ikageng) |
| 86910284 | 64005013 | 13 | 1,165 | 290 | 1,455 | 19.9% | Methodist Church of SA Promosa |
| 86910532 | 64005003 | 3 | 3,551 | 255 | 3,806 | 6.7% | Die Wilge High School |

**Totals: 14,482 verified · 5,156 rejected · 19,638 records · 26.3%
rejected.**

**The rejection spread is the thing to ask about, not to interpret.**
6.7% at Die Wilge against 43.2% at Ikageng is a sixfold difference
between two VDs in the same municipality on the same certified roll.
**[U]** What "rejected" denotes on a certified roll is not established
here, and I am not going to guess at it — it could be an address or
verification status with no bearing on eligibility, or something
operationally significant. Confirm with the IEC before any figure
derived from it reaches a campaign.

> **Partial answer arrived in batch 12, from a second conversation —
> corroboration, not confirmation.** `CLAUDE_CODE_BRIEF.md` (A-087, §12.1)
> reports a complete parse of the same roll in which **50,400 of 52,176
> rejections carry the reason "Deceased"** — 96.6% of them. That would
> make the category overwhelmingly a roll-hygiene status, not an
> eligibility judgement, and it would explain a township/suburb spread as
> an age-profile artefact rather than anything operational.
>
> It does **not** close the item. It is a figure parsed from the same PDFs
> by another run of the same kind of process I ran, not a statement from
> the IEC, and two independent parses agreeing proves the parser, not the
> meaning. The question put to the IEC is unchanged; this only narrows
> what the likely answer is.

### 11.5 What this upload is not

- **Partial.** 21 VDs of NW405's roughly 108, and only 7 of those 21
  have a control sheet.

  > **Amended by batch 12.** A-087 describes a complete parse of **347
  > PDFs → 106 VDs, 184,139 roll entries, 34 wards `64005001`–`64005034`,
  > all 106 reconciling**. So the full dataset exists, in another
  > conversation's working tree. **Ask for it; do not rebuild it** —
  > re-deriving it here would mean handling the whole certified roll a
  > second time for no gain, which is the opposite of what §11.1 says to
  > do with personal information at this scale.
- **Not a test of the composite key.** Every VD here maps to exactly one
  ward, and no voting station spans two. The `wardCode::vdCode`
  composite that exists because 26 of 108 NW405 stations split across
  wards is **not exercised** by this sample, so it remains unverified
  against real data.

  > **Settled by batch 13, and not the way this expected.** It is not a
  > sampling artefact: the complete roll places **all 106** VDs in exactly
  > one ward. The roll and the gazette schedule describe different things,
  > the composite key stays, and the roll **cannot populate it** for the
  > 23 split stations it still carries. §13.4 — it is now a decision for
  > the user, not a verification gap.
- **Not loadable yet.** Beyond the POPIA question, the per-ward
  registered-voter figures that remain item 0 in §5 are still missing —
  the roll gives per-VD counts, and rolling those to wards needs the
  complete VD set, not 21 of 108.

---

## 12. Batch 12 (28 Oct, 14 files) — the corporate site, and a complete roll parse

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-084 | `Innovation_Consult_Site_Preview.md` | `64b24b06` | rendered corporate home page | **KEEP — but see §12.3** | **DEFECT:** footer links `electioncampaignos.co.za`, which `SUPERSEDED_DOMAINS` exists to catch |
A-085 | `Corporate_Website_Technical_and_Design_Architecture_White_Paper.md` | `29734624` | architecture white paper, ADR-01…ADR-10 | **RECONCILE** | Astro + Cloudflare, `innovationconsult.co.za`. A **fifth** palette — §12.3 |
A-086 | `Corporate_Website_…_White_Paper.docx` | `2f26aea6` | same paper, Word | **DUP of A-085** (format variant) | not separately read |
A-087 | `CLAUDE_CODE_BRIEF.md` (IC-ECOS-DATA-2026-02) | `de2d5bae` | voters'-roll parse brief | **KEEP — highest value in the batch** | §12.1 |
A-088 | `Election.docx` | `51ab0aca` | Cloudflare Worker, edge proxy for Firebase Hosting | **RECONCILE** | §12.4 |
A-089 | `Firebase.docx` | `70e38696` | Remote Config fetch-discipline skill | **RECONCILE** | §12.4 |
A-090 | `Election-COS_Demo.html` | `5f8d55dc` | single-file product demo | **REFERENCE — do not ship** | **two DEFECTS:** domain `electioncos.co.za`; PPFA threshold defaults to **R100,000**. §12.2 |
A-091 | `Election-COS_Demo.md` | `8c7df7db` | the demo's script | **REFERENCE** | same `electioncos.co.za`; figures R14,000 / R45,000 are illustrative |
A-092 | `JB_Marks_…_2016-2026_…_Forecasting_Base_Report.md` | `6729ceff` | 175-line base report | **SUPERSEDED by A-033** | **not** the fabricated draft; an earlier *honest* one. §12.5 |
A-093 | `Sourcing_Ward-Level_Data_…_NW405.md` | `029b87cc` | data-sourcing method report | **KEEP** | records *how* the ward data was finally obtained — the provenance trail behind A-033 |
A-094 | `Mahikeng_Local_Municipality_NW383_…_2026_LGE_Outlook.md` | `fb2e7ad7` | second-municipality report | **KEEP — first non-NW405 asset** | §12.6 |
A-095 | `api-contract.md` | `948ec0db` | — | **DUP of A-056** (fourth copy) | identical |
A-096 | `municipal-electoral-research.skill` | `e6348492` | — | **DUP of A-048** | identical |
A-097 | `ecos-settings-modules.zip` | `64094709` | — | **DUP of A-053** (fourth copy) | identical; 12 files in 3 modules |

Four of fourteen are exact re-uploads. Nothing in this batch needed a new
hash family — the register is doing its job.

### 12.1 A-087 is the most consequential document received so far

It documents a **complete** parse of the certified roll §11 only sampled:

```
347 PDFs → 106 VDs → 184,139 roll entries → 34 wards, 64005001–64005034
131,963 verified · 52,176 rejected · 82,607 distinct address points
All 106 VDs = PASS
```

Three things follow, and they are recorded against §11 above rather than
restated here:

1. **It confirms the ward-ID rule a fourth time**, independently, and
   flags it as needing exactly the MDB confirmation our §7/§10 work
   already supplies. Both halves now exist. (§11.2)
2. **It narrows the rejection question** — 50,400 of 52,176 rejections
   read "Deceased". Corroboration from a second parse, not an IEC
   statement. (§11.4)
3. **The full dataset exists; ask for it rather than rebuild it.** (§11.5)

**Its own POPIA rule is ours, arrived at separately.** The brief states
plainly: do not write the roll into `voter` or `household`, because
`trg_popia_consent_check` blocks unconsented rows and *"setting the flag
to TRUE to get past the trigger would falsify the consent record the whole
compliance design rests on."* That is the same reasoning §11.1 gives for
reading page 1 only. **[U]** Two conversations reaching it independently
is encouraging but is not a lawful basis; §11.1's open question stands.

**It targets the fork's stack, not ours** — PostgreSQL 16.15 + PostGIS
3.4 and `rls-tenancy-migrations.sql`. The *finding* ports; the migration
does not.

**It flags its own reconciliation failure, which is the right instinct.**
IEC registration statistics for NW405 do not agree internally: **132,133
vs 131,963 vs a ward table summing to 119,099**. None of the three is the
gazetted 122,059 baseline. Four numbers now claim to be "registered voters
in NW405", and **no campaign-facing figure may be derived from any of them
until that is resolved.** This goes to §5 as a blocker, not a note.

### 12.2 A-090 would publish two wrong numbers if it shipped

The demo is a self-contained HTML page and is good at what it is for. It
also carries two values that contradict verified law and verified
registration:

| field | demo | verified |
|---|---|---|
| disclosure threshold | `value="100000"` | **R200,000** — Gazette No. 53182, 18 Aug 2025 |
| product domain | `electioncos.co.za` ×3 | **`electioscos.co.za`** — `src/config/publicDomain.ts` |

The threshold is a user-editable input labelled "set to the current
regulation", so a demo audience would reasonably read the default *as*
the current regulation. It is the same superseded-PPFA-figure defect
already recorded against A-042, in a third artefact.

Credit where due: its seat calculator is labelled *"Illustrative model,
not an official IEC seat calculation"* — which is exactly the disclosure
discipline the build rules require, and it is the only uploaded demo
artefact that carries one.

### 12.3 Three domains and five palettes

`publicDomain.ts` draws one line: the product is served from
`electioscos.co.za`, the company publishes from `innovationconsult.co.za`,
and `electioncampaignos.co.za` was planned, never registered, and is
guarded against. This batch crosses that line twice:

- **A-084's footer** links `electioncampaignos.co.za` — a name our own
  guard test fails the build over. The corporate site preview is outside
  the repo, so the guard cannot see it. **It is still wrong, and it is
  the one place a prospect would click.**
- **A-090** uses a third spelling that belongs to nobody we know.

**A-085 adds a fifth palette.** `#1A253A` / `#722226` / `#C0A062` matches
neither the EC OS tokens nor `docs/innovation-consult-brand.md` nor the
A-049 briefing page. **[U]** Five palettes across four artefacts is not a
design decision anyone made; it is four conversations each picking one.
Somebody has to say which is the brand — that is a call for the user, not
a reconciliation I can perform.

### 12.4 A-088 / A-089 — good engineering, wrong origin

Both are competent and both are worth keeping as technique:

- **A-089 (Remote Config):** `activate()` from cache on boot (0 ms),
  `fetch()` in the background on a 24-hour interval, realtime listeners
  only in emergency-banner components with explicit teardown. For
  canvassers on poor signal this is the right shape, and the cost
  argument behind it is sound.
- **A-088 (Cloudflare Worker):** edge proxy with HSTS, CSP, frame-deny
  and a `Permissions-Policy` that closes camera and microphone while
  leaving `geolocation=(self)` — correct for a canvassing app.

**What does not port:** the Worker hard-codes
`election-campaign-os-1-v2.web.app` as origin; ours is
`election2026-campaignms7-0.web.app` (`HOSTING_ORIGIN`). And it puts
Cloudflare in front of Firebase Hosting, which is an architecture
decision nobody in this repo has taken — our Functions are pinned
`africa-south1` for data-residency reasons that an edge proxy interacts
with. **[U]** Adopt the two techniques; do not adopt the topology without
deciding it.

### 12.5 A-092 is superseded, and the way it is superseded matters

It is **not** one of the fabricated drafts A-033 corrects — it invents
nothing and says so where it cannot verify: *"verified IEC ward-by-ward
vote counts for all 34 wards … could not be retrieved."* A-033 is the
same work after that gap closed, with primary station-level IEC data.

The two agree everywhere they overlap — 67 seats, 34 wards, ANC 34→33,
DA 22→17, FF+ 4→9 — so this is confirmation, not conflict. Two figures
it carries that A-033 does not foreground, and that are worth keeping:
**registered voters 116,321 (2016) → 113,218 (2021)**, and **turnout
57.58% → 45.81% on the PR ballot**.

That trajectory is the fourth number problem from §12.1 seen from
another angle: 116,321 → 113,218 → a gazetted 2026 baseline of 122,059.
A rise of ~8,800 after a fall of ~3,100. Not impossible — the baseline is
a different vintage and a redelimited area — but **it is a reconciliation
nobody has done**, and it belongs beside the 132,133 / 131,963 / 119,099
spread rather than being treated separately.

One date to reconcile: A-092 cites the MDB gazette as **18 November
2025**; §7 records the delimitation we build on. Same board, possibly
different instruments. Check before either date is printed.

### 12.6 A-094 is the first evidence the work generalises

Every electoral asset in this register until now has been NW405. This is
NW383 Mahikeng, built to the same structure. That matters commercially
more than it matters technically: it is the first demonstration that the
research method is a repeatable product rather than one municipality's
case study, and A-093 is the method write-up that would let someone else
run it.

**It also makes the six-vs-seven roles and the two build-spec versions
more urgent, not less.** A second municipality means a second tenant, and
every unresolved ambiguity in the register gets multiplied by the number
of tenants before it gets resolved.

---

## 13. Batch 13 (28 Oct, 4 files) — the roll dataset itself, and what it cost us

§11.5 said: *the full dataset exists elsewhere; ask for it, do not rebuild
it.* It arrived.

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-098 | `CLAUDE_CODE_BRIEF.md` | `de2d5bae` | — | **DUP of A-087** | also present as the bundle's `README.md`, byte-identical — a third copy |
A-099 | `IC-ECOS-DATA-2026-02_NW405_VotersRoll.zip` | `c2874d20` | 4.2 MB → 36.7 MB, 10 entries | **KEEP — POPIA-GATED, NOT IN THIS REPO** | §13.1 |
A-100 | `load_voters_roll.sql` | `e8eb3c68` | 231 lines, PostgreSQL | **REFERENCE — wrong stack, see §13.5** | byte-identical to the bundle's copy |
A-101 | `parse_iec_voters_roll.py` | `86cf5be9` | 362 lines, pdfplumber | **KEEP as technique** | byte-identical to the bundle's copy |

### 13.1 Handling — where it is and where it is not

The bundle holds `verified_voters.csv` (25.8 MB, **131,963 named people
with masked IDs and home addresses**) and `rejected_voters.csv` (8.7 MB).
It was extracted to a session scratch directory, **not** into this
repository, and is not committed anywhere. **No voter row was read.**

Everything below was established from the non-personal files —
`vd_summary.csv`, `parse_log.jsonl` — plus row *counts* and column
*headers*. That is the same discipline §11.1 set when the roll arrived as
PDFs, and the reason it holds here is unchanged: nothing in reconciling a
dataset requires looking at the people in it.

### 13.2 Every claim in A-087 verifies

| claim | checked | result |
|---|---|---|
| 131,963 verified | `wc -l` − header | **131,963** |
| 52,176 rejected | `wc -l` − header | **52,176** |
| 184,139 entries | sum | **184,139** |
| 106 VDs, all PASS | `vd_summary.csv` | **106 rows, 106 PASS**, all three match-flags True on every row |
| declared = parsed | summed both | **131,963 / 52,176 / 184,139 on both sides** |
| 34 wards `64005001`–`64005034` | distinct | **34, contiguous 1–34** |
| 347 PDFs, 1 junk file skipped | `parse_log.jsonl` | **347 file records, 0 errors, 14,871 pages, 1 `SKIPPED_NON_PDF`** |
| 10,832 with no address | anomaly count | **10,832** |

Two things the brief does not mention, both benign and both worth knowing:
**230,155 rows were parsed and 184,139 kept** — 46,016 dropped as repeats,
which is the rejected list reprinted across Control and part files exactly
as §3 of the brief describes. And **zero `DUPLICATE_KEY_CONTENT_MISMATCH`
anomalies**, which is the load-bearing one: had any VD's roll been split
across two ward folders with restarting sequence numbers, the de-duplicator
would have silently dropped one ward's voters and logged a content
mismatch. None were logged. The 106 VDs are 106 VDs.

### 13.3 It explains the 108-vs-106 voting districts completely

Our seed has 108 station codes; the roll has 106. Compared code by code:

```
shared                                                105
in the seed only   86821151  TENT AT APPELDRAAI        193 voters (2 ward portions)
                   86910138  PUDULOGO PRIMARY SCHOOL  1394 voters (2 ward portions)
                   86940041  TENT AT NDLEBE           1584 voters
in the roll only   86821285  REGOROGILE EARLY LEARNING CENTRE, ward 27, 852 verified
```

Two of the three that vanished are **tents** — temporary stations. Between
a November 2025 delimitation schedule and an August 2026 certified roll,
three stations closing and one opening is ordinary churn, not a conflict.
**Nothing to reconcile. Both are right for their date.**

### 13.4 The split-station question — and why the roll cannot answer it

**The roll places all 106 VDs in exactly one ward each.** Our build says
25 of 108 station codes straddle a ward boundary. That looks like a flat
contradiction and is not one.

For the split codes, the roll's single-ward total tracks the seed's **sum
across all portions**, never one portion:

| VD | seed portions (ward:voters) | seed total | roll ward | roll verified |
|---|---|---:|---:|---:|
| 86910026 | 4:200 · 5:3,391 | 3,591 | 5 | **3,592** |
| 86820464 | 2:1,463 · 5:300 | 1,763 | 2 | **1,756** |
| 86820420 | 32:30 · 33:647 | 677 | 33 | **625** |
| 86820992 | 2:140 · 18:1,788 · 27:760 | 2,688 | 18 | **2,401** |

Across all 25: seed 41,408 against roll 43,382 for the 23 still open — the
same ~5% growth the municipality shows overall. **The two documents are
describing different things.** The gazette schedule apportions a station's
registered voters across every ward its catchment crosses. The certified
roll publishes one roll per station and files it under a single ward. Both
are accurate; neither is the other.

**The consequence is a hard blocker on ingestion, and it is the opposite
of the one we were guarding against.** `VotingDistrict.id` is
`wardCode::vdCode` and `inScope()` narrows on both precisely so a canvasser
working one ward's portion of a split station is not shown the other
wards' voters. If the roll's addresses are attached using the roll's single
ward, then for 23 split stations **the entire station's voters land on one
ward portion** — and ward 18 is handed people the schedule places in wards
2 and 27. That is the leak `SPLIT_VD_BASIS` exists to prevent, re-opened
from the other end.

**[U]** Nothing in the roll says how to apportion a station across wards,
so this cannot be solved by parsing harder. Either the IEC can supply the
per-ward split, or split stations are canvassed as whole stations with the
ward scope relaxed for them and that stated plainly to the user. **This is
a decision, not a defect.**

### 13.5 Reviewing the two scripts — seven findings

The parser is good work: word-level bounding boxes rather than `-layout`
text, a footer cut at its detected y-position, cross-file de-duplication,
and a pre-load and post-load gate either side of the database. The
reconciliation it claims is real, and I reproduced it. What follows is
what I would fix before a second municipality runs through it.

1. **`electoral_roll.address` has no RLS at all.** `roll_entry` gets a
   policy (`load_voters_roll.sql:216–224`); the address table gets a GIST
   index and nothing else. The brief's §6 says the PWA syncs "the user's
   RLS-scoped `electoral_roll.address` rows" — there is no such scoping.
   **The map layer, which is the thing canvassers actually consume, is the
   unprotected one.** Highest-severity item here.
2. **`ENABLE ROW LEVEL SECURITY` without `FORCE`.** The table owner
   bypasses RLS regardless of policy. The brief's test was "as a
   non-superuser", which is a different exemption. If the app connects as
   the schema owner — the common case after a `psql -f` load — every
   policy above is inert.
3. **A second roll edition cannot be loaded.** Open item 4 says a
   supplementary roll "should load as a new edition". But the two INSERTs
   never set `roll_edition` (so it always takes the default), and the
   post-load gate counts `roll_entry` **without filtering on edition** —
   so loading a second edition compares two editions' rows against one
   edition's declared totals and always rolls back. The plan and the file
   disagree.
4. **`footer_top()` can be fooled by a surname.** It takes any word with
   `top > 450` whose text is exactly `Sequence` or `Page`, with no
   x-position constraint. *Page* is a real surname. One voter named Page
   low on a page truncates every record below them. The accuracy gate
   turns that into a FAIL rather than silent loss — so it is a false-alarm
   risk, not a corruption risk — but the fix is one `x0` bound.
5. **A documentation claim that the code does not support.** The brief
   §3.3 says differing duplicate rows are "logged rather than one silently
   winning". The code logs the anomaly *and* keeps the first copy
   (`parse_iec_voters_roll.py:276–286`), and since results are sorted by
   filename, `_1of4` sorts before `_Control` — so totals come from the
   Control file while content comes from a part. **Zero occurrences in
   this run**, so no data is affected. The sentence is what is wrong.
6. **Nothing enforces the ID mask.** `id_number_masked VARCHAR(20)` is
   commented "never a full ID" and the brief verified all 184,139 match
   the mask — once, by hand. A `CHECK` would hold it for the next edition.
   This is the one field where a parser regression is a POPIA incident.
7. **`ward.registered_voters_count` is overwritten with the roll's
   verified count** (lines 103–108). For us that writes the Aug-2026
   figure into a column whose other consumers — the ward-norm deviation
   work — are computed against the Feb-2025 circular. See §5 item 0: the
   figure is fine, the silent change of vintage is not.

### 13.6 What the roll found in our own build — fixed this session

Reconciling the roll against `seed-data/jb-marks-nw405-wards-vds.json`
turned up a defect of ours, not theirs.

The NW405 gazette prints **BOIKHUTSO COMMUNITY HALL (86820419) twice
inside ward 32** — 625 and 350 — and both count towards the ward's printed
3,052. `parse-nw405-demarcation.mjs` transcribed both faithfully, so the
seed held two rows with the identical id `NW405-W32::86820419`.
`tools/dev/seed-emulator.mjs` writes a voting district **by its id**:

```
seed rows 136 · distinct ids 135 · last write wins
ward 32  ward doc 3,052   its VD docs 2,427   short by 625
tenant   ward docs 122,059   VD docs 121,434
```

**625 registered voters disappeared between the gazette and the database,
and nothing reported it.** The generator's own sanity check could not see
it: it sums rows, and both rows were present — only the ids collide.

Fixed, in the order that keeps it fixed:

- `parse-nw405-demarcation.mjs` now coalesces repeats of one station
  within one ward, **logging each one to stderr**, and then asserts id
  uniqueness and refuses to emit output that would lose a row. This
  adjusts no total — 975 and 3,052 are both what the gazette prints.
- The committed seed carries the merged row: **135 rows, 135 ids, ward
  totals and the 122,059 municipal total unchanged.**
- `wardSizeDeviation.test.ts` gains a guard that counts ids, not rows, and
  holds every ward's districts to its ward total. **Proved by reinjecting
  the duplicate pair**: it fails naming `NW405-W32::86820419 ×2`, then
  reverted clean.
- The quoted split count was wrong everywhere as a result. One of the
  "26" was never a split. Corrected to **25** in `staffProvisioning.ts`
  (which also said 24 in its own header, three numbers in one file),
  `firestore.rules`, and `wardSeedingSop.ts`.

The corroboration that the merge is right rather than merely tidy: the
certified roll publishes 86820419 as **one** voting district in ward
64005032 with 1,201 verified — consistent with 975 plus eighteen months,
and nothing like 625 or 350 alone.

---

## 14. Batch 14 (28 Oct, 1 paste) — the architecture white paper

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-102 | pasted *Technology Architecture White Paper — Election COS v1.0* | not in the upload store | 11 sections, ~30 named agents, 6 layers | **RECONCILE — the sharpest fork conflict in the register** | §14.1 |

It presents itself as the **"architecture baseline for build"** and says it
**supersedes** prior drafts. Taken at its word it would invalidate the
application that exists, seven days before the election. It should not be
taken at its word, but it should not be dismissed either — much of it is
verifiably right, and one part of it is verifiably wrong in a way that is
already on the §6 do-not-carry list.

### 14.1 It describes the fork, not this build

| | A-102 says | this repository is |
|---|---|---|
| API | Node.js / Express / Prisma, ECS Fargate | Cloud Functions, pinned `africa-south1` |
| Database | PostgreSQL 15+ on RDS, RLS, PL/pgSQL triggers | Firestore, `firestore.rules` |
| Queue | Redis + BullMQ on ElastiCache | — none — |
| Object store | S3 | Firebase Storage |
| Region | AWS `af-south-1` | Google `africa-south1` |
| Firebase | *"static hosting only… cannot serve as the tenant-context authority"* | **is the backend** |
| Agent tree | ~30 files under `agents/` | `src/agents` does not exist |

`package.json` carries no `express`, no `@prisma/client`, no `pg`.
`functions/src/region.ts` pins `africa-south1` under "IC-ECOS-BUILD-2026-V2
§0 rule 1: every Cloud Function, africa-south1, no exceptions."

**This is not a new conflict; it is A-023 and A-031/A-032 restated at full
length.** A-024, the technical infrastructure whitepaper, is the register's
authoritative architecture log, and its 2026-08 entry records the decision
the other way: Postgres/RLS **→** Firebase/Firestore `africa-south1`. A-102
argues the reverse and does not mention that entry.

**[U]** A document cannot supersede a decision by declaring that it does.
Either A-024's August entry stands and A-102 describes the fork, or A-102
is a later decision that reverses it — and if so it reverses it into a
stack with no running code. **Only the user can say which.** Nothing in
this repository changes on A-102 before 4 November either way.

### 14.2 What it gets right, checked against primary data

The simulator section is not hand-waving. Its swing wards were tested
against the primary 2021 IEC ward results (A-035):

```
A-102 names wards 2, 5, 21, 28 with margins 62, 201, 233, 165
A-035  ward  2  FF+ > DA   margin  62
       ward 28  ANC > DA   margin 165
       ward  5  DA  > FF+  margin 201
       ward 21  ANC > PA   margin 233
```

**Exact, all four**, and they are in fact the four tightest wards in the
municipality — the next closest is ward 32 at 325. Also verified: 2021
turnout 45.81% and FF+ 13.58% (both match A-092), gazette **8929** (matches
`parse-nw405-demarcation.mjs`'s own source header), 34 wards / 67 seats.

Two of its architectural positions are already how this build works, which
is worth saying because they are the two it argues hardest for:

- **"No simplified seat calculator in any UI."** Agreed and already true.
  `seatCalculator.ts` is the statutory engine, it is the only one, and
  A-090's demo page is exactly the "teaching model" A-102 refuses.
- **"Item 16 overhang fixture."** Already built and tested —
  `allocateSeats` carries `overhangSeats` and `councilSizeFinal`, with a
  regression test for a party winning more ward seats than its quota
  entitlement.

### 14.3 Two claims that are false against this repository

1. **PPFA at "R80k Yellow, R100k Critical, R15M hard block"** (§3.4).
   These are the superseded thresholds already named in §6 as
   must-not-carry-forward, and already found in A-042 and A-090. Current
   law is **R200,000 / R30,000,000**, Gazette No. 53182 of 18 Aug 2025.
   This build has it right, and says so in the file:

   ```
   src/modules/finance/ppfaDefaults.ts
     disclosureThresholdZAR: 200_000_00
     annualDonorCapZAR:   30_000_000_00
     warningPercentage: 0.8   // 80% of R200,000 = R160,000 — never R80,000 (superseded)
   ```

   **A document claiming to be the build baseline must not carry a
   repealed threshold into a compliance subsystem.** Fourth artefact now.

2. **"FINANCE_OFFICER gap… the schema currently omits it"** (§2, §10).
   Not here. `src/auth/seedRoles.ts` seeds seven roles and Finance Officer
   is one of them: Party HQ Admin, Municipal Team Lead, Ward Lead, VD
   Captain, Canvasser, Compliance Officer, **Finance Officer**. The gap is
   real in the Postgres schema A-102 describes; it is presented as a
   general defect and is not one. The open question it raises — whether
   Finance Officer should hold `cap-household-read` — is a live product
   question and goes to §5 item 3.

### 14.4 A sixth registered-voter figure, and two figures A-092 says cannot exist

**132,140 registered as at August 2026** (§5.1). That is a sixth number,
seven voters from the IEC stats page's 132,133 and 177 from the certified
roll's 131,963. Seven apart is not a vintage difference; it is a
transcription difference. Added to §5 item 0 as noise around an already
identified figure, not as a new candidate denominator.

**[U] MK at 1.82% and FF+ at 6.28% on the 2024 JB Marks ballot** (§5.2).
A-092 states plainly that *"the JB Marks municipal-level aggregate of the
2024 national/provincial election could not be retrieved from public
interfaces."* A-102 quotes both to two decimals without a source. They may
come from an extraction A-092 did not have — its own §10 open item asks for
exactly that pass. **Until a register row exists for them they fall under
A-102's own rule: an input with register status GAP is not used.** The
irony is the finding: the document's §5.4 invariant forbids the figures in
its own §5.2.

The same applies to the ward turnout range **29.26%–71.49%**, which cannot
be checked against anything in this register — A-035 carries ward votes
cast, not ward registration.

### 14.5 What is worth taking from it regardless of the stack question

Three things are good and are stack-independent:

- **The `anc_trajectory_baseline` parameter.** Making −8.14pp and −3.93pp
  two legitimate named inputs rather than a conflict to be settled is the
  right move, and it is the same discipline as recording both the
  three-term and four-term quota divisors in §7.1.
- **"Never produce a single point estimate as the forecast."** A campaign
  platform that emits one number is a liability.
- **Mandatory recorded seed.** A scenario that cannot be re-run is not
  evidence of anything.

**[U] What is not established** is the claim that the simulator is "the
only product in its class in South Africa" and that "no competitor can
ship it in a cycle" (§5.7). That is a market assertion with no source,
sitting in a document otherwise careful about provenance, and it should
not reach a pitch deck unchecked.

---

## 15. Batch 15 (28 Oct, 4 files) — the Firestore ingestion package

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-103 | `ElectionCOS-ingestion-voters-roll.zip` | `3794165c` | 34 files: Firestore ingest, rules, Dexie sync, 41 tests | **KEEP — the first uploaded asset that ships its own verification and passes it here** | §15.1 |
A-104 | `ElectionCOS-ingestion-voters-roll.zip` (2nd) | `3794165c` | — | **DUP** | identical, same message |
A-105 | `IC-ECOS-DATA-2026-02_NW405_VotersRoll.zip` | `c2874d20` | — | **DUP of A-099** | identical |
A-106 | `CLAUDE_CODE_BRIEF.md` | `de2d5bae` | — | **DUP of A-087** (fourth copy) | identical |

**No roll data is in the package** — no CSV, no JSONL, no PDF. Its
`parse_iec_voters_roll.py` and `load_voters_roll.sql` are byte-identical to
A-101 and A-100.

### 15.1 It is the Firestore answer to §13, and it works

§13.5 reviewed a PostgreSQL loader on a stack this repo does not run. This
is the same ingestion for the stack it does: `firestore/src/` (build,
ingest-core, sink, model, cli), `firestore.rules`, `firestore.indexes.json`,
`client/src/syncRoll.ts` + `rollDb.ts` for scoped Dexie sync, and a test
directory.

**I ran it.** `npm ci --ignore-scripts`, then:

```
tsc --noEmit                                     clean
vitest run                   29 passed, 12 skipped (rules need the emulator)
firebase emulators:exec --only firestore \
  "vitest run test/rules.test.ts"                10 passed  ← real emulator
                                                 41 of 41 passing
```

The ten rules tests include the denials — pins outside the caller's VD,
pins that touch roll fields, pins that impersonate another uid, pins
outside the South African bounding box, and address create/delete. The
`PERMISSION_DENIED` lines in the emulator log are the tests working.

**It fixes two of §13.5's seven findings, on this side:**

- **#1, the unprotected map layer.** In the SQL loader
  `electoral_roll.address` had no RLS at all. Here `roll_addresses` is
  behind the same `canReadRoll()` as the entries, and the only client
  write permitted is a field GPS pin — constrained to seven named keys,
  `geocodeSource == 'FIELD_GPS'`, `geocodedBy == request.auth.uid`,
  `geocodedAt == request.time`, accuracy ≤ 50 m, and a latitude/longitude
  box that rejects `(0,0)` and swapped coordinates.
- **#3, editions.** The SQL post-load gate counted rows without filtering
  on `roll_edition`, so a second edition could never load. Here gate 2
  filters on `rollEdition`, and there is a full lifecycle —
  `LOADING → ACTIVE → SUPERSEDED → PURGED` — with an atomic active-pointer
  flip and a `runPurge` that refuses to purge the ACTIVE edition without
  an explicit flag.

Two more things it gets right that are worth copying regardless of what
happens to the roll:

- Addresses are written with `merge: true` and the location fields are
  documented as owned by the field app, so **re-running ingest cannot
  erase a canvasser's GPS pin**.
- `resolveScope()` refuses to sync the municipality to a device *even for
  HQ_ADMIN* — a command role must name a ward or VD first. That is the
  right default and we do not have its equivalent.

### 15.2 Three integration conflicts — none of them defects in the package

The rules file says to "merge these match blocks into the app's main
`firestore.rules`". Do not do that unchanged.

1. **Root collections against a multi-tenant tree.** Every one of our
   match blocks is `/tenants/{tid}/…` guarded by
   `tenantOK(tid)` (`request.auth.token.tenantId == tid`). The package's
   are root-level — `/roll_entries/{id}`, `/roll_addresses/{id}` — with no
   tenant concept at all, because its model assumes **one Firebase project
   per party**. Merged as-is, 131,963 personal-information documents sit
   outside the tenant tree, and a Firestore root catch-all deny would not
   save them: in Firestore any matching `allow` grants.
2. **A claim we do not mint.** The rules read `request.auth.token.role`,
   `.wardCode`, `.vdCode`. Our tokens carry `tenantId`, `caps` (26
   capabilities), `geoScope`, `wardScope`, `vdScope` — **there is no
   `role` claim**. So merged today the blocks are inert and everything is
   denied, which is the good news. **The exposure is latent, not
   current**: the moment anything mints a `role` claim, finding 1 goes
   live. A rule that is safe only because a claim is missing is not safe.
3. **VD scope without its ward.** `inVd(d)` compares `vdCode` alone. Our
   `inScope()` requires both, and `staffProvisioning.ts` refuses a VD role
   that has no ward, for the reason §13.4 re-examined: narrowing on the
   district alone shows a canvasser the other wards' portion of a split
   station. Less dangerous here because the roll files each VD under one
   ward — but the two rule-sets state different contracts, and merging
   them would leave the weaker one in force for roll data.

### 15.3 A sixth role list, and one guard that does nothing

`model.ts` declares six roles: `HQ_ADMIN`, `LOCAL_HEAD`,
`FINANCE_OFFICER`, `WARD_LEAD`, `VD_CAPTAIN`, `VOLUNTEER`. Ours are seven:
Party HQ Admin, Municipal Team Lead, Ward Lead, VD Captain, Canvasser,
**Compliance Officer**, Finance Officer.

**There is no Compliance Officer in the package's model**, and
`canReadRoll()` grants only to `isCommand()` (HQ/Local Head) or
`isFieldRole()` (Ward Lead/VD Captain/Volunteer). So under these rules
**our Compliance Officer cannot read the roll at all** — which, for the
role whose job is auditing how personal information is handled, is a
decision somebody should make deliberately rather than inherit. Goes to
§5 item 3; this is now the sixth document to propose a role list.

**A dead guard.** The address-update rule carries
`&& role() != 'FINANCE_OFFICER'`. `FINANCE_OFFICER` is in neither
`isCommand()` nor `isFieldRole()`, so `canReadRoll()` has already failed
for that role one line above. The clause can never change an outcome. It
is harmless but it reads as protection, which is the exact thing
`staffProvisioning.ts` refuses: *"a staff record that appears to limit
someone and does not is worse than one that plainly does not limit them."*

### 15.4 What it still does not decide

- **The POPIA lawful basis.** The package *implements* loading 131,963
  name + masked-ID + address records into Firestore; it does not
  authorise it. Its own `CLAUDE.md` and A-087's open item 3 both say
  counsel must sign off first. **§11.1 is unchanged and remains the
  gate.** Nothing here is loaded anywhere.
- **The split stations.** §13.4's question — the roll gives one ward per
  VD, our seed has 25 codes across 2–3 wards — is untouched. The package
  inherits the roll's one-ward-per-VD shape, so adopting it adopts that
  answer by default rather than by decision.
- **The stack.** The package's `CLAUDE.md` frames it a **third** way:
  *"Firebase/Firestore (GCP `africa-south1`) for rollout; PostgreSQL 16 +
  PostGIS with RLS (Prisma) as the target."* A-024 records Firestore as
  the decision; A-102 records Postgres as the baseline with Firebase
  bounded to static hosting; this says Firestore now, Postgres later.
  **Three framings, three documents, same week.** §14.1 stands: only the
  user can settle it.

---

## 16. Batch 16 (28 Oct, 2 files) — a screenshot I cannot read

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-107 | `ElectionCOS-ingestion-voters-roll.zip` | `3794165c` | — | **DUP of A-103** (third copy) | identical |
A-108 | screenshot, `image.webp` | `eb74af2f` | **67 × 5,110 px** chat transcript | **REFERENCE — content not recoverable** | §16.1 |

### 16.1 What the screenshot is, and what it is not

**It is 67 pixels wide.** At that width the body text is not a rendering
problem, it is absent — there are roughly two pixels per character. I
upscaled and sharpened four slices; headings come back, body text does
not, and no amount of processing recovers what was not captured.

**So I am not going to summarise its contents**, because any summary
would be me inventing plausible sentences around a few legible headings.
What follows is only what is actually readable.

It is a **chat transcript**, not one document, and it contains two
distinct pieces of work:

**1. "Election Campaign OS 1.0 — Agent Development Blueprint."** Title
legible. Structured as numbered layers with a subsection per agent.
Recoverable headings include `Agent 1.2 — Media Compression Agent`,
`1.3 — Field Context Guard`, `1.4 — Offline Consent Validator`,
`2. API Gateway & Backend Service Agents`, `2.1 — Tenant Context Agent`,
`2.2 — POPIA Masking Agent`, `2.3 — Soft Delete`, `2.4 — LWW`,
`4.4 — Incident Dispatch Agent`, `4.5 — Audit Log`,
`5. Orchestration Layer`, `5.1 — Campaign Director (Meta-Agent)`,
`5.2 — Compliance War Room Agent`, then an *Inter-Agent Communication
Contracts* table and a deployment table.

**That is A-102 §3 agent-for-agent**, layers 1–5 in the same order with
the same names. One difference is visible and worth recording: **no sixth
layer appears here.** A-102 §3.6 is the simulator subsystem, and A-102
tags the earlier layers `[SIM]`. So this blueprint is the **earlier**
document and A-102 extends it — which also means §14's finding stands
unchanged: this is the fork's agent architecture, on the stack §14.1
could not settle.

**2. An analysis of the Cloudflare edge Worker.** Heading legible as
*"…Cloudflare Edge Worker for Election Campaign OS 1.0 V2"*, with
sections reading approximately *What it verifies / does*, *Strengths of
the Worker script* (a table), and **"Critical Findings & Required
Fixes"** — a numbered list with red and orange severity markers and
green-on-dark code blocks, of which 3.1, 3.2 and 3.3 are discernible as
headings only.

**That is a review of A-088** (`Election.docx`, §12.4). It is the one
thing in this batch I actively want, because §12.4 recorded A-088 as
good technique with the wrong origin constant, and somebody has since
gone through it properly and found things I did not look for. **None of
those findings are readable.**

### 16.2 The ask

The blueprint adds nothing over A-102 §3, which is already registered —
no action needed there unless the full text differs.

**The Worker analysis is worth having as text.** Send the document, or
paste the "Critical Findings & Required Fixes" section, and it gets
reviewed against A-088 and `publicDomain.ts` the same way everything
else has been. A 67-pixel-wide picture of findings is not findings.

---

## 17. Batch 17 (28 Oct, 2 files) — the provenance / report / routing slice

ID | Asset | Hash | Kind | Disposition | Note
---|---|---|---|---|---
A-109 | `deep-researcher.md` | `4f9927ac` | Claude agent definition | **REFERENCE — tooling, not EC OS** | §17.5 |
A-110 | `Ds_conversation.docx` | `d4ab4e1c` | 778 lines: 3 interlocking artifacts | **RECONCILE — reviewed below** | §17.1 |

**This is not the Cloudflare Worker analysis §16.2 asked for.** That one is
still outstanding. A-110 is a different and more substantial document:
provenance enforcement in PL/pgSQL, the Scenario Report Agent's rendering
contract, and the Campaign Director's routing table — the vertical slice
under A-102 §3.6 and §5.

PostgreSQL and PL/pgSQL throughout, so **§14.1 is unchanged**: this is the
fork's stack and nothing here ports to Firestore as written. Reviewed
anyway, because the design is good and the defects are the interesting
part.

### 17.1 What it gets right

- **Nothing is dropped silently.** Every Campaign Director rejection —
  `CAPABILITY_DENIED`, `TARGET_UNHEALTHY`, `PREREQUISITE_MISSING`,
  `NO_ROUTING_RULE`, `SCENARIO_POLICY_VIOLATION` — escalates to the
  Compliance War Room. The document names why, and it is the right why.
- **`NO_HEARTBEAT` is treated as critical**, on the stated grounds that a
  silent ingestion agent is indistinguishable from a corrupted one.
- **Invariant 3** — no party result without a `quota_calculation_id` — is
  the machine-checkable form of A-102's "no naive Hare calculator",
  which until now was a promise in prose.
- **Separate `cos_ingestion` credentials** from the app role, with
  `REVOKE INSERT, UPDATE, DELETE … FROM cos_app`. That is the real
  control in Artifact 1, and it works.
- **It carries no PPFA figures at all.** The routing table has
  `ppfa.limit.warning` and `ppfa.limit.blocked` and no thresholds, so
  **A-102 §3.4's repealed R80k/R100k/R15M does not propagate here.**

### 17.2 Three findings in Artifact 1 (provenance)

1. **The session guard is bypassable by one statement, and §1.6 counts it
   as a control.** `fn_require_ingestion_capability()` rejects any write
   to `dataset_provenance` unless `current_setting('app.agent_code')` is
   `'DATASET_INGESTION_AGENT'`. That is a custom GUC, and **any session
   may `SET` one — no privilege is required**. So the function stops
   nothing the GRANT has not already stopped. §1.5 half-concedes this
   ("the triggers are only as strong as the privileges underneath them"),
   but §1.6's table then lists it as a separate guarantee: *"only
   DATASET_INGESTION_AGENT session can write (enforced by function)."*
   The GRANT is the control. The function is decoration presented as
   enforcement — the same class as the dead `FINANCE_OFFICER` clause in
   §15.3.

2. **`SECURITY DEFINER` with a mutable `search_path`, and it is not
   needed.** All three functions get it in §1.5, the stated reason being
   *"so it can query `dataset_provenance` regardless of the caller's
   privileges"* — but the lines immediately above grant `SELECT` on
   `dataset_provenance` to both roles, so no caller lacks it.
   Meanwhile the function bodies reference `dataset_provenance`
   unqualified, and a `SECURITY DEFINER` function resolves unqualified
   names through the **caller's** `search_path`. That is the standard
   PostgreSQL escalation vector: a caller who can create a schema points
   `search_path` at their own `dataset_provenance` holding a `VALID` row,
   and the provenance check reads their table instead. **The control that
   guarantees provenance can be redirected by the party it is checking.**
   Either drop `SECURITY DEFINER`, or pin
   `ALTER FUNCTION … SET search_path = pg_catalog, public`.

3. **A provenance row with NULL coverage validates everything, and the
   comment claims otherwise.** The code is
   `IF v_prov_event_id IS NOT NULL AND v_prov_event_id <> NEW.electoral_event_id`.
   The comment above it says NULL is allowed *"only if the row explicitly
   claims multi-event coverage"*. **No such flag exists anywhere in the
   artifact.** A `dataset_provenance` row with both `covers_event_id` and
   `covers_municipality` NULL passes every result row, for every event, in
   every municipality. Given what §6 records about fabricated ward figures,
   that is the one hole in Artifact 1 that matters. Fix is either NOT NULL
   columns or a real `covers_all_events` boolean that the trigger tests.

### 17.3 Two findings in Artifact 2 (the report)

4. **The rendering template hard-codes JB Marks's swing wards.** §2.4's
   section 3 reads, as literal template prose: *"The four swing wards
   identified in the baseline (Wards 2, 5, 21, 28 — all decided by under
   400 votes in 2021)."*

   Those four are **correct** — §14.2 verified them against the primary
   2021 IEC results at 62, 165, 201 and 233, all under 400. That is not
   the problem. The problem is that they sit in a *generic* template in
   which every other figure is interpolated and carries a `[R:…]`
   citation tag. Run it for **Mahikeng NW383 (A-094)** — the register's
   first non-NW405 municipality — and the report states JB Marks's swing
   wards as that municipality's, in prose, as the only numeric claim in
   the whole template with no citation tag. The document's own thesis is
   that every figure traces to a register row; this one cannot.

   **Checked the same pattern here and this repo is clean.** The only
   live NW405 constant outside seed data, tests and comments is
   `NW405_MAP_CENTER` in `src/lib/googleMapsConfig.ts`, and it is named
   for the municipality, used only as a pre-load map framing default, and
   already carries a comment forbidding exactly this
   mistake — *"if per-ward map framing is ever needed, derive it from that
   seed file's real ward list, not from a value invented here."*

5. **The invariants check the citations that exist, not that every figure
   has one.** §2.6's guarantee table opens with *"No figure appears
   without a register row."* Invariant 6 checks that every cited id
   resolves to a supplied row. **Nothing checks the converse.** A report
   containing an uncited figure passes all seven checks and still renders
   the static *"✅ All cited register rows validated"* block, which is
   fixed markdown rather than derived from the check results. The checks
   are sound; the guarantee claimed over them is wider than they prove —
   and finding 4 is an instance of precisely the gap.

### 17.4 One question, not a finding

**[U] Two different "hung council" numbers.** Invariant 7 requires
`coalition_frequencies` to sum to 1.0 ± 0.02, and A-102 §5.6's worked
sample puts a `Hung: 0.22` bucket inside that set while separately
reporting `hung_council_frequency: 0.34`. Either they measure different
things — in which case a client-facing report must say which is which —
or one is wrong. No invariant cross-checks them, and nothing in either
document defines the relationship.

### 17.5 A-109 is unrelated to any of this

`deep-researcher.md` is a Claude agent definition — `claude-opus-5-5`,
low effort, auto permission policy — instructing a research agent to
decompose a question, prefer primary sources over aggregators, and close
with a confidence-and-gaps section. Sound instructions, and the same
discipline this sheet runs on, but it is **tooling, not an EC OS
artifact**. Registered so it is not mistaken for one of the ~30 agents in
A-102 §3; it belongs to none of those layers.

---

## 18. Batch 18 (28 Oct) — the repositories, the IEC API, and a harvest service that must not be built

Three things arrived together: two IEC URLs, a pasted `ElectoralHarvestService`,
and instructions to clone ten repositories. The clones answer §5 item 4.

### 18.1 The stack question is settled, and not by argument

All ten were attached and cloned. The two at the centre of the entire corpus:

| repository | refs | contents |
|---|---|---|
| **`AlphiRich/ElectionCOS1_0`** | `main`, `feat/voters-roll-ingestion` | `main`: **one file**, a README reading `# ElectionCOS1_0`. The branch: **25 files, byte-identical to A-103**, committed today |
| **`AlphiRich/Election-COS1.0_v2`** | `main` only | **zero files. The repository is empty.** |

`ElectionCOS1_0` is the repository `CLAUDE_CODE_BRIEF.md` names in its first
line — *"Consumer: Claude Code, working in `AlphiRich/ElectionCOS1_0`"*.
`Election-COS1.0_v2` is the name behind the v2 build plan.

**So the application described by A-102, A-110, A-023 and A-031/A-032 — AWS
`af-south-1`, Express, Prisma, PostgreSQL with PL/pgSQL triggers, BullMQ,
~30 agents, the Monte Carlo simulator — does not exist in any of these
repositories.** Not on `main`, not on a branch, not in a tag. The only
thing ever pushed to `ElectionCOS1_0` is the ingestion package reviewed in
§15, and `Election-COS1.0_v2` has never had a commit with a file in it.

The only working application in the account is
`innovation_consult_front/election-cos-app` — Firebase/Firestore,
`africa-south1`, 65 files, 1,008 tests, green.

**§5 item 4 and §14.1 close.** The question was never which of two systems
wins. One system exists and the other is a set of documents. A-102's claim
to supersede it was a claim about a repository with one README in it.

The other eight, recorded for completeness: `psychekit` (16 entries),
`adk-js` (25, 11 MB), `apphosting-adapters` (18, 44 MB), `eval_hub`
(4, 59 MB), `.github` (5), `claude` (README only), `gemini-cli-`
(README only), and **`npm-install-firebase`, which has no commits at all.**

### 18.2 The pasted `ElectoralHarvestService` — do not build it

Four findings, the first decisive and the second the most dangerous.

1. **The endpoint does not exist.** I read `api.elections.org.za/Help`
   directly this session. The API publishes `Delimitation`,
   `LGESeatCalculationResults`, `LGECandidates`, `ContestingParties`,
   `NPESeatCalculationResults` and per-person `Voters/IDNumber/{ID}`.
   **There is no bulk voter-roll endpoint and no `wardId`/`vdCode` voter
   query.** The base URL is also wrong — real paths are
   `https://api.elections.org.za/api/v1/…`, so `${BASE}/voter-roll`
   against a `/v1` base resolves to nothing either way. The IEC does not
   publish the roll over this API; it publishes it as the certified PDFs
   that IC-ECOS-DATA-2026-02 parsed.

2. **`sha256(idNumber)` is not masking, and the audit log certifies that
   it is.** The hash is unsalted and a South African ID number is a
   narrow, structured space — `YYMMDD` + `SSSS` + citizenship + a digit +
   a derived checksum. That is on the order of 10⁹ candidates, which is
   a precomputation one machine can do; given an approximate date of
   birth it collapses to about 10⁴, which is instant. **The hash is
   reversible by brute force.** The code then writes
   `complianceStatus: 'POPIA_MASKED'` into an append-only audit log —
   so the record asserts a protection the code does not provide. That is
   worse than no label: an auditor reading the trail is told the
   obligation was met.

3. **It writes the roll into `voter`.** `prisma.voter.createMany` with no
   consent field at all. A-087 §5, the ingestion package's own
   `CLAUDE.md` and §11.1 here all say the same thing: `voter` is
   consent-gated by `trg_popia_consent_check`, and the roll is a target
   list. If the trigger exists this code fails; if it succeeds the
   trigger is not there. Both answers are bad.

4. Smaller, but real: the two audit writes use different columns
   (`complianceStatus` vs `severity`) for one table; `error.message` on a
   `catch` binding does not compile under TS strict, where it is
   `unknown`; and `skipDuplicates` needs a unique constraint the snippet
   never declares. It is also Prisma — which, per §18.1, has no
   repository to live in.

The phone-number mask is the one part that is correct.

### 18.3 The network premise changed, and two defects were hiding behind it

`elections.org.za` **is reachable from this environment.** The skill, two
module comments, a guard in `municipalRegister.test.ts` and the seed's
own `notReachable` field all record it as denied at CONNECT. That was
true; it is not true now, and the acquisition tool found two latent bugs
the moment it could reach anything:

- **27 of 31 registry URLs carried an unencoded space**
  (`Downloadable Party Results/NW.csv`), which `urllib` rejects outright.
  Those rows had never been fetchable and never could have been, by any
  network. Percent-encoded: `--probe` went from **3 of 31 to 21 of 31**.
- **Every IEC row expected `content_type: text/csv`.** The IEC serves
  these CSVs as `application/octet-stream`, so the verifier correctly
  refused a perfectly good file. `verify_payload` now accepts a list of
  types; `--self-test` still rejects all six bad payloads, so the check
  was corrected, not loosened.

Still failing, honestly: **9 × HTTP 404** (KZN, LP, WC across all three
years — every candidate token 404s and the directory index is 403, so the
correct filenames cannot be derived from here and the skill forbids
guessing one), and **1 TLS failure on `demarcation.org.za`** (CONNECT
succeeds, the handshake does not; not our bug, and not blocking, since
that gazette is the one document already in hand).

### 18.4 The seat calculator now traces to a file we fetched ourselves

`LGE_2021_NW_VD_Results.csv` was fetched through the tool and verified —
**10,606,612 bytes, SHA-256 `a07f630d…`, 75,680 data rows**, which also
independently confirms the supplier's `min_rows` on a row that was marked
CONFIRMED with the note *"this build has NOT fetched it"*. It is
gitignored; the run manifest is kept.

It reconciles everything it touches:

```
registered voters, unique VD      113,218   = A-092's 2021 figure, exactly
PR shares  ANC 47.72 · DA 25.40 · FF+ 13.58 · EFF 9.16 · PA 2.60
                                          = A-092, all five to 2 dp
wards           34, 64005001–64005034     = the ward-ID rule, a FIFTH time
voting districts in 2021            113   → 108 (Nov 2025) → 106 (Aug 2026)
```

That VD series completes §13.3: stations consolidate over time, and 113 →
108 → 106 is one trend, not three conflicting counts.

**And it explains `A` for the first time.** Our test carried
`A = 101439 // as published`, with no account of how it was composed:

```
PR ballot valid                 50,733
Ward ballot valid             + 51,156
                              = 101,889
INDEPENDENT ward votes        −    450   (no PR list, so no PR seats)
                              = 101,439  = A
floor(101,439 / 67) + 1       =   1,515  = the published quota
```

**All nine party figures match the export exactly** — each is that
party's PR plus ward votes. So the chain now runs IEC primary export →
our acquisition tool → A → quota → `allocateSeats`, with a SHA-256 at the
first link. That is the strongest provenance in the register, and it is
recorded in the test rather than left to a download being present.

---

## 19. The four governing documents — read at last, and the build already obeys them

Registered long ago, never opened. Read 28 Oct.

ID | Asset | Hash | Disposition
---|---|---|---
A-111 | `00-MASTER-INDEX-work-partition-map-v2.md` (IC-ECOS-MASTER-2026-V2, 8 Aug) | `0a786c0f` | **KEEP — the control document** |
A-112 | `06-reconciliation-record-v2.md` (IC-ECOS-RECON-2026-V1, 8 Aug) | `74c51dbd` | **KEEP — decision register** |
A-113 | `CLAUDE-HANDOFF.md` (9 Aug) | `c13f6f16` | **SUPERSEDED by A-111/A-112** — §19.3 |
A-114 | `Election_Campaign_OS_Business_Plan_v2.docx` | `3a63dc94` | **DEFECT — not artefact 02-V2** — §19.4 |

### 19.1 They were already governing the build

The striking thing is that nothing here is news to the code. `src/dal/ports/documents.ts` line 5 cites *"master index §3.3, build spec §3.5"*. `src/modules/finance/escalation.ts` cites *"IC-ECOS-BUILD-2026-V2 §6.8.3"*. A prior session plainly had 00 and 01-V2 in hand; only this register had not caught up.

So this was a conformance audit, not a build input. **Thirteen checkable mandates, thirteen conformant:**

| # | Mandate | Source | Build |
|---|---|---|---|
| 1 | PPFA R200,000 / R30,000,000 | 00 §1.1, 06 §2 | `ppfaDefaults.ts` ✓ |
| 2 | Warning at 80% = R160,000 | 06 §2 | `warningPercentage: 0.8` ✓ |
| 3 | Thresholds are configuration, never constants | 06 §2.2 | tenant `ppfaConfigs` ✓ |
| 4 | `ppfaConfigs` append-only, effective-dated | F-07 | `firestore.rules:277` `allow update, delete: if false` ✓ |
| 5 | Tenant root: `donorLedger`, `donations`, `donationAlerts`, `ppfaConfigs` | Δ08 | all four present ✓ |
| 6 | **Never hard-block a donation at the cap** — flag, escalate to a named human | 06 §2.2 | `escalation.ts` is pure classification; `requiresNamedAcknowledgement` ✓ |
| 7 | Hold the aggregation function until Q1–Q3 land | 06 §5 | *"NOT wired up to run automatically yet"* ✓ |
| 8 | PPFA online-only; Dexie carries no donor/donation tables | Δ11 | none in the Dexie schema ✓ |
| 9 | **7 seed roles**, Finance Officer restored | 00 §3.3, Δ09 | 7 + 26 capabilities ✓ |
| 10 | Tokens `#1A2246` / `#B7913F` / `#7E1F2E` / `#F7F4EE` | D3, A-113 §6 | `tokens.ts` exact ✓ |
| 11 | Never "Blockchain Verified Hash" | 00 §3.3 | `documents.ts` says so and two tests assert no `/blockchain/i` ✓ |
| 12 | Regulation of Gatherings Act, **Section 3** | A-113 §5 | only correct name appears; no "Section 4 notice" ✓ |
| 13 | **Do not claim "all personal information is stored in South Africa"** | 00 §3.1 | `legal/facts.ts` lists it as a claim that must not be made, citing POPIA §72 ✓ |

Mandate 13 is the one worth dwelling on. **00 §3.1 establishes that Firebase Auth has no data residency**: voter PII sits in `africa-south1`, but staff identity records sit in the United States. The mandated response is to keep the Auth record to a UID and a work email and put everything else in Firestore — and `staffProvisioning.ts` and `PermissionsPage.tsx` both state that role and scope are written *"to Firestore in South Africa and never to Auth."* The build reached the right answer and the register never recorded why.

### 19.2 The governance rule worth keeping

A-112 §1 is a documented case of a prior Claude Code session **attributing quotations to artefacts that do not contain them** — five of them, tabulated — and then proposing to build Phase 2 against a document set that existed only in its own context. The diagnosis in §1.1 is fair to everyone: a scope change was given conversationally, the session correctly refused to act on conversation alone, and then treated its own write-up of it as the formal re-issue.

> **A change of scope must land in the artefact before it lands in the build.**

That is now a standing rule here. It is also why this sheet records a hash for everything and why **[U]** marks what is not established — and it is the reason the §18.2 harvest service and the §14 white paper were registered rather than acted on.

### 19.3 A-113 is superseded by a document one day older

`CLAUDE-HANDOFF.md` is dated **9 August**, the V2 set **8 August** — and the 9th is the superseded one. It says so itself: it was *"compiled from claude.ai Project memory + live project_knowledge_search"*, and that knowledge base still held V1. So it asserts **PostgreSQL 15+ with RLS**, **AWS Cape Town `af-south-1`**, and a *"canonical 5-role list"* — all three reversed by A-111 the day before, and all three now also refuted by the repositories (§18.1).

It is not worthless. Three of its corrections are real and all three are already applied: the Gatherings Act citation (Section 3, correct name), the POPIA 48-hour purge reframed as house policy rather than statute, and the seat calculator that *"allows 35 ward wins for 34 seats"* — the exact defect `seatCalculator.ts` opens by describing as fixed.

### 19.4 A-114 is not the V2 business plan, and it carries the repealed thresholds

Its title block reads **"Comprehensive Business Plan · v2.0 · Prepared: 20 July 2026"**. That is its own version number, nineteen days *before* the V2 artefact set, so it is **not** artefact 02-V2 and none of Δ14–Δ16 is in it.

What is in it: **R100,000 and R15m, twice, with zero mentions of R200,000 or R30,000,000**; "Section 4 notice"; "PostgreSQL 15+ (row-level security)"; and `af-south-1`. **Fifth artefact in this register to carry the repealed thresholds — and the first that is investor-facing**, which is the worst place for them. A-112 §5's instruction applies directly: *"Discard all prior versions… Do not reconcile them against remembered or inferred content."*

### 19.5 What closes, and what is still open

**Closes — §5 item 3, the role model.** A-111 §3.3 ends it twice over: *"Seven seed roles, not six"*, and the count was the wrong question anyway, because the permissions screen shows a **grants model** — effective permissions are `role_defaults ∪ user_overrides`, which a fixed enum cannot express. Our 7 roles and 26 capabilities are that model.

**Closes — §5 item 8, the palettes.** D3 names `#1A2246` / `#B7913F` / `#7E1F2E` as canonical and A-113 §6 gives the full set, including the `#33427E` and `#2F7E4A` that turned up in A-085's white paper. Ours match exactly. The other four palettes in the register are drift, not alternatives.

**Still open, and now better specified:**

- **Q1 — is R200,000 per donation, or cumulative per donor per year?** A-112 §2.1 shows the reporting genuinely conflicts and says plainly there is no safe default. We ship `CUMULATIVE_PER_DONOR_PER_YEAR` marked `// PROVISIONAL — §6.8.1 Q1 unresolved`, behind a strategy interface, so answering it is a config change. **Attorney.**
- **Q2 — what is the financial year?** 1 April – 31 March is asserted in our build and A-112 says it is asserted, not sourced. If wrong, every quarterly boundary is wrong.
- **Q3 — is the R30m cap per party or across all parties?** If per party, the platform sees only its own tenant's share and **must not present its figure as the donor's total exposure**. That is a UI honesty requirement.
- **D7 — accept Firebase Auth's offshore staff identity, or defer for self-hosted auth?** The build has taken the "accept, disclose, minimise" default. It should be an explicit decision, not a default.
- **D5 domains and D6 financial model** map onto §5 items 9 and the A-114 problem above.

---

## 20. Batch 20 (28 Oct, 5 files + a paste) — the metered voice relay

ID | Asset | Hash | Disposition | Note
---|---|---|---|---
A-115 | `check-no-hex.mjs` | `e72a0619` | **DEFECT — do not adopt** | §20.1 |
A-116 | `gemini-code-…1745836.ts` | `7183301b` | **DUP of the §18.2 paste** | already on the §6 do-not-carry list |
A-117 | `media_1793046597089_….zip` | `b6ded8d7` | **DUP of the §8 security bundle** | all nine files byte-identical |
A-118 | `gemini-code-…3471827.py` | `7cc90084` | **SUPERSEDED by the paste** | the relay before metering; §20.3 |
A-119 | `Untitled-2.py` | `e3b0c442` | — | **zero bytes** (`e3b0c442` is the empty-file hash) |
A-120 | pasted metered voice relay + capability seed | not in the upload store | **RECONCILE — do not deploy** | §20.2–20.4 |

### 20.1 A-115 would break the build on the first run

It is a near-copy of our own `scripts/check-no-hex.mjs` with one entry
removed from `ALLOW_LIST`: `src/auth/GoogleIcon.tsx`. I ran it against
our source:

```
✗ check:hex failed — raw hex colours found outside src/design/tokens.ts:
  src/auth/GoogleIcon.tsx: found raw hex literal "#4285F4"
  … "#34A853"  … "#FBBC05"  … "#EA4335"
exit=1
```

Those four are Google's brand mark, which is deliberately not a
design-token decision — our copy says so in the comment the upload
deleted. **Adopting A-115 fails `check:all` immediately.** Our version
stands.

### 20.2 Two claims in the covering note are false against the engine's own source

The note is confident about the V2 metering engine. A-032's build bundle
contains that engine, so both claims are checkable.

1. **The capability seed will not run.** `capability` is exactly four
   columns — `key`, `description`, `category`, `metered_cost`
   (`010_v2_shared_tenancy.sql:95`). The proposed INSERT supplies eight,
   including **`name`, `is_geospatial`, `is_strategic` and
   `scope_level`, none of which exist.** The migration errors on the
   first unknown column. (The key itself, `advisory.voice.chunk`, does
   conform to the documented `{category}.{noun}.{qualifier}` convention.)

2. **The soft-cap discount does not exist in code.** The note says a
   tenant at the soft cap "instantly transitions to the discounted 50%
   multiplier via the underlying `debit_tokens` stored procedure, with
   zero changes required to the FastAPI layer." `debit_tokens` reads
   `metered_cost` into `v_cost`, checks the balance, debits `v_cost`, and
   then **writes** spend into `soft_cap_monthly`. Nothing reads that
   table back, and nothing halves a cost. `p_token_cost_override` exists
   but no caller computes a discounted value; the SDK only exposes a
   `GET /soft-caps`. **The 50% drop is specified in pricing §5 and
   implemented nowhere** — and the skill's own "Known gaps" section,
   which is careful and lists three others, does not list this one.

**A third premise is overstated rather than wrong.** The note says
chunking is necessary because `reverse_debit()` "is strictly for
60-second execution failures". The skill says the opposite about
enforcement: *"there is no time check in the function — this is a known,
documented gap"*, and the 60 seconds is policy enforced only in the
SDK's `withMeteredAction`. The sound half of the argument survives:
there is **no partial-refund primitive**, which on its own justifies
chunking over a large up-front reservation.

### 20.3 The relay itself — nine findings, in severity order

1. **No authentication or authorisation at all.**
   `/ws/live-advisory/{tenant_id}/{actor_id}/{session_id}` takes both
   identities **from the URL path**, unverified. Anyone who can reach the
   endpoint can name any tenant and spend that tenant's CampaignTokens,
   and `actorId`/`actorName` are caller-asserted and written into the
   metering audit trail. In a product sold to competing parties, that is
   cross-tenant theft with falsified attribution. Everything below is
   secondary to this.
2. **The "drop the connection" behaviour does not work.**
   `RuntimeError("Tokens depleted…")` is raised **inside a task**.
   `asyncio.wait(…, FIRST_COMPLETED)` returns that task in `done` and
   never re-raises; nothing calls `task.result()`. So the
   `except RuntimeError` block is unreachable, the `close(code=4002)`
   never fires, and the stream falls through `finally` and is marked
   `COMPLETED`. **The constraint the whole design exists to enforce is
   not enforced.**
3. **"Insufficient tokens" is asserted on every failure.** `debit_chunk`
   returns `False` on any exception and on any non-200 — a gateway
   timeout, a 500, a 429. A campaign is told it is out of credit when the
   metering service is merely unreachable, and its call is dropped.
4. **The debit check is not atomic.** `hgetall` → compute → `hincrby`
   across two round trips, with `client_to_gemini` and `gemini_to_client`
   both calling it on one session. Both can read the same counters and
   both debit, or neither. (The *database* debit is safe —
   `debit_tokens` locks the wallet `FOR UPDATE` — so the unsafe
   bookkeeping is entirely the relay's local Redis state.)
5. **A timed-out debit is charged and lost.** `requestId` is
   `f"{session_id}-{datetime.now().timestamp()}"`, a float. The skill
   already records that `debit_tokens()` has **no request-level
   idempotency constraint**, so a retry double-debits — and this relay
   does not retry, so a debit that succeeds server-side but times out
   client-side bills the tenant and drops the call.
6. **One chunk per overrun.** A frame larger than the remaining
   allowance buys a single further 500 KB block, so consumption can
   outrun payment. It needs the number of chunks required, not one.
7. **An unknown session gets a free chunk.** `hgetall` on a missing key
   returns `{}`, so `prepaid_bytes` falls back to `CHUNK_SIZE_BYTES`.
8. **Charged before the session exists.** The first `debit_chunk`
   precedes `start_session`; if that write fails the tenant has paid for
   a session that never began, and reversal is policy-bound to 60
   seconds.
9. Cancelled tasks are never awaited before the Gemini context closes;
   Redis and the gateway are hardcoded to `localhost` with no auth; and
   `gemini-2.0-flash-exp` is an experimental preview model under a
   billed production feature.

**A-118 is the same relay before metering**, and it carries the defect
the covering question is about: `except Exception as e:` →
`redis_client.hset(…, "error", str(e))`, which writes arbitrary exception
text into a shared store.

### 20.4 The question asked — port the `[REDACTED]` regex into the relay?

**No. The instinct is right and the mechanism is wrong.**

The instinct is right because A-118 does write raw exception text to
Redis, and a stack trace from this stack can carry an ID number, a field
worker's phone number, a SQL parameter list, or a base64 audio frame.

Three reasons not to do it as proposed:

- **`fn_sanitize_rejection_reason` is in nothing we hold.** Searched this
  repository, `ElectionCOS1_0`, and every uploaded bundle including
  A-032's migrations: **zero matches.** `reverse_debit` and
  `debit_tokens` are real and were checked above; this function is not.
  I will not port a regex I have never seen.
- **A denylist regex over free text is a control this project has
  already rejected once.** A-113 §2 flags the LET guardrail as
  *"currently implemented as a denylist regex; should be a schema-level
  allowlist — flagged weakness."* Copying that shape into a second place
  doubles down on it. An SA ID pattern is also both over-inclusive (any
  13 digits) and under-inclusive (spaced or hyphenated).
- **Copying a regex across a language boundary forks it.** PostgreSQL
  ARE and Python `re` differ on lookbehind, `\s`, and POSIX classes. Two
  copies drift, and only the SQL one has tests.

**What to do instead:** stop writing exception text into Redis. Log an
error *class* and a correlation id, and keep the detail where it already
has protection. A redaction pass over an arbitrary stack trace is a
best-effort filter — and presenting a best-effort filter as a guarantee
is exactly the `POPIA_MASKED` failure in §18.2. If a sanitiser is wanted
regardless, it belongs in one shared, tested place and should allowlist
what may be logged rather than denylist what may not.

---

## 21. Batch 21 (28 Oct, 5 files) — the regex, tested; and a skill cited for the opposite of what it says

ID | Asset | Hash | Disposition | Note
---|---|---|---|---
A-121 | `Https___api.elections.org.za_Help_develop_the_nece.docx` | `2e711076` | **DEFECT — §21.1** | the harvest service plus its justification |
A-122 | `Regex_Definition__Sanitization_Function.docx` | `c8db6347` | **REJECT — §21.2** | the `[REDACTED]` regex §20.4 asked for |
A-123 | `Yes_you_can_proceed_to_do_that.docx` | `cb42bb28` | **SUPERSEDED** | 3 MB; an earlier revision of the relay |
A-124 | `yes.docx` | `b7bc5104` | **DUP of A-120** | same content as the §20 paste |
A-125 | `yes.rtf` | `e91091e2` | **DUP of A-120** | same again; 337 KB is RTF markup, not content |

### 21.1 The harvest service cites a skill that governs something else

A-121 states: *"The integration must follow the `ecos-electoral-data-harvest`
agent rules, which govern IEC roll ingestion, identity masking, and audit
logging to remain compliant with POPIA."*

That skill is real — it is in A-032's build bundle, with an OpenAPI spec
and a migration. **I read it. It governs none of those things.**

It is a manifest-driven harvest of **published reference data**:
`harvest_source` → `harvest_run` → `ingested_row` (checksummed, with
`source_url` and `sha256` provenance) → materialised into ten typed
tables. Here is every table `030_electoral_data_harvest.sql` creates:

```
harvest_source · harvest_run · ingested_row · municipality · ward
voting_district · electoral_ballot · electoral_result_vd
ppfa_disclosure · derivation_provenance
```

**Not one of them holds a person.** Searched the skill and the spec:
`voter_roll` 0 hits, `voter-roll` 0, `id_number` 0, `idNumber` 0,
"identity mask" 0. The OpenAPI paths are `/sources`, `/runs`,
`/municipalities`, `/wards`, `/voting-districts`, `/ballots` — **there is
no `/voter-roll` endpoint in the spec either**, which is the same endpoint
§18.2 established the IEC does not publish.

The clincher is the skill's RLS posture: the harvested dataset is *"a
**shared public reference dataset** — read access is permissive across all
authenticated tenants (a party doesn't get a competitive edge by being the
only one who can see IEC results)."* **A certified voters' roll could never
be that**, and the skill is read-permissive precisely because it holds
nothing personal.

So the service does not merely call an endpoint that does not exist. **It
attributes its design to a governing document that says the opposite.**
That is the third instance of the pattern A-112 §1 names: A-102 asserted a
FINANCE_OFFICER gap this build does not have, a prior session attributed
five quotations to artefacts that did not contain them, and now this.
A-121 also derives itself from *"the Election Campaign OS 2026 North West
Business Plan"* — A-114, already on the §6 list.

### 21.2 The regex, run against real inputs

§20.4 declined to port a regex nobody had seen. A-122 supplies it, so it
can be tested instead of argued about:

```python
PII_REDACTION_PATTERN = re.compile(
    r'\b\d{13}\b|(?:\+27|0)\d{9}\b|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
```

| input | result |
|---|---|
| `8201015009087` (bare ID) | redacted ✓ |
| `820101 5009 087` (spaced — the printed form) | **passes through** |
| `820101-5009-087` | **passes through** |
| `910906 **** 08*` — **the IEC mask in our own roll data** | **passes through** |
| `0821234567` / `+27821234567` | redacted ✓ |
| `082 123 4567` | **passes through** |
| `27821234567` (no plus) | **passes through** |
| `jane.doe@party.org.za` | redacted ✓ |
| `surname='DLAMINI' full_names='THANDI P' address_raw='14 SOL PLAATJIE AVE, IKAGENG'` | **passes through, entirely** |
| `requestId=sess-1793203471827` | **redacted — a timestamp, not PII** |
| `gemini-code-1793197745836.ts` | **redacted — this batch's own filenames** |

Two failures, in opposite directions.

**It misses what it is for.** It does not match a spaced or hyphenated ID,
and it does not match **the IEC's own mask format**, which is the literal
shape of `id_number_masked` in the roll the whole subsystem exists to
handle. It does not touch names or addresses at all — and the roll's
payload is surname, full names and verbatim street address. A trace
carrying a voter's name and house number passes through and is then
written to Redis under a field that says it was sanitised. **That is the
`POPIA_MASKED` failure of §18.2 in a second place**: a partial filter
presented as a guarantee.

**It destroys what it should keep.** A 13-digit epoch-millisecond
timestamp is exactly 13 digits. The relay's own
`requestId = f"{session_id}-{datetime.now().timestamp()}"` carries one —
and `requestId` is the metering engine's idempotency key and the only
handle for investigating a disputed debit. The note says the word
boundaries were added *"to prevent partial matches on longer operational
IDs (like timestamps…)"*; they do not, because `\b\d{13}\b` matches a
13-digit timestamp exactly.

Two smaller things: the patched block keeps `except RuntimeError` — still
unreachable per §20.3 #2, so the fix preserves the bug it sits next to —
and `str(e)` is the exception message, not a stack trace, despite the
docstring saying otherwise.

**The §20.4 recommendation is unchanged, and now demonstrated rather than
asserted:** do not sanitise arbitrary exception text. Log an error class
and a correlation id, and keep the detail where it already has protection.

### 21.3 The question asked — a `docker-compose.yml` for the relay, Redis and the gateway?

**Not yet — and not because orchestration is the wrong idea.** It is the
right eventual artefact and the wrong next one, for four reasons already
established:

1. **The relay has no authentication** (§20.3 #1). `tenant_id` and
   `actor_id` come from the URL path. Composing it puts an unauthenticated
   token-spending endpoint on a shared network with Redis and the gateway.
   **Orchestration does not fix that; it ships it.**
2. **Two of the three services have no code.** §18.1 established that no
   repository holds the Node gateway or the Postgres schema — they exist
   as a migration bundle and a design. A compose file would orchestrate
   one implemented service and two intentions.
3. **The capability seed does not run** (§20.2) — eight columns against a
   four-column table.
4. **The soft-cap discount it depends on is not implemented** (§20.2).

The next artefact is authentication on that WebSocket endpoint: verify a
bearer token, derive `tenant_id` and `actor_id` **from the token**, and
never from the path. After that, a compose file is a reasonable half-hour.

---

## 22. Batch 22 (28 Oct, 2 files) — the compose file

ID | Asset | Hash | Disposition | Note
---|---|---|---|---
A-126 | `gemini-code-…4744334.py` | `45909fc3` | **DUP of A-122's patch** | 12 lines: the sanitised `except` block |
A-127 | `gemini-code-…4726484.yaml` | `b475e96a` | **RECONCILE — §22.1** | `docker-compose.yml`, three services |
A-128 | the covering paste | not in the upload store | **DUP of A-120** | fourth verbatim copy of the relay |

§21.3 recommended authentication before orchestration. The compose file
came anyway, which is a fair call to make — so this reviews what arrived
rather than restating the recommendation.

### 22.1 Both `build:` contexts point at things that do not exist

```yaml
api-gateway:
  build: { context: ./election-cos-app, dockerfile: Dockerfile }
voice-relay:
  build: { context: ., dockerfile: Dockerfile.voice }
```

**There is no Dockerfile anywhere in this repository** — `find` returns
nothing. And `./election-cos-app` is not a Node API gateway: its
dependencies are React, Dexie, Firebase, TanStack Query and React Router,
it has no `express`, no `main` entry, and nothing listens on 3000. The
service labelled *"Node.js API Gateway & V2 Metering Engine"* has its
build context aimed at **our Vite single-page app**. Adding a Dockerfile
would not fix that; it would containerise the wrong program.

### 22.2 The database is missing, and it is the part that meters

There is no Postgres service. `debit_tokens()` and `reverse_debit()` are
PL/pgSQL functions in `020_metering_tokens_vouchers.sql` — **the
component that actually implements "debit before action" is absent from
the orchestration**, while `DATABASE_URL` is passed in from the host
shell pointing at something undefined. Of three services composed, one is
the wrong program, one has no image, and the one that does the metering
is not there.

### 22.3 Publishing the ports makes the §20.3 finding materially worse

```yaml
redis:      ports: ["6379:6379"]     command: redis-server --save 60 1 …
voice-relay: ports: ["8000:8000"]
```

Redis is published to the host **with no `--requirepass`**, and the relay
— which still derives `tenant_id` and `actor_id` from the URL path — is
published beside it. On any host with a public interface that is an open
Redis holding session state next to an unauthenticated endpoint that
spends tenants' tokens. Neither needs host publishing: the services reach
each other over `ecos-net` by service name, which the file already
configures and uses (`redis://redis:6379`, `http://api-gateway:3000`).

**Minimal changes that make the file not dangerous**, in order:

1. Delete the `ports:` block from `redis` entirely.
2. Bind the relay to loopback — `127.0.0.1:8000:8000` — until a bearer
   token replaces the path parameters.
3. Add `--requirepass` and a `REDIS_PASSWORD` secret regardless; a
   container-network-only Redis with no password is one `docker run
   --network ecos-net` away from open.

### 22.4 Four smaller things

- **`version: '3.8'` is obsolete.** Compose V2 ignores it and warns.
- **`depends_on` is inconsistent.** `api-gateway` waits for
  `condition: service_healthy`; `voice-relay` uses the short form, so it
  starts before the gateway is ready — and its first action is a debit
  against that gateway, which §20.3 #3 reports to the user as
  "Insufficient CampaignTokens".
- **`GEMINI_API_KEY` is passed to `api-gateway`**, which does not talk to
  Gemini. Only the relay does.
- **`restart: unless-stopped` with no healthcheck** on either app service
  will loop a crashing container silently.

One more, from the Redis volume: `--save 60 1` with `redis_data`
persisted means `prepaid_bytes` survives a restart, so a resumed session
can carry allowance it already consumed.

### 22.5 Where this belongs

**Not in this repository.** §18.1 established that the Node gateway and
the Postgres schema exist in no repository, and this build is Firebase
with Cloud Functions pinned `africa-south1` — it has no containers and
needs none. A compose file for FastAPI + Redis + Postgres belongs with
the stack it orchestrates, whenever that stack acquires a repository.
Registered here; **not added to the tree.**

---

## 23. Batch 23 (28 Oct, 1 paste) — the nginx front end

A-129 | pasted `nginx.conf` server block | not in the upload store | **RECONCILE — do not deploy as written**

This is the step §20.3 and §22.3 were about. The relay's missing
authentication stopped being theoretical when a compose file published
its port; this terminates TLS in front of it and puts it on the public
internet.

### 23.1 `/api/` publishes the debit endpoint to the world

```nginx
location /api/ { proxy_pass http://api-gateway:3000; }
```

That is the Node gateway, and the gateway is where
`/api/v2/metering/debit` lives — the endpoint the relay posts to with a
caller-supplied `tenantId`, `actorId` and `actorName`. Proxied like this,
**anyone on the internet can POST debits naming any tenant**, in a loop,
and the metering audit trail will record whichever `actorName` they
chose. A party's token wallet is drained by a stranger and the log blames
a named member of their own staff.

`/ws/` has the same defect one step removed: the relay still takes
`tenant_id` and `actor_id` from the URL path, so the WebSocket is a
token-spending endpoint with no caller identity.

There is no `auth_request`, no JWT verification, no `limit_req` and no
`limit_conn` anywhere in the block. With `proxy_read_timeout 3600s` and
no connection limit, one client can also hold unbounded hour-long
streams.

**Nothing else in this file matters until an `auth_request` sits in front
of both locations** — or, better, until the relay and gateway derive
identity from a bearer token and stop trusting the path and the body.

### 23.2 It cannot obtain or present a valid certificate

Three separate problems, all checkable:

| | |
|---|---|
| `server_name api.electioncos.co.za` | **no DNS record** — resolved today, nothing returned |
| `ssl_certificate …/live/electioncos.co.za/fullchain.pem` | the **apex**, against a subdomain `server_name` |
| no `listen 80` block | no HTTP→HTTPS redirect and **no ACME `http-01` location** |

A certificate issued by a plain `certbot certonly -d electioncos.co.za`
does **not** cover `api.electioncos.co.za`, so every client would get a
name mismatch even if the host resolved. It needs both names on one
certificate (or a wildcard), an A record for `api.`, and a port-80 server
block for webroot renewal — or a DNS-01 challenge instead.

### 23.3 TLS and nginx hygiene

- **No `ssl_protocols`, `ssl_ciphers`, or `ssl_session_cache`**, so the
  policy is whatever this nginx build defaults to. §12.4 credited A-088's
  Cloudflare Worker for getting HSTS right; this drops it entirely, along
  with the rest of the security headers that Worker set.
- `listen 443 ssl;` with **no `http2`** and no IPv6 `listen [::]:443`.
- `proxy_set_header Host $host` passes the client's Host through to a
  Node app — fine if the upstream ignores it, a Host-injection surface if
  it builds links or cache keys from it.
- No `proxy_connect_timeout` on `/ws/`, no timeouts at all on `/api/`.
- **nginx is a fourth service that §22's compose file does not define**,
  yet it addresses `voice-relay` and `api-gateway` by their compose
  service names, so it is expected to run on `ecos-net`.

### 23.4 Correcting myself on `electioncos.co.za`

§12.3 and §6 say this domain "was never ours". **I could not support
that, and DNS partly contradicts it:**

```
electioncos.co.za         169.239.218.58     ← resolves, a live registration
api.electioncos.co.za     no record
electioscos.co.za         no record          ← APP_DOMAIN
electioncampaignos.co.za  no record          ← SUPERSEDED_DOMAINS, consistent
innovationconsult.co.za   172.67.193.15      ← resolves
```

The accurate statement is: `electioncos.co.za` **is a live registration
and is not what `publicDomain.ts` names.** Whether it belongs to
Innovation Consult is not established here and is a question for the
user, not an inference from an A record. The do-not-carry entry stands on
the narrower ground that it is **not `APP_DOMAIN`** — three spellings in
circulation is the problem, regardless of who owns which.

### 23.5 And a finding about this build, not theirs

**`APP_DOMAIN` — `electioscos.co.za` — has no DNS record today**, and
`HOSTING_ORIGIN` (`election2026-campaignms7-0.web.app`) returns **404**.
So nothing is deployed and nothing is reachable at either address.

That is not a defect: `publicDomain.ts` anticipated exactly this, which
is why the launch card prefers `APP_ORIGIN` and falls back to the hosting
origin — *"so the link goes live the moment either answers."* Neither
answers yet. It belongs beside §5's deploy blockers as the current state
of the world, and it means **the domain needs an A record before launch,
not just a deploy**.

---

## 24. Batch 24 (28 Oct, 3 files) — the Dockerfile, and an image that cannot build

ID | Asset | Hash | Disposition
---|---|---|---
A-130 | `docker-compose_yml.docx` | `4b4ab24d` | **RECONCILE** — §22's compose file plus two new artefacts |
A-131 | `gemini-code-…4744334.py` | `45909fc3` | **DUP of A-126** — byte-identical |
A-132 | `gemini-code-…4726484.yaml` | `b475e96a` | **DUP of A-127** — byte-identical |

The compose YAML inside A-130 is the one reviewed in §22. New are a
`Dockerfile.voice` and a `requirements.txt`.

### 24.1 The image cannot be built

```
google-genai==0.1.1
```

**That version was never published.** PyPI's `google-genai` 0.x line runs
`0.0.1, 0.1.0, 0.2.0, 0.2.1, 0.2.2, 0.3.0 …` — there is no `0.1.1`, and
the current release is **2.33.0 (23 Oct 2026)**. So
`pip install --no-cache-dir -r requirements.txt` fails with *no matching
distribution*, and `docker build -f Dockerfile.voice` aborts on that
layer.

§22 reported that the compose file's `voice-relay` had no image. It has
one now, and it still cannot be built — and even corrected to a real
version, a 0.x pin is two major versions behind the library whose Live
API (`aio.live.connect`, `LiveConnectConfig`, `PrebuiltVoiceConfig`) the
relay calls.

### 24.2 Four more in the Dockerfile

- **It runs as root.** No `USER` directive, so uvicorn serves as root in
  a container that §23's nginx publishes to the internet.
- **`build-essential` is installed and never removed.** A compiler
  toolchain stays in the production image; this wants a multi-stage build
  with the wheels built in the first stage.
- **`COPY main.py .`** copies one file. The relay has never been called
  `main.py` anywhere in this corpus, and the moment it becomes two
  modules the image silently ships a broken app.
- **No `HEALTHCHECK`**, so §22's `restart: unless-stopped` has nothing to
  test and will loop a crashing container.

### 24.3 The matched pair: nginx sets headers uvicorn is told to ignore

`uvicorn main:app --host 0.0.0.0 --port 8000` — **no `--proxy-headers`,
no `--forwarded-allow-ips`.**

§23's nginx block carefully sets `X-Real-IP`, `X-Forwarded-For` and
`X-Forwarded-Proto`. This uvicorn discards all three, so every request
logs with the proxy's address. For a per-tenant **metered** service whose
identity is already caller-asserted from the URL path, that removes the
last network-level attribution there was: a drained wallet would have no
client IP in the record either.

### 24.4 A fourth domain, and it is the corporate one

A-130 closes by offering an nginx config to route `wss://` from
**`api.innovationconsult.co.za`**. The config actually pasted (§23) uses
**`api.electioncos.co.za`**. That is a fourth spelling, and this one is
the **corporate** domain, which `publicDomain.ts` keeps deliberately
apart:

> *"The corporate domain, which is a different thing and stays where it
> is. Innovation Consult publishes from `innovationconsult.co.za`; the
> product is served from `APP_DOMAIN`."*

Putting the product's WebSocket relay on the corporate host collapses a
separation the build makes on purpose. **The offer is already answered:
§23 reviewed an nginx config for this relay** — on a different host than
the one proposed here, which is itself the point.

---

## 25. Batch 25 (28 Oct, 5 files) — the infographic, and an unenacted proposal labelled as statute

ID | Asset | Hash | Disposition
---|---|---|---
A-133 | `gemini-code-…5732815.ts` | `6ac62bdd` | **DEFECT — does not compile** (§25.1) |
A-134 | `…5712434.txt` (nginx) | `489a8428` | **DUP of A-129** — same bytes as the §23 paste |
A-135 | `…5702768.txt` (requirements) | `33ca5116` | **DUP** — the §24.1 file, `google-genai==0.1.1` |
A-136 | `…5688764.txt` (Dockerfile) | `18ac3621` | **DUP** — the §24.2 file |
A-137 | `election_campaign_os_2026_infographic.html` | `990d627f` | **RECONCILE — §25.2–25.4** |

### 25.1 The client snippet imports two things that do not exist

```ts
import { InnovationConsultVoiceClient } from '@/modules/voice/voice-agent-client';
import { getApiWebSocketUrl } from '@/config/publicDomain';
```

`src/modules/voice` does not exist. And `publicDomain.ts` exports exactly
five things — `APP_DOMAIN`, `APP_ORIGIN`, `HOSTING_ORIGIN`,
`SUPERSEDED_DOMAINS`, `CORPORATE_DOMAIN`. **There is no
`getApiWebSocketUrl`**, and no environment-keyed URL helper of any kind:
the module is deliberately a small set of constants. Both imports fail
at typecheck.

It is also the first artefact to assume the relay belongs in *this*
app's bundle, which §18.1 and §22.5 say it does not.

### 25.2 The infographic gets a great deal right

Checked against the proclaimed baseline and the primary data:

- **4,488 wards** nationally ✓ · **402 wards** in North West ✓
- **NW405: 34 ward + 33 PR = 67 seats, 122,059 voters** ✓ — all four
- **Every quota in Scenarios 1–3 is arithmetically exact** under Item 12:

  ```
  S1  ⌊114,600 / 67⌋ + 1 = 1,711   stated 1,711  ✓
  S2  ⌊110,000 / 67⌋ + 1 = 1,642   stated 1,642  ✓
  S3  ⌊108,000 / 66⌋ + 1 = 1,637   stated 1,637  ✓   (C = 1, correctly)
  ```
- Scenario 3 handles the independent properly: votes excluded from A,
  `B − C` contracted to 66, and the party votes still sum to A.
- Seat allocation follows quota-then-largest-remainder correctly in every
  scenario, and each totals 67.
- The financial block is internally consistent: 1,113,000 − 239,000 =
  874,000, less 1,100,000 = (226,000).

### 25.3 Scenario 4 is an unenacted proposal presented as the statute

Scenario 4 is labelled **"Excessive Ward Overhang (Schedule 1, Item 16)"**
and states `Q_new = 1,667`. That figure is **not** Item 12:

```
as Item 12:  ⌊106,000 / 67⌋ + 1            = 1,583   ✗ (stated 1,667)
the proposal: ⌊(106,000 − 6,000) / (67 − 7)⌋ + 1 = 1,667   ✓ exact
```

It recalculates the quota **excluding the overhang party's votes and its
wards**. Our own registered source excerpt gives Item 16's entire
operative text — the party gets no PR seats, its ward seats are
unaffected — and then says:

> *"It does not provide a resolution mechanism for the resulting
> council-size overhang."* … The IEC's own deck proposes recalculating
> the quota excluding the excessive-seats party's votes and wards, but
> frames it **explicitly as a proposal, not enacted law. Do not implement
> this as default behavior; if a user wants to model the proposed
> amendment as a scenario, build it as an explicitly-labeled alternate
> calculation path, never as the default."*

The infographic does the proposal and calls it Item 16, beneath a footer
reading *"Calculations compliant with Local Government: Municipal
Structures Act (Act 117 of 1998, Schedule 1 as amended)."* **It is not
compliant with the Act; it implements an amendment the Act does not
contain.** The instruction not to do this is in our register, in those
words.

**Where it is right, and we differ:** Item 16 really does lock the
overhang party's PR seats to zero while leaving its ward seats alone —
Scenario 4 does that, and so does `allocateSeats` (`prSeats: 0`, ward
seats retained). The divergence is only the unlegislated part:
`seatCalculator.ts` **expands the council** (`councilSizeFinal >
totalSeats`) rather than contracting the quota, and makes no claim of
statutory authority for the choice. Both are decisions in a gap the law
leaves open; only one of them says the Act decided it.

Also, `Q = ⌊A/(B−C)⌋+1` is captioned **"the Hare Quota formula"**. Hare
is `A/B` with no `+1` and no `−C`. The formula shown is Item 12; the name
attached to it is wrong.

### 25.4 Four more, and what not to publish

- **"over 28.5 million registered voters nationwide"**, unsourced. Our
  verified baseline is **27,723,675** (IEC Circular 1 of 2025, Annexure A,
  which the build computes against). 2.8% growth over 20 months is
  plausible — but §5 item 0's rule applies: a figure must name its source
  and date, and this one does neither.
- **"80% of new registrations in mid-2026 surges came from voters under
  30"** — no source anywhere in the register.
- **R1,113,000 as "Base Case Target"** picks one side of a conflict
  A-113 §5 records as open: *"Revenue figures R969k vs R1,113k
  inconsistency across GTM model and architecture doc — needs single
  reconciled figure… not yet reconciled."* Presented here as settled.
- **Scenario 2 invokes "2021 historical fragmentation" and gives ANC 30
  seats.** The verified 2021 result is **ANC 33** (A-035, confirmed
  against the IEC export in §18.4). A hypothetical is fine; attaching
  2021 to it is not.
- **A sixth palette** — slate/blue/cyan, none of the product tokens.

**It is not an engine.** `scenarioData` is a hard-coded literal carrying
pre-computed `ward`, `pr` and `total` for every party; the page renders a
table from constants and computes nothing. "Interactive … Seat Allocation
Engine" and "Simulate electoral quotas" describe a calculator that is not
there — the §17.3 and §14 pattern again, a claim wider than the code.

**Disposition: do not publish as-is.** Fix the Item 16 labelling or drop
Scenario 4, source or remove the two voter-registration claims, pick a
revenue figure deliberately, and either wire the engine to
`allocateSeats` or stop calling it one. The electoral baseline numbers
are sound and the arithmetic is careful — which is exactly why the
compliance footer over the top of it is the problem.

---

## 26. Batch 26 — `Tech_Architecture_Master_Code_Stack_3.md`

A-138 | `Tech_Architecture_Master_Code_Stack_3.md` | `8435e02c` | **DEFECT — the statutory engine is wrong, and it is the only part presented as authoritative**

### 26.1 Its quota function is not Schedule 1, and the real data proves it

The document calls `fn_calculate_schedule1_quotas` the place where
*"Schedule 1 (Items 12, 13, and 16) [is] calculated strictly at database
level"*, and agent 16 `QUOTA_FORMULA_GUARDIAN` is said to *"enforce
Schedule 1 (Items 12, 13, 16) statutory seat allocation formulas"*. The
function is:

```sql
v_quota := v_total_valid_votes::NUMERIC / v_council_size::NUMERIC;
```

That is `A / B`. **Item 12 is `Q = (A / (B − C)) + 1`.** Both the `+ 1`
and the `− C` independent-councillor deduction are missing — so this is
the Hare quota the register has twice recorded as a teaching model
(§12.2, A-102 §9.2), presented here as the statutory engine.

Run against the NW405 2021 figures we fetched from the IEC ourselves
(§18.4):

```
their quota   A / B          = 1514.0149
Item 12       ⌊A/B⌋ + 1      = 1515          (published quota: 1515)

party    votes   their seats   published
ANC     48,911            32          33   ← wrong
DA      25,837            17          17
FF+     13,800             9           9
EFF      9,200             6           6
PA       2,389             1           2   ← wrong

allocated 65 of 67 — two seats never assigned
```

**It gets the council size wrong, and it gets the governing party's seat
count wrong, on the one election we have certified data for.**

Two seats vanish because **Item 13 is absent**: the function computes a
`remainder` column and then never uses it — `final_seats` is a verbatim
copy of `quota_seats`, so no surplus allocation happens at all. **Item 16
is absent entirely**; nothing in the function detects or handles a party
whose ward wins exceed its entitlement.

For contrast, `seatCalculator.ts:123` is
`Math.floor(totalValidVotes / quotaDivisor) + 1`, with the divisor
carrying `− C − D`, and it reproduces 1,515 and all five published seat
totals exactly.

### 26.2 PPFA thresholds are half-corrected, which is worse than stale

Agent 18, `PPFA_AGGREGATOR`: *"aggregating political donations against
statutory thresholds (**R80k/R200k/R15M**)."*

R200,000 is current. **R80,000 and R15,000,000 are repealed** — the cap
is R30,000,000. A document carrying all three superseded figures reads as
out of date; one carrying the new disclosure threshold beside the old cap
reads as *updated* and is not. Sixth artefact in the register to carry
repealed PPFA figures; §6 already names the pattern.

### 26.3 It may explain the App Engine flag — and that is today's problem

§1 places the landing page on **"GCP Cloud Storage / App Engine static
site hosting"** for `electioncos.co.za`.

That bears directly on the open console question. A-111 §3.1 records the
caveat verbatim: Firestore's `africa-south1` *"does not support App
Engine"*, followed by *"We are not using App Engine, so this is
immaterial."* The GCP dashboard analysis reports the **App Engine Admin
API enabled** in `electioncos1-0`. **This document is a plausible reason
why** — somebody followed it.

If an App Engine *application* was ever initialised in that project, it
cannot be in `africa-south1`, and in older projects the App Engine
location is what pinned Firestore's. **Check before any data is written.**

### 26.4 The rest

- **The Worker cannot reach its backend.** It fetches
  `https://api.election-cos.af-south-1.aws.internal` — a `.internal`
  name is not publicly resolvable, and a Cloudflare Worker runs on the
  public internet. Same constant as A-102 §6; it has never been able to
  work.
- **A third agent inventory.** 32 agents here against A-102 §3's ~30 and
  the blueprint's five layers (§16.1). Same names, different counts.
- **The topology contradicts §18.1.** AWS `af-south-1`, ECS Fargate, RDS,
  "Firebase strictly bounded to static asset delivery" — no repository
  holds any of it, and A-024 records the decision the other way.
- **Credit where due:** the Dexie outbox enum carries `REJECTED` and
  `DISCARDED`, which is exactly the fix A-102 §2 identified for silently
  lost sync records, and the Cloudflare Free Tier bounds are at least
  stated as constraints rather than ignored. **[U]** Those limits are
  quoted without a source and should be checked against current
  Cloudflare documentation before anything is budgeted on them.

**Disposition:** do not implement §4.1 under any circumstances. If this
document governs anything, the quota engine must be replaced wholesale —
and the version that reproduces the certified NW405 result already exists
in this repository.

---

## 27. The domain decision, and why "disable App Engine" would not have worked

### 27.1 `APP_DOMAIN` is now `app.electioncos.co.za`

Decided 28 Oct: the apex serves the static landing page, the PWA lives on
the subdomain. Changed in `publicDomain.ts` and in the root `index.html`
together, because the guard test holds them to each other.

**`electioscos.co.za` was added to `SUPERSEDED_DOMAINS` rather than
deleted.** The other four entries there were planned in phase 0 and never
registered; this one was the live `APP_DOMAIN` until today, which makes
it the more dangerous kind — a superseded name that once worked is the
one somebody remembers. The guard's failure message said *"was planned
and never registered"*, which is now untrue of one entry, so it was
rewritten.

**Proved by injection.** Putting `electioscos.co.za` back into
`index.html` fails two tests — the origin match and the supersession
tripwire — then reverted clean.

**Deliberately not changed:** `HOSTING_ORIGIN` and `.firebaserc` still
name `election2026-campaignms7-0`. A custom domain attaches to whichever
project serves it, so the domain is independent of the project question
— and the project question is not settled while §27.2 is open.

### 27.2 Disabling App Engine would not free the location — checked against Google's docs

The suggestion was: *"Disabling App Engine in `electioncos1-0` will
ensure Firestore region pinning doesn't lock your location
constraints."* **It would do the opposite of that — it would leave the
pin in place while looking like it had been removed.** Both halves,
from Google's own documentation:

| | Google's wording |
|---|---|
| App Engine region | *"You cannot change an app's region after you set it."* |
| Disabling an app | *"No data loss will occur when you disable your app, **nor will any configuration settings change**."* Serving stops; the app, and its location, remain. There is no delete-the-application-only operation — only shutting down the whole project releases its resources. |
| Firestore location | *"once you provision a database instance, you cannot change its location setting."* |
| The link between them | The **default** database's location follows the *"location for default Google Cloud resources"*, which covers resources *"associated with Google App Engine."* |

So disabling changes nothing about location. If a pin exists it survives;
if no pin exists there was nothing to disable.

**But the same page gives a real escape hatch, and it is better than the
proposed one:** *"any non-default Cloud Firestore database instances in
your project do not share this location dependency."* A **named**
(non-default) Firestore database can be created in `africa-south1` even
where the default resource location is wrong. That is not free — the
Firebase SDKs talk to `(default)` unless given a database id, so it is a
code change in this repo — but it is a genuine way out that does not
require a new project.

### 27.3 The three outcomes, and what each means

Everything turns on two facts nobody has read yet: whether an **App
Engine application** exists in `electioncos1-0`, and whether a
**Firestore database** exists and where.

| console shows | meaning | action |
|---|---|---|
| **No Firestore, no App Engine app** | nothing is pinned — the clean case | choose `africa-south1` when Firestore is first created, and do not initialise App Engine |
| **Default resource location is `africa-south1`** | already correct | proceed; `.firebaserc` and `HOSTING_ORIGIN` move to `electioncos1-0` |
| **Default resource location is anything else** | permanent, and not fixable by disabling anything | either a **named** Firestore database in `africa-south1` (code change, §27.2), or **a different project** |

A-138 §1 is the likely reason the App Engine Admin API is on at all: it
puts the `electioncos.co.za` landing page on *"GCP Cloud Storage / App
Engine static site hosting"*. Note that an **enabled API is not an
initialised application** — the API is on by default in many projects and
Firebase enables it routinely — so this may be nothing. The console
answers it in one glance.

---

## 28. The project is settled, and the region is verified

Read from an authenticated Cloud Shell on 28 Oct 2026:

```
$ gcloud firestore databases list --project=electioncos1-0
NAME: projects/electioncos1-0/databases/(default)
LOCATION_ID: africa-south1
TYPE: FIRESTORE_NATIVE

$ gcloud app describe --project=electioncos1-0
ERROR: ... does not contain an App Engine application
```

**Both answers are the ones we wanted.** The default database is already
in `africa-south1`, in Native mode, so rule 1 of §0 holds and the
residency claim in A-111 §3.1 is true of the real project. And there is
**no App Engine application**, so the enabled Admin API that §26.3
flagged was nothing — nothing ever pinned the default-resource location
anywhere else. §27.2's escape hatch is not needed.

### 28.1 What changed

| file | from | to |
|---|---|---|
| `.firebaserc` | `election2026-campaignms7-0` | `electioncos1-0` |
| `publicDomain.ts` `HOSTING_ORIGIN` | `election2026-campaignms7-0.web.app` | `electioncos1-0.web.app` |
| root `index.html` `FALLBACK_URL` | same | same |

The project id is now confirmed four ways — the console Project info
card (`Election-COS`, number 960903975002), the GCP dashboard analysis,
the Cloud Shell prompt, and the deploy log. The `.firebaserc` comment
records that, replacing the older note that said the previous id had been
"confirmed by the human session 10" after a guess between three
candidates.

`https://electioncos1-0.web.app` was fetched independently from here:
**HTTP 200, 1,219 bytes, `text/html`, `<title>Election-COS</title>`** —
well-formed HTML, not the garbled JSON of the earlier attempt.

### 28.2 The preflight now checks the region instead of nagging about it

`deploy-preflight.mjs` opened with a section headed *"WHAT IT CANNOT
CHECK"*, whose single entry was the Firestore region. That section is
gone. The check runs `gcloud firestore databases list` and has four
outcomes, **all four proved by stubbing `gcloud` on `PATH`**:

```
PASS  1 database(s), all africa-south1
FAIL  (default) is in us-central1
        -> … a database's location cannot be changed. A non-default
           database can be created in the right region, or the project replaced.
WARN  no database yet in electioncos1-0
        -> Create it in africa-south1. The location cannot be changed afterwards.
skip  gcloud not authenticated here — recorded value is africa-south1
```

**`SKIP` is a new fourth state and the important one.** A check that
reports success because it could not run is worse than one that says
nothing — the acquisition skill records an ETL script that printed
`ETL Pipeline complete` with every network call commented out. So where
`gcloud` is missing or unauthenticated, as in this build's own container,
the check prints `skip`, does not count as a pass, does not block the
deploy, and names the command that would settle it.

**Storage's location is still unchecked** and the closing reminder now
says so specifically, rather than lumping it together with Firestore.

### 28.3 Still open

- **Deploy credential.** Preflight still fails on it. A service-account
  JSON as `GOOGLE_APPLICATION_CREDENTIALS` remains the better path than a
  personal `firebase login` — scoped to the project, revocable, and the
  only option that works from a cloud session.
- **`.env` points at the emulator suite**, so a build published today
  would be a development build.
- **The placeholder's `firebase.json` is not ours.** `electioncos1-0.web.app`
  currently returns HSTS and nothing else — no `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` or CSP — because that hand-made
  config has no `headers` block. Harmless for a placeholder; it is the
  observable shape of the regression if the PWA deploys against it rather
  than against this repo's `firebase.json` and its six header blocks.
- **A second Hosting site** for `app.electioncos.co.za` needs deploy
  targets: one `firebase.json` cannot name two sites with a bare `site`
  key.

---

## 29. The DNS audit document — four corrections

A-139 | `dns_architecture_deployment_audit.md` | **KEEP, after the corrections below**

The zone table is accurate — it matches what was resolved independently
(Cloudflare NS, proxied apex and `www`, grey-clouded `app` CNAME, no CAA,
`v=spf1 -all`). The CAA omission policy is right and for the right
reason. Four specifics are wrong, and three of them are the kind that
only surface after someone acts on them.

### 29.1 The HSTS value is wrong, and the risk it describes does not exist

| | |
|---|---|
| document §2.2 | `max-age=63072000` (730 days) |
| **actually served** | `max-age=15552000` (**180 days**) |

The preload list requires **`max-age` ≥ 31536000** (one year). At 180
days the apex carries the `preload` directive but **is not eligible for
the preload list** — the directive is inert. So §2.2's "permanent
constraint that requires long lead times to reverse" is not a commitment
currently in force.

That cuts both ways and the document should say which is intended:
either raise `max-age` to a year and accept the commitment deliberately,
or drop `preload` so the header stops advertising an intent the value
cannot support. Carrying `preload` at 180 days is the one combination
that means nothing.

### 29.2 `public/index.html` does not exist in this repository

The document cites it twice as "Repository Source". The landing page is
at the **repository root** — `index.html`, 21,571 bytes, 563 lines. There
is no `public/` directory here; `public/` is the Cloud Shell placeholder
folder (`~/electioncos-firebase/public/`, one file).

The byte comparison in §2.3 is right. The path is not, and it points at
the directory holding the *other* page — which is how the wrong file gets
shipped.

### 29.3 `VITE_USE_EMULATOR` is not the flag

The real one is **`VITE_FIREBASE_USE_EMULATORS`**, set `true` at
`.env:11` and asserted in `dal/adapters/firestore/client.test.ts`.
Setting the document's variable name leaves the real flag untouched and
publishes a build pointed at the local emulator suite — exactly the
failure `deploy-preflight.mjs` reports and the reason it fails today.

### 29.4 `firebase deploy --only hosting:app` has no target to deploy to

This repo's `firebase.json` hosting block declares **neither `site` nor
`target`** — `public: dist` and nothing else — so it deploys to the
project's default site and there is no target named `app`. The command
fails until someone runs:

```bash
firebase target:apply hosting app electioncos1-0
```

and adds `"target": "app"` to the hosting block. That is the deploy-target
work §28.3 already flagged for a second site; the document assumes it is
done.

### 29.5 Two smaller notes

**§3.2 undersells its own point.** It describes the canonical
`firebase.json` as the one "with single-page application rewrites to
`index.html`". The SPA rewrite is the least important thing in it. The
reasons to insist on ours are the **six header blocks** — kept in sync by
`scripts/sync-hosting-headers.mjs` and enforced by `check:headers` in
`check:all` — and the `/api/** → function api` rewrite. Naming the rewrite
and not the headers invites someone to conclude any config with an SPA
rewrite will do, which is how `app.electioncos.co.za` ends up serving
HSTS and nothing else, as `electioncos1-0.web.app` does today.

**§3.4's orange-cloud cutover is still the one step to think twice
about.** Proxying `app` through Cloudflare puts a second CDN in front of
Firebase and moves certificate renewal behind it. Full (Strict) works
while the Firebase origin certificate is valid; the failure mode is a
renewal that quietly does not happen months later, which presents as an
outage with no recent change to blame. Grey is not a limitation to
outgrow here — it is the configuration that lets Firebase keep its own
certificate working.

---

## 30. The deploy target — and a CSP that would have broken sign-in

### 30.1 What was asked for

`firebase.json` now declares `"target": "app"`, and `.firebaserc` maps it:

```json
"targets": { "electioncos1-0": { "hosting": { "app": ["electioncos1-0"] } } }
```

So `firebase deploy --only hosting:app` means something, which §29.4
recorded it did not. The deploy scripts follow: `deploy:hosting` uses
`--only hosting:app`, and the full `deploy` now names its components
(`hosting:app,functions,firestore:rules,storage`) rather than deploying
whatever is in the file.

The target resolves to the project's **default site**, because there is
only one — `electioncos1-0`, which serves both `electioncos1-0.web.app`
and `app.electioncos.co.za`. The apex is deliberately not here: it is
Cloudflare's, and §28 settled that keeping it there is the point.

### 30.2 What the change exposed

Pointing `app` at this repo's `firebase.json` meant reading it, and the
CSP's `frame-src` still named the **old** project:

```
frame-src 'self' … https://election2026-campaignms7-0.firebaseapp.com
```

That is the host Firebase Auth loads in an iframe to finish a sign-in.
When `.firebaserc` moved to `electioncos1-0` in §28, **nothing failed** —
not a type, not a lint, not a test. The app would have built, deployed,
loaded, and then silently refused to sign anyone in, blocked by our own
policy. On a campaign platform a week before an election, that is a bad
way to find out.

It is generated from a single declaration, so the fix is one line in
`src/config/securityHeaders.ts` plus `node scripts/sync-hosting-headers.mjs`.
It is now a named export, `AUTH_IFRAME_HOST`, rather than a literal
buried in a template string.

### 30.3 Two guards, both proved by injection

Added to `securityHeaders.test.ts`:

| guard | injected defect | result |
|---|---|---|
| auth host matches `.firebaserc` | put `election2026-campaignms7-0` back | **2 tests fail**, naming the expected host |
| hosting target is declared and mapped | deleted `hosting.target` | **fails**: *"firebase.json hosting needs a target"* |

Both reverted clean; `check:all` green at **65 files, 1,010 tests**.

The first guard checks the generated header as well as the constant it
came from, because the thing that ships is `firebase.json`, not the
TypeScript.

### 30.4 Still open before `app.` can serve the PWA

Unchanged from §28.3, and now the only things between here and a deploy:

1. **Deploy credential** — `GOOGLE_APPLICATION_CREDENTIALS` (service
   account) preferred over a personal `firebase login`.
2. **`.env`** — `VITE_FIREBASE_USE_EMULATORS=true` at line 11. Note the
   name: §29.3 records that the audit document had it as
   `VITE_USE_EMULATOR`, which would leave the real flag set.
3. **`npm run build`** — `dist` is older than `src`.

Then `npm run deploy:hosting`, which runs the build, the preflight and
`--only hosting:app` in order, and replaces the placeholder on
`app.electioncos.co.za` with the PWA **and its six header blocks** —
which is what §29.5 was about.

---

## 31. The "Phases 5–7 complete" build document

A-140 | pasted Phase 5/6/7 completion + final register | **MIXED — valuable prose, a parallel codebase, and a third wrong quota**

### 31.1 What is worth keeping

More of this document is right than any architecture paste in the
register since A-111, and the compliance thinking is good:

- **PPFA figures are correct.** R200,000 / R30,000,000, cited to Gazette
  53182, with `?? 2e5` / `?? 3e7` fallbacks in the UI. The first
  architecture-style document since §12 not to carry a repealed figure.
- **The residency wording is the mandated one**, near-verbatim from
  A-111 §3.1 — voter and financial PII in `africa-south1`, Firebase Auth
  identifiers processed in the US, disclosed under POPIA s72.
- **"Document Integrity Hash (SHA-256)"** — the exact rename A-111 §3.3
  requires over "Blockchain Verified Hash", used without being asked.
- **Sentiment is labelled** *"SPIKE · G5 — unvalidated model,
  configuration only"* rather than sold as analysis.
- **PPFA is online-only** (Δ11) and `ppfaConfigs` is append-only and
  effective-dated via `appendAmendment` (F-07).
- The legal drafts carry **"DRAFT — pending attorney review (LG2/LG3)"**
  and get the operator / responsible-party split right under POPIA, with
  crypto-shredding erasure and a statutory-retention override.

The **runbook and pre-launch audit are the most useful artefacts** — a
go/no-go script that emits BLOCKER vs NOTE, and an exit-criteria list
with numbers in it. Those have no equivalent here and are worth adapting.

### 31.2 "Build is DONE" is not true of this repository

Every one of the fourteen files it presents as delivered is **absent**:

```
src/dal/ports/counters.ts · functions/src/counters/bump.ts
src/modules/warroom/WarRoomView.tsx · src/lib/mmp.ts
src/modules/analytics/SeatCalculatorView.tsx · src/lib/pdf/engine.ts
src/dal/ports/reports.ts · functions/src/reports/runner.ts
functions/src/mail/send.ts · src/modules/finance/FinanceView.tsx
src/lib/pricing.ts · src/modules/landing/LandingView.tsx
src/modules/legal/LegalPages.tsx · scripts/prelaunch-audit.ts
```

**But the capabilities are mostly built already, under other names** —
`SeatCalculatorPage.tsx`, `ThresholdAnalyzerPage.tsx`,
`ScheduledReportsPage.tsx`, `DisclosureRegisterPanel.tsx`,
`DonationForm.tsx`, `DonorDetail.tsx`, `DonorForm.tsx`,
`FinancePage.tsx`, and `seatCalculator.ts` with its NW405 regression
test.

So this is not undone work. It is a **second implementation of work that
exists**, declared complete. Adopting it wholesale would give the product
two seat calculators and two finance modules — and §25.1 already showed a
client snippet importing `@/modules/voice`, which likewise does not
exist. The register entry that matters is: **nothing here is a gap in the
build; it is an alternative to it.**

### 31.3 The quota is wrong — the third distinct wrong formula

```typescript
const quota = Math.floor(totalVotes / (councilSize + 1)) + 1;
```

That is the **Droop** quota, and the file says so: *"Municipal Structures
Act MMP allocation (Droop quota)."* Item 12 is `Q = (A / (B − C)) + 1`.

Against the certified NW405 2021 data we fetched from the IEC:

```
document   ⌊101,439 / (67+1)⌋ + 1 = 1,492
Item 12    ⌊101,439 / 67⌋     + 1 = 1,515   ← published
```

**And there is no `C` term at all.** Its own `DEFAULTS` include
`Independent W6` holding a ward seat with `prEligible: false` — exactly
the case Item 12's `− C` exists for — and the code never deducts it. On
its own example: 228 where Item 12 gives 234.

Running tally of quota implementations in this register:

| source | formula | NW405 result |
|---|---|---|
| A-138 §4.1 | `A / B`, no `+1`, no `−C` | 65 of 67 seats allocated |
| A-137 S1–S3 | Item 12, correct | exact |
| A-137 S4 | unenacted IEC amendment, labelled Item 16 | §25.3 |
| **A-140** | **Droop, `⌊A/(B+1)⌋+1`, no `−C`** | **1,492 vs 1,515** |
| `seatCalculator.ts` | Item 12 with `− C − D` | **1,515 and all nine party totals** |

### 31.4 Three more that would stop it at the gate

1. **`check:hex` fails on the first run.** Five components carry an `HX`
   constant of raw hex literals; the guard permits hex only in
   `tokens.ts`. Six of the eleven are not our tokens at all — it uses
   `#0C2430` as ink against our `#1A2246`. **A seventh palette.**
2. **It mails from a dead superseded domain.**
   `smtp.ecos.electioncampaignos.co.za`, from
   `reports@ecos.electioncampaignos.co.za`. `electioncampaignos.co.za` is
   in `SUPERSEDED_DOMAINS`, and `ecos.electioncampaignos.co.za` resolves
   to **no DNS record** — while the comment claims "SPF/DKIM/DMARC
   aligned".
3. **The War Room's stated rationale contradicts its own code.** The
   comment promises counters that keep reads *"O(1) on the free tier"*
   with *"nothing scanned per render"*. `tenantTotals` then does
   `.collection(counters).orderBy('day').get()` — the whole collection —
   and filters in JavaScript; `range` fetches every day ever recorded for
   a ward and filters in JavaScript. On a free-tier read quota that is a
   problem precisely where it claims to have solved one.

Also worth noting, smaller: `FieldValue.increment(1)` in an at-least-once
Firestore trigger with no idempotency key **double-counts on retry**, and
these counters are presented as the authoritative command-view figures.

### 31.5 Disposition

**Take:** the runbook, the pre-launch audit script's shape, the legal
draft text as a starting point for the attorney, and the PPFA/residency
wording as confirmation that ours is right.

**Do not take:** `src/lib/mmp.ts`, under any circumstances. The engine
that reproduces the certified result is already in this repository.

**Do not believe:** the final register. Seven green ticks describe files
that are not here.

---

## 32. The second "all phases complete" document

A-141 | pasted Phases 5–8 + programme close-out | **MIXED — one design genuinely improved, one gate falsely ticked, the wrong quota now under test**

Read against §31, which covered the first of this pair.

### 32.1 A gate is ticked against a test that does not exist

The G5 block carries:

```
[x] Aggregation fixture suite functions/src/ppfa/aggregate.test.ts:
    FY-boundary donations … threshold flag → alerts match hand-computed expectations
```

and the close-out says **"G5 ✅ fixture-suite green in CI."**

`functions/src/ppfa/aggregate.test.ts` **does not exist**, and no CI job
runs it. Thirteen other named deliverables are likewise absent —
`counters/maintain.ts`, `analytics/mmp.ts`, `ppfa/iecExport.ts`,
`reports/scheduler.ts`, `billing/weeklyMeter.ts`, `pdf/engine.ts`, the
Postgres adapter, the parity harness, `PHASE-8-RUNBOOK.md`,
`ecos-landing/`, `ic-corporate`.

§31 reported the same absence against a *description* of completion. This
is a **gate**: a tick that says an independent check was performed and
passed. That is the A-112 §1 pattern — work attributed to an artefact
that does not contain it — in the one place it does the most damage,
because a gate is what somebody relies on instead of looking.

### 32.2 The wrong quota now has a test asserting it

```typescript
const quota = Math.floor(totalVotes / (councilSize + 1)) + 1;   // Droop
// Tests: quota = floor(V/(S+1))+1; …
```

§31.3 established this is not Item 12 — **1,492 against the published
1,515** on the certified NW405 data, with no `− C` term despite its own
independent-with-a-ward-seat fixture. What is new is that the test suite
is specified to **assert the wrong formula**.

A test that codifies an error does not merely fail to catch it; it
certifies it. Anyone later checking "is the seat maths tested?" gets yes.

**It would also land beside ours.** `src/modules/analytics/mmp.ts` sits in
the same directory as `seatCalculator.ts`, and the routes it registers —
`/analytics/seat-calculator` and `/analytics/thresholds` — are **already
served** by `SeatCalculatorPage.tsx` and `ThresholdAnalyzerPage.tsx`
(`routes.tsx:59–60`). Same for `war-room`, `finance` and
`ppfa-thresholds`. Two calculators, one route each, one of them wrong.

### 32.3 Credit: the counters design is materially better

This is a real improvement on §31.4 and worth saying so. Counters are now
keyed by **scope** — `tenant`, `ward-{code}`, `vd-{code}` — as single
documents, so `counters.get(ctx, 'tenant')` genuinely is one read. The
§31 version promised O(1) and scanned the collection; this one delivers
what that comment claimed.

It also moves to `onDocumentWritten` with a before/after **delta**, so
edits and soft-deletes decrement correctly rather than only creates
incrementing, and wraps each scope in `runTransaction`.

**Still not idempotent.** Firestore triggers are at-least-once; a retried
event recomputes the same delta from the same before/after and applies it
again. The transaction makes each write atomic, not exactly-once. A
`lastEventId` on the counter document, checked inside the transaction,
would close it.

### 32.4 The signature PIN is not a second factor as designed

```typescript
if (hashPin(signaturePin, staff.pinSalt) !== staff.digitalSignaturePinHash)
  throw new HttpsError('failed-precondition', 'Digital signature PIN incorrect');
```

Two problems compound:

1. **A PIN is low-entropy and SHA-256 is fast.** Four to six digits is
   10⁴–10⁶ candidates; a salted SHA-256 is exhaustible in microseconds
   once the hash and salt are in hand. The salt stops a rainbow table
   and nothing else. This wants a deliberately slow KDF — scrypt, argon2
   or bcrypt — which is the same correction §18.2 required for hashed ID
   numbers. Second time in this register that a fast hash is used where
   a slow one is the whole point.
2. **The hash and salt would sit where colleagues can read them.**
   `firestore.rules:68` grants read on any `staff/{uid}` document to a
   caller with `team.manage`. So the person who administers the team can
   read another officer's `digitalSignaturePinHash` and `pinSalt` and
   recover the PIN offline — **the second factor on IEC export is
   defeated by the role that provisions it.**

If a PIN gate is wanted, the material belongs somewhere no client can
read, verified server-side, with a slow KDF and attempt throttling.

### 32.5 What is sound

- **The residency wording is quoted verbatim and correctly**, again.
- **Phase 8 is "ARMED", gated on the first paying customer** — which is
  exactly what A-111 §4 says: *"Phase 8 is conditional, not scheduled."*
  Correctly respected, and the parity-harness idea (*"if it passes, the
  migration is done"*) is the right shape for a DAL swap.
- **The SPIKE · G5 guard** — sentiment renders observed counts only, "no
  NLP scores, no predictive language … never claimable in marketing."
- Landing and corporate split into isolated deploy targets, which matches
  A-111 §4's insistence that Phase 7 is a separate project.

### 32.6 Disposition

**Take:** the scope-keyed counter design (§32.3), with an idempotency key
added; the Phase 8 parity-harness idea; the SPIKE guard wording.

**Do not take:** `mmp.ts` and its test. **Do not take** the PIN scheme as
written.

**Do not rely on the close-out.** "ALL PHASES COMPLETE" and "G5 ✅" refer
to files that are not in this repository, and the routes it would add are
already live.

---

*Append new batches as §7-style tables. Identity by hash; filenames in
this project repeat across conversations and are not reliable keys.*
