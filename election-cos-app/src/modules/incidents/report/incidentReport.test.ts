/**
 * Election Campaign OS — guards on the municipal incident report
 *
 * The one failure a report of this kind cannot survive is a total that
 * stops describing the table beneath it. The design this was built from
 * printed "142 incidents" above a six-row table and "+ 136 additional
 * records truncated for preview" below it — which is the failure, drawn.
 *
 * So the load-bearing test is that the count and the rows come from the
 * same array, whatever the filters do. The rest guard what the document
 * says about itself: not official, not sent, not a referral.
 */
import { describe, expect, it } from 'vitest';
import type { Block, PrintDocument } from '@/lib/document/model';
import type { Incident, IncidentCategory, IncidentSeverity } from '@/dal/ports/incidents';
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import { CATEGORY_LABEL } from '../incidentMeta';
import {
  buildIncidentReport,
  COMPLETENESS_BASIS,
  incidentReportDocument,
  PHOTO_BASIS,
  REPORT_BASIS,
  type IncidentReportFilter,
} from './incidentReport';

const META = {
  organisation: 'JB Marks Local Municipality',
  municipalityName: 'JB Marks Local Municipality (NW405)',
  version: '1.0',
  preparedByName: 'T. Molefe, Municipal Team Lead',
  preparedAt: '2026-09-18T08:00:00.000Z',
};

const FILTER: IncidentReportFilter = {
  fromIso: '2026-08-01T00:00:00.000Z',
  toIso: '2026-08-31T23:59:59.999Z',
  wardCodes: [],
  categories: [],
  severities: [],
};

let seq = 0;
const incident = (over: Partial<Incident> = {}): Incident => ({
  id: `i${++seq}`,
  tenantId: 't',
  vdCode: '32900123',
  wardCode: 'NW405012',
  category: 'WATER_SANITATION',
  severity: 'MEDIUM',
  status: 'LOGGED',
  description: 'Burst pipe flooding the intersection.',
  photoPaths: [],
  reportedBy: 'uid-canvasser',
  createdAt: '2026-08-14T09:00:00.000Z',
  updatedAt: '2026-08-14T09:00:00.000Z',
  updatedBy: 'uid-canvasser',
  deletedAt: null,
  schemaVersion: 1,
  ...over,
});

function prose(doc: PrintDocument): string {
  const fromBlock = (block: Block): string => {
    switch (block.kind) {
      case 'steps':
      case 'bullets':
        return block.items.join('\n');
      case 'field':
        return `${block.label} ${block.value}`;
      case 'rule':
      case 'pageBreak':
        return '';
      default:
        return block.text;
    }
  };
  return [doc.title, doc.subtitle ?? '', ...doc.blocks.map(fromBlock)].join('\n');
}

describe('selecting what goes in the report', () => {
  it('keeps only what falls inside the period', () => {
    const report = buildIncidentReport(
      [
        incident({ createdAt: '2026-07-31T23:59:59.000Z' }),
        incident({ createdAt: '2026-08-01T00:00:00.000Z' }),
        incident({ createdAt: '2026-08-31T23:59:59.000Z' }),
        incident({ createdAt: '2026-09-01T00:00:01.000Z' }),
      ],
      FILTER,
    );
    expect(report.summary.total).toBe(2);
  });

  it('treats an empty filter list as every one of them, not none', () => {
    // The screen's checkboxes start ticked. A reader who unticks
    // everything is asking for nothing; a caller passing [] is asking for
    // all — and the two must not be the same code path.
    const all = buildIncidentReport([incident(), incident({ category: 'ELECTRICITY' })], FILTER);
    expect(all.summary.total).toBe(2);

    const narrowed = buildIncidentReport([incident(), incident({ category: 'ELECTRICITY' })], {
      ...FILTER,
      categories: ['ELECTRICITY'],
    });
    expect(narrowed.summary.total).toBe(1);
  });

  it('narrows by ward and by severity', () => {
    const incidents = [
      incident({ wardCode: 'NW405001', severity: 'LOW' }),
      incident({ wardCode: 'NW405002', severity: 'CRITICAL' }),
      incident({ wardCode: 'NW405002', severity: 'LOW' }),
    ];
    expect(buildIncidentReport(incidents, { ...FILTER, wardCodes: ['NW405002'] }).summary.total).toBe(2);
    expect(buildIncidentReport(incidents, { ...FILTER, severities: ['CRITICAL'] }).summary.total).toBe(1);
  });

  it('never includes a suppressed record', () => {
    const report = buildIncidentReport([incident(), incident({ deletedAt: '2026-08-20T00:00:00.000Z' })], FILTER);
    expect(report.summary.total).toBe(1);
  });

  it('orders newest first', () => {
    const report = buildIncidentReport(
      [
        incident({ createdAt: '2026-08-02T00:00:00.000Z', description: 'older' }),
        incident({ createdAt: '2026-08-20T00:00:00.000Z', description: 'newer' }),
      ],
      FILTER,
    );
    expect(report.incidents.map((i) => i.description)).toEqual(['newer', 'older']);
  });
});

describe('the counts describe the rows', () => {
  it('totals what it prints, and prints what it totals', () => {
    // The guard this module exists for. Forty incidents, every category
    // and severity, and the document must carry all forty.
    const categories = Object.keys(CATEGORY_LABEL) as IncidentCategory[];
    const severities: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const many = Array.from({ length: 40 }, (_, n) =>
      incident({
        description: `Incident number ${n}`,
        category: categories[n % categories.length],
        severity: severities[n % severities.length],
        createdAt: `2026-08-${String((n % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
      }),
    );
    const report = buildIncidentReport(many, FILTER);
    expect(report.summary.total).toBe(40);
    expect(report.incidents).toHaveLength(40);

    const text = prose(incidentReportDocument(report, META));
    for (const one of many) expect(text).toContain(one.description);

    // Category counts add up to the total, with nothing uncounted.
    const counted = Object.values(report.summary.byCategory).reduce((a, b) => a + b, 0);
    expect(counted).toBe(report.summary.total);
    expect(Object.values(report.summary.bySeverity).reduce((a, b) => a + b, 0)).toBe(report.summary.total);
  });

  it('never truncates, and says so on the paper', () => {
    const text = prose(incidentReportDocument(buildIncidentReport([incident()], FILTER), META));
    expect(text).toContain(COMPLETENESS_BASIS);
    // Scanned with the basis removed: it is the one place the word
    // legitimately appears, preceded by "Nothing is".
    const body = text.split(COMPLETENESS_BASIS).join('');
    expect(body).not.toMatch(/\btruncated\b/i);
    expect(body).not.toMatch(/additional records/i);
    expect(body).not.toMatch(/\bexcerpt\b/i);
  });

  it('counts open incidents by the shared workflow rule', () => {
    const report = buildIncidentReport(
      [
        incident({ status: 'LOGGED' }),
        incident({ status: 'REFERRED' }),
        incident({ status: 'RESOLVED' }),
        incident({ status: 'CLOSED' }),
      ],
      FILTER,
    );
    expect(report.summary.total).toBe(4);
    expect(report.summary.open).toBe(2);
  });
});

describe('what the document says about itself', () => {
  const doc = () => incidentReportDocument(buildIncidentReport([incident()], FILTER), META);

  it('says it is not a municipal document, before anything else', () => {
    expect(doc().blocks[0]).toEqual({ kind: 'callout', text: REPORT_BASIS });
    expect(REPORT_BASIS).toMatch(/not a municipal document/i);
    expect(REPORT_BASIS).toMatch(/no part of it has been verified by the municipality/i);
  });

  it('refuses to read as a referral or a submission', () => {
    const text = prose(doc());
    expect(text).toMatch(/Nothing here has been sent to the municipality/i);
    expect(text).toMatch(/is not a referral and does not become one by being printed/i);
    expect(text).not.toMatch(/FOR OFFICIAL REVIEW/i);
    expect(text).not.toMatch(/\b(authoris|author)ing signature\b/i);
  });

  it('keeps severity as the campaign’s own judgement', () => {
    expect(prose(doc())).toMatch(/corresponds to no municipal classification/i);
  });

  it('notes photographs without reproducing them', () => {
    const withPhotos = buildIncidentReport([incident({ photoPaths: ['a.jpg', 'b.jpg'] })], FILTER);
    expect(withPhotos.summary.withPhotos).toBe(1);
    const text = prose(incidentReportDocument(withPhotos, META));
    expect(text).toContain(PHOTO_BASIS);
    expect(text).toMatch(/2 photograph\(s\) held against this incident/i);
    expect(text).not.toContain('a.jpg');
  });

  it('is an honest empty report rather than a finding that nothing happened', () => {
    const text = prose(incidentReportDocument(buildIncidentReport([], FILTER), META));
    expect(text).toMatch(/No incidents were logged in this period/i);
    expect(text).toMatch(/not a finding that nothing happened/i);
  });

  it('renders to PDF and Word', () => {
    const rendered = incidentReportDocument(buildIncidentReport([incident(), incident()], FILTER), META);
    expect(renderDocumentPdf(rendered).byteLength).toBeGreaterThan(1000);
    expect(renderDocumentDocx(rendered).byteLength).toBeGreaterThan(1000);
  });
});
