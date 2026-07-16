'use client';

import { useState } from 'react';
import NavbarKomandir from './(komandir-navbar)/navbar';
import { KomandirPage } from './page';

const KomandirLayout = () => {
  const [page, setPage] = useState('tayyrolangan');

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <NavbarKomandir setPage={setPage} />
      <main className="w-full">
        <KomandirPage page={page} />
      </main>
    </div>
  );
};

export default KomandirLayout;
