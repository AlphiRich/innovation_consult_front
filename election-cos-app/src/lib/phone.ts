/**
 * Election Campaign OS — phone number display masking
 * IC-ECOS-BUILD-2026-V2 §6.2.1.
 *
 * This is the DISPLAY mask only (`Voter.phoneMasked`) — not encryption.
 * The plaintext number is never stored; `phoneEncrypted` (AES-256, still
 * pending real key management — see BUILD-STATUS.md) is a separate
 * concern from this formatting helper.
 *
 * Format mirrors the masking style already used for candidate SA ID
 * numbers elsewhere in the app ("771120 •••• 081"): keep enough of both
 * ends to be recognisable to the canvasser who captured it, mask the
 * middle.
 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) {
    // Too short to safely mask both ends without revealing everything —
    // mask it all rather than leak a short number in the clear.
    return '•'.repeat(digits.length || 1);
  }
  const head = digits.slice(0, 3);
  const tail = digits.slice(-3);
  return `${head} •••• ${tail}`;
}
