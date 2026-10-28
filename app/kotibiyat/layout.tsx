'use client';

import { useState } from 'react';
import NavbarKotibiyat from './(navbar)/navbar';
import { KotibiyatPage } from './KotibiyatPage';

const KotibiyatLayout = () => {
  const [page, setPage] = useState('file');

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <NavbarKotibiyat setPage={setPage} organ="" />
      <main className="institutional-content min-h-screen w-full">
        <KotibiyatPage page={page} />
      </main>
    </div>
  );
};

export default KotibiyatLayout;
