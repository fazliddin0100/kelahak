import { AUTH_COOKIE } from '@/lib/authCookies';
import { NextRequest } from 'next/server';

export function readBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  return null;
}

/** token / sa_token (cookie yoki mos Bearer) */
export function readMainToken(req: NextRequest): string | null {
  const sa = req.cookies.get(AUTH_COOKIE.superadmin)?.value;
  const tok = req.cookies.get(AUTH_COOKIE.access)?.value;
  const bearer = readBearerToken(req);
  const ref = req.cookies.get(AUTH_COOKIE.admin)?.value;

  if (sa && (!bearer || bearer === sa)) return sa;
  if (tok && (!bearer || bearer === tok)) return tok;
  if (bearer && bearer !== ref) return bearer;
  return sa ?? tok ?? null;
}

/** ref_token — admin panel API chaqiriqlari */
export function readRefToken(req: NextRequest): string | null {
  const ref = req.cookies.get(AUTH_COOKIE.admin)?.value;
  const bearer = readBearerToken(req);
  if (ref) return ref;
  if (bearer && !req.cookies.get(AUTH_COOKIE.access)?.value && !req.cookies.get(AUTH_COOKIE.superadmin)?.value) {
    return bearer;
  }
  return null;
}
