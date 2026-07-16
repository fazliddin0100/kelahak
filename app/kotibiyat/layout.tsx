'use client';

import { useState } from 'react';
import NavbarKotibiyat from './(navbar)/navbar';
import { KotibiyatPage } from './page';

const KotibiyatLayout = () => {
  const [page, setPage] = useState('file');

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <NavbarKotibiyat setPage={setPage} organ="" />
      <main className="w-full">
        <KotibiyatPage page={page} />
      </main>
    </div>
  );
};

export default KotibiyatLayout;
