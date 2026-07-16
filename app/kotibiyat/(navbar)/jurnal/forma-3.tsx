'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QrCodeJurnal from '@/helpers/qr-code-jurnal';
import { useGetSharedDocuments } from '@/hooks/useShareKotibiyatDocumen';
import NotData from '@/utils/not-data';
import { FileEdit, Loader2 } from 'lucide-react';
import {
  JurnalSectionHeader,
  JurnalTableShell,
  JurnalViewButton,
  jurnalTdClass,
  jurnalThClass,
} from './shared';

function getPreviewText(content?: string, wordCount: number = 6): string {
  if (!content) return '—';
  let plainText = content.replace(/<[^>]+>/g, '');
  plainText = plainText
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const words = plainText.trim().split(/\s+/);
  return (
    words.slice(0, wordCount).join(' ') + (words.length > wordCount ? '…' : '')
  );
}

const Forma3 = () => {
  const { documents, loading } = useGetSharedDocuments();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <JurnalSectionHeader
        title="Tayyorlangan hujjatlar"
        description="Forma 3 — tayyorlangan va ro‘yxatga olingan hujjatlar jurnali"
        icon={FileEdit}
        count={documents.length}
      />

      <JurnalTableShell>
        <Table className="min-w-max w-full">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className={jurnalThClass}>
                Q/R /<br /> grif
              </TableHead>
              <TableHead className={jurnalThClass}>Imzo sanasi</TableHead>
              <TableHead className={jurnalThClass}>Tayyorlagan</TableHead>
              <TableHead className={jurnalThClass}>Tur va mazmun</TableHead>
              <TableHead className={jurnalThClass}>Nusxalar</TableHead>
              <TableHead className={jurnalThClass}>Qabul qilgan</TableHead>
              <TableHead className={jurnalThClass}>Qabul imzosi</TableHead>
              <TableHead className={jurnalThClass}>Ish jildi</TableHead>
              <TableHead className={`${jurnalThClass} text-center`}>
                Ko‘rish
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {documents.length > 0 ?
              documents.map((doc) => (
                <TableRow
                  key={doc._id}
                  className="border-slate-100 transition-colors hover:bg-sky-50/40">
                  <TableCell className={`${jurnalTdClass} text-center`}>
                    <span className="font-medium text-slate-800 text-center">
                      {doc.registrationIndex || '—'}
                    </span>
                    <br />
                    <span className="text-xs text-slate-500">
                      {doc.grif || '—'}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`${jurnalTdClass} text-center whitespace-nowrap`}>
                    {doc.ownerAcceptedAt ?
                      new Date(
                        typeof doc.ownerAcceptedAt === 'string' ?
                          doc.ownerAcceptedAt
                        : doc.ownerAcceptedAt instanceof Date ?
                          doc.ownerAcceptedAt
                        : doc.ownerAcceptedAt.$date
                      ).toLocaleDateString('uz-UZ')
                    : doc.updatedAt ?
                      new Date(
                        typeof doc.updatedAt === 'string' ? doc.updatedAt
                        : doc.updatedAt instanceof Date ? doc.updatedAt
                        : doc.updatedAt.$date
                      ).toLocaleDateString('uz-UZ')
                    : '—'}
                  </TableCell>
                  <TableCell className={jurnalTdClass}>
                    {doc.author?.fullName || '—'}
                  </TableCell>
                  <TableCell className={`${jurnalTdClass} max-w-[200px]`}>
                    <span className="line-clamp-2">
                      {getPreviewText(
                        typeof doc.content === 'string' ? doc.content : ''
                      )}
                    </span>
                  </TableCell>
                  <TableCell className={`${jurnalTdClass} text-center`}>
                    {doc.copyNumber?.length ? doc.copyNumber.join(', ') : '1'}
                  </TableCell>
                  <TableCell className={`${jurnalTdClass} text-center`}>
                    {doc.ownerAcceptedBy?.fullName ?
                      <span className="font-medium text-slate-800">
                        {doc.ownerAcceptedBy.fullName}
                      </span>
                    : <span className="text-xs text-amber-600">
                        Qabul qilinmagan
                      </span>
                    }
                  </TableCell>
                  <TableCell className={`${jurnalTdClass} text-center`}>
                    {doc.ownerAcceptedBy?.hasSigned &&
                    doc.ownerAcceptedBy.fullName ?
                      <div className="flex justify-center">
                        <QrCodeJurnal
                          fullNames={doc.ownerAcceptedBy.fullName}
                          size={32}
                          logoSize={10}
                        />
                      </div>
                    : <span className="text-xs text-amber-600">
                        Qabul qilinmagan
                      </span>
                    }
                  </TableCell>
                  <TableCell className={`${jurnalTdClass} text-center`}>
                    {doc.nomenclatureId?.registrationIndex || '—'}
                  </TableCell>
                  <TableCell className={`${jurnalTdClass} text-center`}>
                    <div className="flex justify-center">
                      <JurnalViewButton documentId={doc._id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            : <TableRow>
                <TableCell colSpan={9} className="py-16 text-center">
                  <NotData />
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
      </JurnalTableShell>
    </div>
  );
};

export default Forma3;
