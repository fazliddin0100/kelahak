// nomeklaturalarning arxivga olinganlarini tikish kerak bolgan joy

import { requireApiAuth, isAuthError } from '@/lib/apiAuth';

import { findArchivedNomeklaturaPopulated } from '@/lib/db/nomeklatura';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;

    const province = auth.user.personal?.province;
    if (!province) {
      return NextResponse.json(
        { error: 'Foydalanuvchi viloyati topilmadi' },
        { status: 400 }
      );
    }

    return NextResponse.json(await findArchivedNomeklaturaPopulated(province));
  } catch (error) {
    console.error('Error fetching nomeklatura arxiv:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nomeklatura arxiv' },
      { status: 500 }
    );
  }
}
