import { authLoginExistsRaw } from '@/lib/db/user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const login = request.nextUrl.searchParams.get('login');
  if (!login) return NextResponse.json({ exists: false });

  const exists = await authLoginExistsRaw(login);
  return NextResponse.json({ exists });
}
