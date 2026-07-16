'use client';

import { DocumentType } from '@/types/document';
import { useCallback, useEffect, useState } from 'react';

export function useKelganDocuments() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents/kelgan', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ma’lumot yuklanmadi');
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
}
