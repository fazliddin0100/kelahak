'use client';

import LogOutProfile from '@/components/LogOut';
import InstitutionalNavigation from '@/components/InstitutionalNavigation';
import { useTashkilot } from '@/hooks/useTashkilot';
import { BookMarked, CalendarClock, FileText, Inbox, Library, MessageCircleMore } from 'lucide-react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface NavbarKomandirProps {
  setPage?: Dispatch<SetStateAction<string>>;
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

  return (
    <InstitutionalNavigation
      organization={data?.organ}
      role="Rahbar kabineti"
      activePage={activePage}
      items={NAV_ITEMS}
      onSelect={handleClick}
      profile={<LogOutProfile />}
    />
  );
};

export default NavbarKomandir;
