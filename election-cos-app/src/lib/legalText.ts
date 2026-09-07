/**
 * Election Campaign OS — canonical ownership & rights strings.
 * IC-ECOS-BUILD-2026-V2 §3 (branding).
 *
 * RULE: ownership citations name Innovation Consult ONLY. No municipality,
 * metro, council, district, or tenant party may appear in a copyright or
 * rights-attribution line anywhere in the product or its communications —
 * this product is multi-tenant infrastructure, not a party's own asset.
 *
 * Company detail (registration number, trading name) sourced from
 * `CLAUDEHANDOFF.md` §1 — not independently verified against CIPC or any
 * other registry by this codebase. If that detail is ever wrong, this is
 * the one place to fix it.
 */
export const COMPANY_LEGAL_NAME = 'Innovation Consult (Pty) Ltd';
export const COMPANY_REG_NUMBER = '2007/021390/07';
export const COMPANY_TRADING_AS = 'Just Be Trading 10 (Pty) Ltd';

export const COPYRIGHT_LINE = `Copyright © ${COMPANY_LEGAL_NAME}. All rights reserved.`;

export const COMPANY_REG_LINE = `${COMPANY_LEGAL_NAME} (t/a ${COMPANY_TRADING_AS}) · Reg. ${COMPANY_REG_NUMBER}`;

/** Appended to outbound reports/notifications/exports — never to voter-facing text (LET guardrail, §6.7-adjacent). */
export const EMAIL_FOOTER = [
  COPYRIGHT_LINE,
  COMPANY_REG_LINE,
  'Election Campaign OS is a product of Innovation Consult (Pty) Ltd.',
  'Confidential — intended solely for the authorised recipient.',
].join('\n');

/** Footer for watermarked/exported PDFs (referral records, PPFA schedules, etc.) once those exports exist. */
export function pdfFooter(integrityHashSha256: string): string {
  return `${COPYRIGHT_LINE}\nDocument Integrity Hash (SHA-256): ${integrityHashSha256}`;
}
