/**
 * Election-COS1.0 — financial year / quarter derivation
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3. `Donation.financialYear`/`quarter`
 * are "derived by the caller (module layer) from the current
 * PPFAConfig.financialYearStartMonth, not computed [in the adapter]" —
 * per donationsRepository.ts's header. This is that derivation, kept pure
 * and separate from any component so it's testable without a session.
 *
 * `financialYearStartMonth` itself is PROVISIONAL (§6.8.1 Q2, assumed
 * April) — this function takes it as a parameter rather than assuming
 * April, so answering Q2 is a config change, not a rewrite here.
 */
export function deriveFinancialYear(date: Date, financialYearStartMonth: number): string {
  const month = date.getMonth() + 1; // 1–12
  const year = date.getFullYear();
  const fyStartYear = month >= financialYearStartMonth ? year : year - 1;
  const fyEndYearShort = (fyStartYear + 1) % 100;
  return `${fyStartYear}/${String(fyEndYearShort).padStart(2, '0')}`;
}

export function deriveQuarter(date: Date, financialYearStartMonth: number): 1 | 2 | 3 | 4 {
  const month = date.getMonth() + 1;
  const monthsSinceStart = (((month - financialYearStartMonth) % 12) + 12) % 12;
  return (Math.floor(monthsSinceStart / 3) + 1) as 1 | 2 | 3 | 4;
}
