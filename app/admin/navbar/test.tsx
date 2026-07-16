'use client';

import { ClipboardList } from 'lucide-react';
import { PlaceholderPage } from './shared';

const TestQuestions = () => (
  <PlaceholderPage
    title="Test savollari"
    description="Test savollari va javoblarni boshqarish"
    icon={ClipboardList}
    iconClassName="bg-emerald-500/10 text-emerald-600"
  />
);

export default TestQuestions;
