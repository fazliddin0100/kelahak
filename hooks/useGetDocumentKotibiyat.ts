'use client';

import { DocumentType } from '@/types/document';
import { useCallback, useEffect, useState } from 'react';

export function useGetDocumentsKotibiyat() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [province, setProvince] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents/get-doc-kotibiyat', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Hujjatlarni olishda xatolik');
      }

      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setProvince(data.province ?? '');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Hujjatlarni yuklashda xatolik';
      setError(message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, province, loading, error, refetch: fetchDocuments };
}
