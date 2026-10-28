import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { readRequestIdentity } from '@/lib/userid';
import { finalizeUserSession } from '@/lib/sessionFiles';

export async function POST(request: NextRequest) {
  const identity = readRequestIdentity(request);
  if (identity?.sessionId) await finalizeUserSession(identity.sessionId);
  const response = NextResponse.json({ success: true });
  response.cookies.delete('sa_token');
  response.cookies.delete('token');
  response.cookies.delete('ref_token');
  return response;
}
