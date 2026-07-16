// hooks/useDocuments.ts
import { useEffect, useState } from 'react';

type Role =
  | 'admin'
  | 'user'
  | 'commander'
  | 'komandir'
  | 'deputyCommander'
  | 'departmentCommander'
  | 'departmentDeputy'
  | null;

export const useRoleHook = (userId?: string) => {
  const [role, setRole] = useState<Role>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [province, setProvince] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/users/user-role');
        if (!res.ok) throw new Error('Hujjatlarni olishda xato');
        const data = await res.json();
        setRole(data.role || null);
        setCurrentUserId(data.userId ?? null);
        setProvince(typeof data.province === 'string' ? data.province : '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [userId]);

  return { role, loading, error, userId: currentUserId, province };
};
