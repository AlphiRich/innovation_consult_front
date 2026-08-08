import { PagePlaceholder } from '@/app/PagePlaceholder';

// Allocation logic (allocateSeats) is fully implemented and property-tested
// in seatCalculator.ts / seatCalculator.test.ts. This page is the UI shell
// around it — no Stitch screen was available this session to match pixel
// layout against, so it renders as a placeholder pending that asset.
export function SeatCalculatorPage() {
  return (
    <PagePlaceholder
      title="Vote Calculator (Seat Allocation)"
      route="/analytics/seat-calculator"
      status="partial"
      note="MMP allocation logic (quota, entitlement, overhang, largest-remainder tie handling) implemented and property-tested in seatCalculator.ts. UI wiring pending real screens."
    />
  );
}
