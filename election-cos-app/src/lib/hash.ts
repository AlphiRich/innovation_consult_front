/**
 * Election Campaign OS — SHA-256 helper
 *
 * Wraps the Web Crypto API. There is exactly one hash function in this
 * product and this is it — so that "Document Integrity Hash (SHA-256)"
 * (§8.4) always means the same operation over the same kind of input, and
 * so that nothing can quietly ship a substring of a record id in a field
 * labelled as a hash.
 *
 * `crypto.subtle` requires a secure context (HTTPS or localhost). If it is
 * unavailable this throws rather than degrading to a weaker digest: a
 * document that cannot be hashed must not be issued claiming it was.
 *
 * WHAT THIS IS FOR, AND WHAT IT MUST NEVER BE USED FOR
 *
 * This is an INTEGRITY hash over content that is not secret — a referral's
 * canonical field serialization, an export's bytes. SHA-256 is the right
 * tool there precisely because it is fast and deterministic: anyone
 * holding the record can recompute it and get the same answer.
 *
 * That same speed makes it the WRONG tool for committing to a low-entropy
 * secret — an OTP, a PIN, a passcode, a password, a short account number.
 * A six-digit OTP has a million possible values; an attacker holding the
 * database can exhaust every SHA-256 of them in well under a second, so
 * the hash protects nothing. Secrets need a deliberately slow,
 * salted KDF (bcrypt, scrypt, argon2id, or PBKDF2 with a high iteration
 * count) — not this function.
 *
 * Nothing in this product hashes a secret today. `hash.test.ts` scans the
 * source tree and fails if that changes, because the mistake is easy to
 * make and invisible once made: the code looks identical either way.
 */

function subtle(): SubtleCrypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error(
      'SHA-256 is unavailable: Web Crypto requires a secure context (HTTPS or localhost). ' +
        'Refusing to issue a document whose integrity hash cannot be computed.',
    );
  }
  return cryptoObj.subtle;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Lowercase hex SHA-256 of a UTF-8 string. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

/** Lowercase hex SHA-256 of raw bytes (e.g. a generated PDF). */
export async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  // `bytes.slice()` normalises a possibly-shared or offset view into a
  // standalone buffer, which digest() requires.
  const digest = await subtle().digest('SHA-256', bytes.slice().buffer);
  return toHex(digest);
}

/**
 * A short, human-quotable prefix of a hash, for reading over a phone or
 * printing in a confined column. Always rendered alongside the full hash,
 * never instead of it — a truncated hash is a convenience, not a
 * verification.
 */
export function shortHash(hashHex: string, length = 12): string {
  return hashHex.slice(0, length);
}
