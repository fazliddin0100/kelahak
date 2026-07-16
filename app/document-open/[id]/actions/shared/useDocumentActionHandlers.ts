'use client';

import { toast } from '@/components/ui/sonner';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function useDocumentActionHandlers(
  documentId: string,
  onRefresh?: () => void | Promise<void>
) {
  const router = useRouter();

  const authHeaders = useCallback((): HeadersInit => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const onEdit = useCallback(() => {
    router.push(`/document/${documentId}`);
  }, [router, documentId]);

  const onSign = useCallback(async () => {
    const token = getToken();
    if (!token) return toast.error('Token topilmadi!');
    try {
      const res = await fetch(`/api/documents/${documentId}/signed`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat imzolandi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, authHeaders, onRefresh, router]);

  const onRegister = useCallback(async () => {
    const token = getToken();
    if (!token) return toast.error('Token topilmadi!');
    try {
      const res = await fetch(`/api/documents/${documentId}/register`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat ro‘yxatga olindi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, authHeaders, onRefresh, router]);

  const onBack = useCallback(async () => {
    const token = getToken();
    if (!token) return toast.error('Token topilmadi!');
    try {
      const res = await fetch(`/api/documents/${documentId}/back-doc`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat egasiga qaytarildi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, authHeaders, onRefresh, router]);

  const onSubmitToKotibiyat = useCallback(async () => {
    const token = getToken();
    if (!token) return toast.error('Token topilmadi!');
    try {
      const res = await fetch(`/api/documents/${documentId}/submit-kotibiyat`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat kotibiyatga yuborildi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, authHeaders, onRefresh, router]);

  const onLinkNomeklatura = useCallback(async () => {
    const token = getToken();
    if (!token) return toast.error('Token topilmadi!');
    try {
      const res = await fetch(`/api/documents/${documentId}/nomeklatura`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return toast.error(
          typeof data === 'object' && data?.message ?
            data.message
          : 'Ish jildga biriktirishda xatolik'
        );
      }
      toast.success(data?.message || 'Hujjat ish jildga biriktirildi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, authHeaders, onRefresh, router]);

  return {
    onEdit,
    onSign,
    onRegister,
    onBack,
    onSubmitToKotibiyat,
    onLinkNomeklatura,
  };
}
