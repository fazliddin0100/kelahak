// app/api/file/[id]/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId } from '@/lib/db/nomeklatura';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user } = auth;

    await connectToDatabase();

    const { id } = await params;

    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ error: 'Noto‘g‘ri ID' }, { status: 400 });
    }

    const fileDoc = await prisma.file.findUnique({ where: { id } });

    if (!fileDoc) {
      return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 404 });
    }

    const isOwner = fileDoc.userUploadId === userId;
    const isAdminInRegion =
      role === 'admin' && user.personal?.province === fileDoc.ownerRegion;
    const isSuperAdmin = role === 'superAdmin';

    if (!isOwner && !isAdminInRegion && !isSuperAdmin) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
    }

    const filePath = path.resolve(
      'public',
      fileDoc.filePath.replace(/^\/+/, '')
    );
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          path.basename(filePath)
        )}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Server xatosi: ' + message },
      { status: 500 }
    );
  }
}
