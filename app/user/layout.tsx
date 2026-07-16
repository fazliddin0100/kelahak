'use client';

import { useState } from 'react';
import NavbarUser from './(navbar)/navbar';
import { UserPage } from './page';

const UserPanelLayout = () => {
  const [page, setPage] = useState('file');

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <NavbarUser setPage={setPage} />
      <main className="w-full">
        <UserPage page={page} />
      </main>
    </div>
  );
};

export default UserPanelLayout;
