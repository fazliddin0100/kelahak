'use client';

import CreateNomeklatura from '@/components/CreateNomeklatura';
import Bolinma from '@/components/bolim-modal';
import BolinmaModal from '@/components/bolinma-modal';
import UserNomeklaturaView from '@/components/UserNomeklaturaView';
import {
  SectionShell,
  adminTdClass,
  adminThClass,
} from './shared';

export default function Nomeklatura() {
  return (
    <UserNomeklaturaView
      Shell={SectionShell}
      thClass={adminThClass}
      tdClass={adminTdClass}
      headerActions={(refetch) => (
        <>
          <Bolinma />
          <BolinmaModal />
          <CreateNomeklatura onSuccess={refetch} />
        </>
      )}
    />
  );
}
