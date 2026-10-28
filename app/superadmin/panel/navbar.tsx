'use client';

import InstitutionalNavigation from '@/components/InstitutionalNavigation';
import { BookOpen, LayoutDashboard, LogOut, ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Dispatch, SetStateAction } from 'react';

const NAV = [
  { page: 'dashboard', label: 'Boshqaruv', Icon: LayoutDashboard },
  { page: 'security', label: 'Xavfsizlik', Icon: ShieldAlert },
  { page: 'users', label: 'Foydalanuvchilar', Icon: Users },
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
    localStorage.removeItem('sa_token');
    localStorage.removeItem('token');
    localStorage.removeItem('ref_token');
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
            className="hidden rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#c7a75b] hover:text-[#102c50] sm:inline-flex">
            Kotibiyat paneli
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#102c50] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#173c68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a75b]">
            <LogOut className="size-3.5" />
            Chiqish
          </button>
        </>
      }
    />
  );
}
