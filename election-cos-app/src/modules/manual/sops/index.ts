/**
 * Election Campaign OS — the SOP register
 *
 * SOP-01 through SOP-12 are written — the whole intended structure. An
 * SOP is declared in `PLANNED_SOPS` with the area, audience and gating it
 * will carry, and moves into `SOPS` when it is written and not before: a
 * stub that printed as a heading with nothing under it would be worse
 * than an honest gap, because a manual that looks complete stops anyone
 * asking what is missing.
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
import { REFERRAL_SOP } from './referralSop';
import { WAR_ROOM_SOP } from './warRoomSop';
import { DATA_SUBJECT_REQUEST_SOP } from './dataSubjectRequestSop';
import { DONATIONS_SOP } from './donationsSop';
import { PR_LIST_SOP } from './prListSop';
import { PERMISSIONS_SOP } from './permissionsSop';

export const SOPS: Sop[] = [
  CANVASSER_SOP,
  TENANT_SETUP_SOP,
  WARD_SEEDING_SOP,
  REGISTER_IMPORT_SOP,
  WARD_ROUND_SOP,
  INCIDENT_SOP,
  REFERRAL_SOP,
  WAR_ROOM_SOP,
  DATA_SUBJECT_REQUEST_SOP,
  DONATIONS_SOP,
  PR_LIST_SOP,
  PERMISSIONS_SOP,
];

export interface PlannedSop {
  number: string;
  title: string;
  area: SopArea;
  roles: string[];
  requiresModule?: string;
}

/**
 * Empty, and that is the finished state rather than a gap.
 *
 * SOP-01 through SOP-12 are the manual's intended structure and all
 * twelve are written. The appendix prints this list as "not yet issued",
 * so leaving a number here after it ships would print it as issued in the
 * body and unwritten in the appendix of the same document —
 * `manual.test.ts` fails on that.
 *
 * A thirteenth procedure is added here first and moved across when it is
 * written, never the other way round.
 */
export const PLANNED_SOPS: PlannedSop[] = [];
