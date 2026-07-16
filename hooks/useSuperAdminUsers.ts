'use client';

import { IUserPopulated } from '@/types/user';
import { useCallback, useEffect, useState } from 'react';

function saHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('sa_token') || localStorage.getItem('token')
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useSuperAdminUsers() {
  const [users, setUsers] = useState<IUserPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/users', {
        credentials: 'include',
        headers: saHeaders(),
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
