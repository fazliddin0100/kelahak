'use client';

import IshJildLinkModal from '@/components/modals/IshJildLinkModal';
import KotibiyatSendModal from '@/components/modals/KotibiyatSendModal';
import ShareUserModal from '@/components/modals/ShareUserModal';
import { isDocumentInWorkFile } from '@/lib/documentLifecycle';
import { useRoleHook } from '@/hooks/useRoleHook';
import { useState } from 'react';
import { ActionToolbar } from '../shared/ActionToolbar';
import { ForwardQueueSidebar } from '../shared/ForwardQueueSidebar';
import { useDocumentActionHandlers } from '../shared/useDocumentActionHandlers';
import { useDocumentActionPermissions } from '../shared/useDocumentActionPermissions';
import type { DocumentActionsProps } from '../shared/types';

function useUserActionState(document: DocumentActionsProps['document'], onRefresh?: DocumentActionsProps['onRefresh']) {
  const [shareOpen, setShareOpen] = useState(false);
  const [kotibiyatOpen, setKotibiyatOpen] = useState(false);
  const [ishJildOpen, setIshJildOpen] = useState(false);
  const { userId, province } = useRoleHook();
  const handlers = useDocumentActionHandlers(document._id, onRefresh);
  const permissions = useDocumentActionPermissions({
    document,
    roleGroup: 'user',
    currentUserId: userId,
    staffProvince: province,
  });

  const toolbarHandlers = {
    onEdit: handlers.onEdit,
    onSign: handlers.onSign,
    onRegister: handlers.onRegister,
    onBack: handlers.onBack,
    onSend: () => {
      if (permissions.workFileShareOnly) {
        setShareOpen(true);
        return;
      }
      if (permissions.sendLabel === 'Kotibiyatga yuborish') {
        setKotibiyatOpen(true);
        return;
      }
      setShareOpen(true);
    },
    onLinkNomeklatura: () => setIshJildOpen(true),
  };

  return {
    shareOpen,
    setShareOpen,
    kotibiyatOpen,
    setKotibiyatOpen,
    ishJildOpen,
    setIshJildOpen,
    permissions,
    toolbarHandlers,
    documentId: document._id,
    onRefresh,
  };
}

export function UserDocumentToolbar({
  document,
  onRefresh,
}: DocumentActionsProps) {
  const {
    shareOpen,
    setShareOpen,
    kotibiyatOpen,
    setKotibiyatOpen,
    ishJildOpen,
    setIshJildOpen,
    permissions,
    toolbarHandlers,
    documentId,
    onRefresh: refresh,
  } = useUserActionState(document, onRefresh);

  return (
    <>
      <ActionToolbar
        roleGroup="user"
        permissions={permissions}
        handlers={toolbarHandlers}
      />
      <KotibiyatSendModal
        open={kotibiyatOpen}
        onClose={() => setKotibiyatOpen(false)}
        documentId={documentId}
        onSent={refresh}
      />
      <ShareUserModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={documentId}
        onShared={refresh}
      />
      <IshJildLinkModal
        open={ishJildOpen}
        onClose={() => setIshJildOpen(false)}
        documentId={documentId}
        onLinked={refresh}
      />
    </>
  );
}

export function UserDocumentSidebar({
  document,
  onRefresh,
}: DocumentActionsProps) {
  if (isDocumentInWorkFile(document)) {
    return null;
  }

  return (
    <ForwardQueueSidebar
      document={document}
      onRefresh={onRefresh}
      title="Izoh va yo‘naltirish"
      description="Izoh qoldiring yoki boshqa foydalanuvchilarga yuboring"
    />
  );
}
