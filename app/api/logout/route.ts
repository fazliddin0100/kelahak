import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from '@/lib/authTokens';
import { readRequestIdentity } from '@/lib/userid';
import { finalizeUserSession } from '@/lib/sessionFiles';

export async function POST(request: NextRequest) {
    const identity = readRequestIdentity(request);
    if (identity?.sessionId) await finalizeUserSession(identity.sessionId);
    return clearAuthCookies(NextResponse.json({ success: true }));
}
