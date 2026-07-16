// hooks/useDocuments.ts
import { DocumentType } from '@/types/document';
import { useCallback, useEffect, useState } from 'react';

type UseDocumentsOptions = {
  /** `owner` — faqat joriy foydalanuvchi yaratgan hujjatlar (kotibiyat Hujjat sahifasi) */
  scope?: 'all' | 'owner';
};

export const useDocuments = (userId?: string, options?: UseDocumentsOptions) => {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (options?.scope === 'owner') params.set('scope', 'owner');
      const qs = params.toString();
      const url = `/api/documents/get-documents-user${qs ? `?${qs}` : ''}`;

      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Hujjatlarni olishda xato');

      const data = await res.json();
      setDocuments(data.documents || data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [userId, options?.scope]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
};
