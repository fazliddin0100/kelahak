'use client';

import Buyruq from './(komandir-navbar)/buyruq';
import Chat from './(komandir-navbar)/chat';
import Controlni from './(komandir-navbar)/controlni';
import KelDocument from './(komandir-navbar)/kel-document';
import Nomeklatura from './(komandir-navbar)/nomeklatura';
import Tayyrolangan from './(komandir-navbar)/tayyrolangan';

interface Props {
  page: string;
}

export function KomandirPage({ page }: Props) {
  return (
    <div className="w-full">
      {page === 'tayyrolangan' && <Tayyrolangan />}
      {page === 'kel' && <KelDocument />}
      {page === 'controlni' && <Controlni />}
      {page === 'buyruq' && <Buyruq />}
      {page === 'nomeklatura' && <Nomeklatura />}
      {page === 'chat' && <Chat />}
    </div>
  );
}

export default function KomandirRoutePage() {
  return null;
}
