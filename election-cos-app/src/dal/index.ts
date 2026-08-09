/**
 * Election-COS1.0 — DAL adapter selection
 * IC-ECOS-BUILD-2026-V2 §5, §10.
 *
 * The ONLY place a module should ever import to get a repository. Swapping
 * VITE_DAL_ADAPTER from 'firestore' to 'postgres' at Phase 8 is meant to be
 * the entire migration for module code — if it isn't, the DAL was breached
 * somewhere and that's the bug to fix (§10 closing line).
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

const adapter = (import.meta.env.VITE_DAL_ADAPTER as string | undefined) ?? 'firestore';

if (adapter === 'postgres') {
  // Phase 8 not yet implemented — src/dal/adapters/postgres is empty by
  // design (see its README). Fail loudly rather than silently falling back
  // to Firestore, which would be a data-residency surprise.
  throw new Error(
    'VITE_DAL_ADAPTER=postgres set, but the Postgres adapter (Phase 8) has not been built yet. ' +
      'See src/dal/adapters/postgres/README.md.',
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
};

export type { SessionContext, GeoScope, Page, PageRequest } from './ports/session';
