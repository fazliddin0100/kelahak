'use client';

import { useEffect, useState } from 'react';
import { DocumentType } from '@/types/document';

export function useBosSignDocuments() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/documents/bos-sign', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const { message } = await res.json();
          throw new Error(message || "Ma'lumotni olishda xatolik");
        }

        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  return { documents, loading, error };
}
