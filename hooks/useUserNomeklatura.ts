'use client';

import type { BolinmaWithNomeklatura } from '@/hooks/useNomeklatura';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useUserNomeklatura = () => {
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

// re-export types for convenience
export type { BolinmaWithNomeklatura, NomeklaturaItem } from '@/hooks/useNomeklatura';
