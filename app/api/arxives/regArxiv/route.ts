// nomeklaturalarning arxivga olinganlarini tikish kerak bolgan joy
// api/arxives/regArxiv/route.ts

import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { findArchivedNomeklaturaPopulated } from '@/lib/db/nomeklatura';


import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

        const nomeklaturaArxiv = await findArchivedNomeklaturaPopulated();
    return new NextResponse(JSON.stringify(nomeklaturaArxiv), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching nomeklatura arxiv:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch nomeklatura arxiv' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
