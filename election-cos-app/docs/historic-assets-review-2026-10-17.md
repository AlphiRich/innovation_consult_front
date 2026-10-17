# Three historic assets — review and verdicts

17 October 2026. Three assets supplied for review: carry forward what has
value, and say plainly what must not be carried.

| Asset | What it is | Verdict |
|---|---|---|
| `01-claude-code-build-spec_1.md` | **IC-ECOS-BUILD-2026-V1**, 8 Aug 2026 | **Superseded by V2.** Two of its five overriding rules are now reversed. Four genuine disciplines in it; two of those we do not have. |
| `municipal-gantt-planner-v2_1.xlsx` | IC-ECOS-WP-2026-V4 — 20-week WBS and Gantt, 60 rows | **Wrong stack, wrong figures, one forbidden workstream.** Keeps real value as a *schedule*. |
| `DOCTYPE_1.txt` | "NW Canvassing Mobile Control Tower" — single-file React/CDN prototype | **Ward data is wrong in a dangerous way.** Some reference value; no code value. |

---

## 1. The finding that matters most

**`DOCTYPE_1.txt` carries North West ward counts that are wrong for 7 of
18 municipalities — and its national total is right.**

Its `PROVINCIAL_DATA` totals **402 wards**. The proclaimed delimitation
(Annexure A to IEC Circular 1 of 2025) also totals **402** for North
West. A spot-check on the headline figure passes. The distribution does
not:

| Code | Municipality | Asset | **Proclaimed** | Δ |
|---|---|---|---|---|
| NW371 | Moretele | 28 | **25** | −3 |
| NW374 | Kgetlengrivier | 6 | **7** | +1 |
| NW375 | Moses Kotane | 34 | **35** | +1 |
| NW382 | Tswaing | 15 | **14** | −1 |
| NW384 | Ditsobotla | 21 | **20** | −1 |
| NW393 | Mamusa | 9 | **8** | −1 |
| NW397 | Kagisano-Molopo | 11 | **15** | +4 |

The other eleven agree, including the pilot (NW405 JB Marks, 34). Three
of the four district rollups are also wrong — DC37 154 vs **153**, DC38
104 vs **102**, DC39 60 vs **63** — and they too sum to 402.

**This is the worst shape a bad dataset can take.** Every aggregate
checks out; seven municipalities would be campaigned on the wrong number
of wards. Ward count drives the seat quota, so an error here propagates
straight into a seat projection a party would brief a press conference
on.

**Do not ingest any ward figure from this asset.** The proclaimed
delimitation is hardwired and governs, and
`provinceDelimitation.test.ts` already reconciles all 44 districts
against their locals — which is why this was checkable in minutes rather
than being discovered later.

**One name variant worth keeping.** The asset writes **Mahikeng**
(NW383); the Annexure writes **Mafikeng**. The Annexure's spelling stays,
because the Commission's spelling is what appears on a nomination form —
that is already the recorded policy. The variant is worth knowing when
matching a supplied dataset, and is noted in
`municipalCodeHistory.ts`.

**Genuinely new but unverified:** administrative seat towns per
municipality (Makapanstad, Brits, Koster, Mogwase, Setlagole,
Delareyville, Lichtenburg, Zeerust, Vryburg, Schweizer-Reneke, Taung,
Christiana, Ganyesa, Klerksdorp, Wolmaransstad, Potchefstroom…). Nothing
in the build computes with them, and they trace to no primary source
here. Recorded as available, not ingested.

---

## 2. V1 of the build spec — superseded, but not worthless

**Two of its five overriding rules are now reversed**, which is the whole
reason it cannot be merged, only mined:

| V1 rule | Status |
|---|---|
| §0.4 "There is **no** funding, donation, or PPFA module… delete it and note it" | **Reversed.** V2 §6.8 mandates it. The build has `/finance`, donor capture, the disclosure register, effective-dated PPFA config and a held aggregation function. This is also why the nav is **nine** items and V1's table shows eight — the ninth is Funding & Disclosure. |
| §0.5 "There is **no** gatherings permit workflow… a single static advisory page only" | **Still in force**, and the Gantt violates it (see §3). |
| §4.4 "No Finance Officer role in v1" | **Reversed with PPFA.** Seven seed roles now, including Finance Officer and Compliance Officer. |

### 2.1 A formula in V1 that is wrong and was already disproved

§8.2 presents, under the heading "Fix:", this quota:

```
Q = floor(totalValidVotes / (totalSeats + 1)) + 1
```

That is a Droop quota. **It is not the South African municipal
formula.** The build implements Municipal Structures Act **Schedule 1
Item 12** — `Q = (A/(B−C−D))+1` — with Item 16 for excessive seats, and
session 8 disproved the Droop-adjacent form against a real IEC result.
`SeatCalculatorPage.tsx` records this in its header precisely so the
formula is not re-adopted from a document that presents it
authoritatively.

V1's surrounding instructions are sound and were followed: PR seats never
negative, overhang retained, ties never auto-resolved, property-based
tests.

### 2.2 Four disciplines from V1 — two held, two we do not have

| V1 discipline | Status |
|---|---|
| §4.3 Auth minimal footprint, asserted by a CI test | ✅ **Held.** `firebaseAuth.test.ts` pins `PERMITTED_AUTH_FIELDS` to exactly `uid`/`email`/`emailVerified`, rejects a StaffProfile-shaped write, and asserts `updateProfile` clears the `displayName`/`photoURL` Google populates. |
| §3.5 "Blockchain Verified Hash" → "Document Integrity Hash (SHA-256)" | ✅ **Held**, and guarded by two tests that assert the word never returns. |
| §6.2 informal-settlement addressing | ✅ **Held.** `dwellingType` + `informalDescriptor` + GPS. |
| §5.2 **one port test suite, run against both adapters** | ❌ **Not built.** There is no `src/dal/ports/*.test.ts`. |
| §7.4 **dev read-counter that fails the build over 50 reads per page load** | ❌ **Not built.** |

The first gap is the more serious. **The entire justification for the DAL
is that Phase 8 becomes a swap rather than a rewrite — and the thing that
proves it is a storage-agnostic suite that passes against both
adapters.** Without it, "the DAL held" is an assertion, not a result. The
boundary is enforced (ESLint forbids `firebase/*` outside adapters), but
enforcement of the boundary is not evidence of substitutability.

The second gap is cheaper and still real: the free-tier discipline is
followed by hand (counters doc, pagination, no wide listeners) with
nothing stopping a regression.

Both are now issues #17 and #18.

### 2.3 Also worth noting from V1

- §7.3 "Write the OpenAPI spec **before** the implementation." We did
  not; `sync.ts` was built from the V1 JSON sketch, with 33 pure-function
  tests. The sketch's shape — `accepted`/`rejected`/`conflicts`/`changes`,
  `idempotencyKey`, per-field LWW, `retryable: false` for
  `CONSENT_REQUIRED` — is what we implemented, so the gap is the
  document, not the behaviour.
- §8.3 Ward Intelligence: *"the multilingual sentiment claim has no model,
  no baseline, and no accuracy evidence… Report before building. If
  accuracy is not demonstrable, the feature does not ship, and the
  commercial material must stop claiming it."* This **corroborates** the
  build's position exactly. It also names a candidate baseline,
  `MzansiText_and_MzansiLM`, which we have never evaluated.

---

## 3. The Gantt planner — a good schedule attached to the wrong build

### 3.1 It describes a different system

| Gantt | This build |
|---|---|
| AWS **af-south-1** (Cape Town) managed Postgres + Redis | GCP Firestore, **africa-south1** (Johannesburg) |
| Node.js + Express + **Prisma ORM** | Firebase Cloud Functions + the DAL port/adapter |
| Physically isolated database per tenant | One Firestore root, `/tenants/{tid}`, isolation in claims + rules + DAL |
| "4-level RBAC (HQ Admin, Local Head, Ward Lead, VD Captain)" | 26 capabilities, 7 roles, per-user overrides |
| **Base64** geolocated photo uploads | Blob in IndexedDB offline → Cloud Storage on sync |
| `trg_popia_consent_check` database trigger | Consent condition in `firestore.rules`, mirrored in the DAL |

V1 §3.5 already required "af-south-1" → "africa-south1 (Johannesburg)",
and V1 §6.4 already forbade Base64 in documents. The Gantt predates both
corrections.

### 3.2 Its PPFA figures are the superseded ones

The Gantt schedules alarms at **R80,000 warning / R100,000 critical /
R15 million annual cap**.

**The build uses R200,000 and R30,000,000**, from
`Government Gazette No. 53182, 18 August 2025`, with the warning at 80%
of R200,000 = **R160,000** — and `ppfaDefaults.ts` carries the comment
*"never R80,000 (superseded)"*, which exists because this exact error has
been seen before.

Carrying the Gantt's figures forward would set a disclosure trigger at
half the statutory threshold and a donor cap at half the statutory cap.
**Do not.**

### 3.3 One workstream is forbidden, and is also a legal category error

WBS 2.3 schedules a Public Gatherings Act permit regime: "daily event
calendar permit status scanner", "automated T-7 Days warnings", "T-3
Days automatic high-priority escalation", "cross-reference municipal
permit statuses", WhatsApp/SMS notifications.

V1 §0.5 forbids all of it — "no permit tracking, no T-7/T-3 alerts, no
compliance automation for gatherings" — and so does V2.

Beyond scope, **it is wrong about the law.** The Regulation of Gatherings
Act 205 of 1993 is a **notice** regime, not a permit regime: the convener
gives notice, and the responsible officer may impose conditions or
prohibit. There is no "permit status" to scan. A product that tracked
permit statuses and sent T-7 warnings would be telling a campaign it was
compliant against a test the Act does not contain. The build's static
advisory says this explicitly, and ends by stating the platform does not
file notices or monitor compliance — a paragraph V1 marked "required. Do
not soften it."

### 3.4 What the Gantt is genuinely worth

**Its schedule, which is the thing we do not have.** Anchored to today:

| Milestone | Date | From 17 Oct 2026 |
|---|---|---|
| Sprint 4 — hardening, stress test, freeze | 16–31 Oct | **now** |
| Production code freeze | 28–31 Oct | **11 days** |
| **Election day** | **4 Nov** | **18 days** |

Two tasks in Sprint 4 describe tests we do not have:

- **1.5.1** load-test runner, 120 PWA devices and 1,200 sync payloads
- **1.5.2** verify last-write-wins reconciliation under 20% socket
  dropouts

We have 33 pure-function tests over `syncMerge` and 52 in `functions/`.
We have never run the sync endpoint under concurrency or packet loss.
That is a real gap at T−18 days — issue #19.

Also worth recording, not building:

- **2.1.3** a 48-hour verbal-consent remediation dispatcher. The
  *remediation* half is a good idea — flag doorstep records whose verbal
  consent has not been confirmed. The *"cron purge"* half is dangerous
  and conflicts with the standing rule that work is never silently
  discarded; a canvasser's afternoon must not evaporate on a timer.
- **3.1** independent penetration test, budgeted ZAR 120,000.
- **5.2.3** ISO 27001 Stage 1 & 2.
- **5.1** post-election councillor casework pivot at R2,500/month per
  ward, reusing the incident capture and geolocation already built. The
  most commercially interesting item in the set.

### 3.5 Two cost models that disagree

The Gantt projects **R250/month per ward** (WBS 5.2.2, "90.0% gross
margins"). `DOCTYPE_1.txt` models **R93.37/ward** optimised against
**R843.06/ward** unoptimised. Neither is sourced, and both price the
Phase-8 Postgres/Cloud SQL architecture rather than what was built, which
runs on Firestore. `docs/infrastructure-blueprint-review.md` already
reviewed this family of figures. **No figure from either is usable as a
price.**

---

## 4. The prototype's design system is a fifth palette

`DOCTYPE_1.txt` declares an "Executive Precision" theme: ink `#000c15`,
paper `#effbff`, plus a RAG trio. That is **neither** the corporate
identity (`#13244A`/`#C9A227`/`#7B1E30`/`#F4EFE2`) **nor** the product
tokens (`#1A2246`/`#B7913F`/`#7E1F2E`/`#F7F4EE`). V1 §3.3 warned about
three conflicting palettes and named four drift values to avoid; this is
another. `check-no-hex.mjs` and `check-type-scale.mjs` make it a
non-issue for the build.

Two details in it **corroborate** decisions already made, which is worth
something: `.touch-target { min-height: 44px; min-width: 44px }` matches
the 44px rule, and its `.label-caps` at 700 weight with letter-spacing
matches the `label-caps` token. Its mobile bottom tab bar is the
alternative the shell considered and rejected, because §3.2 fixes the nav
at nine items and nine does not fit a tab bar.

**No code should be carried from this file.** It is CDN React with
in-browser Babel, and it holds `const apiKey = ""` next to live Gemini
endpoints — a pattern that is inert only because the key is empty, and
that exposes the key client-side the moment anyone fills it in.

---

## 5. Actions taken

1. This review, committed.
2. **#17** — one port test suite, run against both adapters. The
   missing proof behind the DAL.
3. **#18** — dev read-counter guard, V1 §7.4.
4. **#19** — sync load and dropout test, from Gantt 1.5.1/1.5.2.
5. The T−18 countdown added to `docs/session-handoff.md`, because the
   deploy is still blocked on two values the account holder has to
   supply.

Nothing was ingested from any of the three. The one checkable dataset
among them disagreed with the proclaimed delimitation in seven
municipalities while matching on every total.
