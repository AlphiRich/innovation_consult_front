/**
 * Election Campaign OS — membership OTP, the whole of the logic
 * IC-ECOS-BUILD-2026-V2 §6.2.1, §6.6, §7.5.
 *
 * WHAT THIS CONFIRMS, AND WHAT IT DOES NOT
 *
 * One narrow thing: that the person whose consent was captured on a
 * membership form is reachable on the number written on it. It is
 * evidence for a `popiaConsentReference` that already exists on a voter
 * record — POPIA puts the burden of showing consent was given on the
 * responsible party, and "WRITTEN" on its own shows nothing.
 *
 * It does **not** establish who that person is. A one-time code proves
 * control of a handset. It is not identity verification, it is not a
 * Home Affairs check, and nothing here may set anything that means one —
 * the same line `saIdNumber.ts` draws, for the same reason.
 *
 * WHY THIS IS A CALLABLE AND NOT A WEBHOOK
 *
 * Session 38 reviewed a Cloud Run boilerplate that did this over an
 * inbound Meta webhook (docs/asset-control-sheet.md §35). Twelve findings,
 * and the shape of the thing caused most of them: a public endpoint that
 * read no signature, so anyone who found the URL could mark any member
 * verified; a parser that 500'd on every delivery receipt Meta sends; a
 * 500 handler that echoed the exception back out.
 *
 * None of those exist here, because there is no inbound endpoint at all.
 * The field agent is standing with the member. The member reads the code
 * off their phone and the agent types it into the app, which calls a
 * Firebase callable carrying the agent's own token. Authentication,
 * tenancy and capability are the platform's job, and they are already
 * solved in this build.
 *
 * THE FIVE DEFECTS THAT GOT FIXED RATHER THAN RE-DISCOVERED
 *
 *  1. **The hash is slow and the salt is real.** The boilerplate hashed a
 *     six-digit code with one SHA-256 pass under a *literal* salt —
 *     `salt_from_db` was a string, not a variable. The code came back in
 *     0.67 s. Here it is scrypt with 16 random bytes per challenge; the
 *     cost is measured in `membershipOtp.test.ts` rather than assumed.
 *  2. **A wrong guess does not destroy the challenge.** In the
 *     boilerplate the attempt log and the challenge shared a table, so
 *     the first failed attempt became the newest row and every later
 *     lookup read a null hash — one typo locked the member out for good,
 *     silently. Here attempts are a counter on the challenge itself, and
 *     a test spends a wrong guess and then submits the right code.
 *  3. **Expiry is a number compared to a number.** Theirs compared a
 *     `datetime` to `time.time()`, which raises `TypeError`, which their
 *     bare `except` turned into a 500 — so nothing ever expired.
 *  4. **Attempts are counted, not merely logged.** Theirs wrote a row per
 *     failure and never read it back.
 *  5. **Comparison is constant-time.**
 *
 * NOTHING HERE TOUCHES A PLAINTEXT NUMBER
 *
 * The challenge document stores a mask, never the number. The number
 * exists for the length of one outbound send and is not persisted by this
 * module or written to a log.
 */
import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * `promisify(scrypt)` drops the options overload, and the options are the
 * entire point of using scrypt — without them it silently falls back to
 * defaults that a future Node could change underneath us.
 */
function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) =>
      err ? reject(err) : resolve(derived),
    );
  });
}

/** Six digits. Long enough to be read aloud once, short enough to be. */
export const OTP_LENGTH = 6;

/** How long a code is good for. */
export const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Wrong guesses before the challenge stops accepting any.
 *
 * It locks the *challenge*, not the member — a new code can be requested
 * after the cooldown. A control that locks the person is a denial of
 * service anyone can trigger on anyone.
 */
export const MAX_ATTEMPTS = 5;

/** Minimum gap between sends to one voter. Caps both cost and nuisance. */
export const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * scrypt cost. N=16384 is Node's default and the figure
 * `membershipOtp.test.ts` measures: raising it raises the attacker's bill
 * and this function's latency in exactly the same proportion, so it is a
 * number to revisit deliberately rather than drift.
 */
export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

export type ChallengeStatus =
  | 'PENDING_DELIVERY'
  | 'SENT'
  | 'DELIVERY_FAILED'
  | 'VERIFIED'
  | 'LOCKED';

export interface OtpChallenge {
  tenantId: string;
  voterId: string;
  /** `maskPhone()` output. The number itself is never stored here. */
  phoneMasked: string;
  codeHash: string;
  salt: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  status: ChallengeStatus;
  requestedByUid: string;
}

export type VerifyOutcome =
  | { kind: 'VERIFIED' }
  | { kind: 'WRONG'; attemptsRemaining: number }
  | { kind: 'LOCKED' }
  | { kind: 'EXPIRED' }
  | { kind: 'NOT_DELIVERED' }
  | { kind: 'ALREADY_VERIFIED' };

/**
 * A uniformly random code, leading zeros kept.
 *
 * `randomInt` is rejection-sampled and unbiased; `Math.random()` is
 * neither random enough nor uniform over a range, and `% 1000000` on a
 * byte stream is biased toward low codes.
 */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

/** 16 random bytes, hex. One per challenge — never a constant. */
export function newSalt(): string {
  return randomBytes(16).toString('hex');
}

export async function hashOtp(code: string, salt: string): Promise<string> {
  const { N, r, p, keylen } = SCRYPT_PARAMS;
  const derived = await scryptAsync(code, salt, keylen, { N, r, p });
  return derived.toString('hex');
}

/**
 * The order of these checks is deliberate.
 *
 * Status before expiry before attempts before the code: a challenge that
 * is already verified, or locked, or stale must not spend an attempt, and
 * must not reach the comparison at all. Getting this order wrong is how a
 * lockout counter becomes the thing an attacker uses to lock people out.
 */
export async function verifyOtp(
  challenge: OtpChallenge,
  submitted: string,
  nowMillis: number,
): Promise<VerifyOutcome> {
  if (challenge.status === 'VERIFIED') return { kind: 'ALREADY_VERIFIED' };
  if (challenge.status === 'LOCKED') return { kind: 'LOCKED' };
  if (challenge.status !== 'SENT') return { kind: 'NOT_DELIVERED' };
  if (nowMillis >= challenge.expiresAt) return { kind: 'EXPIRED' };
  if (challenge.attempts >= MAX_ATTEMPTS) return { kind: 'LOCKED' };

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const actual = Buffer.from(await hashOtp(submitted.trim(), challenge.salt), 'hex');

  // Equal length by construction (same keylen), but a length mismatch
  // makes timingSafeEqual throw rather than return false, so it is
  // checked rather than assumed.
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (matches) return { kind: 'VERIFIED' };

  const attempts = challenge.attempts + 1;
  return attempts >= MAX_ATTEMPTS
    ? { kind: 'LOCKED' }
    : { kind: 'WRONG', attemptsRemaining: MAX_ATTEMPTS - attempts };
}

/** Whether a new code may be sent, given the most recent one. */
export function canResend(latest: OtpChallenge | null, nowMillis: number): boolean {
  if (!latest) return true;
  // A send that never went out does not hold the cooldown — otherwise an
  // outage on the delivery side becomes a minute of silence per member.
  if (latest.status === 'DELIVERY_FAILED') return true;
  return nowMillis - latest.createdAt >= RESEND_COOLDOWN_MS;
}

/**
 * Display mask for a phone number.
 *
 * A standalone copy of `src/lib/phone.ts`'s `maskPhone`, for the same
 * reason `warRoomCounters.ts` keeps trimmed copies of the DAL port
 * shapes: the two packages do not share a workspace yet. The pair is held
 * to one vector table — `membershipOtp.test.ts` and `src/lib/phone.test.ts`
 * assert the same outputs, so the copies cannot drift apart in silence.
 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return '•'.repeat(digits.length || 1);
  return `${digits.slice(0, 3)} •••• ${digits.slice(-3)}`;
}

/**
 * South African E.164, or null.
 *
 * Note 2 of the reviewed boilerplate was right that normalisation belongs
 * upstream of storage, and wrong to leave it to "your OCR step". A number
 * that reaches delivery unnormalised is a message that silently never
 * arrives, so it is normalised here too and refused if it cannot be.
 */
export function toE164ZA(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  const bare = digits.startsWith('+') ? digits.slice(1) : digits;

  if (/^27[678]\d{8}$/.test(bare)) return `+${bare}`;
  if (/^0[678]\d{8}$/.test(bare)) return `+27${bare.slice(1)}`;
  return null;
}
