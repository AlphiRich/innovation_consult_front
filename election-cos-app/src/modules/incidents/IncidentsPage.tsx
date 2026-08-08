import { PagePlaceholder } from '@/app/PagePlaceholder';

export function IncidentsPage() {
  return (
    <PagePlaceholder
      title="Incidents"
      route="/incidents"
      status="stub"
      note="Fixed taxonomy only. Workflow: Canvasser logs → Ward Lead triages → Municipal Lead escalates → referral PDF (§6.4)."
    />
  );
}
