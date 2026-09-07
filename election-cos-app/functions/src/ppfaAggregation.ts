/**
 * Election Campaign OS — PPFA aggregation & alerting
 * IC-ECOS-BUILD-2026-V2 §6.8.1, §6.8.3.
 *
 * DELIBERATELY NOT EXPORTED / NOT DEPLOYED. Build spec §6.8.1: "Build the
 * data model, the capability wiring, and the UI shells now. Hold the
 * aggregation Cloud Function until legal confirms." Three statutory
 * questions are open:
 *
 *   Q1 — R200,000 per-donation or cumulative per donor per financial year?
 *   Q2 — What is the financial year (assumed 1 Apr–31 Mar, unconfirmed)?
 *   Q3 — Is the R30m cap per party or across all parties?
 *
 * The pure classification logic (levelForAggregate, in
 * src/modules/finance/escalation.ts on the app side) is written and
 * tested against the PROVISIONAL config in ppfaDefaults.ts, behind a
 * strategy interface (PPFAConfig.aggregationRule) so answering Q1 is a
 * configuration choice, not a rewrite — see that file's header.
 *
 * When legal confirms Q1–Q3:
 *   1. Confirm/update PPFAConfig.aggregationRule and
 *      financialYearStartMonth defaults in ppfaDefaults.ts.
 *   2. Implement runAggregation() below: read donations for a donor in the
 *      current financial year (per the confirmed rule), sum amountZAR,
 *      call levelForAggregate(), write a DonationAlert with
 *      configIdApplied set to the CURRENT PPFAConfig id (evidential
 *      record — §6.8.2).
 *   3. Wire it as BOTH a Firestore trigger (onDocumentCreated donations/*,
 *      "recompute on write so the UI is not stale") AND a scheduled
 *      function (§6.8.3 "Aggregation runs as a scheduled Cloud Function").
 *   4. Export it from index.ts. Until then it stays unexported.
 *
 * Never make this function block or reject a donation write (§6.8.3) —
 * it only reads donations and writes alerts.
 */

export function runAggregation(): never {
  throw new Error(
    'PPFA aggregation is deliberately not implemented — see file header. ' +
      'Do not wire this up without legal confirmation of §6.8.1 Q1–Q3.',
  );
}
