'use client';

import { getDocumentActionRoleGroup } from '@/lib/documentActionRole';
import { useRoleHook } from '@/hooks/useRoleHook';
import LoadingState from '@/components/LoadingState';
import {
  CommanderDocumentSidebar,
  CommanderDocumentToolbar,
} from './commander/CommanderDocumentActions';
import {
  KotibiyatDocumentSidebar,
  KotibiyatDocumentToolbar,
} from './kotibiyat/KotibiyatDocumentActions';
import type { DocumentActionsProps } from './shared/types';
import { UserDocumentSidebar, UserDocumentToolbar } from './user/UserDocumentActions';

function useRoleGroup() {
  const { role, loading } = useRoleHook();
  const currentRole = Array.isArray(role) ? role[0] : role;
  const roleGroup = getDocumentActionRoleGroup(currentRole);
  return { roleGroup, loading };
}

export function DocumentOpenToolbar(props: DocumentActionsProps) {
  const { roleGroup, loading } = useRoleGroup();

  if (loading) {
    return (
      <div className="flex h-9 items-center gap-2 px-2">
        <LoadingState compact message="Hujjat amallari yuklanmoqda..." />
      </div>
    );
  }

  switch (roleGroup) {
    case 'kotibiyat':
      return <KotibiyatDocumentToolbar {...props} />;
    case 'commander':
      return <CommanderDocumentToolbar {...props} />;
    case 'user':
      return <UserDocumentToolbar {...props} />;
    default:
      return null;
  }
}

export function DocumentOpenSidebar(props: DocumentActionsProps) {
  const { roleGroup, loading } = useRoleGroup();

  if (loading) {
    return (
      <aside className="flex h-full w-full items-center justify-center border-l border-slate-200 bg-white lg:w-96">
        <LoadingState message="Amallar yuklanmoqda..." className="h-full" />
      </aside>
    );
  }

  switch (roleGroup) {
    case 'kotibiyat':
      return <KotibiyatDocumentSidebar {...props} />;
    case 'commander':
      return <CommanderDocumentSidebar {...props} />;
    case 'user':
      return <UserDocumentSidebar {...props} />;
    default:
      return null;
  }
}
