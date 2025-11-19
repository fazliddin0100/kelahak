'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FileArxiv from './file-arxiv';

interface Props {
  open: boolean;
  onClose: () => void;
  id: string | null;
}

const ModalArxiv: React.FC<Props> = ({ open, onClose, id }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ish jildidagi hujjatlar</DialogTitle>
        </DialogHeader>
        <FileArxiv documentId={id} />
      </DialogContent>
    </Dialog>
  );
};

export default ModalArxiv;
