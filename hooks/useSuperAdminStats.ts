'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SuperAdminStats {
  totalUsers: number;
  pendingApproval: number;
  approvedUsers: number;
  superAdminCount: number;
  byRole: Record<string, number>;
  byProvince: Record<string, number>;
}

function saHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('sa_token') || localStorage.getItem('token')
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useSuperAdminStats() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/stats', {
        credentials: 'include',
        headers: saHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { message?: string }).message ||
            `Statistika yuklanmadi (${res.status})`
        );
        setStats(null);
        return;
      }
      setStats(data as SuperAdminStats);
    } catch {
      setError('Server bilan bog‘lanishda xatolik');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
