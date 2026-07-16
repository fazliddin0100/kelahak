'use client';

import { Author, DateLike, DocumentType, ObjectIdLike } from '@/types/document';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

import type { UserNomeklaturaRelation } from '@/lib/userNomeklaturaLabels';

export type { UserNomeklaturaRelation };

export interface NomeklaturaItem extends Omit<DocumentType, '_id'> {
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
  relation?: UserNomeklaturaRelation;
  owner?: ObjectIdLike | string;
  canAccept?: boolean;
}

export interface BolinmaWithNomeklatura {
  _id: ObjectIdLike | string;
  bolinma: string;
  nomeklaturalar: NomeklaturaItem[];
}

/** Joriy foydalanuvchiga tegishli nomeklatura (owner, author, creator, hujjat bog‘liqligi). */
export const useNomeklatura = () => {
  const [nomeklatura, setNomeklatura] = useState<BolinmaWithNomeklatura[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nameklatura/get-users-nomeklatura', {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setNomeklatura(data.results || []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('Nomeklatura yuklanmadi yoki sizga biriktirilmagan');
      setNomeklatura([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { nomeklatura, loading, total, refetch: fetchData };
};
