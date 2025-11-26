'use client';

import { useState } from 'react';
import NavbarKomandir from './(komandir-navbar)/navbar';

import Tayyrolangan from './(komandir-navbar)/tayyrolangan';
import KelDocument from './(komandir-navbar)/kel-document';
import Controlni from './(komandir-navbar)/controlni';
import Buyruq from './(komandir-navbar)/buyruq';
import Chat from './(komandir-navbar)/chat';

const ComandirPage = () => {
  const [page, setPage] = useState<string>('tayyrolangan');

  return (
    <>
      <NavbarKomandir setPage={setPage} />

      {/* Navbar fixed bo‘lgani uchun tepaga joy bo‘shatamiz */}
      <div className="mt-[60px]">
        {page === 'tayyrolangan' && <Tayyrolangan />}
        {page === 'kel' && <KelDocument />}
        {page === 'controlni' && <Controlni />}
        {page === 'buyruq' && <Buyruq />}
        {page === 'chat' && <Chat />}
      </div>
    </>
  );
};

export default ComandirPage;
