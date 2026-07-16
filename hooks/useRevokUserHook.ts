import { useState } from 'react';
import { toast } from '../components/ui/sonner';

function getAdminAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const useRevokeUser = (onSuccess?: () => void) => {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const revokeUser = async (userId: string) => {
    try {
      setLoadingIds((prev) => new Set(prev).add(userId));

      const res = await fetch('/api/users/sessions/revoke', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Xatolik yuz berdi');

      toast.success(data.message || 'Foydalanuvchi tizimdan chiqarildi');
      onSuccess?.();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      toast.error(message);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return { revokeUser, loadingIds };
};

export default useRevokeUser;
