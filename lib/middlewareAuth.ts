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
  const sa = req.cookies.get('sa_token')?.value;
  const tok = req.cookies.get('token')?.value;
  const bearer = readBearerToken(req);
  const ref = req.cookies.get('ref_token')?.value;

  if (sa && (!bearer || bearer === sa)) return sa;
  if (tok && (!bearer || bearer === tok)) return tok;
  if (bearer && bearer !== ref) return bearer;
  return sa ?? tok ?? null;
}

/** ref_token — admin panel API chaqiriqlari */
export function readRefToken(req: NextRequest): string | null {
  const ref = req.cookies.get('ref_token')?.value;
  const bearer = readBearerToken(req);
  if (ref) return ref;
  if (bearer && !req.cookies.get('token')?.value && !req.cookies.get('sa_token')?.value) {
    return bearer;
  }
  return null;
}
