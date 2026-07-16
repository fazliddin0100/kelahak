'use client';

import { useCallback, useEffect, useState } from 'react';

export interface DepartmentPeer {
  userId: string;
  fullName: string;
  province: string;
  organ: string;
  department: string;
  personal: {
    name?: string;
    fName?: string;
    sName?: string;
    province?: string;
  };
  job: {
    position?: string;
    organ?: string;
    department?: string;
    militaryRank?: string;
  };
}

export function useDepartmentPeers() {
  const [users, setUsers] = useState<DepartmentPeer[]>([]);
  const [province, setProvince] = useState('');
  const [organ, setOrgan] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPeers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/department-peers', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Foydalanuvchilar yuklanmadi');
      const data = await res.json();
      setUsers(data.users ?? []);
      setProvince(data.province ?? '');
      setOrgan(data.organ ?? '');
      setDepartment(data.department ?? '');
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeers();
  }, [fetchPeers]);

  return { users, province, organ, department, loading, refetch: fetchPeers };
}
