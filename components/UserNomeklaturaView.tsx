'use client';

import ModalArxiv from '@/components/modal-arxiv';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  NomeklaturaItem,
  useUserNomeklatura,
} from '@/hooks/useUserNomeklatura';
import { USER_NOMEKLATURA_RELATION_LABEL } from '@/lib/userNomeklaturaLabels';
import { cn } from '@/lib/utils';
import NotData from '@/utils/not-data';
import { toDate } from '@/lib/dateLike';
import dayjs from 'dayjs';
import { Check, FolderOpen, Library, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

type ShellProps = {
  title: string;
  description: string;
  thClass: string;
  tdClass: string;
  iconClassName?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

type Props = {
  Shell: React.ComponentType<
    ShellProps & { icon: typeof Library; children: React.ReactNode }
  >;
  thClass: string;
  tdClass: string;
  iconClassName?: string;
  headerActions?: React.ReactNode | ((refetch: () => void) => React.ReactNode);
  title?: string;
  description?: string;
};

function relationBadgeClass(relation?: NomeklaturaItem['relation']) {
  switch (relation) {
    case 'creator':
      return 'bg-violet-100 text-violet-800 ring-violet-200';
    case 'document':
      return 'bg-sky-100 text-sky-800 ring-sky-200';
    case 'owner':
      return 'bg-indigo-100 text-indigo-800 ring-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

export default function UserNomeklaturaView({
  Shell,
  thClass,
  tdClass,
  iconClassName = 'bg-indigo-500/10 text-indigo-600',
  headerActions,
  title = 'Nomeklatura',
  description = 'Siz yaratgan, javobgar bo‘lgan va hujjatingiz biriktirilgan ish jildlari',
}: Props) {
  const { nomeklatura, loading, total, refetch } = useUserNomeklatura();
  const actions =
    typeof headerActions === 'function' ? headerActions(refetch) : headerActions;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      const token =
        localStorage.getItem('ref_token') || localStorage.getItem('token');
      const res = await fetch(`/api/nameklatura/${id}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Qabul qilishda xatolik');
      }
      toast.success(data.message || 'Nomeklatura imzolangan');
      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Qabul qilishda xatolik'
      );
    } finally {
      setAcceptingId(null);
    }
  };

  const canAccept = (item: NomeklaturaItem) =>
    item.canAccept === true ||
    (item.status !== 'APPROVED' &&
      item.canAccept !== false &&
      (item.relation === 'owner' || item.relation === 'author'));

  return (
    <Shell
      title={title}
      description={description}
      icon={Library}
      iconClassName={iconClassName}
      thClass={thClass}
      tdClass={tdClass}
      actions={actions}>
      <div className="p-5">
        <p className="mb-4 text-sm text-slate-500">
          Jami: <span className="font-semibold text-slate-800">{total}</span> ta
          ish jild
        </p>

        {loading ?
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-sky-500" />
          </div>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-280px)] min-h-[360px] overflow-auto">
              <Table className="min-w-max w-full">
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                    <TableHead className={thClass}>T/R</TableHead>
                    <TableHead className={thClass}>Ish jild nomi</TableHead>
                    <TableHead className={thClass}>Bog‘lanish</TableHead>
                    <TableHead className={thClass}>Maxfiylik</TableHead>
                    <TableHead className={thClass}>Sana</TableHead>
                    <TableHead className={thClass}>Javobgar</TableHead>
                    <TableHead className={thClass}>Imzo</TableHead>
                    <TableHead className={thClass}>Saqlash</TableHead>
                    <TableHead className={`${thClass} text-center`}>
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nomeklatura.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center">
                        <NotData />
                        <p className="mt-2 text-xs text-slate-400">
                          Hujjatda «Nomeklaturaga tikish» qilganingizdan keyin yoki
                          admin sizga ish jild biriktirganda shu yerda ko‘rinadi
                        </p>
                      </TableCell>
                    </TableRow>
                  : nomeklatura.map((bolinmaItem) => (
                      <React.Fragment
                        key={String(
                          (bolinmaItem._id as { $oid?: string })?.$oid ??
                            bolinmaItem._id
                        )}>
                        <TableRow className="bg-slate-100/80">
                          <TableCell
                            colSpan={9}
                            className="py-2 text-center text-sm font-bold uppercase tracking-wide text-indigo-700">
                            {bolinmaItem.bolinma}
                          </TableCell>
                        </TableRow>
                        {bolinmaItem.nomeklaturalar.map((item) => {
                          const id =
                            (
                              typeof item._id === 'object' &&
                              item._id &&
                              '$oid' in item._id
                            ) ?
                              item._id.$oid
                            : String(item._id);
                          const isSigned = item.status === 'APPROVED';
                          const relation = item.relation ?? 'author';

                          return (
                            <TableRow
                              key={id}
                              className="border-slate-100 transition-colors hover:bg-sky-50/40">
                              <TableCell
                                className={`${tdClass} text-center font-medium`}>
                                {item.registrationIndex}
                              </TableCell>
                              <TableCell className={tdClass}>
                                {item.title}
                              </TableCell>
                              <TableCell className={tdClass}>
                                <span
                                  className={cn(
                                    'inline-flex max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ring-1 ring-inset',
                                    relationBadgeClass(relation)
                                  )}>
                                  {USER_NOMEKLATURA_RELATION_LABEL[relation]}
                                </span>
                              </TableCell>
                              <TableCell
                                className={`${tdClass} text-center`}>
                                {item.grif}
                              </TableCell>
                              <TableCell
                                className={`${tdClass} text-center whitespace-nowrap`}>
                                {dayjs(toDate(item.createdAt)).format('DD.MM.YYYY')}
                              </TableCell>
                              <TableCell className={tdClass}>
                                {item.author?.fullName || '—'}
                              </TableCell>
                              <TableCell className={tdClass}>
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                                    isSigned ?
                                      'bg-emerald-100 text-emerald-700 ring-emerald-200'
                                    : 'bg-amber-100 text-amber-700 ring-amber-200'
                                  )}>
                                  {isSigned ? 'Imzolangan' : 'Imzolanmagan'}
                                </span>
                              </TableCell>
                              <TableCell
                                className={`${tdClass} text-center`}>
                                {item.saqlashMuddati === 'doimiy' ?
                                  'Doimiy'
                                : `${item.saqlashMuddati || '—'} yil`}
                                {item.qonunTuri ?
                                  <>
                                    <br />
                                    <span className="text-xs text-slate-500">
                                      {item.qonunTuri}
                                    </span>
                                  </>
                                : null}
                              </TableCell>
                              <TableCell
                                className={`${tdClass} text-center`}>
                                <div className="flex items-center justify-center gap-1.5">
                                  {!isSigned && canAccept(item) ?
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 border-emerald-200 bg-emerald-50 px-2 text-emerald-800 hover:bg-emerald-100"
                                      disabled={acceptingId === id}
                                      onClick={() => handleAccept(id)}
                                      title="Qabul qilish (bir marta)">
                                      {acceptingId === id ?
                                        <Loader2 className="size-3.5 animate-spin" />
                                      : <Check className="size-3.5" />}
                                      Qabul qilish
                                    </Button>
                                  : null}
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                    onClick={() => {
                                      setSelectedId(id);
                                      setIsModalOpen(true);
                                    }}
                                    title="Ish jildni ochish">
                                    <FolderOpen className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </div>
        }
      </div>

      <ModalArxiv
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedId(null);
        }}
        id={selectedId}
      />
    </Shell>
  );
}
