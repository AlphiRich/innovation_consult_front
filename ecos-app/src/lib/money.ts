/**
 * Election Campaign OS — money helpers
 * IC-ECOS-BUILD-2026-V2 §6.8.2: "Money is integer cents. Never a float."
 * Used anywhere ZAR amounts cross a UI boundary (PPFA module).
 */
export function centsToRand(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new Error(`Expected integer cents, got ${cents}`);
  }
  return cents / 100;
}

export function randToCents(rand: number): number {
  return Math.round(rand * 100);
}

export function formatZAR(cents: number): string {
  const rand = centsToRand(cents);
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(rand);
}
