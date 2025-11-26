'use client';

import Buyruq from './(navbar)/buyruq';
import Chat from './(navbar)/chat';
import Controlni from './(navbar)/controlni';
import File from './(navbar)/file';
import Jurnal from './(navbar)/jurnal';
import KelDocument from './(navbar)/kel-document';
import Nomeklatura from './(navbar)/nomeklatura';

interface Props {
  page: string;
}

const KotibiyatPage = ({ page }: Props) => {
  return (
    <>
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

export default KotibiyatPage;
