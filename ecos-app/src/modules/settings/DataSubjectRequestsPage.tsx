import { PagePlaceholder } from '@/app/PagePlaceholder';

export function DataSubjectRequestsPage() {
  return (
    <PagePlaceholder
      title="Data Subject Requests"
      route="/settings/data-requests"
      status="partial"
      note={
        'POPIA Condition 8. New scope added post-initial-build — see ' +
        'src/dal/ports/dataSubjectRequests.ts. Data model, capability wiring (dsr.view / ' +
        'dsr.manage), and Firestore rules are in place; UI pending real screens like the ' +
        'rest of Settings.'
      }
    />
  );
}
