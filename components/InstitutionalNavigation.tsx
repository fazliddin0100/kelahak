'use client';

import Image from 'next/image';
import type { Dispatch, ReactNode } from 'react';
import { ChevronsLeft, ChevronsRight, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import logo from '../public/mexon-mark.png';

export interface InstitutionalNavItem {
  page: string;
  label: string;
  Icon: LucideIcon;
}

interface InstitutionalNavigationProps {
  organization?: string;
  role: string;
  activePage: string;
  items: readonly InstitutionalNavItem[];
  onSelect: Dispatch<string>;
  profile?: ReactNode;
}

export default function InstitutionalNavigation({
  organization,
  role,
  activePage,
  items,
  onSelect,
  profile,
}: InstitutionalNavigationProps) {
  const organizationName = organization?.trim() || 'Mezon';
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      '--institutional-nav-width',
      isCollapsed ? '4.5rem' : '16rem'
    );

    return () => {
      root.style.removeProperty('--institutional-nav-width');
    };
  }, [isCollapsed]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#102c50] p-1.5">
            <Image src={logo} alt="Mezon" width={56} height={36} className="size-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">{organizationName}</p>
            <p className="truncate text-xs text-slate-500">{role}</p>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">{profile}</div>
      </header>

      <div className="h-16" aria-hidden="true" />

      <aside className={`fixed bottom-0 left-0 top-16 z-40 hidden border-r border-slate-200 bg-white transition-[width] duration-200 md:flex md:flex-col ${isCollapsed ? 'w-[4.5rem]' : 'w-64'}`}>
        <div className={`flex items-center pb-2 pt-5 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {!isCollapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Ish bo‘limlari
            </span>
          )}
          <button
            type="button"
            aria-label={isCollapsed ? 'Yon menyuni ochish' : 'Yon menyuni yopish'}
            aria-expanded={!isCollapsed}
            aria-controls="institutional-sidebar-nav"
            title={isCollapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish'}
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#102c50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a75b]">
            {isCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
        <nav id="institutional-sidebar-nav" aria-label="Asosiy navigatsiya" className={`flex flex-col gap-1 py-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {items.map(({ page, label, Icon }) => {
            const active = activePage === page;
            return (
              <button
                key={page}
                type="button"
                aria-current={active ? 'page' : undefined}
                title={isCollapsed ? label : undefined}
                onClick={() => onSelect(page)}
                className={`group flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a75b] ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left'} ${
                  active
                    ? 'bg-[#edf2f8] text-[#102c50] shadow-[inset_3px_0_0_#c7a75b]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#102c50]'
                }`}>
                <Icon className={`size-[18px] shrink-0 ${active ? 'text-[#102c50]' : 'text-slate-400 group-hover:text-[#102c50]'}`} strokeWidth={1.9} />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-slate-100 px-3 py-3 text-center text-[10px] leading-5 text-slate-400">
          {!isCollapsed && 'Rasmiy elektron hujjat aylanishi'}
        </div>
      </aside>

      <nav aria-label="Asosiy navigatsiya" className="sticky top-16 z-40 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
        {items.map(({ page, label, Icon }) => {
          const active = activePage === page;
          return (
            <button
              key={page}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect(page)}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a75b] ${
                active ? 'bg-[#edf2f8] text-[#102c50]' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <Icon className="size-4" strokeWidth={1.9} />
              {label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
