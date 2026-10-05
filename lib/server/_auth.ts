/**
 * Shared session helpers for the shared-password auth layer.
 *
 * This module is imported by BOTH the Edge middleware and the Node route
 * handlers, so it must stay dependency-free: Web Crypto only (no `node:crypto`,
 * no mongoose, no Buffer).
 *
 * Session token = base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * The payload only carries an expiry, so a leaked token cannot be forged
 * forward without AUTH_SECRET, and it carries no user data.
 */

export const SESSION_COOKIE = 'substor_session';

/** Sessions last 7 days, then the user must sign in again. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

/** App password, or null when unset (the app fails closed). */
export function getPassword(): string | null {
  const password = process.env.AUTH_PASSWORD;
  return password && password.length > 0 ? password : null;
}

/** HMAC signing secret, or null when unset (the app fails closed). */
export function getSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Return type is inferred (not annotated `Uint8Array`) so the value keeps its
// concrete `ArrayBuffer` backing, which `crypto.subtle.verify` requires.
function fromBase64Url(value: string) {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Create a signed session token that expires in SESSION_TTL_MS. */
export async function createSessionToken(secret: string): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }))
  );
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify signature and expiry. Returns false when the token is missing,
 * malformed, tampered with, expired — or when AUTH_SECRET is not configured,
 * so a misconfigured deployment denies access instead of allowing it.
 */
export async function isSessionTokenValid(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const separator = token.indexOf('.');
  if (separator <= 0 || separator === token.length - 1) return false;
  const payload = token.slice(0, separator);
  const signature = fromBase64Url(token.slice(separator + 1));
  if (!signature) return false;

  const key = await hmacKey(secret);
  const signatureOk = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(payload)
  );
  if (!signatureOk) return false;

  const decoded = fromBase64Url(payload);
  if (!decoded) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(decoded)) as { exp?: number };
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison so a password guess cannot be timed
 * byte-by-byte. Length differences are absorbed rather than short-circuited.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length, 1);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/** Cookie attributes shared by login (set) and logout (clear). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}
