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

function useCommanderActionState(document: DocumentActionsProps['document'], onRefresh?: DocumentActionsProps['onRefresh']) {
  const [shareOpen, setShareOpen] = useState(false);
  const { userId, province } = useRoleHook();
  const handlers = useDocumentActionHandlers(document._id, onRefresh);
  const permissions = useDocumentActionPermissions({
    document,
    roleGroup: 'commander',
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

export function CommanderDocumentToolbar({
  document,
  onRefresh,
}: DocumentActionsProps) {
  const { shareOpen, setShareOpen, permissions, toolbarHandlers, documentId } =
    useCommanderActionState(document, onRefresh);

  return (
    <>
      <ActionToolbar
        roleGroup="commander"
        permissions={permissions}
        handlers={toolbarHandlers}
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

export function CommanderDocumentSidebar({
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
      description="Izoh qoldiring va xodimlarga navbat bilan yuboring"
    />
  );
}
