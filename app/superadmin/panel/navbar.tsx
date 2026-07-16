'use client';

import { cn } from '@/lib/utils';
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import logo from '../../../public/dxxLogo.png';

const NAV = [
  { id: 'dashboard', label: 'Boshqaruv', Icon: LayoutDashboard },
  { id: 'security', label: 'Xavfsizlik', Icon: ShieldAlert },
  { id: 'users', label: 'Foydalanuvchilar', Icon: Users },
  { id: 'guide', label: 'Qo‘llanma', Icon: BookOpen },
] as const;

export default function SuperAdminNavbar({
  page,
  setPage,
}: {
  page: string;
  setPage: (p: string) => void;
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

  const linkClass = (id: string) =>
    cn(
      'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
      'text-slate-300 hover:bg-white/10 hover:text-white',
      page === id &&
        'bg-violet-500/20 text-violet-200 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.4)]'
    );

  return (
    <div>
      <nav className="fixed top-0 z-50 flex h-[60px] w-full items-center justify-between border-b border-violet-900/40 bg-gradient-to-r from-slate-950 via-violet-950 to-slate-900 px-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/20 ring-1 ring-violet-400/30">
            <Shield className="size-5 text-violet-300" />
          </div>
          <div>
            <span className="block text-sm font-semibold">SuperAdmin</span>
            <span className="text-[10px] uppercase tracking-wider text-violet-300/80">
              Tizim boshqaruvi
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={linkClass(id)}
              onClick={() => setPage(id)}>
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/navbar"
            className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 sm:inline">
            Kotibiyat paneli
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20">
            <LogOut className="size-3.5" />
            Chiqish
          </button>
          <Image
            src={logo}
            alt=""
            width={32}
            height={32}
            className="rounded-sm opacity-80"
          />
        </div>
      </nav>
      <div className="h-[60px]" aria-hidden />
    </div>
  );
}
