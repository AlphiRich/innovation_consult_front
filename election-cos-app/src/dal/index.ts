/**
 * Election Campaign OS — DAL adapter selection
 * IC-ECOS-BUILD-2026-V2 §5, §10.
 *
 * The ONLY place a module should ever import to get a repository.
 *
 * This file used to say that swapping `VITE_DAL_ADAPTER` to 'postgres' at
 * Phase 8 was meant to be the entire migration. There is no Phase 8
 * migration: Firestore is the database, decided 13 Sep 2026 (see
 * BUILD-STATUS.md, "DECISION — Firestore is the database"). The port /
 * adapter seam stays regardless — it is what keeps the Firebase SDK out of
 * `src/modules/**` and what forces `SessionContext` through every data
 * call (§5.2, non-negotiable #1). Those reasons never depended on a
 * migration and outlive it.
 */
import { votersRepository } from './adapters/firestore/votersRepository';
import { householdsRepository } from './adapters/firestore/householdsRepository';
import { wardsRepository } from './adapters/firestore/wardsRepository';
import { votingDistrictsRepository } from './adapters/firestore/votingDistrictsRepository';
import { incidentsRepository } from './adapters/firestore/incidentsRepository';
import { diaryRepository } from './adapters/firestore/diaryRepository';
import { logisticsRepository } from './adapters/firestore/logisticsRepository';
import { staffRepository } from './adapters/firestore/staffRepository';
import { tasksRepository } from './adapters/firestore/tasksRepository';
import { documentsRepository } from './adapters/firestore/documentsRepository';
import { auditLogRepository } from './adapters/firestore/auditLogRepository';
import { candidatesRepository } from './adapters/firestore/candidatesRepository';
import { donorsRepository } from './adapters/firestore/donorsRepository';
import { donationsRepository } from './adapters/firestore/donationsRepository';
import { ppfaConfigRepository } from './adapters/firestore/ppfaConfigRepository';
import { donationAlertsRepository } from './adapters/firestore/donationAlertsRepository';
import { dataSubjectRequestsRepository } from './adapters/firestore/dataSubjectRequestsRepository';
import { warRoomCountersRepository } from './adapters/firestore/warRoomCountersRepository';
import { municipalityProfileRepository } from './adapters/firestore/municipalityProfileRepository';
import { fileStoreRepository } from './adapters/firestore/fileStoreRepository';

const adapter = (import.meta.env.VITE_DAL_ADAPTER as string | undefined) ?? 'firestore';

if (adapter === 'postgres') {
  // Not an unbuilt phase — a closed question. Firestore is the database
  // (BUILD-STATUS.md, "DECISION — Firestore is the database", 13 Sep 2026).
  // Fail loudly: silently falling back to Firestore would let a
  // misconfigured deployment look like it had honoured a setting it did
  // not, and this env var existing at all is now a historical artefact.
  throw new Error(
    'VITE_DAL_ADAPTER=postgres is not supported. Firestore is the database for Election Campaign OS — ' +
      'the conditional Phase 8 Postgres migration was closed by decision on 13 Sep 2026. ' +
      'See BUILD-STATUS.md and src/dal/adapters/postgres/README.md.',
  );
}

export const dal = {
  voters: votersRepository,
  households: householdsRepository,
  wards: wardsRepository,
  votingDistricts: votingDistrictsRepository,
  incidents: incidentsRepository,
  diary: diaryRepository,
  logistics: logisticsRepository,
  staff: staffRepository,
  tasks: tasksRepository,
  documents: documentsRepository,
  auditLog: auditLogRepository,
  candidates: candidatesRepository,
  donors: donorsRepository,
  donations: donationsRepository,
  ppfaConfig: ppfaConfigRepository,
  donationAlerts: donationAlertsRepository,
  dataSubjectRequests: dataSubjectRequestsRepository,
  warRoomCounters: warRoomCountersRepository,
  municipalityProfile: municipalityProfileRepository,
  // Cloud Storage rather than Firestore, but the same rule applies: module
  // code reaches object storage through the DAL or not at all (§5, §10).
  fileStore: fileStoreRepository,
};

export type { SessionContext, GeoScope, Page, PageRequest } from './ports/session';
