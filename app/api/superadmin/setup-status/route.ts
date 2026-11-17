import { countSuperAdmins, getBootstrapKey } from '@/lib/superadminAuth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hasSuperAdmin = (await countSuperAdmins()) > 0;
    return NextResponse.json({
      hasSuperAdmin,
      bootstrapConfigured: Boolean(getBootstrapKey()),
      needsBootstrap: !hasSuperAdmin,
    });
  } catch {
    return NextResponse.json(
      { message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
