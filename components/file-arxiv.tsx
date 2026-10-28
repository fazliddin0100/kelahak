'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DocumentType } from '@/types/document';
import { ExternalLink, FileText, Search } from 'lucide-react';
import LoadingState from '@/components/LoadingState';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  /** Nomeklatura (ish jild) identifikatori */
  nomeklaturaId?: string | null;
}

const thClass =
  'whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500';
const tdClass = 'px-3 py-2.5 text-sm text-slate-700';

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FileArxiv: React.FC<Props> = ({ nomeklaturaId }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!nomeklaturaId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents/by-nomeklatura/${nomeklaturaId}`,
        {
          credentials: 'include',
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Hujjatlar yuklanmadi');
      }
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [nomeklaturaId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredFiles = documents.filter((file) =>
    (file.title ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!nomeklaturaId) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Ish jild tanlanmagan
      </p>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Hujjat nomidan qidirish..."
          className="border-slate-200 bg-slate-50/80 pl-10 focus-visible:ring-sky-500/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ?
          <LoadingState message="Arxiv hujjatlari yuklanmoqda..." className="py-4" />
        : error ?
          <div className="py-12 text-center text-sm text-red-500">{error}</div>
        : filteredFiles.length === 0 ?
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FileText className="size-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              Ushbu ish jildda hujjat yo‘q
            </p>
            <p className="text-xs text-slate-400">
              «Ish jildga yuborish» orqali biriktirilgan hujjatlar shu yerda
              ko‘rinadi
            </p>
          </div>
        : <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className={`${thClass} w-14 text-center`}>№</TableHead>
                <TableHead className={thClass}>Hujjat nomi</TableHead>
                <TableHead className={thClass}>Muallif</TableHead>
                <TableHead className={`${thClass} text-center`}>Holat</TableHead>
                <TableHead className={`${thClass} text-center`}>Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file, index) => (
                <TableRow
                  key={String(file._id)}
                  className="border-slate-100 transition-colors hover:bg-sky-50/40">
                  <TableCell className={`${tdClass} text-center font-medium`}>
                    {file.registrationIndex ?? index + 1}
                  </TableCell>
                  <TableCell className={tdClass}>
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-red-500" />
                      <span className="font-medium text-slate-800">
                        {file.title ?? '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={tdClass}>
                    {file.author?.fullName || '—'}
                  </TableCell>
                  <TableCell className={`${tdClass} text-center`}>
                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 ring-1 ring-indigo-200 ring-inset">
                      ish jildda
                    </span>
                  </TableCell>
                  <TableCell className={`${tdClass} text-center`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                      onClick={() =>
                        router.push(`/document-open/${file._id}`)
                      }>
                      <ExternalLink className="size-3.5" />
                      Ochish
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      </div>

      <p className="text-xs text-slate-400">
        Jami: {filteredFiles.length} ta hujjat
      </p>
    </div>
  );
};

export default FileArxiv;
