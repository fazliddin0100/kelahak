// app/api/something/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiAuth(req);
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    const person =
      user.personal ?
        { ...user.personal, _id: user.personal.id }
      : null;

    return NextResponse.json({ person }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: 'Tokenni tekshirishda xato' },
      { status: 500 }
    );
  }
}
