'use client';

import UserNomeklaturaView from '@/components/UserNomeklaturaView';
import {
  SectionShell,
  userTdClass,
  userThClass,
} from './section-shell';

export default function Nomeklatura() {
  return (
    <UserNomeklaturaView
      Shell={SectionShell}
      thClass={userThClass}
      tdClass={userTdClass}
    />
  );
}
