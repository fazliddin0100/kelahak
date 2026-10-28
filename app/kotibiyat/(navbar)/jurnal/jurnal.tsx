'use client';

import { cn } from '@/lib/utils';
import {
  FileEdit,
  FileStack,
  Inbox,
  NotebookPen,
} from 'lucide-react';
import { useState } from 'react';
import Forma3 from './forma-3';
import Forma6 from './forma-6';
import KelganHujjatlar from './kel-documents';

const TABS = [
  {
    id: 'forma3',
    label: 'Forma 3',
    description: 'Tayyorlangan hujjatlar',
    icon: FileEdit,
  },
  {
    id: 'forma6',
    label: 'Forma 6',
    description: 'Buyruqlar jurnali',
    icon: FileStack,
  },
  {
    id: 'kelgan',
    label: 'Kel/Hujjatlar',
    description: 'Kiruvchi hujjatlar',
    icon: Inbox,
  },
] as const;

const Jurnal = () => {
  const [activeComponent, setActiveComponent] =
    useState<(typeof TABS)[number]['id']>('forma3');

  const renderContent = () => {
    switch (activeComponent) {
      case 'forma3':
        return <Forma3 />;
      case 'forma6':
        return <Forma6 />;
      case 'kelgan':
        return <KelganHujjatlar />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-[#102c50]">
          <NotebookPen className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Jurnal</h2>
          <p className="text-xs text-slate-500">
            Hujjatlar aylanishi va qabul qilish jurnallari
          </p>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-200px)] flex-col gap-3">
        <nav aria-label="Jurnal turlari" className="flex w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1.5">
          {TABS.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              title={description}
              aria-current={activeComponent === id ? 'page' : undefined}
              onClick={() => setActiveComponent(id)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150',
                activeComponent === id ?
                  'bg-[#edf2f8] text-[#102c50] shadow-[inset_0_-2px_0_#c7a75b]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#102c50]'
              )}>
              <Icon className="size-3.5 shrink-0" strokeWidth={1.8} />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Jurnal;
