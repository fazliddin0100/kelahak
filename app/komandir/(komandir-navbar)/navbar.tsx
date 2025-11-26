'use client';

import logo from '@/public/dxxLogo.png';
import { useTashkilot } from '@/hooks/useTashkilot';
import Image from 'next/image';
import LogOutProfile from '@/components/LogOut';
import { useState } from 'react';
import {
  BookMarked,
  CalendarClock,
  FileDown,
  FileText,
  MessageCircleMore,
} from 'lucide-react';

interface NavbarKomandirProps {
  setPage?: (value: string) => void;
}

const NavbarKomandir = ({ setPage }: NavbarKomandirProps) => {
  const { data } = useTashkilot();
  const [activePage, setActivePage] = useState('tayyrolangan');

  const handleClick = (page: string) => {
    setActivePage(page);
    setPage?.(page);
  };

  const linkClasses = (page: string) =>
    `cursor-pointer flex flex-row items-center px-1 hover:text-gray-300 transition 
     ${
       activePage === page
         ? 'text-blue-400 border-b-2 border-blue-400 font-semibold'
         : ''
     }`;

  return (
    <>
      <div className="flex flex-row justify-between items-center w-full p-2 bg-gray-700 text-white fixed top-0 z-100 text-[16px]">
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
            className={linkClasses('tayyrolangan')}
            onClick={() => handleClick('tayyrolangan')}>
            <FileText className="mr-2" /> Hujjat
          </span>

          <span
            className={linkClasses('kel')}
            onClick={() => handleClick('kel')}>
            <FileDown className="mr-2" /> Kel/hujjat
          </span>

          <span
            className={linkClasses('controlni')}
            onClick={() => handleClick('controlni')}>
            <CalendarClock className="mr-2" /> Controlni
          </span>

          <span
            className={linkClasses('buyruq')}
            onClick={() => handleClick('buyruq')}>
            <BookMarked className="mr-2" /> Buyruq
          </span>

          <span
            className={linkClasses('chat')}
            onClick={() => handleClick('chat')}>
            <MessageCircleMore className="mr-2" /> Chat
          </span>
        </div>

        <LogOutProfile />
      </div>
    </>
  );
};

export default NavbarKomandir;
