import { countSuperAdmins, isBootstrapConfigured } from '@/lib/superadminAuth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hasSuperAdmin = (await countSuperAdmins()) > 0;
    return NextResponse.json({
      hasSuperAdmin,
      needsSetup: !hasSuperAdmin,
      bootstrapConfigured: isBootstrapConfigured(),
    });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
