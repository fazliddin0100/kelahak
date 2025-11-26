// hooks/useDocuments.ts
import { useState, useEffect } from 'react';

export const useDocuments = (userId?: string) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        let url = '/api/documents/get-documents-user';
        if (userId) url += `?userId=${userId}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Hujjatlarni olishda xato');

        const data = await res.json();
        setDocuments(data.documents || data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [userId]);

  return { documents, loading, error };
};
