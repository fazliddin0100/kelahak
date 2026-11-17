import { useState } from 'react';
import { toast } from '../components/ui/sonner';

const useGrantUser = (onSuccess?: () => void) => {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const grantUser = async (userId: string) => {
    try {
      setLoadingIds((prev) => new Set(prev).add(userId));

      const res = await fetch('/api/users/sessions/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Xatolik yuz berdi');

      toast.success(data.message || 'Foydalanuvchiga ruxsat berildi');
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

  return { grantUser, loadingIds };
};

export default useGrantUser;
