// app/api/file/[id]/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId } from '@/lib/db/nomeklatura';
import { decryptDocumentFile } from '@/lib/documentContentEncryption';

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

    const fileDoc = await prisma.file.findUnique({
      where: { id },
      include: { pendingUpload: true },
    });

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

    let encrypted: Buffer;
    let fileName = fileDoc.nomi;
    if (fileDoc.encryptedContent) {
      encrypted = Buffer.from(fileDoc.encryptedContent);
    } else if (fileDoc.pendingUpload) {
      encrypted = await fs.readFile(fileDoc.pendingUpload.storagePath);
    } else if (fileDoc.filePath) {
      const filePath = path.resolve('public', fileDoc.filePath.replace(/^\/+/, ''));
      fileName = path.basename(filePath);
      const legacyBytes = await fs.readFile(filePath);
      return new NextResponse(legacyBytes, {
        headers: {
          'Content-Type': fileDoc.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
          'Cache-Control': 'no-store',
        },
      });
    } else {
      return NextResponse.json({ error: 'Fayl tarkibi topilmadi' }, { status: 404 });
    }
    const buffer = decryptDocumentFile(encrypted);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': fileDoc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store',
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
