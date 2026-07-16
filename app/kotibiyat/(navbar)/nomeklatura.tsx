'use client';

import UserNomeklaturaView from '@/components/UserNomeklaturaView';
import {
  SectionShell,
  kotibiyatTdClass,
  kotibiyatThClass,
} from './section-shell';

export default function Nomeklatura() {
  return (
    <UserNomeklaturaView
      Shell={SectionShell}
      thClass={kotibiyatThClass}
      tdClass={kotibiyatTdClass}
    />
  );
}
