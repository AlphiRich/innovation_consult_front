# ecos-v2 fork — source review

Sessions 11–13 (7 Sep 2026). The human supplied a parallel build of this
same product — `ecos-v2`, developed in Google AI Studio with Gemini
code-assist rather than Claude Code — first as a zip, then as loose source
files. This records what was examined, what was taken, and what was
rejected and why, so a future session doesn't re-litigate the same calls or
quietly absorb the rejected parts on a second pass.

**This is a review of a different codebase, not of this one.** Nothing here
describes `election-cos-app`'s own state except where explicitly noted.

## Provenance

Built through Google AI Studio (`assets/.aistudio/`, `bun.lock`,
`metadata.json` declaring `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, and a
Session-6 note citing platform attribution ID
`gmp_mcp_codeassist_v1_aistudio`). It forked from this repo after Session 1
and developed independently. Its own `BUILD-STATUS.md` records only Voters
as a real module as of its Session 5 — this repo has since built every
module — so it is behind on functionality and ahead on nothing except the
Google Maps integration (ported properly in session 11) and the naming pass
(corrected against the real source in session 12).

## Taken

| What | Where it landed | Note |
|---|---|---|
| Household geocoding on a map | `src/modules/voters/VoterHouseholdMap.tsx` | Rebuilt, not copied — see session 11 in BUILD-STATUS.md |
| Ownership/rights strings | `src/lib/legalText.ts` | Corrected against `CLAUDEHANDOFF.md` §1 and later `03-NAMING-SCHEMA.md` §2.1/§2.3 |

## Rejected, with reasons

### 1. `services/metricsService.ts` — fabricated campaign figures

Confirms what session 11 flagged from the patch scripts alone. The service
constructs metrics from hardcoded constants and trigonometric noise:

- `reachBase = 2482901` — "Total Voter Reach"
- `donationsBase = 15450000` — **R15.45 m of donations**
- `sentiment: 54.8`, `precinctsSecured: 42 / 120`, `volunteerHours: 8450`
- `generateHistoryForTimeframe()` synthesises every chart point via
  `Math.sin()`/`Math.cos()` against those bases

`export const metricsService = new MetricsService(true)` — the `true` is
`useMock`, so **the fabricated path is the default**. The Firestore branch
exists but falls back to the same invented numbers on any error.

The donations figure is the serious one: this product is PPFA-regulated,
and a fabricated R15.45 m donations total rendered in a finance dashboard
is the kind of number that could be screenshotted into a party
conversation. Not adopted in any form. This repo's War Room reads real
counters (`functions/src/warRoomCounters.ts`) or shows nothing.

### 2. `modules/telemetry/telemetryData` + `campaignTelemetry.test.ts`

Same pattern one layer down — a telemetry engine over invented ward
weights and daily targets, with a test suite that asserts the *shape of
the invented data* (`ward12?.status === 'AHEAD'`,
`snap14d.comparison.growthPct > 0`). Tests that pass because the fixture
was authored to make them pass carry no signal about correctness.

### 3. `index.css` — palette regression to a retired value

Defines `--bg-header` / `--bg-rail` as `#040c30`, `--text-secondary` as
`#42474B`, `.gold-accent` as `#795907`, `.maroon-accent` as `#290006`.

`#040c30` is specifically the **retired** Stitch-suite navy.
`CLAUDEHANDOFF.md` §5 records `#1A2246` vs `#040c30` as an already-resolved
conflict decided in favour of `#1A2246`, which is what
`src/design/tokens.ts` uses. The fork regressed to the retired value. It
also introduces Inter (this repo's body face is Public Sans), a dark theme
this repo doesn't have, remote CDN font imports, and Tailwind v4 syntax
(`@import "tailwindcss"`) against this repo's v3.4. Not adopted.

### 4. `services/validation.ts` — right algorithm, wrong enforcement, fake PII

This is the most substantive thing in the fork, and the most nuanced call.
It implements SA National ID validation (13 digits, DOB parse, gender,
citizenship, Department of Home Affairs Luhn checksum), POPIA masking, and
duplicate-capture detection that logs a HIGH-severity incident.

**The checksum algorithm is correct.** Transcribed verbatim and run against
its own fixtures: sum odd-position digits, concatenate even-position
digits and double, digit-sum that, `(10 - total % 10) % 10`. Its
`9001015009086` fixture computes check digit 6 and has 6; its
deliberately-corrupted `9001015009087` correctly fails. That part is worth
keeping if SA ID validation is ever needed here.

**But three things sit on top of it that are not:**

- **Checksum enforcement is off by default, including in the anti-fraud
  path.** `validateSouthAfricanId()` only enforces Luhn when the caller
  passes `{ strictLuhn: true }`, and
  `validateAndVerifyMemberCapture()` — the POPIA anti-fraud capture flow —
  calls it *without* that option. A checksum-invalid ID number is accepted
  as `isValid: true` by the fraud-detection routine. Its own test suite
  can't catch this: the `8804150123183` fixture asserted valid computes
  check digit 7 and carries 3, i.e. **the fixture itself fails the
  checksum** and passes only because enforcement is off.
- **Six fabricated people are baked into the module.**
  `SEED_CAPTURED_IDS` holds full names, phone numbers, ID numbers, wards
  and VDs for six invented South Africans, auto-loaded into a module-scope
  `Map` at import time. All six ID numbers fail the checksum (verified —
  expected/actual: 3/4, 6/9, 3/7, 8/3, 7/5, 2/1), which at least means
  they cannot collide with a real person's ID. It is still a fabricated
  member registry initialised on import, inside the compliance surface of
  a POPIA product.
- **It reaches past the DAL.** It imports
  `@/dal/adapters/firestore/incidentsRepository` directly rather than
  going through `dal.incidents`, which every other module in this repo
  uses. That defeats the port/adapter boundary the Postgres cutover
  depends on.

**Not ported, and deliberately not ported "cleaned up" either** — there is
no consumer for it in this repo today. `Candidate.idNumberMasked` documents
the exact `'771120 •••• 081'` mask shape this code produces, but nothing
writes that field, the Candidates module has no UI or route (it is not one
of §3.2's nine nav items), and `DonorForm` deliberately does not capture ID
numbers because `idNumberEncrypted` needs Cloud KMS that doesn't exist yet.
Adding a validator with no caller would be speculative code.

**If SA ID validation is ever needed here** (most likely when Candidates
gets a capture UI): take the checksum algorithm, enforce it by default
rather than behind an opt-in flag, derive test vectors by computing them
rather than copying the fork's fixtures, and leave the seed registry
behind.

### 5. `main.tsx` — boot-time Firestore connection test

The fork calls `testConnection()` at startup. Declining for an
offline-first PWA: a canvasser cold-starting the app in the field with no
signal is the normal case, not an error worth a console warning on every
boot.

### 6. Everything else in the batch

`App.tsx`, `vite-env.d.ts`, `MemberCapture.tsx` (a re-export shim) are
trivial or identical to this repo's. `setup.ts` and `syncTypes.ts` **are
this repo's own files** round-tripped back — `syncTypes.ts` still carries
the post-rename "Election Campaign OS" header from session 11.

## A hard conflict the fork exposes in the V2 bundle

`tenantIsolationRls.test.ts` is a pure-function model of a Postgres RLS
policy, and its stated purpose (header, item 1) is *"String VARCHAR(36) ID
compatibility (no ::UUID cast failure)"*. Its fixtures use human-readable
tenant ids — `'tenant-jbm-anc-2026'` — and one test exists specifically to
prove those don't throw a UUID cast error.

The V2 bundle's own `010_v2_shared_tenancy.sql` does the opposite:

```sql
tenant.id  uuid  PRIMARY KEY DEFAULT uuid_generate_v4()
...
CREATE POLICY tenant_read_self ON tenant
  FOR SELECT USING (id = current_setting('app.current_tenant_id', true)::uuid);
```

Setting `app.current_tenant_id` to `'tenant-jbm-anc-2026'` under that
policy raises `invalid input syntax for type uuid`. **The fork's RLS tests
and the bundle's RLS migration cannot both be right.** Whoever owns the
bundle needs to pick: uuid keys (and human-readable tenant slugs move to a
separate column) or VARCHAR(36) keys (and the `::uuid` casts come out of
every policy). Flagged rather than picked here — this repo is
Firestore-native and neither applies to it yet.

Incidentally, that test file is a **third independent source** for the
6-role canonical set (`HQ_ADMIN`, `LOCAL_HEAD`, `FINANCE_OFFICER`,
`WARD_LEAD`, `VD_CAPTAIN`, `VOLUNTEER`), alongside the bundle's seed and
the `ecos-rbac-config` skill — against this repo's seven roles from
build-spec §4.4. See BUILD-STATUS.md session 12 for why the seventh
(`compliance-officer`, which owns the POPIA DSR workflow) was not dropped
unilaterally.
