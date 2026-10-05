import { beforeEach, describe, expect, it, vi } from 'vitest';
import { badRequest, notFound, parseBody, serverError } from './_helpers';

/** Minimal stand-in for the `Request` these helpers read. */
const request = (text: string) => ({ text: async () => text }) as unknown as Request;

beforeEach(() => {
  // serverError logs the full error server-side; keep the test output quiet.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('parseBody', () => {
  it('parses a JSON body', async () => {
    await expect(parseBody(request('{"name":"A"}'))).resolves.toEqual({ name: 'A' });
  });

  it('returns {} when there is no body at all', async () => {
    await expect(parseBody(request(''))).resolves.toEqual({});
    await expect(parseBody(request('   \n '))).resolves.toEqual({});
  });

  it('returns null for malformed JSON so the caller can answer 400', async () => {
    await expect(parseBody(request('{oops'))).resolves.toBeNull();
    await expect(parseBody(request('not json'))).resolves.toBeNull();
  });
});

describe('serverError', () => {
  it('never forwards the underlying message to the client', async () => {
    const res = serverError(
      new Error('MongoServerError: connection string mongodb+srv://user:pass@cluster/x')
    );
    expect(res.status).toBe(500);

    const body = (await res.json()) as { error: string; requestId: string };
    expect(body.error).not.toContain('mongodb+srv');
    expect(body.error).not.toContain('pass@cluster');
    expect(body.error).not.toContain('MongoServerError');
    expect(body.error).toMatch(/Ralat pelayan/);
    expect(body.error).toContain(body.requestId);
  });

  it('quotes a greppable request id', async () => {
    const body = (await serverError(new Error('boom')).json()) as { requestId: string };
    expect(body.requestId).toMatch(/^[0-9a-f]{8}$/);
  });

  it('logs the full error server-side', () => {
    const spy = vi.mocked(console.error);
    spy.mockClear(); // earlier tests in this file also log
    serverError(new Error('the detail stays in the log'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('the detail stays in the log');
  });

  it('handles non-Error throws', async () => {
    const res = serverError('just a string');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; requestId: string };
    expect(body.error).toMatch(/Ralat pelayan/);
    expect(body.requestId).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('badRequest / notFound', () => {
  it('returns the authored message with the right status', async () => {
    const bad = badRequest('ID tidak sah');
    expect(bad.status).toBe(400);
    await expect(bad.json()).resolves.toEqual({ error: 'ID tidak sah' });

    const missing = notFound('Pesanan tidak dijumpai');
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Pesanan tidak dijumpai' });
  });
});
