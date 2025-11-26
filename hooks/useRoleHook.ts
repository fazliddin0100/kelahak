// hooks/useDocuments.ts
import { useState, useEffect } from 'react';

export const useRoleHook = (userId?: string) => {
  const [role, setRole] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/users/user-role');
        if (!res.ok) throw new Error('Hujjatlarni olishda xato');
        const data = await res.json();
        setRole(data.role || data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [userId]);

  return { role, loading, error };
};
