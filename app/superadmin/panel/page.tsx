'use client';

import { useState } from 'react';
import SuperAdminNavbar from './navbar';
import SuperAdminDashboard from './dashboard';
import SuperAdminUsers from './users';
import SuperAdminGuide from './guide';
import SuperAdminSecurity from './security';

export default function SuperAdminPanelPage() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50">
      <SuperAdminNavbar page={page} setPage={setPage} />
      <main className="institutional-content min-h-screen w-full">
        {page === 'dashboard' && <SuperAdminDashboard />}
        {page === 'security' && <SuperAdminSecurity />}
        {page === 'users' && <SuperAdminUsers />}
        {page === 'guide' && <SuperAdminGuide />}
      </main>
    </div>
  );
}
