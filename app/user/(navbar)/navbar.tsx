'use client';

import LogOutProfile from '@/components/LogOut';
import InstitutionalNavigation from '@/components/InstitutionalNavigation';
import { useTashkilot } from '@/hooks/useTashkilot';
import { BookMarked, CalendarClock, FileText, Inbox, Library, MessageCircleMore } from 'lucide-react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface NavbarUserProps {
  setPage?: Dispatch<SetStateAction<string>>;
}

const NAV_ITEMS = [
  { page: 'file', label: 'Hujjat', Icon: FileText },
  { page: 'kel', label: 'Kel/hujjat', Icon: Inbox },
  { page: 'nomeklatura', label: 'Nomeklatura', Icon: Library },
  { page: 'controlni', label: 'Controlni', Icon: CalendarClock },
  { page: 'buyruq', label: 'Buyruq', Icon: BookMarked },
  { page: 'chat', label: 'Chat', Icon: MessageCircleMore },
] as const;

const NavbarUser = ({ setPage }: NavbarUserProps) => {
  const [activePage, setActivePage] = useState('file');
  const { data } = useTashkilot();

  const handleClick = (page: string) => {
    setActivePage(page);
    setPage?.(page);
  };

  return (
    <InstitutionalNavigation
      organization={data?.organ}
      role="Foydalanuvchi kabineti"
      activePage={activePage}
      items={NAV_ITEMS}
      onSelect={handleClick}
      profile={<LogOutProfile />}
    />
  );
};

export default NavbarUser;
