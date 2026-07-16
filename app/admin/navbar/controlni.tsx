'use client';

import { CalendarClock } from 'lucide-react';
import { PlaceholderPage } from './shared';

const TimeFileControl = () => (
  <PlaceholderPage
    title="Muddatli hujjatlar"
    description="Muddatli va nazorat ostidagi hujjatlar ro‘yxati"
    icon={CalendarClock}
    iconClassName="bg-amber-500/10 text-amber-600"
  />
);

export default TimeFileControl;
