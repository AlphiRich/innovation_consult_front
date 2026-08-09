import { PagePlaceholder } from '@/app/PagePlaceholder';

export function MunicipalityConfigPage() {
  return (
    <PagePlaceholder
      title="Municipality Config"
      route="/settings/municipality"
      status="stub"
      note="Carries seat totals and election parameters the seat calculator depends on. Retained deliberately (master index §3.2)."
    />
  );
}
