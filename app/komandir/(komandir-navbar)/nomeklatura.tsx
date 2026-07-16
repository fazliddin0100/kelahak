'use client';

import UserNomeklaturaView from '@/components/UserNomeklaturaView';
import {
  SectionShell,
  komandirTdClass,
  komandirThClass,
} from './section-shell';

export default function Nomeklatura() {
  return (
    <UserNomeklaturaView
      Shell={SectionShell}
      thClass={komandirThClass}
      tdClass={komandirTdClass}
    />
  );
}
