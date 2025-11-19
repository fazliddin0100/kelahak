'use client';

// hooks/useNomeklatura.ts
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ObjectIdLike, DateLike, Author, DocumentType } from '@/types/document';

// Har bir nomeklatura elementini DocumentType asosida aniqlaymiz
export interface NomeklaturaItem extends DocumentType {
  _id: ObjectIdLike | string;
  registrationIndex: string | number;
  title: string;
  grif: string;
  status: string;
  createdAt: DateLike;
  updatedAt?: DateLike;
  author?: Author;
  saqlashMuddati?: string | number;
  qonunTuri?: string;
}

// Bo‘linma va unga tegishli nomeklaturalar
export interface BolinmaWithNomeklatura {
  _id: ObjectIdLike | string;
  bolinma: string;
  nomeklaturalar: NomeklaturaItem[];
}

export const useNomeklatura = () => {
  const [nomeklatura, setNomeklatura] = useState<BolinmaWithNomeklatura[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/nameklatura/get-nomeklatura');
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setNomeklatura(data.results || []);
      } catch (err) {
        console.error(err);
        toast.error('Nomeklatura olishda xatolik');
        setNomeklatura([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { nomeklatura, loading };
};
