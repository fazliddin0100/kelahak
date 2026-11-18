import { useState } from 'react';
import { toast } from '../components/ui/sonner';

export interface GrantPayload {
  role: string;
  permissions: string[];
}

/** Ruxsat berish (yoki huquqlarni yangilash): rol va tanlangan huquqlar bilan. */
const useGrantUser = (onSuccess?: () => void) => {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const grantUser = async (userId: string, payload: GrantPayload) => {
    try {
      setLoadingIds((prev) => new Set(prev).add(userId));

      const res = await fetch('/api/users/sessions/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, ...payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Xatolik yuz berdi');

      toast.success(data.message || 'Foydalanuvchiga ruxsat berildi');
      onSuccess?.();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      toast.error(message);
      return null;
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
