'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookMarked, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ModalCountOrder from './(buyruq)/ModalCountUser';
import ModalCountUserOrder from './(buyruq)/ModalCountUserOrder';
import ModalFile from './(buyruq)/UploadFile';
import { SectionShell, adminTdClass, adminThClass } from './shared';

type FileItem = {
  _id: string;
  nomi: string;
  raqami: string;
  maxfiylik: string;
  sanasi: string;
  filePath: string;
};

const Buyruq = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/file/upload-get');
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fayllarni olishda xato:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  return (
    <SectionShell
      title="Buyruqlar"
      description="Buyruq hujjatlari va nusxa oluvchilar"
      icon={BookMarked}
      iconClassName="bg-sky-500/10 text-sky-600"
      actions={<ModalFile />}>
      <div className="p-5">
        <p className="mb-4 text-sm text-slate-500">
          Jami:{' '}
          <span className="font-semibold text-slate-800">{files.length}</span> ta
          buyruq
        </p>

        {loading ?
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-sky-500" />
          </div>
        : files.length === 0 ?
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
            <FileText className="size-10 text-slate-300" />
            <p className="text-sm text-slate-500">Hozircha buyruq yuklanmagan</p>
          </div>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-300px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                    <TableHead className={`${adminThClass} w-12 text-center`}>
                      №
                    </TableHead>
                    <TableHead className={adminThClass}>Nomi</TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Maxfiylik
                    </TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Raqam
                    </TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Sana
                    </TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Foydalanuvchilar
                    </TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      So‘rovlar
                    </TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow
                      key={file._id}
                      className="border-slate-100 transition-colors hover:bg-sky-50/40">
                      <TableCell
                        className={`${adminTdClass} text-center font-medium`}>
                        {index + 1}
                      </TableCell>
                      <TableCell className={`${adminTdClass} font-medium text-slate-800`}>
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-sky-500" />
                          {file.nomi}
                        </div>
                      </TableCell>
                      <TableCell className={`${adminTdClass} text-center`}>
                        <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                          {file.maxfiylik}
                        </span>
                      </TableCell>
                      <TableCell className={`${adminTdClass} text-center`}>
                        {file.raqami}
                      </TableCell>
                      <TableCell
                        className={`${adminTdClass} text-center whitespace-nowrap`}>
                        {file.sanasi}
                      </TableCell>
                      <TableCell className={`${adminTdClass} text-center`}>
                        <ModalCountOrder />
                      </TableCell>
                      <TableCell className={`${adminTdClass} text-center`}>
                        <ModalCountUserOrder />
                      </TableCell>
                      <TableCell className={`${adminTdClass} text-center`}>
                        <a
                          href={`/api/file/${file._id}`}
                          target="_blank"
                          rel="noopener noreferrer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
                            <ExternalLink className="size-3.5" />
                            Ochish
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        }
      </div>
    </SectionShell>
  );
};

export default Buyruq;
