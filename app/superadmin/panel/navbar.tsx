'use client';

import InstitutionalNavigation from '@/components/InstitutionalNavigation';
import { clearLegacyAuthStorage } from '@/lib/clientAuthStorage';
import { BookOpen, Building2, FileKey2, LayoutDashboard, LogOut, ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Dispatch, SetStateAction } from 'react';

const NAV = [
  { page: 'dashboard', label: 'Boshqaruv', Icon: LayoutDashboard },
  { page: 'security', label: 'Xavfsizlik', Icon: ShieldAlert },
  { page: 'shahobchalar', label: 'Shahobchalar', Icon: Building2 },
  { page: 'users', label: 'Foydalanuvchilar', Icon: Users },
  { page: 'certificates', label: 'E-IMZO sertifikatlar', Icon: FileKey2 },
  { page: 'guide', label: 'Qo‘llanma', Icon: BookOpen },
] as const;

export default function SuperAdminNavbar({
  page,
  setPage,
}: {
  page: string;
  setPage: Dispatch<SetStateAction<string>>;
}) {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/superadmin/logout', {
      method: 'POST',
      credentials: 'include',
    });
    clearLegacyAuthStorage();
    router.push('/sign-in');
  };

  return (
    <InstitutionalNavigation
      organization="Tizim boshqaruvi"
      role="SuperAdmin"
      activePage={page}
      items={NAV}
      onSelect={setPage}
      profile={
        <>
          <Link
            href="/admin/navbar"
            className="hidden rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-gold hover:text-primary sm:inline-flex">
            Kotibiyat paneli
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <LogOut className="size-3.5" />
            Chiqish
          </button>
        </>
      }
    />
  );
}
