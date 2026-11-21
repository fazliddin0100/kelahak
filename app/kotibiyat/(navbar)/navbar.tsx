'use client';

import UserProfile from '@/components/UserProfile';
import InstitutionalNavigation from '@/components/InstitutionalNavigation';
import { useTashkilot } from '@/hooks/useTashkilot';
import { BookMarked, CalendarClock, FileText, Inbox, Library, MessageCircleMore, NotebookPen, Printer } from 'lucide-react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface NavbarKotibiyatProps {
  setPage?: Dispatch<SetStateAction<string>>;
  organ: string;
}

const NAV_ITEMS = [
  { page: 'file', label: 'Hujjat', Icon: FileText },
  { page: 'kel', label: 'Ro‘yxatga olish', Icon: Inbox },
  { page: 'jurnal', label: 'Jurnal', Icon: NotebookPen },
  { page: 'nomeklatura', label: 'Nomeklatura', Icon: Library },
  { page: 'controlni', label: 'Nazorat', Icon: CalendarClock },
  { page: 'buyruq', label: 'Buyruq', Icon: BookMarked },
  { page: 'chat', label: 'Chat', Icon: MessageCircleMore },
  { page: 'print', label: 'Chop etish', Icon: Printer },
] as const;

const NavbarKotibiyat = ({ setPage, organ }: NavbarKotibiyatProps) => {
  const [activePage, setActivePage] = useState('file');
  const { data } = useTashkilot();

  const handleClick = (page: string) => {
    setActivePage(page);
    setPage?.(page);
  };

  return (
    <InstitutionalNavigation
      organization={data?.organ || organ}
      role="Kotibiyat"
      activePage={activePage}
      items={NAV_ITEMS}
      onSelect={handleClick}
      profile={<UserProfile />}
    />
  );
};

export default NavbarKotibiyat;
