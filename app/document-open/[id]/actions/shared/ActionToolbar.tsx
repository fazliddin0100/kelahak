'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDocumentActionsHomeHref } from '@/lib/documentActionRole';
import { DocumentActionRoleGroup } from '@/lib/documentActionRole';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  FileCheck,
  FilePenLine,
  Notebook,
  Send,
  Signature,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import type { DocumentActionHandlers, DocumentActionPermissions } from './types';

const actionBtn = (active: boolean, color: string) =>
  cn(
    'size-9 rounded-lg border p-0 shadow-sm transition-all duration-200',
    active ?
      `${color} hover:scale-105 hover:shadow-md`
    : 'cursor-not-allowed border-slate-600/50 bg-slate-700/40 opacity-40'
  );

type ToolbarAction = {
  id: string;
  label: string;
  icon: typeof FilePenLine;
  active: boolean;
  className: string;
  onClick: () => void;
  show: boolean;
};

type Props = {
  roleGroup: DocumentActionRoleGroup;
  permissions: DocumentActionPermissions;
  handlers: DocumentActionHandlers;
  showRegister?: boolean;
};

export function ActionToolbar({
  roleGroup,
  permissions,
  handlers,
  showRegister = false,
}: Props) {
  const homeHref = getDocumentActionsHomeHref(roleGroup);
  const shareOnly = permissions.workFileShareOnly;

  const actions: ToolbarAction[] = [
    {
      id: 'edit',
      label: 'O‘zgartirish',
      icon: FilePenLine,
      active: permissions.canEdit,
      className:
        'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
      onClick: handlers.onEdit,
      show: !shareOnly && !permissions.forwardReviewOnly,
    },
    {
      id: 'sign',
      label: permissions.canSignLabel,
      icon: Signature,
      active: permissions.canSign,
      className:
        'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
      onClick: handlers.onSign,
      show: !shareOnly,
    },
    {
      id: 'register',
      label: 'Ro‘yxatga olish',
      icon: FileCheck,
      active: permissions.canRegister,
      className:
        'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
      onClick: handlers.onRegister,
      show: !shareOnly && showRegister && !permissions.forwardReviewOnly,
    },
    {
      id: 'send',
      label: permissions.sendLabel,
      icon: Send,
      active: permissions.canSend,
      className:
        'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20',
      onClick: handlers.onSend,
      show: shareOnly || !permissions.forwardReviewOnly,
    },
    {
      id: 'back',
      label: 'Egasiga qaytarish',
      icon: Undo2,
      active: permissions.canBack,
      className:
        'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20',
      onClick: handlers.onBack,
      show: !shareOnly && !permissions.forwardReviewOnly,
    },
    {
      id: 'nomenklatura',
      label: permissions.nomeklaturaLabel,
      icon: Notebook,
      active: permissions.canLinkNomeklatura,
      className:
        'border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20',
      onClick: handlers.onLinkNomeklatura,
      show: !shareOnly && !permissions.forwardReviewOnly,
    },
  ];

  const visible = actions.filter((a) => a.show);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={homeHref}>
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-lg border-slate-600/50 bg-slate-700/50 text-slate-200 hover:border-sky-500/50 hover:bg-slate-700 hover:text-white">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Orqaga</span>
          </Button>
        </Link>

        <div className="mx-1 hidden h-6 w-px bg-slate-600 sm:block" />

        {visible.map(({ id, label, icon: Icon, active, className, onClick }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!active}
                className={actionBtn(active, className)}
                onClick={onClick}>
                <Icon className="size-4" strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
