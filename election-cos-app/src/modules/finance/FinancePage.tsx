import { PagePlaceholder } from '@/app/PagePlaceholder';

export function FinancePage() {
  return (
    <PagePlaceholder
      title="Funding & Disclosure"
      route="/finance"
      status="partial"
      note="Data model, capability wiring, and UI shell in place. Aggregation/alerting Cloud Function deliberately HELD pending §6.8.1 (Q1–Q3 statutory questions). Online only — never in the offline layer."
    />
  );
}
