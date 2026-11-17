'use client';

import { toast } from '@/components/ui/sonner';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const jsonHeaders: HeadersInit = { 'Content-Type': 'application/json' };

export function useDocumentActionHandlers(
  documentId: string,
  onRefresh?: () => void | Promise<void>
) {
  const router = useRouter();

  const onEdit = useCallback(() => {
    router.push(`/document/${documentId}`);
  }, [router, documentId]);

  const onSign = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/signed`, {
        method: 'POST',
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat imzolandi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, onRefresh, router]);

  const onRegister = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/register`, {
        method: 'POST',
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat ro‘yxatga olindi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, onRefresh, router]);

  const onBack = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/back-doc`, {
        method: 'POST',
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat egasiga qaytarildi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, onRefresh, router]);

  const onSubmitToKotibiyat = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/submit-kotibiyat`, {
        method: 'POST',
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat kotibiyatga yuborildi!');
      await onRefresh?.();
      router.refresh();
    } catch {
      toast.error('Server xatosi!');
    }
  }, [documentId, onRefresh, router]);

  const onLinkNomeklatura = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/nomeklatura`, {
        method: 'POST',
        headers: jsonHeaders,
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
  }, [documentId, onRefresh, router]);

  return {
    onEdit,
    onSign,
    onRegister,
    onBack,
    onSubmitToKotibiyat,
    onLinkNomeklatura,
  };
}
