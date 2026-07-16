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
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
          <NotebookPen className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Jurnal</h2>
          <p className="text-xs text-slate-500">
            Hujjatlar aylanishi va qabul qilish jurnallari
          </p>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-200px)] flex-col gap-4 lg:flex-row">
        <aside className="flex shrink-0 flex-row gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm lg:w-56 lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveComponent(id)}
              className={cn(
                'flex min-w-[140px] flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 lg:min-w-0 lg:w-full',
                activeComponent === id ?
                  'bg-sky-500/10 text-sky-700 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.35)]'
                : 'text-slate-600 hover:bg-slate-50'
              )}>
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  activeComponent === id ?
                    'bg-sky-500/20 text-sky-600'
                  : 'bg-slate-100 text-slate-500'
                )}>
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="hidden text-xs text-slate-500 lg:block">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Jurnal;
