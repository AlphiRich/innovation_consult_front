import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sha256Hex, sha256HexOfBytes, shortHash } from './hash';

describe('sha256Hex', () => {
  it('matches the published SHA-256 test vectors', async () => {
    // NIST/FIPS-180-4 worked examples — an independent check that this is
    // really SHA-256 and not, say, SHA-1 or a truncated digest.
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('hashes UTF-8 bytes, not UTF-16 code units', async () => {
    // "é" is 2 bytes in UTF-8 (0xC3 0xA9) and one UTF-16 code unit.
    // Getting this wrong would make a hash computed on one platform
    // unverifiable on another. Vector computed with Python hashlib, not
    // recalled — the first draft of this line carried a digest written
    // from memory, and it was wrong.
    expect(await sha256Hex('é')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
    expect(await sha256HexOfBytes(new Uint8Array([0xc3, 0xa9]))).toBe(await sha256Hex('é'));
  });

  it('agrees with itself across the string and bytes entry points', async () => {
    const text = 'ecos.referral.v1';
    expect(await sha256HexOfBytes(new TextEncoder().encode(text))).toBe(await sha256Hex(text));
  });

  it('hashes a view of a larger buffer, not the whole buffer', async () => {
    // A Uint8Array can be a window onto a bigger ArrayBuffer. Digesting
    // the backing buffer instead of the view would silently hash the
    // wrong bytes.
    const backing = new Uint8Array([0, 0, 1, 2, 3, 0, 0]);
    const view = backing.subarray(2, 5);
    expect(await sha256HexOfBytes(view)).toBe(await sha256HexOfBytes(new Uint8Array([1, 2, 3])));
  });

  it('truncates for display without pretending a prefix is a hash', () => {
    const full = 'a'.repeat(64);
    expect(shortHash(full)).toHaveLength(12);
    expect(full.startsWith(shortHash(full))).toBe(true);
  });
});

/**
 * Session 19. An uploaded security review of a Postgres MFA/OTP spec —
 * a spec that lives outside this repo — made a point that lands squarely
 * on this file: SHA-256 is designed for speed, so hashing a six-digit OTP
 * with it protects nothing, because a million candidates can be exhausted
 * instantly. See docs/infrastructure-blueprint-review.md §5.
 *
 * This product hashes no secrets today, and this is the tripwire on that.
 * The mistake is worth guarding rather than remembering: `sha256Hex(otp)`
 * and `sha256Hex(canonicalPayload(doc))` are indistinguishable at a
 * glance, and only one of them is sound.
 */
describe('the one hash function is never pointed at a secret', () => {
  const SRC = resolve(process.cwd(), 'src');

  /**
   * Identifiers that name a low-entropy secret needing a slow KDF.
   *
   * Note the asymmetric word boundaries, which are load-bearing. A leading
   * `\b` stops `mapping` matching `pin`. A *trailing* `\b` would be wrong:
   * the first draft had one, and `sha256Hex(otpCode)` slipped straight
   * through it, because there is no word boundary between `otp` and `C`.
   * That draft passed its own tripwire proof by doing nothing at all.
   *
   * The cost of the looser end is that `pinned` would also match. That is
   * the right way round for a tripwire — a false positive costs someone a
   * glance, a false negative costs the thing the guard exists to prevent.
   */
  const SECRET_ARGUMENT =
    /\b(?:sha256Hex|sha256HexOfBytes)\s*\(\s*[^)]*\b(?:otp|pin|passcode|password|passphrase|secret|credential|apiKey|privateKey)/i;

  /** Importing a KDF would mean secret-hashing arrived; that needs review. */
  const KDF_IMPORT = /from\s+['"](?:bcrypt|bcryptjs|argon2|scrypt-js|@node-rs\/(?:bcrypt|argon2))['"]/;

  function sourceFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        found.push(...sourceFiles(full));
        continue;
      }
      if (['.ts', '.tsx'].includes(extname(full))) found.push(full);
    }
    return found;
  }

  const files = sourceFiles(SRC).filter((f) => !f.endsWith('hash.test.ts'));

  it('finds source files to scan (the guard is not vacuously passing)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never passes an OTP, PIN, password or key to the integrity hash', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${relative(SRC, file)} hashes a secret with SHA-256`).not.toMatch(SECRET_ARGUMENT);
    }
  });

  it('pulls in no password-hashing KDF without this guard being revisited', () => {
    // Not a prohibition — if this product ever does hold a secret, a KDF
    // is exactly what it should use. This fails so that the decision is
    // deliberate and the note above gets updated rather than going stale.
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), `${relative(SRC, file)} imports a KDF`).not.toMatch(KDF_IMPORT);
    }
  });

  it('keeps the caveat next to the function it constrains', () => {
    const source = readFileSync(resolve(SRC, 'lib/hash.ts'), 'utf8');
    expect(source).toMatch(/never be used for/i);
    expect(source).toMatch(/argon2id|bcrypt/);
    expect(source).toMatch(/low-entropy\s+(?:\*\s+)?secret/i);
  });
});
