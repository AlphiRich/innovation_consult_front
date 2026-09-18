# Stitch screens — extracted HTML

Source: `stitch_ic_election_management_suite_3_Aug_2026.zip`, uploaded
directly to this session (the re-supply `phase-1-ia-consolidation.md` and
`BUILD-STATUS.md` blocker #1 asked for). The zip contains 229 screen
folders; each folder holds `screen.png` and, where Stitch exported one,
`code.html` (a self-contained static HTML/CSS/JS mock of that screen).

Of the 229 folders: **47 have a `code.html`** — those are extracted here,
one file per screen, named after the source folder. The remaining **182**
(176 `screen.png`-only + 6 with neither) are screenshots or empty and are
not included — there's no HTML to extract from them; building those
screens still means going off the PNG as a visual reference, not lifting
markup.

These are Stitch's standalone mock exports, not wired into the
`election-cos-app` build — each references its own CDN Tailwind/fonts and
has no shared routing, state, or `src/design/tokens.ts` values. Use them
as layout/interaction reference when building the real module pages (per
`docs/screen-findings.md`'s existing guidance: adopt the brand-neutral
typographic scale and interaction patterns, not the retired navy/gold
palette or any DevOps/Civic-Architect-branded copy or data model).

## Extracted screens (47)

- `30_day_ward_sentiment_summary_refined_report.html`
- `allocation_confirmation_receipt.html`
- `campaign_os_contact_sales_provincial_metro.html`
- `campaign_os_contact_sales_with_enhanced_validation.html`
- `campaign_os_mobile_landing_page.html`
- `campaign_os_refined_mobile_pricing.html`
- `campaign_os_submission_success.html`
- `configure_automated_reporting_johannesburg_team.html`
- `configure_automated_reporting_refined_incident_filters.html`
- `devops_refine_api_handshake_permissions.html`
- `devops_refine_devops_engineer_permissions.html`
- `election_campaign_os_desktop_with_device_toggle.html`
- `election_campaign_os_tablet_dashboard.html`
- `incident_management_sms_whatsapp_notification_configuration.html`
- `incident_report_popia_compliant_pdf_export.html`
- `incident_report_refined_pdf_export.html`
- `incident_triage_encryption_alert_configuration.html`
- `incident_triage_refined_encryption_alert_templates.html`
- `innovation_consult_campaign_os_landing_page.html`
- `innovation_consult_landing_page_feature_refinement.html`
- `innovation_consult_landing_page_with_platform_hierarchy.html`
- `innovation_consult_landing_page_with_pricing.html`
- `innovation_consult_platform_infographic_tutorial.html`
- `jb_marks_nw405_refined_resource_levels.html`
- `johannesburg_team_weekly_report_distribution_configuration.html`
- `lge_war_room_innovation_consult_edition.html`
- `municipal_seat_calculator_populated_city_of_johannesburg_data.html`
- `municipal_team_lead_permissions_management.html`
- `platform_infographic_tactical_command_hierarchy.html`
- `referral_letter_let_0812_public_works.html`
- `refined_constituency_audit_log_telemetry_view.html`
- `refined_incident_reporting_mobile_field_flow.html`
- `refined_voter_profiling_intake_operational_edition.html`
- `server_side_audit_logs.html`
- `strategic_coalition_modeler_innovation_consult_edition.html`
- `strategic_lead_deployment_innovation_consult_edition_1.html`
- `sync_reconciliation_terminal.html`
- `turnout_impact_report_65_scenario.html`
- `volunteer_performance_metrics_dashboard.html`
- `volunteer_rewards_configuration.html`
- `volunteer_tasks_innovation_consult_edition.html`
- `voter_detail_profile.html`
- `voter_profiling_intake_innovation_consult_edition.html`
- `ward_12_resource_audit_log.html`
- `ward_field_app_innovation_consult_edition.html`
- `ward_sentiment_comparison_innovation_consult_edition.html`
- `ward_sentiment_report_refined_pdf_export.html`

Note: several of these carry "Civic Architect" / "SA Elections 2024"
branding or DevOps/infrastructure content already flagged as retired /
out of scope in `docs/screen-findings.md` — check that note before
building a module against one of these files.

Full inventory (folder name → `html` / `png-only` / `none`) for the
remaining 182 screens has not been transcribed here; re-open the source
zip if the Phase 1 screen-inventory-to-route mapping needs it.
