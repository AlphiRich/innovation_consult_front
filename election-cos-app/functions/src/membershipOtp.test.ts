/**
 * Election Campaign OS — membership OTP
 *
 * Each block here names the §35 finding it exists to stop coming back.
 * The reviewed boilerplate's defects were all findable by running it and
 * none of them by reading it, so these run it.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_ATTEMPTS,
  OTP_LENGTH,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  SCRYPT_PARAMS,
  canResend,
  generateOtp,
  hashOtp,
  maskPhone,
  newSalt,
  toE164ZA,
  verifyOtp,
  type OtpChallenge,
} from './membershipOtp';

const NOW = Date.parse('2026-10-28T09:00:00.000Z');

async function challengeFor(code: string, overrides: Partial<OtpChallenge> = {}): Promise<OtpChallenge> {
  const salt = newSalt();
  return {
    tenantId: 'jbmarks',
    voterId: 'voter-1',
    phoneMasked: maskPhone('0821234567'),
    codeHash: await hashOtp(code, salt),
    salt,
    createdAt: NOW,
    expiresAt: NOW + OTP_TTL_MS,
    attempts: 0,
    status: 'SENT',
    requestedByUid: 'agent-1',
    ...overrides,
  };
}

describe('the code itself', () => {
  it('is six digits, leading zeros kept', async () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(code).toHaveLength(OTP_LENGTH);
    }
  });

  it('spreads uniformly, by a test strong enough to see the bias it is about', () => {
    /**
     * `randomBytes(3) % 1000000` looks random and is not: 0–777 215 come
     * up 17 times per 2^24 and the rest 16, a 6% skew toward low codes.
     *
     * A first draft of this test bucketed 20 000 draws with a ±30% band
     * and passed that generator happily. Proved by injection, which is
     * the only reason the weakness was visible at all: the biased
     * generator now drives the statistic to roughly 110, and a fair one
     * sits under 10. The threshold is at p≈0.99999 for df=9, so a true
     * generator fails this about once in a hundred thousand runs.
     */
    const draws = 200_000;
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < draws; i += 1) buckets[Number(generateOtp()[0])] += 1;

    const expected = draws / 10;
    const chiSquare = buckets.reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, 0);
    expect(chiSquare).toBeLessThan(45);
  });

  it('never reuses a salt', () => {
    const salts = new Set(Array.from({ length: 1_000 }, () => newSalt()));
    expect(salts.size).toBe(1_000);
  });
});

describe('§35.2 — the hash is slow, and the salt is real', () => {
  it('gives a different hash for the same code under a different salt', async () => {
    // The boilerplate's salt was the literal string `salt_from_db`, so
    // every OTP in the system shared one. Two challenges for the same
    // code must not look alike.
    const a = await challengeFor('482915');
    const b = await challengeFor('482915');
    expect(a.salt).not.toBe(b.salt);
    expect(a.codeHash).not.toBe(b.codeHash);
  });

  it('costs enough per guess to make the keyspace unaffordable', async () => {
    const salt = newSalt();
    const started = performance.now();
    await hashOtp('482915', salt);
    const perGuess = performance.now() - started;

    // SHA-256 recovered a six-digit code in 0.67 s (§35.2). The whole
    // point of scrypt here is that the same sweep becomes hours. This
    // asserts the floor, not the measured figure, so a slower CI box
    // never fails the build — and a *faster* hash, which is the actual
    // regression, does.
    expect(perGuess).toBeGreaterThan(5);
    const keyspaceHours = (perGuess * 10 ** OTP_LENGTH) / 1000 / 3600;
    expect(keyspaceHours).toBeGreaterThan(1);
    console.log(
      `   scrypt N=${SCRYPT_PARAMS.N}: ${perGuess.toFixed(1)} ms/guess ` +
        `→ ~${keyspaceHours.toFixed(1)} h for the full 10^6 keyspace on this core`,
    );
  });
});

describe('§35.3 — a wrong guess does not destroy the challenge', () => {
  it('accepts the right code after a wrong one, which the reviewed service could not', async () => {
    // THE test. In the boilerplate a failed attempt was written into the
    // same table the challenge lived in, became the newest row, and every
    // later lookup read a null hash — so one typo locked the member out
    // for good, with no error anywhere. Simulated in §35.3.
    const challenge = await challengeFor('482915');

    const wrong = await verifyOtp(challenge, '111111', NOW);
    expect(wrong).toEqual({ kind: 'WRONG', attemptsRemaining: MAX_ATTEMPTS - 1 });

    // The caller persists the incremented count; the hash and salt are
    // untouched, which is the whole fix.
    const afterWrong = { ...challenge, attempts: 1 };
    expect(afterWrong.codeHash).toBe(challenge.codeHash);
    expect(afterWrong.salt).toBe(challenge.salt);

    expect(await verifyOtp(afterWrong, '482915', NOW)).toEqual({ kind: 'VERIFIED' });
  });

  it('still verifies on the last attempt before the lock', async () => {
    const challenge = await challengeFor('482915', { attempts: MAX_ATTEMPTS - 1 });
    expect(await verifyOtp(challenge, '482915', NOW)).toEqual({ kind: 'VERIFIED' });
  });
});

describe('§35.7 — attempts are counted, not merely logged', () => {
  it('counts down and then locks', async () => {
    let challenge = await challengeFor('482915');
    const seen: string[] = [];

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      const outcome = await verifyOtp(challenge, '000000', NOW);
      seen.push(outcome.kind);
      challenge = { ...challenge, attempts: challenge.attempts + 1 };
    }

    expect(seen).toEqual(['WRONG', 'WRONG', 'WRONG', 'WRONG', 'LOCKED']);
  });

  it('refuses the correct code once locked', async () => {
    const challenge = await challengeFor('482915', { attempts: MAX_ATTEMPTS });
    expect(await verifyOtp(challenge, '482915', NOW)).toEqual({ kind: 'LOCKED' });
  });

  it('locks the challenge and not the member', async () => {
    // A locked challenge must not hold the cooldown open for ever, or
    // five wrong guesses become a permanent denial of service on a member
    // anyone can trigger.
    const locked = await challengeFor('482915', { status: 'LOCKED' });
    expect(canResend(locked, NOW + RESEND_COOLDOWN_MS)).toBe(true);
  });
});

describe('§35.4 — expiry is a number compared to a number', () => {
  it('expires exactly at its own deadline, not a tick before', async () => {
    const challenge = await challengeFor('482915');
    expect(await verifyOtp(challenge, '482915', challenge.expiresAt - 1)).toEqual({ kind: 'VERIFIED' });
    expect(await verifyOtp(challenge, '482915', challenge.expiresAt)).toEqual({ kind: 'EXPIRED' });
  });

  it('expires before it spends an attempt', async () => {
    // A stale challenge must not be usable to burn down an attempt
    // budget, and must not reach the hash comparison at all.
    const challenge = await challengeFor('482915');
    expect(await verifyOtp(challenge, '000000', NOW + OTP_TTL_MS + 1)).toEqual({ kind: 'EXPIRED' });
  });

  it('is checked before the attempt counter, not after', async () => {
    /**
     * A challenge that is both out of attempts and out of time reports
     * EXPIRED. Both are terminal and both lead to the same remedy, so the
     * choice is about which message helps: "that code expired, ask for
     * another" is actionable, "locked" invites a support call.
     *
     * Pinned because the first draft of the test above could not tell the
     * two orderings apart — it used a challenge with no attempts spent,
     * so reordering the checks changed nothing it looked at.
     */
    const stale = await challengeFor('482915', { attempts: MAX_ATTEMPTS });
    expect(await verifyOtp(stale, '482915', NOW + OTP_TTL_MS + 1)).toEqual({ kind: 'EXPIRED' });
  });

  it('holds both sides of the comparison as numbers', async () => {
    const challenge = await challengeFor('482915');
    expect(typeof challenge.expiresAt).toBe('number');
    expect(typeof challenge.createdAt).toBe('number');
    expect(challenge.expiresAt - challenge.createdAt).toBe(OTP_TTL_MS);
  });
});

describe('what a challenge will not do twice', () => {
  it('refuses a replay of a code that already worked', async () => {
    const challenge = await challengeFor('482915', { status: 'VERIFIED' });
    expect(await verifyOtp(challenge, '482915', NOW)).toEqual({ kind: 'ALREADY_VERIFIED' });
  });

  it('refuses a code for a message that never went out', async () => {
    for (const status of ['PENDING_DELIVERY', 'DELIVERY_FAILED'] as const) {
      const challenge = await challengeFor('482915', { status });
      expect(await verifyOtp(challenge, '482915', NOW)).toEqual({ kind: 'NOT_DELIVERED' });
    }
  });
});

describe('the resend cooldown', () => {
  it('allows the first send and holds the second', async () => {
    expect(canResend(null, NOW)).toBe(true);
    const sent = await challengeFor('482915');
    expect(canResend(sent, NOW + RESEND_COOLDOWN_MS - 1)).toBe(false);
    expect(canResend(sent, NOW + RESEND_COOLDOWN_MS)).toBe(true);
  });

  it('does not punish a member for a delivery outage', async () => {
    const failed = await challengeFor('482915', { status: 'DELIVERY_FAILED' });
    expect(canResend(failed, NOW)).toBe(true);
  });
});

describe('the number never lands in the challenge', () => {
  it('stores a mask and nothing that could be read back as a number', async () => {
    const challenge = await challengeFor('482915');
    expect(challenge.phoneMasked).toBe('082 •••• 567');
    expect(JSON.stringify(challenge)).not.toContain('0821234567');
    expect(Object.keys(challenge)).not.toContain('phone');
  });

  it('masks the same way src/lib/phone.ts does', () => {
    // The vector table is shared with src/lib/phone.test.ts. These two
    // copies exist because the packages do not share a workspace; this is
    // what stops them drifting apart in silence.
    expect(maskPhone('0821234567')).toBe('082 •••• 567');
    expect(maskPhone('+27 82 123 4567')).toBe('278 •••• 567');
    expect(maskPhone('12345')).toBe('•••••');
    expect(maskPhone('')).toBe('•');
  });
});

describe('normalising a South African number', () => {
  it('accepts the shapes a canvasser actually types', () => {
    for (const raw of ['0821234567', '082 123 4567', '+27821234567', '+27 82 123 4567', '27821234567']) {
      expect(toE164ZA(raw)).toBe('+27821234567');
    }
  });

  it('refuses rather than guessing at anything else', () => {
    // A number that reaches delivery unnormalised is a message that
    // silently never arrives. Refusing is louder than that.
    for (const raw of ['', '12345', '0821234', '0123456789', '+44821234567', 'not a number']) {
      expect(toE164ZA(raw)).toBeNull();
    }
  });
});
