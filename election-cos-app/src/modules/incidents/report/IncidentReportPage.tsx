/**
 * Election Campaign OS — Municipal incident report
 * IC-ECOS-BUILD-2026-V2 §6.4. Capability: `incidents.view`.
 *
 * Built from a supplied screen design (session 31): filters on the left,
 * the document on the right, a period and a set of categories at the top.
 * The information architecture is the design's; the palette, the tokens
 * and every claim on the page are this build's. See
 * `docs/design-decision-and-change-log.md` entry 31.2 for what was
 * changed and why.
 *
 * The counts update as the filters move, which is the design's best idea:
 * a person choosing a period can see how much they are about to print
 * before they print it.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { IncidentCategory, IncidentSeverity } from '@/dal/ports/incidents';
import { documentFileStem } from '@/lib/document/model';
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import { CATEGORY_LABEL, SEVERITY_META, SEVERITY_ORDER } from '../incidentMeta';
import {
  buildIncidentReport,
  COMPLETENESS_BASIS,
  incidentReportDocument,
  PHOTO_BASIS,
  REPORT_BASIS,
} from './incidentReport';
import { BasisNote, Button, Card, Field, PageHeader, SectionLabel, StatTile } from '@/components/ui';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as IncidentCategory[];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function download(bytes: Uint8Array, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Thirty days back, as a plain date the input accepts. */
function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

export function IncidentReportPage() {
  const session = useSession();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [wardCodes, setWardCodes] = useState<string[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>(CATEGORIES);
  const [severities, setSeverities] = useState<IncidentSeverity[]>([...SEVERITY_ORDER]);

  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const incidentsQuery = useQuery({
    queryKey: ['incidents', session?.tenantId, 'range', fromIso, toIso],
    queryFn: () => dal.incidents.listByDateRange(session!, fromIso, toIso),
    enabled: Boolean(session) && from <= to,
  });
  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', session?.tenantId],
    queryFn: () => dal.municipalityProfile.get(session!),
    enabled: Boolean(session),
  });
  const staffQuery = useQuery({
    queryKey: ['staff', session?.tenantId, session?.uid],
    queryFn: () => dal.staff.getByUid(session!, session!.uid),
    enabled: Boolean(session),
  });

  const incidents = useMemo(() => incidentsQuery.data ?? [], [incidentsQuery.data]);
  const report = useMemo(
    () => buildIncidentReport(incidents, { fromIso, toIso, wardCodes, categories, severities }),
    [incidents, fromIso, toIso, wardCodes, categories, severities],
  );

  const wardsInRange = useMemo(
    () => [...new Set(incidents.map((i) => i.wardCode))].sort(),
    [incidents],
  );

  if (!session) {
    return (
      <Card className="max-w-lg">
        <PageHeader slug="/incidents/report" title="Municipal incident report" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
    );
  }

  const profile = profileQuery.data ?? null;
  const staff = staffQuery.data ?? null;

  function buildDocument() {
    return incidentReportDocument(report, {
      organisation: profile?.municipalityName ?? '',
      municipalityName: profile
        ? `${profile.municipalityName} (${profile.municipalityCode})`
        : 'Municipality not configured',
      version: '1.0',
      preparedByName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : session!.uid,
      preparedAt: new Date().toISOString(),
    });
  }

  const rangeInvalid = from > to;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader slug="/incidents/report" title="Municipal incident report" description={REPORT_BASIS} />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Filters */}
        {/*
         * The three checkbox groups are <fieldset>/<legend> rather than a
         * <p> above a run of checkboxes. The checkboxes themselves were
         * always labelled — each sits inside its own <label> — but
         * nothing tied them together, so a screen reader read twelve
         * unrelated checkboxes instead of "Categories, group, 1 of 5".
         * On a filter panel that decides what a report contains, the
         * grouping is the meaning.
         */}
        <Card className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-label-caps font-display uppercase text-slate">Period</legend>
            <Field label="From" mono>
              {(props) => (
                <input {...props} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              )}
            </Field>
            <Field label="To" mono error={rangeInvalid ? 'The start date is after the end date.' : undefined}>
              {(props) => <input {...props} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}
            </Field>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-label-caps font-display uppercase text-slate">Categories</legend>
            {CATEGORIES.map((category) => (
              <label key={category} className="flex min-h-11 items-center gap-2 text-body-md font-body">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={categories.includes(category)}
                  onChange={() => setCategories((c) => toggle(c, category))}
                />
                {CATEGORY_LABEL[category]}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-label-caps font-display uppercase text-slate">Severity</legend>
            {SEVERITY_ORDER.map((severity) => (
              <label key={severity} className="flex min-h-11 items-center gap-2 text-body-md font-body">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={severities.includes(severity)}
                  onChange={() => setSeverities((s) => toggle(s, severity))}
                />
                {SEVERITY_META[severity].label}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-label-caps font-display uppercase text-slate">Wards</legend>
            {wardsInRange.length === 0 && (
              <p className="text-body-md font-body text-slate">No wards in this period yet.</p>
            )}
            {wardsInRange.map((ward) => (
              <label key={ward} className="flex min-h-11 items-center gap-2 text-data-mono font-mono">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={wardCodes.length === 0 || wardCodes.includes(ward)}
                  onChange={() => setWardCodes((w) => toggle(w.length === 0 ? wardsInRange : w, ward))}
                />
                {ward}
              </label>
            ))}
            <BasisNote>
              Only wards you may read appear here, and only those with something logged in this period.
            </BasisNote>
          </fieldset>
        </Card>

        {/* Summary and actions */}
        <div className="space-y-4">
          {incidentsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="In this report" value={report.summary.total} />
            {/* Hand-rolled: the open count is maroon, which StatTile has
                no state for. Same call as the Vote Calculator's tied-seats
                tile. */}
            <div className="rounded border border-ink/10 bg-white p-4">
              <p className="text-label-caps font-display uppercase text-slate">Still open</p>
              <p className="text-display-lg-mobile font-display text-maroon">{report.summary.open}</p>
            </div>
            <StatTile label="Wards affected" value={report.summary.wardsAffected.length} />
            <StatTile label="With photographs" value={report.summary.withPhotos} />
          </div>

          <Card className="space-y-2">
            <SectionLabel as="h2">By category</SectionLabel>
            {CATEGORIES.map((category) => (
              <p key={category} className="text-body-md font-body text-ink">
                {CATEGORY_LABEL[category]}{' '}
                <span className="text-data-mono font-mono text-slate">{report.summary.byCategory[category]}</span>
              </p>
            ))}
          </Card>

          {!profile && (
            <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
              No municipality profile is set, so the report cannot name the municipality it covers. Set it in
              Settings → Municipality Config first.
            </p>
          )}

          <BasisNote>{COMPLETENESS_BASIS}</BasisNote>
          <BasisNote>{PHOTO_BASIS}</BasisNote>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={rangeInvalid || incidentsQuery.isLoading}
              onClick={() => {
                const doc = buildDocument();
                download(renderDocumentPdf(doc), `${documentFileStem(doc)}.pdf`, 'application/pdf');
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="ghost"
              disabled={rangeInvalid || incidentsQuery.isLoading}
              onClick={() => {
                const doc = buildDocument();
                download(
                  renderDocumentDocx(doc),
                  `${documentFileStem(doc)}.docx`,
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                );
              }}
            >
              Download Word
            </Button>
          </div>

          <BasisNote>
            Downloading sends nothing. A fault that needs formally referring is referred one at a time, from
            the incident itself, as an addressed and signed document.
          </BasisNote>
        </div>
      </div>
    </div>
  );
}
