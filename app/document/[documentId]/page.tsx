'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useTashkilot } from '@/hooks/useTashkilot';
import dxxlogo from '@/public/dxxLogo.png';
import { DocumentFormValues } from '@/types/user';
import { FilePenLine, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import TnyEditor, { type TinyEditorHandle } from '@/editor/tnyEditor';
import { canUserEditOwnDocument } from '@/lib/documentEditRules';
import { useRoleHook } from '@/hooks/useRoleHook';
import { useEffect, useMemo, useRef, useState } from 'react';
import { attachmentTextToFormIds } from '@/lib/parseAttachmentTextIds';
import Inputs from './inputs';

const getFullName = (item: any): string => {
  if (!item?.personal) return '';
  const { name = '', fName = '', sName = '' } = item.personal;
  return `${fName} ${name} ${sName}`.trim();
};

const authorToFormSender = (author: {
  userId?: string;
  fullName?: string;
  militaryRank?: string;
  position?: string;
} | null) => {
  if (!author?.userId) return null;
  const parts = (author.fullName || '').trim().split(/\s+/).filter(Boolean);
  let fName = '';
  let name = '';
  let sName = '';
  if (parts.length >= 3) {
    fName = parts[0];
    name = parts[1];
    sName = parts.slice(2).join(' ');
  } else if (parts.length === 2) {
    fName = parts[0];
    name = parts[1];
  } else if (parts.length === 1) {
    fName = parts[0];
  }
  return {
    userId: author.userId,
    personal: { fName, name, sName },
    job: {
      militaryRank: author.militaryRank || '',
      position: author.position || '',
    },
  };
};

const DocumentPage = () => {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.documentId as string;

  const { data: tashkilotData } = useTashkilot();
  const { userId } = useRoleHook();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [docStatus, setDocStatus] = useState<string | undefined>();
  const [docOwner, setDocOwner] = useState<unknown>();
  const [docAuthor, setDocAuthor] = useState<{ userId?: unknown } | null>(null);
  const editorRef = useRef<TinyEditorHandle>(null);

  const canEdit = useMemo(
    () =>
      canUserEditOwnDocument(
        { owner: docOwner, author: docAuthor, status: docStatus },
        userId
      ),
    [docOwner, docAuthor, docStatus, userId]
  );

  const [formValues, setFormValues] = useState<DocumentFormValues>({
    editorContent: '',
    grifi: '',
    nomi: '',
    selectedRegions: [],
    imzoMain: null,
    imzoAll: [],
    buyruqSender: null,
    buyruqReceivers: [],
    xatSender: null,
    xatReceivers: [],
    attachmentText: [],
  });

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        setIsFetching(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Siz tizimda mavjud emassiz!');
          router.push('/sign-in');
          return;
        }
        const res = await fetch(`/api/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Hujjatni yuklab bo‘lmadi');
        }
        const doc = await res.json();
        setDocStatus(doc.status);
        setDocOwner(doc.owner);
        setDocAuthor(doc.author ?? null);
        const senderForm =
          doc.sender?.userId ? doc.sender : authorToFormSender(doc.author);
        setFormValues({
          editorContent: doc.content || '',
          grifi: doc.grif || '',
          nomi: doc.title || '',
          selectedRegions: doc.copyNumber || [],
          imzoMain: doc.signerInfo || null,
          imzoAll: doc.approvers || [],
          buyruqSender: senderForm,
          buyruqReceivers: Array.isArray(doc.receiver) ? doc.receiver : [],
          xatSender: senderForm,
          xatReceivers: Array.isArray(doc.receiver) ? doc.receiver : [],
          attachmentText: attachmentTextToFormIds(doc.attachmentText),
        });
      } catch (err: any) {
        toast.error(err.message || 'Hujjatni ochishda xatolik');
        router.push('/kotibiyat');
      } finally {
        setIsFetching(false);
      }
    };
    fetchDocument();
  }, [documentId, router]);

  const handleSave = async () => {
    if (!documentId) {
      toast.error('Hujjat ID topilmadi!');
      return;
    }
    if (!canEdit) {
      toast.error('Hujjat ro‘yxatga olingan — tahrirlash mumkin emas');
      return;
    }
    setIsLoading(true);
    try {
      const htmlContent =
        editorRef.current?.getHtml()?.trim() ||
        formValues.editorContent?.trim() ||
        '';

      const payload: any = {
        title: formValues.nomi || '',
        grif: formValues.grifi || '',
        copyNumber: formValues.selectedRegions || [],
        content: htmlContent,
        attachmentText: attachmentTextToFormIds(formValues.attachmentText),

        signerInfo:
          formValues.imzoMain ?
            {
              userId: formValues.imzoMain.userId,
              fullName: formValues.imzoMain.fullName,
              militaryRank: formValues.imzoMain.militaryRank || '',
              position: formValues.imzoMain.position || '',
              hasSigned: false,
            }
          : null,

        approvers: (formValues.imzoAll || []).map((a: any) => ({
          userId: a.userId,
          fullName: a.fullName,
          militaryRank: a.militaryRank || '',
          position: a.position || '',
          hasSigned: false,
        })),

        sender:
          formValues.buyruqSender ?
            {
              userId: formValues.buyruqSender.userId,
              fullName: getFullName(formValues.buyruqSender),
              militaryRank: formValues.buyruqSender.job?.militaryRank || '',
              position: formValues.buyruqSender.job?.position || '',
              hasSigned: false,
            }
          : formValues.xatSender ?
            {
              userId: formValues.xatSender.userId,
              fullName: getFullName(formValues.xatSender),
              militaryRank: formValues.xatSender.job?.militaryRank || '',
              position: formValues.xatSender.job?.position || '',
              hasSigned: false,
            }
          : null,

        receiver: (formValues.buyruqReceivers || []).map((r: any) => ({
          userId: r.userId,
          fullName: getFullName(r),
          militaryRank: r.job?.militaryRank || '',
          position: r.job?.position || '',
        })),

        ...(formValues.xatSender && {
          sender: {
            userId: formValues.xatSender.userId,
            fullName: getFullName(formValues.xatSender),
            militaryRank: formValues.xatSender.job?.militaryRank || '',
            position: formValues.xatSender.job?.position || '',
            hasSigned: false,
          },
        }),

        ...(formValues.xatReceivers?.length > 0 && {
          receiver: formValues.xatReceivers.map((r: any) => ({
            userId: r.userId,
            fullName: getFullName(r),
            militaryRank: r.job?.militaryRank || '',
            position: r.job?.position || '',
          })),
        }),
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success('Hujjat muvaffaqiyatli yangilandi!');
        if (result.user === 'admin') {
          setTimeout(() => router.push('/kotibiyat'), 500);
        } else if (result.user === 'komandir') {
          setTimeout(() => router.push('/komandir'), 500);
        } else {
          setTimeout(() => router.push('/user'), 500);
        }
      } else {
        toast.error(result.message || 'Saqlashda xatolik');
      }
    } catch (error: any) {
      toast.error('Tarmoq xatosi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <Loader2 className="mx-auto mb-4 size-10 animate-spin text-sky-500" />
          <p className="text-sm font-medium text-slate-600">
            Hujjat yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <Image
                src={dxxlogo}
                alt="DXX Logo"
                width={36}
                height={36}
                loading="eager"
                className="object-contain image_navbar360 rounded-sm"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white sm:text-base">
                {tashkilotData?.organ ?
                  tashkilotData.organ.charAt(0).toUpperCase() +
                  tashkilotData.organ.slice(1)
                : 'DXX'}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-slate-400">
                <FilePenLine className="size-3.5 shrink-0" />
                {formValues.nomi || 'Hujjat tahriri'}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isLoading || !canEdit}
            className="shrink-0 gap-2 bg-sky-600 px-5 text-white shadow-md hover:bg-sky-500 disabled:opacity-60">
            {isLoading ?
              <Loader2 className="size-4 animate-spin" />
            : <Save className="size-4" />}
            {isLoading ?
              'Saqlanmoqda...'
            : canEdit ?
              'Saqlash'
            : 'Tahrirlash yopiq'}
          </Button>
        </div>

        <div className="border-t border-slate-700/50 bg-slate-800/60 px-4 py-2.5 sm:px-6">
          <Inputs formValues={formValues} setFormValues={setFormValues} />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TnyEditor
          ref={editorRef}
          editorKey={documentId}
          readOnly={!canEdit}
          initialContent={formValues.editorContent}
          setEditorContent={(val) =>
            setFormValues((prev) => ({ ...prev, editorContent: val }))
          }
        />
      </main>
    </div>
  );
};

export default DocumentPage;
