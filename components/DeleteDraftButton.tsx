'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import type { DocumentType } from '@/types/document';
import { useRoleHook } from '@/hooks/useRoleHook';
import { resolveIdReference } from '@/lib/resolveIdReference';

/** Imzolanmagan qoralama: o'chirish mumkin (server ham tekshiradi) */
export function isDeletableDraft(doc: DocumentType): boolean {
  const author = doc.author as { hasSigned?: boolean } | undefined;
  return (
    (doc.status === 'yangi' || doc.status === 'created') &&
    !author?.hasSigned &&
    doc.registrationIndex == null &&
    !(doc as { isCopy?: boolean }).isCopy
  );
}

export default function DeleteDraftButton({
  document,
  onDeleted,
}: {
  document: DocumentType;
  onDeleted?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { userId } = useRoleHook();
  // Faqat o'z hujjati (ro'yxatda boshqalar ulashgan hujjatlar ham bo'lishi mumkin)
  if (!userId || resolveIdReference(document.owner) !== userId || !isDeletableDraft(document)) return null;

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${document._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.message || 'O‘chirib bo‘lmadi');
      toast.success('Hujjat o‘chirildi');
      setOpen(false);
      await onDeleted?.();
    } catch {
      toast.error('Server xatosi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-8 rounded-lg border-red-200 bg-white text-red-600 transition-all hover:scale-105 hover:bg-red-50"
        aria-label="Qoralamani o‘chirish"
        title="Qoralamani o‘chirish">
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-600" />
              Hujjatni o‘chirasizmi?
            </AlertDialogTitle>
            <AlertDialogDescription>
              «{document.title || 'Hujjat'}» butunlay o‘chiriladi va uni qayta tiklab bo‘lmaydi. Faqat hali
              imzolanmagan qoralamani o‘chirish mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Orqaga</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={busy} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Ha, o‘chirish
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
