'use client';

import { useState } from 'react';
import NavbarAdmin from './navbar';
import { AdminPage } from './page';

const AdminNavbarLayout = () => {
  const [page, setPage] = useState('nomeklatura');

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <NavbarAdmin setPage={setPage} />
      <main className="w-full">
        <AdminPage page={page} />
      </main>
    </div>
  );
};

export default AdminNavbarLayout;
