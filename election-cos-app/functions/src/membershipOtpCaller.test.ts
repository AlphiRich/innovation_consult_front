/**
 * Election Campaign OS — who a membership OTP callable will talk to
 *
 * §35.1 was an authentication bypass: the reviewed service read the
 * subject's identity straight out of an unauthenticated request body, so
 * anyone who found the Cloud Run URL could verify any member. These are
 * the assertions that keep the replacement from drifting back toward it.
 */
import { describe, expect, it } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { callerFrom } from './membershipOtpCallables';

type Req = Parameters<typeof callerFrom>[0];

const req = (auth: unknown, data: unknown = {}): Req => ({ auth, data, rawRequest: {}, acceptsStreaming: false }) as Req;
const signedIn = (token: Record<string, unknown>, uid = 'agent-1') => req({ uid, token });

function refusal(request: Req): { code: string; message: string } {
  try {
    callerFrom(request);
  } catch (error) {
    const e = error as HttpsError;
    return { code: e.code, message: e.message };
  }
  throw new Error('expected a refusal, got a caller');
}

describe('the caller', () => {
  it('is accepted when signed in, tenanted and capable', () => {
    expect(callerFrom(signedIn({ tenantId: 'jbmarks', caps: ['voters.view', 'voters.edit'] }))).toEqual({
      uid: 'agent-1',
      tenantId: 'jbmarks',
    });
  });

  it('refuses an anonymous call outright', () => {
    // The whole of §35.1 in one line: no token, no conversation.
    expect(refusal(req(undefined)).code).toBe('unauthenticated');
    expect(refusal(req(null)).code).toBe('unauthenticated');
  });

  it('refuses a signed-in account with no tenant', () => {
    expect(refusal(signedIn({ caps: ['voters.edit'] })).code).toBe('permission-denied');
    expect(refusal(signedIn({ tenantId: '', caps: ['voters.edit'] })).code).toBe('permission-denied');
  });

  it('refuses a tenanted account without voters.edit', () => {
    expect(refusal(signedIn({ tenantId: 'jbmarks', caps: ['voters.view'] })).code).toBe('permission-denied');
    expect(refusal(signedIn({ tenantId: 'jbmarks', caps: [] })).code).toBe('permission-denied');
    expect(refusal(signedIn({ tenantId: 'jbmarks' })).code).toBe('permission-denied');
  });

  it('takes the tenant from the token and never from the payload', () => {
    // A tenant id in the request body is the shape of the original bug.
    // Supplying one must not change which tenant is acted on.
    const request = req(
      { uid: 'agent-1', token: { tenantId: 'jbmarks', caps: ['voters.edit'] } },
      { tenantId: 'matlosana', voterId: 'someone-elses-voter' },
    );
    expect(callerFrom(request).tenantId).toBe('jbmarks');
  });

  it('is not fooled by a caps claim that is not an array', () => {
    // A string claim would satisfy `.includes('voters.edit')` on a
    // substring, which is a capability check that can be talked past.
    for (const caps of ['voters.edit', { 'voters.edit': true }, 'all voters.edit caps']) {
      expect(refusal(signedIn({ tenantId: 'jbmarks', caps })).code).toBe('permission-denied');
    }
  });

  it('is not fooled by a tenantId claim that is not a string', () => {
    for (const tenantId of [42, true, { id: 'jbmarks' }, ['jbmarks']]) {
      expect(refusal(signedIn({ tenantId, caps: ['voters.edit'] })).code).toBe('permission-denied');
    }
  });
});
