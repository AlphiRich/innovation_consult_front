# Phase 1 screen inventory — the re-supplied Stitch batch (14 Oct 2026)

The actual Phase 1 gate deliverable `phase-1-ia-consolidation.md` §1 asked
for: every Stitch screen mapped to a route, or marked **OUT OF SCOPE v1**,
or **DUPLICATE OF** another screen. This covers the 47 screens with a real
`code.html` export in `docs/stitch-screens/` (the `stitch_ic_election_
management_suite_3_Aug_2026.zip` re-supply) — the other 182 folders in that
zip are screenshot-only or empty; there is no HTML to classify for those,
only a PNG to eyeball, which is a separate, larger pass.

Disposition categories, same ones `docs/screen-findings.md` already
established:

- **ROUTE** — maps to an existing route; reused as layout/interaction
  reference, never for its retired branding, fabricated names, or any
  field outside the governing data model.
- **BUILT** — this session built a previously-missing screen from it.
- **GAP** — real, in-scope, still has no screen. Reference is ready;
  nobody has built it yet.
- **EXCLUDED** — retired "Civic Architect" / "Civic Authority" / "SA
  Elections 2024" shell, a DevOps/infrastructure persona this product has
  no role for, or a mismatched third product skin ("Campaign Resource
  Manager", "Admin Portal") that isn't Election Campaign OS at all. Kept
  out of routing; a pattern is sometimes still worth reusing, noted where
  true, per `screen-findings.md`'s own precedent.
- **OUT OF SCOPE v1** — real product idea, but ruled out by the governing
  spec (§8.3's Ward Intelligence v2-spike) or not in any governing spec at
  all (no port, no mention anywhere) — not something to build on a Stitch
  screen's say-so alone.
- **OUT OF SCOPE (marketing)** — `election-cos-landing` / `ic-corporate`
  content, per build spec §2 and the website/app split confirmed this
  session. Left alone, same as the rest of that split.
- **DUPLICATE OF** — a near-identical re-skin of another screen in this
  same batch.

## BUILT this session

| Screen | Route | Notes |
|---|---|---|
| `volunteer_tasks_innovation_consult_edition` | `/tasks` (`TasksPage.tsx`) | `src/dal/ports/tasks.ts` said "field list provisional pending real screens" since it was written — repository and Firestore adapter complete and tested, zero UI referencing either. Built honestly short of the mockup: no quota/route-map (no backing field for either on `Task`). See `src/modules/tasks/taskStatus.ts`. |

## ROUTE — reused as reference for an existing screen

| Screen | Route | Notes |
|---|---|---|
| `refined_voter_profiling_intake_operational_edition` | `/voters` | DUPLICATE OF `voter_profiling_intake_innovation_consult_edition` — same screen, two export names. Already informed `VoterForm.tsx` per session 5. |
| `voter_profiling_intake_innovation_consult_edition` | `/voters` | Already informed `VoterForm.tsx` per session 5 (`BUILD-STATUS.md`). |
| `voter_detail_profile` | `/voters` (`VoterCard.tsx`) | Shows demographics/engagement-history/concerns fields beyond the governing `Voter` type — the exact gap `screen-findings.md` already flagged as an open decision, not silently added here either. No dedicated detail route; `VoterCard` already shows everything the type supports. |
| `refined_incident_reporting_mobile_field_flow` | `/incidents/new` + `/voters` | Titled "Household Detail" in its own `<title>`, not what its filename suggests — a combined household-detail-then-report-incident flow. Both halves exist (`ReportIncidentPage.tsx`, the Voters module); no new route needed. |
| `ward_field_app_innovation_consult_edition` | `/diary` + `/voters` | Canvasser mobile shell: voter intake form, field diary, a "live sector map." The map is **not** built — no live-location/mapping feature exists anywhere in this codebase (`VoterHouseholdMap.tsx` is a schematic, not GPS) — OUT OF SCOPE v1 for that one panel; the rest is covered. |
| `30_day_ward_sentiment_summary_refined_report` | `/analytics/scheduled-reports` | Carries retired "SA ELECTIONS 2024 / MUNICIPAL COMMAND CENTER" branding in its header — EXCLUDED as a skin — but its ranking/heatmap/drill-down layout was already adopted into `ScheduledReportsPage.tsx` in a prior session (see that file's own header comment), which explicitly declined the screen's fabricated signatory. No further action. |
| `ward_sentiment_report_refined_pdf_export` | `/analytics/scheduled-reports` | The "Ward 18: Strategic Sentiment" screen `ScheduledReportsPage.tsx`'s header comment also names directly. Same disposition as above. |

## GAP — real, in-scope, no screen yet

| Screen | What it's for | Why it's real |
|---|---|---|
| `sync_reconciliation_terminal` | A conflict-review UI for offline sync | `src/offline/db.ts`'s `conflicts` table and `src/offline/outbox.ts` are built and tested at the data layer (§7.5 "conflicts must be visible") — **nothing in `src/modules/**` renders a `ConflictEntry`.** Same class of defect SOP-05 found and fixed for the canvassing queue (logic built, never wired to a screen). Not built this session — picking one gap to build properly (Tasks) rather than two built thin. |
| `server_side_audit_logs` | "Sync Audit Logs" / "Reconciliation Overview" / "Event Stream" | No audit-log viewer route exists. Overlaps the gap above; a future session should decide whether these are one screen or two before building either. |

## EXCLUDED — retired shell or mismatched product (pattern noted where reusable)

Civic Architect / Civic Authority / SA Elections 2024 / DevOps persona —
same disposition `screen-findings.md` already gave this family. `lge_war_
room_innovation_consult_edition`'s content matches `lge_war_room_local_
head`, already the stated reference for `WarRoomPage.tsx` — this is that
same screen re-exported under a new folder name in this batch, not a new
one.

- `configure_automated_reporting_johannesburg_team` — pattern (progressive-disclosure config) already flagged reusable for Analytics in `screen-findings.md`.
- `configure_automated_reporting_refined_incident_filters` — DUPLICATE OF above (incident-filter variant).
- `devops_refine_api_handshake_permissions`
- `devops_refine_devops_engineer_permissions`
- `election_campaign_os_desktop_with_device_toggle` — title tag is "Civic Authority | LGE War Room" despite the filename.
- `election_campaign_os_tablet_dashboard` — DUPLICATE OF above, tablet variant.
- `incident_management_sms_whatsapp_notification_configuration`
- `incident_report_popia_compliant_pdf_export`
- `incident_report_refined_pdf_export` — DUPLICATE OF above.
- `incident_triage_encryption_alert_configuration`
- `incident_triage_refined_encryption_alert_templates` — DUPLICATE OF above.
- `lge_war_room_innovation_consult_edition` — see note above; already acted on.
- `municipal_seat_calculator_populated_city_of_johannesburg_data` — its own `<title>` says "Civic Authority | War Room Dashboard", not seat calculator, despite the filename.
- `municipal_team_lead_permissions_management`
- `referral_letter_let_0812_public_works` — "CIVIC AUTHORITY" branded. The real referral-letter feature (`src/modules/incidents/referral/`) is already built and tested (`referralDocument.ts`, `referralPdf.ts`, `issueReferral.ts`, `verifyReferral.ts`) — this screen did not inform it and isn't needed to.
- `refined_constituency_audit_log_telemetry_view`
- `strategic_coalition_modeler_innovation_consult_edition` — title "Civic Authority"; overlaps `ThresholdAnalyzerPage.tsx`'s existing scope.
- `strategic_lead_deployment_innovation_consult_edition_1`
- `turnout_impact_report_65_scenario`
- `volunteer_performance_metrics_dashboard`

Mismatched-product shells (a different fictional "Campaign Resource
Manager" / "Admin Portal" skin, not Election Campaign OS — treated the
same as the Civic Architect family rather than as our product's screens):

- `allocation_confirmation_receipt` — pattern (confirmation receipt after an approval) worth reusing if Logistics ever gets a post-approval confirmation screen; `LogisticsPage.tsx`'s existing approve action has none today.
- `jb_marks_nw405_refined_resource_levels` — titled "Ward 12 Logistics Summary" despite the filename; same shell family.
- `ward_12_resource_audit_log` — "Admin Portal" branded; pattern (real-time audit stream) noted for the same future audit-log gap as `server_side_audit_logs` above.

## OUT OF SCOPE v1 — real idea, ruled out by the governing spec

- `ward_sentiment_comparison_innovation_consult_edition` — "Sentiment Leaderboard" / "Sentiment Index Map (30-day aggregate)" overlaps both screens already adopted into `ScheduledReportsPage.tsx` and the deeper Ward Intelligence layer (CTR, local search volume, multilingual sentiment beyond the lexicon tagger) `BUILD-STATUS.md` §8.3 explicitly calls a v2 spike, not a v1 build. Not route-mapped.
- `volunteer_rewards_configuration` — "Reward Tiers & Achievement Governance." No port, no mention in any governing doc in `docs/`, no gamification concept anywhere in this codebase. Inventing a rewards/points data model from one Stitch screen, with no spec backing, is exactly the kind of silent scope creep `screen-findings.md` already warned against for the Voters module's extra fields. Flagged for a human decision, not built.
- `johannesburg_team_weekly_report_distribution_configuration` — "Recipient Management" / "Intelligence Scope." `ScheduledReportsPage.tsx` has neither concept today. Plausible (§8.1 report distribution), but not confirmed against the spec this session — reference kept, not acted on.

## OUT OF SCOPE (marketing) — `election-cos-landing` / `ic-corporate`, not this repo

Per build spec §2 and the website/app split confirmed this session
(company site on GCP/Cloudflare, product app on Firebase — see
`phase-0-infra-plan.md`'s updated domain table). Left alone exactly as
decided.

- `campaign_os_contact_sales_provincial_metro`
- `campaign_os_contact_sales_with_enhanced_validation` — DUPLICATE OF above.
- `campaign_os_mobile_landing_page`
- `campaign_os_refined_mobile_pricing`
- `campaign_os_submission_success`
- `innovation_consult_campaign_os_landing_page`
- `innovation_consult_landing_page_feature_refinement` — DUPLICATE OF above.
- `innovation_consult_landing_page_with_platform_hierarchy` — DUPLICATE OF above.
- `innovation_consult_landing_page_with_pricing` — DUPLICATE OF above, pricing variant.
- `innovation_consult_platform_infographic_tutorial` — could inform in-app onboarding later; not a marketing asset, not product UI either, as supplied.
- `platform_infographic_tactical_command_hierarchy` — org-chart sales collateral.

## What this does not close

This is 47 of 229 screens. The other 182 folders in the same zip are
`screen.png`-only (176) or empty (6) — no HTML to classify. The full
inventory-to-route mapping the build spec's Phase 1 gate actually asks for
is still open until those are accounted for too; this covers only what had
markup to read.
