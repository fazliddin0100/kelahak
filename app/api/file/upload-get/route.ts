import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { serializeFile } from '@/lib/db/file';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request, { roles: ['admin'] });
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const files = await prisma.file.findMany({
      where: { ownerRegion: user.personal.province },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(files.map(serializeFile));
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
