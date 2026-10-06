import { describe, expect, it } from 'vitest';
import { config } from './middleware';

// Next applies the matcher from the start of the path, so anchor it here too.
const matches = (path: string) =>
  (config.matcher ?? []).some((pattern) => new RegExp('^' + pattern).test(path));

describe('middleware matcher', () => {
  it('never gates the brand icon — browsers fetch it before logging in', () => {
    expect(matches('/icon.svg')).toBe(false);
    expect(matches('/favicon.ico')).toBe(false);
    expect(matches('/_next/static/chunks/main.js')).toBe(false);
  });

  it('still gates every page and API route', () => {
    expect(matches('/dashboard')).toBe(true);
    expect(matches('/skus')).toBe(true);
    expect(matches('/api/skus')).toBe(true);
    expect(matches('/login')).toBe(true); // public-ness is decided in PUBLIC_PATHS
  });
});
