'use client';

import { useState } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';

/** Boshliq: hujjatni xatolari yozilgan holda muallifga qaytarish */
export default function ReturnToAuthorModal({
  open,
  onClose,
  documentId,
  onReturned,
}: {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onReturned?: () => void | Promise<void>;
}) {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (comment.trim().length < 3) return toast.error('Xatolarni yoki qaytarish sababini yozing');
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat muallifga qaytarildi');
      setComment('');
      onClose();
      await onReturned?.();
    } catch {
      toast.error('Server xatosi!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-5 text-amber-600" />
            Muallifga qaytarish
          </DialogTitle>
          <DialogDescription>
            Hujjatdagi xatolarni yozing. Muallif tuzatib, qayta imzolaydi va hujjat yana sizga keladi.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="Masalan: 2-banddagi sana noto‘g‘ri, imzo blokiga lavozimni qo‘shing"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </Button>
          <Button onClick={submit} disabled={saving || comment.trim().length < 3} className="gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Qaytarish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
