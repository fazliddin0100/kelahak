'use client';

import Image from 'next/image';
import logo from '../../../public/dxxLogo.png';
import {
  BookMarked,
  CalendarClock,
  FileDown,
  FileText,
  Library,
  MessageCircleMore,
} from 'lucide-react';
import { useState } from 'react';

// pages
import { useTashkilot } from '@/hooks/useTashkilot';
import LogOutProfile from '@/components/LogOut';

interface NavbarUserProps {
  setPage?: (page: string) => void;
  organ: string;
}

const NavbarUser = ({ setPage }: NavbarUserProps) => {
  const [activePage, setActivePage] = useState('file');
  const { data } = useTashkilot();

  const handleClick = (page: string) => {
    setActivePage(page);
    if (setPage) {
      setPage(page);
    }
  };

  const linkStyle = (page: string) =>
    `cursor-pointer flex flex-row items-center px-1 
        hover:text-gray-300 transition 
        ${
          activePage === page
            ? 'text-blue-400 border-b-2 border-blue-400 font-semibold'
            : ''
        }`;

  return (
    <div>
      {/* Navbar */}
      <nav className="flex flex-row justify-between items-center w-full p-2 bg-gray-700 text-white fixed top-0 z-100 text-[16px]">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="logo" className="image_navbar360" />
          <span>
            {data?.organ
              ? data.organ.charAt(0).toUpperCase() + data.organ.slice(1)
              : ''}
          </span>
        </div>
        <div className="flex items-center gap-6 text-[17px]">
          <span
            className={linkStyle('file')}
            onClick={() => handleClick('file')}>
            <FileText className="mr-2" /> Hujjat
          </span>

          <span className={linkStyle('kel')} onClick={() => handleClick('kel')}>
            <FileDown className="mr-2" /> Kel/hujjat
          </span>

          <span
            className={linkStyle('nomeklatura')}
            onClick={() => handleClick('nomeklatura')}>
            <Library className="mr-2" /> Nomeklatura
          </span>

          <span
            className={linkStyle('controlni')}
            onClick={() => handleClick('controlni')}>
            <CalendarClock className="mr-2" /> Controlni
          </span>

          <span
            className={linkStyle('buyruq')}
            onClick={() => handleClick('buyruq')}>
            <BookMarked className="mr-2" /> Buyruq
          </span>

          <span
            className={linkStyle('chat')}
            onClick={() => handleClick('chat')}>
            <MessageCircleMore className="mr-2" /> Chat
          </span>
        </div>

        <div>
          <LogOutProfile />
        </div>
      </nav>
    </div>
  );
};

export default NavbarUser;
