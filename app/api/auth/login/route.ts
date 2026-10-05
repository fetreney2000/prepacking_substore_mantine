import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  createSessionToken,
  getPassword,
  getSecret,
  sessionCookieOptions,
  timingSafeEqual,
} from '@/lib/server/_auth';
import { badRequest, parseBody, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Small pause after a wrong password to slow down scripted guessing. */
const FAILED_ATTEMPT_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const password = getPassword();
    const secret = getSecret();
    if (!password || !secret) {
      return NextResponse.json(
        {
          error:
            'Konfigurasi keselamatan tiada. Tetapkan AUTH_PASSWORD dan AUTH_SECRET ' +
            '(Vercel: Project Settings > Environment Variables).',
        },
        { status: 500 }
      );
    }

    const body = await parseBody<{ password?: string }>(req);
    if (body === null) return badRequest('Format JSON tidak sah');

    if (!timingSafeEqual(body.password ?? '', password)) {
      await delay(FAILED_ATTEMPT_DELAY_MS);
      return NextResponse.json({ error: 'Kata laluan salah' }, { status: 401 });
    }

    const token = await createSessionToken(secret);
    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    return serverError(err);
  }
}
