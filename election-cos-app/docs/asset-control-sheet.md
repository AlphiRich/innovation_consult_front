# Asset control sheet

The register for assets uploaded from other Claude conversations.
Identity is established by **SHA-256**, not by filename — several files
arrived under different names with identical content, and two arrived
under the same name with different content.

**Opened 28 October 2026 · T−7** (election day 4 November).
**94 files received · 65 distinct · 29 redundant copies**, across seven
batches. Running totals are in §7.

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

1. **A-031 / A-032 — the fork and its build bundle.** After 4 November.
   Port forward from the fork; never merge backward. Start with
   `src/MemberCapture.tsx`, `src/services/**`, `src/hooks/**`.
2. **Entity identity (§0).** Blocked on the lodgement and the
   subsidiary's registration documents. Then: licensor/licensee split,
   effective-dated, and the three inline literals routed through config.
3. **Role model.** Six documented (A-027) against seven seed roles and 26
   capabilities built. One has to give.
4. **Which stack.** Four descriptions are in circulation — Firebase/
   Firestore (built, A-024), AWS Postgres (A-023), Postgres/Prisma
   (A-032), MySQL/Prisma (A-008). A-024 matches reality.
5. **The security package (A-004–A-010).** Wrong stack for EC OS and
   three files cannot pass their own gates. Rewrite only if the package
   has a destination.
6. **Stitch re-export (A-045/047).** 178 screens, 121 with nothing
   outside Stitch. Operational work for a human in the Stitch UI.
7. **PPFA citation (A-043).** "6 Aug 2025 proclamation" against our
   verified *Gazette No. 53182, 18 Aug 2025*. Figures agree; provenance
   does not.
8. **Palettes.** A-049 introduces a fourth (`#040c30` / `#795907`).
   Canonical remains corporate `#13244A`/`#C9A227` and EC OS product
   tokens `#1A2246`/`#B7913F`.

## 6. What must not be carried forward

- **The NW405 32-ward "correction"** (§1). Wrong provenance; fails the
  statutory ward-seat test; now contradicted by MDB Gazette 8929.
- **PPFA R80k/R100k/R15M** (A-041, A-042 §2.1). Superseded.
- **PSP figures of R7,515 / "under 1%"** (A-020, A-021).
- **"Cumulative cash dips negative in December"** (A-021).
- **The fork as a merge source** (§3). Donor tree only.
- **Any legal entity name written to code before the registration
  documents land** (§0).

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
| **total** | **94** | **65** |

Redundancy is running at **31%**. The pattern is consistent: the same
research corpus re-exported from several conversations. Hash-keying is
doing real work — four copies of one HTML file, three each of the base
report, the RD report, the Ventersdorp CSV and the research skill.

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

*Append new batches as §7-style tables. Identity by hash; filenames in
this project repeat across conversations and are not reliable keys.*
