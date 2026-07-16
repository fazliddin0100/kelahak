import DocumentTable from '@/app/user/(navbar)/document-table';
import { TemplateGallery } from '@/components/template-galerey';
import { FilePlus2, Files } from 'lucide-react';

const File = () => {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
            <FilePlus2 className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Yangi hujjat yaratish
            </h2>
            <p className="text-xs text-slate-500">
              Shablonni tanlang va hujjatni tahrirlashga o&apos;ting
            </p>
          </div>
        </div>
        <TemplateGallery className="border-0 bg-transparent shadow-none" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <Files className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Mening hujjatlarim
            </h2>
            <p className="text-xs text-slate-500">
              Jarayondagi hujjatlar (ish jildga yuborilganlar «Nomeklatura»da)
            </p>
          </div>
        </div>
        <DocumentTable />
      </section>
    </div>
  );
};

export default File;
