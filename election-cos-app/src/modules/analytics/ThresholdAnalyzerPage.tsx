import { PagePlaceholder } from '@/app/PagePlaceholder';

// NAMING DISCIPLINE (§3.2): this is the ELECTORAL vote-threshold tool.
// /settings/ppfa-thresholds is the STATUTORY FUNDING settings screen.
// They must never share a label, icon, or breadcrumb.
export function ThresholdAnalyzerPage() {
  return (
    <PagePlaceholder
      title="Threshold Analyzer (electoral)"
      route="/analytics/thresholds"
      status="stub"
      note="Electoral vote thresholds — distinct from /settings/ppfa-thresholds (statutory funding disclosure). Do not merge."
    />
  );
}
