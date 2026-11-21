'use client';

import { useEffect } from 'react';
import { toast } from '@/components/ui/sonner';

/**
 * Hujjatlarni nusxalash va chop etishdan himoya (hamma rollar uchun).
 * - Ctrl/Cmd+P va Ctrl/Cmd+S butun ilovada bloklanadi; chop etish faqat kotibiyatning
 *   "Chop etish so'rovlari" bo'limidagi Word fayl orqali.
 * - [data-protected] ichida belgilash, nusxa olish, kesish, sudrash va kontekst menyu bloklanadi.
 * - CSS (globals.css, @media print) brauzer menyusidan chop etilganda ham bo'sh sahifa beradi.
 * Eslatma: ekran rasmini (screenshot) brauzer orqali to'liq taqiqlab bo'lmaydi.
 */
export default function DocumentProtection() {
  useEffect(() => {
    const inProtected = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest('[data-protected]');

    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && (key === 'p' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Hujjatni chop etish faqat kotibiyat orqali (Chop etish so‘rovi)');
      }
    };
    const blockInside = (e: Event) => {
      if (inProtected(e.target)) e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      const sel = document.getSelection();
      const anchor = sel?.anchorNode?.parentElement ?? null;
      if (inProtected(e.target) || inProtected(anchor)) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', '');
      }
    };

    window.addEventListener('keydown', onKey, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCopy, true);
    document.addEventListener('contextmenu', blockInside, true);
    document.addEventListener('selectstart', blockInside, true);
    document.addEventListener('dragstart', blockInside, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCopy, true);
      document.removeEventListener('contextmenu', blockInside, true);
      document.removeEventListener('selectstart', blockInside, true);
      document.removeEventListener('dragstart', blockInside, true);
    };
  }, []);

  return null;
}
