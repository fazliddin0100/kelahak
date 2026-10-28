'use client';

import LogOutProfile from '@/components/LogOut';
import InstitutionalNavigation from '@/components/InstitutionalNavigation';
import { useTashkilot } from '@/hooks/useTashkilot';
import { Archive, BookMarked, CalendarClock, ClipboardList, Library, MessageCircleMore, Users } from 'lucide-react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface NavbarAdminProps {
  setPage?: Dispatch<SetStateAction<string>>;
}

const NAV_ITEMS = [
  { page: 'nomeklatura', label: 'Nomeklatura', Icon: Library },
  { page: 'orders', label: 'Buyruqlar', Icon: BookMarked },
  { page: 'arxiv', label: 'Arxiv', Icon: Archive },
  { page: 'users', label: 'Foydalanuvchilar', Icon: Users },
  { page: 'timeFileControl', label: 'Muddatli hujjatlar', Icon: CalendarClock },
  { page: 'test', label: 'Test savollari', Icon: ClipboardList },
  { page: 'chat', label: 'Chat', Icon: MessageCircleMore },
] as const;

const NavbarAdmin = ({ setPage }: NavbarAdminProps) => {
  const [activePage, setActivePage] = useState('nomeklatura');
  const { data } = useTashkilot();

  const handleClick = (page: string) => {
    setActivePage(page);
    setPage?.(page);
  };

  return (
    <InstitutionalNavigation
      organization={data?.organ}
      role="Tashkilot boshqaruvi"
      activePage={activePage}
      items={NAV_ITEMS}
      onSelect={handleClick}
      profile={<LogOutProfile />}
    />
  );
};

export default NavbarAdmin;
