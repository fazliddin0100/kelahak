// app/api/tashkilot/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/prisma';

export async function GET(request: NextRequest) {
  await connectToDatabase();
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.job) {
      return NextResponse.json({ error: 'Job topilmadi' }, { status: 404 });
    }

    return NextResponse.json({ organ: user.job.organ }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 }
    );
  }
}
