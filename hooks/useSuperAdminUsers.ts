'use client';

import { IUserPopulated } from '@/types/user';
import { useCallback, useEffect, useState } from 'react';

export function useSuperAdminUsers() {
  const [users, setUsers] = useState<IUserPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/users', {
        credentials: 'include',
      });
      const json = await res.json();
      setUsers(res.ok ? json.users ?? [] : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}
