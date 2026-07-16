'use client';

import ShareUserModal from '@/components/modals/ShareUserModal';
import { isDocumentInWorkFile } from '@/lib/documentLifecycle';
import { useRoleHook } from '@/hooks/useRoleHook';
import { useState } from 'react';
import { ActionToolbar } from '../shared/ActionToolbar';
import { ForwardQueueSidebar } from '../shared/ForwardQueueSidebar';
import { useDocumentActionHandlers } from '../shared/useDocumentActionHandlers';
import { useDocumentActionPermissions } from '../shared/useDocumentActionPermissions';
import type { DocumentActionsProps } from '../shared/types';

function useKotibiyatActionState(
  document: DocumentActionsProps['document'],
  onRefresh?: DocumentActionsProps['onRefresh']
) {
  const [shareOpen, setShareOpen] = useState(false);
  const { userId, province } = useRoleHook();
  const handlers = useDocumentActionHandlers(document._id, onRefresh);
  const permissions = useDocumentActionPermissions({
    document,
    roleGroup: 'kotibiyat',
    currentUserId: userId,
    staffProvince: province,
  });

  const toolbarHandlers = {
    onEdit: handlers.onEdit,
    onSign: handlers.onSign,
    onRegister: handlers.onRegister,
    onBack: handlers.onBack,
    onSend: () => setShareOpen(true),
    onLinkNomeklatura: handlers.onLinkNomeklatura,
  };

  return { shareOpen, setShareOpen, permissions, toolbarHandlers, documentId: document._id };
}

export function KotibiyatDocumentToolbar({
  document,
  onRefresh,
}: DocumentActionsProps) {
  const { shareOpen, setShareOpen, permissions, toolbarHandlers, documentId } =
    useKotibiyatActionState(document, onRefresh);

  return (
    <>
      <ActionToolbar
        roleGroup="kotibiyat"
        permissions={permissions}
        handlers={toolbarHandlers}
        showRegister
      />
      <ShareUserModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={documentId}
        onShared={onRefresh}
      />
    </>
  );
}

export function KotibiyatDocumentSidebar({
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
      description="Izoh, yo‘naltirish va hujjatni boshqarish"
    />
  );
}
