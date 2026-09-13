/**
 * Election Campaign OS — the SOP register
 *
 * SOP-01 through SOP-06 are written. The rest are declared as the manual's
 * intended structure with the area, audience and gating each will carry,
 * and are not shipped until written — an SOP stub that printed as a
 * heading with nothing under it would be worse than an honest gap, because
 * a manual that looks complete stops anyone asking what is missing.
 *
 * `PLANNED_SOPS` is not exported into the manual. It is the register, and
 * the printed appendix lists it so a subscriber can see the shape of what
 * they will receive. A number moves out of `PLANNED_SOPS` and into `SOPS`
 * when it is written, never before — `manual.test.ts` fails if a number
 * appears in both.
 */
import type { Sop, SopArea } from '../manualModel';
import { CANVASSER_SOP } from './canvasserSop';
import { TENANT_SETUP_SOP } from './tenantSetupSop';
import { WARD_SEEDING_SOP } from './wardSeedingSop';
import { REGISTER_IMPORT_SOP } from './registerImportSop';
import { WARD_ROUND_SOP } from './wardRoundSop';
import { INCIDENT_SOP } from './incidentSop';

export const SOPS: Sop[] = [
  CANVASSER_SOP,
  TENANT_SETUP_SOP,
  WARD_SEEDING_SOP,
  REGISTER_IMPORT_SOP,
  WARD_ROUND_SOP,
  INCIDENT_SOP,
];

export interface PlannedSop {
  number: string;
  title: string;
  area: SopArea;
  roles: string[];
  requiresModule?: string;
}

/** Written next, in this order. */
export const PLANNED_SOPS: PlannedSop[] = [
  { number: 'SOP-07', title: 'Issuing a service delivery referral', area: 'WAR_ROOM', roles: ['municipal-team-lead'] },
  { number: 'SOP-08', title: 'Reading the war room', area: 'WAR_ROOM', roles: ['municipal-team-lead', 'party-hq-admin'] },
  { number: 'SOP-09', title: 'Handling a data subject request', area: 'COMPLIANCE', roles: ['compliance-officer', 'party-hq-admin'] },
  { number: 'SOP-10', title: 'Recording donations and disclosure thresholds', area: 'FUNDING', roles: ['finance-officer'], requiresModule: 'ppfa-disclosure' },
  { number: 'SOP-11', title: 'Preparing a PR candidate list', area: 'ADMINISTRATION', roles: ['party-hq-admin'] },
  { number: 'SOP-12', title: 'Roles, permissions and what your subscription includes', area: 'ADMINISTRATION', roles: ['party-hq-admin'] },
];
