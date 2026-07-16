import { IUserPopulated } from '@/types/user';
import { useCallback, useEffect, useState } from 'react';

function getAdminAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useSessionsUsers = () => {
  const [users, setUsers] = useState<IUserPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok) {
        setUsers(json.users || []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { users, loading, refetch: fetchData };
};
