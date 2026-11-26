import { isDeviceRequiredGlobally } from '@/lib/eimzo/device';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

/** E-IMZO kompyuterlari (Mezon agenti orqali birinchi imzoda yozilganlar) */
export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    await connectToDatabase();
    const rows = await prisma.userEimzoDevice.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      select: {
        id: true,
        hostname: true,
        primaryMac: true,
        macs: true,
        diskSerial: true,
        diskModel: true,
        diskSerialReliable: true,
        hardwareKey: true,
        usbSerial: true,
        usbSerialReliable: true,
        usbModel: true,
        publicKeySha256: true,
        status: true,
        createdAt: true,
        lastSeenAt: true,
        revokedAt: true,
        revokedReason: true,
        user: {
          select: {
            id: true,
            auth: { select: { login: true } },
            personal: { select: { fName: true, name: true, sName: true } },
          },
        },
      },
    });
    return NextResponse.json(
      {
        deviceRequiredGlobally: isDeviceRequiredGlobally(),
        devices: rows.map(({ user, ...d }) => ({
          ...d,
          userId: user.id,
          login: user.auth?.login ?? '',
          fullName: [user.personal?.fName, user.personal?.name, user.personal?.sName].filter(Boolean).join(' '),
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('E-IMZO kompyuterlari ro‘yxatida xato:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
