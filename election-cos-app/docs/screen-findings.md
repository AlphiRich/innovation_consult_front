# Stitch screen findings (session 5, 9 Aug 2026)

Source: `stitch_ic_election_management_suite.zip` — 66 screen folders (code.html
+ screen.png) + `civic_authority/DESIGN.md` + `ic_election_campaign.jsx`
(single-file reference demo). This is the first batch of real Stitch assets
received; `BUILD-STATUS.md` blocker #1 ("no Stitch screen assets") is
**partially** resolved — a full 66-screen inventory-to-route mapping (the
actual Phase 1 gate deliverable, build spec §3.4 item 1) is still
outstanding and should happen as its own pass, not folded into this note.

## Retired-shell screens — excluded, not built from

A large share of the batch is branded **"Civic Architect"** or
**"SA Elections 2024"** — both explicitly retired per the master index's
consolidation directive (§3.2: "Retire 'Civic Architect', 'Civic
Authority', 'SA Elections 2024'"). Their `#040c30`/dark-navy-and-gold
palette is the exact drift the build spec's §3.5 copy-corrections table
already calls out. Observed in this batch: DevOps/infrastructure
permissions management (cloud infra, AES-256 key rotation, S3 bucket
policy, VPC routing — an "Infrastructure Architect"/"DevOps Engineer" role
that has no place in a campaign product; likely a mismatched admin
template, not a real requirement), incident-triage SMS/WhatsApp
notification config, a "Voucher Manager" / "Resource Allocation" logistics
dashboard, and a "Constituency Filing Audit Log" / "Municipal Incident
Report" PDF export.

**Disposition:** excluded from this build. Two of them (notification
config, resource logistics) show interaction patterns that *could*
usefully inform our real Logistics/Incidents modules later — the pattern
(progressive-disclosure toggle-then-nested-checkboxes; asset inventory
table with status pills) is generic enough to reuse, just never the
palette, copy, or DevOps-flavoured data model. Flagging for the Phase 1
inventory pass, not acting on it now.

## `civic_authority/DESIGN.md` — split verdict

Its YAML colour palette (`primary: '#040c30'` etc) is the same retired
drift. Its prose "Brand & Style" section, however, explicitly cites **our
real brand values** (Ink `#1A2246`, Amber `#B7913F`, Paper `#F7F4EE`) and
documents a typographic role scale (`display-lg`, `headline-md`,
`body-lg`/`body-md`, `label-caps`, `data-mono`) that's brand-neutral and
genuinely useful. Adopted into `tailwind.config.js` / `tokens.ts` this
session (kept in sync by `tokens.test.ts`). The colour palette from this
file was **not** adopted.

## Voters/households screens — used, and where they exceed the data model

`voter_detail_profile`, `household_voter_logging`,
`voter_profiling_service_delivery_intake` are under the actual
**"ELECTION CAMPAIGN OS"** shell (our target, matching the nav labels in
the build spec) and are the direct reference for the Voters module built
this session (`src/modules/voters/`). Structure used as-is (household →
voter cards, sentiment pill, "Log Response" action, POPIA consent
section), reskinned to our tokens.

**They show more fields than `Voter` in `src/dal/ports/voters.ts`
currently has:**

| Screen field | Notes | Recommendation |
|---|---|---|
| Formatted Voter ID (`ZA-992-0481`) | Display code, not obviously a real IEC identifier | Skip — not in build spec §6.2, no stated source |
| Demographics (age/gender), email | Not in current `Voter` type | Flag for a data-model decision, don't add silently |
| Primary concerns (tag chips: Electricity Grid, Crime & Safety, Water Infrastructure) | **Maps cleanly onto the existing `IncidentCategory` enum** (`ELECTRICITY`, `PUBLIC_SAFETY`, `WATER_SANITATION`) | Likely belongs as a query over that voter's/household's `Incidents`, not a new field on `Voter` |
| Engagement History timeline (CANVASS/PHONE/SMS entries with notes) | Overlaps `DiaryEntry`, but `DiaryEntry` isn't currently linked to an individual voter (only `vdCode`/`wardCode`/`streetName`) | Needs a real decision: add `voterId` to `DiaryEntry`, or a separate lightweight per-voter note log |
| Demographic profile (age group, employment status, primary language) + psychological alignment (1–5 scale, probability-of-support %) — from `voter_profiling_service_delivery_intake` | Not in `Voter` at all; a materially richer profiling concept than the 5-tier `sentiment` enum | Explicit scope-expansion decision needed before building — not done this session |
| Service delivery status per utility (Water/Electricity/Sanitation/Roads, Stable/Critical/Intermittent) — same screen | **This is very plausibly meant to create `Incident` records**, not fields on `Voter` — the categories match `IncidentCategory` almost one-to-one | Recommend: wire as "log an incident from this voter capture flow" in a future pass, not a `Voter` field |

**Nothing above was added to the data model this session.** The Voters
module built matches `Voter` exactly as governed by
`01-claude-code-build-spec-v2.md` §6.2. This table exists so the richer
screens aren't silently dropped (build spec §3.4 item 5's requirement),
and so a future session doesn't have to re-derive this comparison from
scratch.

## A fifth product-name variant: "ElectoralOS"

`vd_captain_dashboard_hyper_local` and `lge_war_room_local_head` render
under the wordmark **"ElectoralOS"** — a name not listed anywhere in the
master index's "four shells, three names" inventory (Election Campaign
OS / Civic Architect / Civic Authority / SA Elections 2024). Nav in both
(Command Center · Voter Roll · Ward Mapping · Field Diary · Resources ·
Settings) matches the master index's description of the "ELECTION
CAMPAIGN OS — Strategy HQ / District Admin" shell exactly, so this is the
**same target shell**, just a fifth transient name for it in the source
material — not a new product to reconcile, just one more name to retire
(consistent with the existing "one product name" consolidation, no
action needed beyond noting it).

## Wards & VDs (session 7) — used `lge_war_room_local_head`

That screen's "Ward/VD Voter Matrix" table (VD Code · Location/Name ·
Registered · Active Volunteers · Target Coverage · Performance · Actions)
is the direct reference for `src/modules/wards/`. Trimmed to columns the
governing data model actually has (VD code, name, registered voters —
no volunteer-assignment or coverage-performance fields, those belong to
a module that doesn't exist yet). The screen embeds a real interactive
map (Google-Maps-style tiles, pins, "Download Shapefiles"); per build
spec §6.1 ("schematic map first... do not pull in a GIS stack in v1")
that was deliberately **not** reproduced — `SchematicMap.tsx` renders a
proportional tile grid instead, sized by registered-voter count, with an
explicit label saying it isn't a real map.

## Incidents (session 9) — a real taxonomy discrepancy, not adopted

`vd_captain_log_incident_modal` (same "ElectoralOS"/retired-palette shell
as the Wards screens above) shows a "Log Local Incident" modal with a
**different** incident taxonomy than the governing `IncidentCategory`
enum in `src/dal/ports/incidents.ts`: the screen offers Access Denied,
Vandalism, Intimidation, Supply Shortage, Other — field-operations/
canvasser-safety issues — where the governing data model's four
categories (`WATER_SANITATION`, `ELECTRICITY`, `ROADS_TRANSPORT`,
`PUBLIC_SAFETY`) are community service-delivery issues meant for
municipal referral (§6.4). These are two different concepts wearing the
same "incident" word. `src/modules/incidents/IncidentForm.tsx` (built
this session) uses the governing enum, matching §6.4 exactly, and does
**not** adopt the screen's taxonomy — flagged here rather than silently
picked one or blended them. The screen's Severity field (Low/Medium/
High/Critical) and Description/Photo fields do match what was built,
which is a useful confirmation of everything except the category list.

`incident_report_export_*` (DRAFT watermark → authorized → signature →
timestamped views) are the same retired "Municipal Incident Report" PDF
export screens already flagged as excluded in the "Retired-shell
screens" section above — not new information, just confirms
§6.4's referral-PDF concept (`IncidentRepository.markReferred()`) was a
real, spec'd feature, not invented — it's just not built yet (see
`IncidentsPage.tsx`'s header comment for why).

No IEC demarcation source data had been supplied as of this note's
original writing; both named PDFs (`8929_18112025_NWestDemarcation.pdf`,
`NW405.pdf`) arrived in session 8 — see `docs/nw405-seed-data.md` for the
full account (a real, working ingest script, real seed data for JB Marks,
and two real bugs it caught: a wrong seat-calculator quota formula and a
VD-identity collision for split voting districts). `WardForm.tsx` /
`VDForm.tsx` remain the manual-capture fallback for every municipality
that isn't JB Marks, and for JB Marks itself until a live Firebase
project exists to load the seed data into.

## Field Diary (session 9, continued) — used `ward_field_app_mobile`

`ward_field_app_mobile` (branded "ElectoralOS | Field Interface" — same
fifth-name shell noted above) has an actual "Field Diary" panel: a
"+ New Entry" action and timestamped entries, each with a type tag
("Rally", "Observation"), a short title ("Street Corner Meeting: Oak &
Main"), and free-text notes. **No household-count field is visible at
all.** This is the first real screen `src/dal/ports/diary.ts` ever had —
its header comment had said the field list was provisional and invited
exactly this reconciliation once a real screen existed.

Unlike the Voters/Incidents cases (shipped, tested schemas — screen
richness flagged and left alone), this port had zero other consumers and
an explicit "refine me" note, so the schema itself was updated rather
than just flagged: `activityType` (`CANVASS`/`RALLY`/`OBSERVATION`/
`OTHER`) and an optional `title` were added, keeping `streetName` +
`householdsVisited` for the `CANVASS` case — those are the quantitative
half the future War Room coverage-% derivation needs (§6.3) and the
screen's version has nothing that serves that purpose. See
`src/dal/ports/diary.ts`'s header for the full reasoning.

## War Room (session 9, continued) — used `lge_war_room_local_head`, partially

Same screen as the Wards module (its title literally is "War Room", nav
label "Command Center" — matches this route exactly), this time its top
dashboard section rather than the Ward/VD table. It shows: Total
Registered Voters with a target/%-achieved bar, Active Volunteers (with
an online-now count), Campaign Velocity (a "voters per minute" figure), a
High Activity Zone ranking, a live Field Diary feed, and an Official
Directives document repository.

Only the pieces with a real, traceable data source in this codebase were
built: voters captured, households canvassed, sentiment breakdown, and
incidents-by-status, all from the new `warRoomCounters` doc, plus a
registered-voters coverage % against the Wards collection's real total.
**Not built**, and not faked with placeholder numbers: volunteer presence/
online tracking (no such feature exists), campaign velocity (no per-
minute metric is computed anywhere), a high-activity-zone ranking (would
need a per-ward coverage comparison this session didn't build), a live
diary feed (the diary port only supports per-VD listing, not a
tenant-wide recent-activity query), and the directives repository (no
UI exists for `dal.documents` yet). `WarRoomPage.tsx`'s header comment
records this explicitly — same discipline as the Incidents module's
referral-PDF gap and the Voters module's phone-encryption gap.
