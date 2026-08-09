/**
 * Election-COS1.0 — Cloud Functions 2nd gen entry point
 * IC-ECOS-BUILD-2026-V2 §1, §0 rule 1. Every function here is pinned to
 * africa-south1 via ./region.ts — do not add a function that omits it.
 */
export { resolveCapabilities } from './resolveCapabilities';
export { sync } from './sync';
export { unmaskCandidateIdNumber } from './unmaskCandidateIdNumber';

// ppfaAggregation is deliberately NOT exported — see its file header and
// build spec §6.8.1. Do not add it here without legal confirmation.
