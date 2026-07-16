'use client';

import LogOutProfile from '@/components/LogOut';
import { cn } from '@/lib/utils';
import { useTashkilot } from '@/hooks/useTashkilot';
import {
  BookMarked,
  CalendarClock,
  FileText,
  Inbox,
  Library,
  MessageCircleMore,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import logo from '../../../public/dxxLogo.png';

interface NavbarKomandirProps {
  setPage?: (value: string) => void;
}

const NAV_ITEMS = [
  { page: 'tayyrolangan', label: 'Hujjat', Icon: FileText },
  { page: 'kel', label: 'Kel/hujjat', Icon: Inbox },
  { page: 'controlni', label: 'Controlni', Icon: CalendarClock },
  { page: 'buyruq', label: 'Buyruq', Icon: BookMarked },
  { page: 'nomeklatura', label: 'Nomeklatura', Icon: Library },
  { page: 'chat', label: 'Chat', Icon: MessageCircleMore },
] as const;

const NavbarKomandir = ({ setPage }: NavbarKomandirProps) => {
  const [activePage, setActivePage] = useState('tayyrolangan');
  const { data } = useTashkilot();

  const handleClick = (page: string) => {
    setActivePage(page);
    setPage?.(page);
  };

  const linkStyle = (page: string) =>
    cn(
      'group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
      'text-slate-300 hover:bg-white/10 hover:text-white',
      activePage === page &&
        'bg-sky-500/15 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]'
    );

  const iconStyle = (page: string) =>
    cn(
      'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200',
      'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200',
      activePage === page && 'bg-sky-500/20 text-sky-300'
    );

  return (
    <div>
      <nav className="fixed top-0 z-50 flex h-[60px] w-full items-center justify-between border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 text-white shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
            <Image
              src={logo}
              alt="logo"
              className="image_navbar360 rounded-sm"
            />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-100 sm:text-base">
              {data?.organ ?
                data.organ.charAt(0).toUpperCase() + data.organ.slice(1)
              : 'Komandir'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Shaxsiy kabinet
            </span>
          </div>
        </div>

        <div className="mx-2 flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-2 scrollbar-thin">
          {NAV_ITEMS.map(({ page, label, Icon }) => (
            <span
              key={page}
              className={linkStyle(page)}
              onClick={() => handleClick(page)}>
              <span className={iconStyle(page)}>
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </span>
          ))}
        </div>

        <div className="shrink-0">
          <LogOutProfile />
        </div>
      </nav>
      <div className="h-[60px]" aria-hidden />
    </div>
  );
};

export default NavbarKomandir;
