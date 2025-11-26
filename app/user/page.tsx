'use client';

import { useState } from 'react';
import Buyruq from './(navbar)/buyruq';
import Chat from './(navbar)/chat';
import Controlni from './(navbar)/controlni';
import File from './(navbar)/file';
import Jurnal from './(navbar)/jurnal';
import KelDocument from './(navbar)/kel-document';
import Nomeklatura from './(navbar)/nomeklatura';
import NavbarUser from './(navbar)/navbar';

const UserLayout = () => {
  const [page, setPage] = useState<string>('file');

  return (
    <>
      <div className="flex flex-col items-center justify-center font-bold text-[25px] gap-y-4">
        <div className="w-full">
          <NavbarUser setPage={setPage} organ={''} />
        </div>
        <div>{page}</div>
      </div>
      {/* Content */}
      <div className="w-full">
        {page === 'file' && <File />}
        {page === 'kel' && <KelDocument />}
        {page === 'jurnal' && <Jurnal />}
        {page === 'nomeklatura' && <Nomeklatura />}
        {page === 'controlni' && <Controlni />}
        {page === 'buyruq' && <Buyruq />}
        {page === 'chat' && <Chat />}
      </div>
    </>
  );
};

export default UserLayout;
