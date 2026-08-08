/**
 * Election Campaign OS — DAL port barrel
 * IC-ECOS-BUILD-2026-V2 §5. Re-exports every port interface and domain
 * type. Modules import from '@/dal/ports', never from an adapter directly.
 */
export * from './session';
export * from './voters';
export * from './households';
export * from './wards';
export * from './votingDistricts';
export * from './incidents';
export * from './diary';
export * from './logistics';
export * from './staff';
export * from './tasks';
export * from './documents';
export * from './auditLog';
export * from './candidates';
export * from './donors';
export * from './donations';
export * from './ppfaConfig';
export * from './donationAlerts';
export * from './dataSubjectRequests';
