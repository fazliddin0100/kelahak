import { useEffect, useState } from 'react';
import { DocumentType } from '@/types/document';

export const useSignetDocuments = () => {
  const [signDocuments, setSignDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/documents/signet-documents');

        const json = await res.json();
        setSignDocuments(json.documents || []);
      } catch (err) {
        console.error('Hujjatlarni olishda xatolik:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  return { signDocuments, loading };
};
