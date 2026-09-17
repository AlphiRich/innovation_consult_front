/**
 * Election Campaign OS — phone number display masking
 * IC-ECOS-BUILD-2026-V2 §6.2.1.
 *
 * This is the DISPLAY mask only (`Voter.phoneMasked`) — not encryption.
 * The plaintext number is never stored; `phoneEncrypted` (AES-256, still
 * pending real key management — see BUILD-STATUS.md) is a separate
 * concern from this formatting helper.
 *
 * Keeps enough of both ends to be recognisable to the canvasser who
 * captured it, and masks the middle.
 *
 * This is NOT the same trade-off as `maskSaIdNumber()`, which reveals four
 * digits and no more. A phone number is a contact detail the canvasser has
 * to recognise at a glance in a list; an ID number is special personal
 * information whose leading digits are a date of birth. Different
 * sensitivity, different mask — see that function's header.
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
