import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_TTL_MS,
  createSessionToken,
  isSessionTokenValid,
  timingSafeEqual,
} from './_auth';

const SECRET = 'unit-test-secret';

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
});

afterEach(() => {
  vi.useRealTimers();
  process.env.AUTH_SECRET = SECRET;
});

describe('createSessionToken / isSessionTokenValid', () => {
  it('round-trips a freshly signed token', async () => {
    const token = await createSessionToken(SECRET);
    expect(await isSessionTokenValid(token)).toBe(true);
  });

  it('signs with the configured secret, not the password', async () => {
    const token = await createSessionToken('a-different-secret');
    expect(await isSessionTokenValid(token)).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const token = await createSessionToken(SECRET);
    const [payload, signature] = token.split('.');
    const flipped = (payload[0] === 'e' ? 'f' : 'e') + payload.slice(1);
    expect(await isSessionTokenValid(`${flipped}.${signature}`)).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(SECRET);
    const [payload, signature] = token.split('.');
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
    expect(await isSessionTokenValid(`${payload}.${flipped}`)).toBe(false);
  });

  it('rejects malformed tokens without throwing', async () => {
    for (const bad of ['', '.', '..', 'no-separator', 'a.b', 'a.b.c', '....', '%%%.%%%']) {
      expect(await isSessionTokenValid(bad)).toBe(false);
    }
  });

  it('rejects a missing token', async () => {
    expect(await isSessionTokenValid(undefined)).toBe(false);
    expect(await isSessionTokenValid(null)).toBe(false);
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const token = await createSessionToken(SECRET);
    expect(await isSessionTokenValid(token)).toBe(true);

    vi.advanceTimersByTime(SESSION_TTL_MS + 60_000);
    expect(await isSessionTokenValid(token)).toBe(false);
  });

  it('fails closed when AUTH_SECRET is unset or empty', async () => {
    const token = await createSessionToken(SECRET);

    process.env.AUTH_SECRET = '';
    expect(await isSessionTokenValid(token)).toBe(false);

    delete process.env.AUTH_SECRET;
    expect(await isSessionTokenValid(token)).toBe(false);
  });

  it('keeps sessions to 7 days', () => {
    expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('timingSafeEqual', () => {
  it('accepts identical strings', () => {
    expect(timingSafeEqual('hunter2', 'hunter2')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
    expect(timingSafeEqual('p@ssw0rd', 'p@ssw0rd')).toBe(true);
  });

  it('rejects different strings of the same length', () => {
    expect(timingSafeEqual('hunter2', 'hunter3')).toBe(false);
  });

  it('rejects different lengths without throwing', () => {
    expect(timingSafeEqual('pass', 'password')).toBe(false);
    expect(timingSafeEqual('', 'x')).toBe(false);
    expect(timingSafeEqual('longer-than-expected', '')).toBe(false);
  });

  it('compares bytes, not code units', () => {
    expect(timingSafeEqual('é', 'e')).toBe(false);
    expect(timingSafeEqual('sécurité', 'sécurité')).toBe(true);
  });
});
