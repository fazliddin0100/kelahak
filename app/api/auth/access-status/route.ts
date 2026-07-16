import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { getUserAccessStatus } from '@/lib/userAccess';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const status = await getUserAccessStatus(userId);
    return NextResponse.json(status, { status: 200 });
  } catch {
    return NextResponse.json(
      { approved: false, error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
