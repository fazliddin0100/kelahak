import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { findDocumentById, isValidDbId, serializeDocumentForApi } from '@/lib/db/document';
import { logAdminAction, loginOf } from '@/lib/auditLog';
import { canHandlePrintRequest } from '@/lib/printRequests';
import { buildDocumentDocx } from '@/lib/documentDocx';
import type { DocumentType } from '@/types/document';

export const runtime = 'nodejs';

/** Tasdiqlangan so'rov bo'yicha hujjatni barcha rekvizitlari bilan Word (.docx) qilib berish */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const req = isValidDbId(id) ? await prisma.printRequest.findUnique({ where: { id } }) : null;
    if (
      !req ||
      !canHandlePrintRequest(req, {
        userId: auth.userId,
        role: auth.role,
        province: auth.user.personal?.province,
      })
    ) {
      return NextResponse.json({ message: 'So‘rov topilmadi' }, { status: 404 });
    }
    if (req.status !== 'approved') {
      return NextResponse.json({ message: 'Avval so‘rovni tasdiqlang' }, { status: 409 });
    }

    const document = await findDocumentById(req.documentId, { includeContent: true });
    if (!document) return NextResponse.json({ message: 'Hujjat topilmadi' }, { status: 404 });
    const doc = serializeDocumentForApi(document, {
      includeContent: true,
      populateAttachments: false,
    }) as unknown as DocumentType;

    const p = auth.user.personal;
    const printedBy = p ? `${p.fName} ${p.name} ${p.sName}`.trim() : await loginOf(auth.userId);
    const buffer = await buildDocumentDocx(doc, { printedBy, requestId: req.id });

    await prisma.printRequest.update({
      where: { id },
      data: { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
    });
    await logAdminAction(request, auth.userId, `Hujjat Word'ga yuklandi: so'rov ${id}, hujjat ${req.documentId}`);

    const base = `hujjat-${document.registrationIndex ?? document.id.slice(-6)}`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${base}.docx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Word faylini yaratishda xato:', error);
    return NextResponse.json({ message: 'Word faylini yaratib bo‘lmadi' }, { status: 500 });
  }
}
