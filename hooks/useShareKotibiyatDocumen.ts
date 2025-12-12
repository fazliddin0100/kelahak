'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { DocumentType } from '@/types/document';

interface ApiResponse {
  message: string;
  documents?: DocumentType[];
}

export function useGetSharedDocuments() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch('/api/documents/share-admin-documents', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Xatolik yuz berdi');
        return;
      }

      setDocuments(data.documents || []);
      toast.success(data.message || 'Hujjatlar olindi');
    } catch (error) {
      console.error('Fetch documents error:', error);
      toast.error('Server xatosi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return { documents, loading, refetch: fetchDocuments };
}
