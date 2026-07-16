'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FolderOpen } from 'lucide-react';
import FileArxiv from './file-arxiv';
import { ModalHeaderBlock, modalContentWideClass } from './modal-shared';

interface Props {
  open: boolean;
  onClose: () => void;
  id: string | null;
}

const ModalArxiv: React.FC<Props> = ({ open, onClose, id }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={modalContentWideClass} showCloseButton>
        <ModalHeaderBlock
          icon={FolderOpen}
          title="Ish jildidagi hujjatlar"
          description="Tanlangan ish jild ichidagi hujjatlar ro‘yxati"
          iconClassName="bg-amber-500/10 text-amber-600"
        />
        <div className="overflow-y-auto px-6 py-5">
          <FileArxiv nomeklaturaId={id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalArxiv;
