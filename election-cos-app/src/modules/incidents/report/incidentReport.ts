/**
 * Election Campaign OS — the municipal incident report
 * IC-ECOS-BUILD-2026-V2 §6.4. Capability: `incidents.view`.
 *
 * WHY THIS EXISTS
 *
 * A supplied screen design (session 31) asked for a date-ranged,
 * ward-and-category-filtered incident report with a printable document
 * beside the filters. Checked against the build, the question it asks
 * could not be asked: `IncidentRepository` had `listByStatus` and nothing
 * else. That answers "what is waiting on us now", which is the incidents
 * board's question. "What did this ward live with last month" is a
 * different question and there was no read for it.
 *
 * The referral module already produces a document about *one* incident,
 * addressed to a department, signed. This is the other shape: many
 * incidents, no addressee, no signature, produced so a campaign can put a
 * month of service-delivery faults in front of a councillor, a community
 * meeting or its own war room.
 *
 * WHAT IT REFUSES TO BE
 *
 * The design it came from carried "FOR OFFICIAL REVIEW" in a stamp, a
 * click-to-sign signature box, and "+ 136 additional records truncated
 * for preview" above a page count.
 *
 *  - It is not official and does not say it is. `REPORT_BASIS` is on the
 *    first page.
 *  - It is not signed by a box. A referral is signed from the signed-in
 *    person's own staff record; a report is prepared, and says by whom.
 *  - **It does not truncate.** A report that silently drops records is
 *    worse than no report: the total at the top stops describing the
 *    table under it. Every incident in the range is printed, and the
 *    count and the rows are computed from the same array —
 *    `incidentReport.test.ts` fails if they diverge.
 *
 * WHAT IT DOES NOT CARRY
 *
 * Photographs. An incident's `photoPaths` point at Cloud Storage, and
 * §6.4 keeps images out of generated documents. The report says a
 * photograph exists and where its incident is, which is what a reader
 * needs to go and look.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import type { Incident, IncidentCategory, IncidentSeverity } from '@/dal/ports/incidents';
import { CATEGORY_LABEL, SEVERITY_META, SEVERITY_ORDER, STATUS_LABEL } from '../incidentMeta';
import { isOpen } from '../incidentWorkflow';

export const REPORT_BASIS =
  'This is a campaign record of faults its own people logged. It is not a municipal document, it is not a ' +
  'return to anybody, and no part of it has been verified by the municipality. Every entry is what a ' +
  'canvasser or ward lead recorded at the time, in their own words.';

export const COMPLETENESS_BASIS =
  'Every incident in the selected range is printed. Nothing is truncated for length — a total that stops ' +
  'describing the table beneath it is the one failure a report of this kind cannot survive.';

export const PHOTO_BASIS =
  'Photographs are not reproduced. The report notes which incidents carry them so they can be retrieved ' +
  'from the incident itself.';

export interface IncidentReportFilter {
  fromIso: string;
  toIso: string;
  /** Empty means every ward the reader may see. */
  wardCodes: string[];
  categories: IncidentCategory[];
  severities: IncidentSeverity[];
}

export interface IncidentReportSummary {
  total: number;
  open: number;
  withPhotos: number;
  byCategory: Record<IncidentCategory, number>;
  bySeverity: Record<IncidentSeverity, number>;
  /** Wards actually represented in the selection, sorted. */
  wardsAffected: string[];
}

export interface IncidentReport {
  filter: IncidentReportFilter;
  /** Every matching incident, newest first. Never a page of them. */
  incidents: Incident[];
  summary: IncidentReportSummary;
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as IncidentCategory[];

function emptyByCategory(): Record<IncidentCategory, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<IncidentCategory, number>;
}

function emptyBySeverity(): Record<IncidentSeverity, number> {
  return Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0])) as Record<IncidentSeverity, number>;
}

/**
 * Narrow a read to the selection and count it.
 *
 * An empty filter list means "all of them", not "none of them" — the
 * screen's checkboxes start ticked, and a reader who unticks everything
 * is asking for nothing rather than for everything.
 */
export function buildIncidentReport(incidents: Incident[], filter: IncidentReportFilter): IncidentReport {
  const inRange = incidents.filter((incident) => {
    if (incident.deletedAt !== null) return false;
    if (incident.createdAt < filter.fromIso || incident.createdAt > filter.toIso) return false;
    if (filter.wardCodes.length > 0 && !filter.wardCodes.includes(incident.wardCode)) return false;
    if (filter.categories.length > 0 && !filter.categories.includes(incident.category)) return false;
    if (filter.severities.length > 0 && !filter.severities.includes(incident.severity)) return false;
    return true;
  });

  const ordered = [...inRange].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const byCategory = emptyByCategory();
  const bySeverity = emptyBySeverity();
  for (const incident of ordered) {
    byCategory[incident.category] += 1;
    bySeverity[incident.severity] += 1;
  }

  return {
    filter,
    incidents: ordered,
    summary: {
      total: ordered.length,
      open: ordered.filter((i) => isOpen(i.status)).length,
      withPhotos: ordered.filter((i) => i.photoPaths.length > 0).length,
      byCategory,
      bySeverity,
      wardsAffected: [...new Set(ordered.map((i) => i.wardCode))].sort(),
    },
  };
}

export interface IncidentReportMeta {
  organisation: string;
  municipalityName: string;
  version: string;
  preparedByName: string;
  preparedAt: string;
}

const dateOnly = (iso: string) => iso.slice(0, 10);

export function incidentReportDocument(report: IncidentReport, meta: IncidentReportMeta): PrintDocument {
  const { summary, filter, incidents } = report;

  const blocks: Block[] = [
    { kind: 'callout', text: REPORT_BASIS },

    { kind: 'heading', level: 1, text: 'What this covers' },
    { kind: 'field', label: 'Municipality', value: meta.municipalityName },
    { kind: 'field', label: 'Period', value: `${dateOnly(filter.fromIso)} to ${dateOnly(filter.toIso)}` },
    {
      kind: 'field',
      label: 'Wards',
      value: filter.wardCodes.length > 0 ? filter.wardCodes.join(', ') : 'Every ward this report could read',
    },
    {
      kind: 'field',
      label: 'Categories',
      value:
        filter.categories.length > 0
          ? filter.categories.map((c) => CATEGORY_LABEL[c]).join(', ')
          : 'All four categories',
    },
    { kind: 'field', label: 'Prepared by', value: meta.preparedByName },
    { kind: 'field', label: 'Prepared on', value: meta.preparedAt },

    { kind: 'heading', level: 1, text: 'What was logged' },
    { kind: 'field', label: 'Incidents in this period', value: String(summary.total) },
    { kind: 'field', label: 'Still awaiting campaign action', value: String(summary.open) },
    { kind: 'field', label: 'Wards affected', value: String(summary.wardsAffected.length) },
  ];

  for (const category of CATEGORIES) {
    blocks.push({ kind: 'field', label: CATEGORY_LABEL[category], value: String(summary.byCategory[category]) });
  }
  for (const severity of SEVERITY_ORDER) {
    blocks.push({
      kind: 'field',
      label: `${SEVERITY_META[severity].label} severity`,
      value: String(summary.bySeverity[severity]),
    });
  }

  blocks.push(
    {
      kind: 'para',
      muted: true,
      text:
        'Severity is this campaign\'s own judgement of urgency. It corresponds to no municipal ' +
        'classification and no service standard.',
    },
    { kind: 'pageBreak' },
    { kind: 'heading', level: 1, text: 'The incidents' },
    { kind: 'para', muted: true, text: COMPLETENESS_BASIS },
  );

  if (incidents.length === 0) {
    blocks.push({
      kind: 'para',
      text:
        'No incidents were logged in this period, in the wards and categories selected. That is a record of ' +
        'what was logged, not a finding that nothing happened.',
    });
  }

  for (const incident of incidents) {
    blocks.push({
      kind: 'heading',
      level: 3,
      text: `${dateOnly(incident.createdAt)} · ${CATEGORY_LABEL[incident.category]} · ward ${incident.wardCode}`,
    });
    blocks.push({
      kind: 'field',
      label: 'Severity and state',
      value: `${SEVERITY_META[incident.severity].label} · ${STATUS_LABEL[incident.status]}`,
    });
    blocks.push({ kind: 'field', label: 'Voting district', value: incident.vdCode });
    blocks.push({ kind: 'para', text: incident.description });
    if (incident.photoPaths.length > 0) {
      blocks.push({
        kind: 'para',
        muted: true,
        text: `${incident.photoPaths.length} photograph(s) held against this incident, not reproduced here.`,
      });
    }
  }

  blocks.push(
    { kind: 'heading', level: 1, text: 'What this report is not' },
    { kind: 'para', text: PHOTO_BASIS },
    {
      kind: 'callout',
      text:
        'Nothing here has been sent to the municipality. A fault that needs formally referring is referred ' +
        'one at a time, as an addressed and signed document — see the referral on the incident itself. A ' +
        'count in this report is not a referral and does not become one by being printed.',
    },
  );

  return {
    title: 'Municipal incident report',
    subtitle: `${meta.municipalityName} · ${dateOnly(filter.fromIso)} to ${dateOnly(filter.toIso)}`,
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      status: 'ISSUED',
      reference: 'IC-ECOS-INC-2026',
    },
    blocks,
  };
}
