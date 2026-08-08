import { PagePlaceholder } from '@/app/PagePlaceholder';

// NAMING DISCIPLINE (§3.2): this is the STATUTORY FUNDING settings screen
// (R200k / R30m). /analytics/thresholds is the electoral vote-threshold
// tool. They must never share a label, icon, or breadcrumb.
export function PPFAThresholdsPage() {
  return (
    <PagePlaceholder
      title="PPFA Threshold Config"
      route="/settings/ppfa-thresholds"
      status="partial"
      note={
        'Data model in src/dal/ports/ppfaConfig.ts (append-only, effective-dated). ' +
        'Requires ppfa.manage_thresholds — deliberately separate from ppfa.edit (§4.4). ' +
        'Must show governing figure + source citation + effective date, and a visible ' +
        'history of previous configurations (§6.8.5).'
      }
    />
  );
}
