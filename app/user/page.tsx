'use client';

import Buyruq from './(navbar)/buyruq';
import Chat from './(navbar)/chat';
import Controlni from './(navbar)/controlni';
import File from './(navbar)/file';
import KelDocument from './(navbar)/kel-document';
import Nomeklatura from './(navbar)/nomeklatura';

interface Props {
  page: string;
}

export function UserPage({ page }: Props) {
  return (
    <div className="w-full">
      {page === 'file' && <File />}
      {page === 'kel' && <KelDocument />}
      {page === 'nomeklatura' && <Nomeklatura />}
      {page === 'controlni' && <Controlni />}
      {page === 'buyruq' && <Buyruq />}
      {page === 'chat' && <Chat />}
    </div>
  );
}

export default function UserRoutePage() {
  return null;
}
