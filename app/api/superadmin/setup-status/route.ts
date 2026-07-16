import { countSuperAdmins, getBootstrapKey } from '@/lib/superadminAuth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const total = await countSuperAdmins();
    return NextResponse.json({
      hasSuperAdmin: total > 0,
      superAdminCount: total,
      bootstrapConfigured: Boolean(getBootstrapKey()),
      needsBootstrap: total === 0,
    });
  } catch {
    return NextResponse.json(
      { message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
