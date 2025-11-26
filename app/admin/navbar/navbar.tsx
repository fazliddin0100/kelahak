'use client';

import Image from 'next/image';
import logo from '@/public/dxxLogo.png';
import { useState } from 'react';
import { useTashkilot } from '@/hooks/useTashkilot';

import { IoBookOutline } from 'react-icons/io5';
import { FaJournalWhills, FaUsers } from 'react-icons/fa';
import { RiBookShelfLine } from 'react-icons/ri';
import { LuFileClock } from 'react-icons/lu';
import { SiTestcafe } from 'react-icons/si';
// React komponenti
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserSecret } from '@fortawesome/free-solid-svg-icons';

// Pages
import Nomeklatura from './nomeklatura';
import Buyruq from './buyruq';
import Arxiv from './arxiv';
import Users from './users';
import TimeFileControl from './controlni';
import TestQuestions from './test';
import Chat from './chat';
import { MessageSquareText } from 'lucide-react';
import WafAdminPage from '../waf/page';
import LogOutProfile from '@/components/LogOut';

const NavbarAdmin = () => {
  const { data } = useTashkilot();
  const [activePage, setActivePage] = useState('nomeklatura');

  const handleClick = (page: string) => {
    setActivePage(page);
  };

  const linkStyle = (page: string) =>
    `cursor-pointer flex items-center px-2 py-1 
     hover:text-gray-300 transition 
     ${
       activePage === page
         ? 'text-blue-400 border-b-2 border-blue-400 font-semibold'
         : ''
     }`;

  return (
    <div>
      {/* Navbar */}
      <nav className="flex flex-row justify-between items-center w-full p-2 bg-gray-900 text-white fixed top-0 z-50">
        <div className="flex items-center gap-2">
          <Image
            src={logo}
            alt="logo"
            className="rounded-md image_navbar360"
            width={45}
            height={45}
          />
          <span className="font-semibold">
            {data?.organ
              ? data.organ.charAt(0).toUpperCase() + data.organ.slice(1)
              : ''}
          </span>
        </div>

        <div className="flex items-center gap-6 text-[16px]">
          <span
            className={linkStyle('nomeklatura')}
            onClick={() => handleClick('nomeklatura')}>
            <IoBookOutline className="mr-2" /> Nomeklatura
          </span>

          <span
            className={linkStyle('orders')}
            onClick={() => handleClick('orders')}>
            <FaJournalWhills className="mr-2" /> Buyruqlar
          </span>

          <span
            className={linkStyle('arxiv')}
            onClick={() => handleClick('arxiv')}>
            <RiBookShelfLine className="mr-2" /> Arxiv
          </span>

          <span
            className={linkStyle('users')}
            onClick={() => handleClick('users')}>
            <FaUsers className="mr-2" /> Foydalanuvchilar
          </span>

          <span
            className={linkStyle('timeFileControl')}
            onClick={() => handleClick('timeFileControl')}>
            <LuFileClock className="mr-2" /> Muddatli hujjatlar
          </span>

          <span
            className={linkStyle('test')}
            onClick={() => handleClick('test')}>
            <SiTestcafe className="mr-2" /> Test savollari
          </span>

          <span
            className={linkStyle('chat')}
            onClick={() => handleClick('chat')}>
            <MessageSquareText className="mr-2" size={20} /> Chat
          </span>

          <span className={linkStyle('waf')} onClick={() => handleClick('waf')}>
            <span onClick={() => handleClick('waf')}>
              <FontAwesomeIcon icon={faUserSecret} /> Ip-blocker
            </span>
            Ip-blocker
          </span>
        </div>

        <LogOutProfile />
      </nav>

      {/* Content */}
      <div className="p-4 mt-16 ">
        {activePage === 'nomeklatura' && <Nomeklatura />}
        {activePage === 'orders' && <Buyruq />}
        {activePage === 'arxiv' && <Arxiv />}
        {activePage === 'users' && <Users />}
        {activePage === 'timeFileControl' && <TimeFileControl />}
        {activePage === 'test' && <TestQuestions />}
        {activePage === 'chat' && <Chat />}
        {activePage === 'waf' && <WafAdminPage />}
      </div>
    </div>
  );
};

export default NavbarAdmin;
