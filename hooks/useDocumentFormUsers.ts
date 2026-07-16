'use client';

import { IUserPopulated, IPersonal, IJob } from '@/types/user';
import { useCallback, useEffect, useState } from 'react';
import type { DepartmentPeer } from './useDepartmentPeers';

function peerToPopulated(peer: DepartmentPeer): IUserPopulated {
  const p = peer.personal ?? {};
  const j = peer.job ?? {};
  return {
    userId: peer.userId,
    personal: {
      name: p.name ?? '',
      fName: p.fName ?? '',
      sName: p.sName ?? '',
      province: p.province ?? peer.province,
    } as IPersonal,
    job: {
      position: j.position ?? '',
      organ: j.organ ?? peer.organ,
      department: j.department ?? peer.department,
      militaryRank: j.militaryRank ?? '',
      isUserTrue: true,
    } as IJob,
  };
}

export type DocumentFormUsersScope = 'unit' | 'organ';

/** Hujjat tahriri modallari: viloyat + bo‘lim/organ bo‘yicha xodimlar */
export function useDocumentFormUsers(
  enabled = true,
  scope: DocumentFormUsersScope = 'organ'
) {
  const [users, setUsers] = useState<IUserPopulated[]>([]);
  const [province, setProvince] = useState('');
  const [organ, setOrgan] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined' ?
          localStorage.getItem('token') ||
          localStorage.getItem('ref_token')
        : null;
      const query =
        scope === 'organ' ? '?scope=organ' : '';
      const res = await fetch(`/api/users/department-peers${query}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Foydalanuvchilar yuklanmadi');
      }
      const peers: DepartmentPeer[] = data.users ?? [];
      setUsers(peers.map(peerToPopulated));
      setProvince(data.province ?? '');
      setOrgan(data.organ ?? '');
      setDepartment(data.department ?? '');
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [enabled, scope, fetchUsers]);

  return { users, province, organ, department, loading, refetch: fetchUsers };
}
