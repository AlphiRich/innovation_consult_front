import { describe, expect, it } from 'vitest';
import { isOverdue, RESPONSE_TARGET_DAYS } from './dataSubjectRequestSla';

describe('isOverdue', () => {
  const now = new Date('2026-08-08T00:00:00.000Z');

  it('is false for a request received today', () => {
    expect(isOverdue(now.toISOString(), 'RECEIVED', now)).toBe(false);
  });

  it(`is false just under ${RESPONSE_TARGET_DAYS} days`, () => {
    const received = new Date(now.getTime() - (RESPONSE_TARGET_DAYS - 1) * 86_400_000).toISOString();
    expect(isOverdue(received, 'IN_PROGRESS', now)).toBe(false);
  });

  it(`is true past ${RESPONSE_TARGET_DAYS} days and still open`, () => {
    const received = new Date(now.getTime() - (RESPONSE_TARGET_DAYS + 1) * 86_400_000).toISOString();
    expect(isOverdue(received, 'IN_PROGRESS', now)).toBe(true);
  });

  it('is never overdue once fulfilled, however old', () => {
    const received = new Date(now.getTime() - 365 * 86_400_000).toISOString();
    expect(isOverdue(received, 'FULFILLED', now)).toBe(false);
  });

  it('is never overdue once rejected', () => {
    const received = new Date(now.getTime() - 365 * 86_400_000).toISOString();
    expect(isOverdue(received, 'REJECTED', now)).toBe(false);
  });
});
