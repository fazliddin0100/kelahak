'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import dxxlogo from '@/public/dxxLogo.png';
import TnyEditor from '@/editor/tnyEditor';
import { Button } from '@/components/ui/button';
import Inputs from './inputs';
import { useTashkilot } from '@/hooks/useTashkilot';
import { DocumentFormValues } from '@/types/user';
import { toast } from '@/components/ui/sonner';
import { Save, Loader2 } from 'lucide-react';

const getFullName = (item: any): string => {
  if (!item?.personal) return '';
  const { name = '', fName = '', sName = '' } = item.personal;
  return `${name} ${fName} ${sName}`.trim();
};

const DocumentPage = () => {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.documentId as string;

  const { data: tashkilotData } = useTashkilot();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
    attachmentText: [], // <-- qo‘shildi
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
        setFormValues({
          editorContent: doc.content || '',
          grifi: doc.grif || '',
          nomi: doc.title || '',
          selectedRegions: doc.copyNumber || [],
          imzoMain: doc.signerInfo || null,
          imzoAll: doc.approvers || [],
          buyruqSender: doc.sender || null,
          buyruqReceivers: Array.isArray(doc.receiver) ? doc.receiver : [],
          xatSender: doc.sender || null,
          xatReceivers: Array.isArray(doc.receiver) ? doc.receiver : [],
          attachmentText: doc.attachmentText || [], // <-- backenddan kelganini yuklaydi
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
    setIsLoading(true);
    try {
      const payload: any = {
        title: formValues.nomi || '',
        grif: formValues.grifi || '',
        copyNumber: formValues.selectedRegions || [],
        content: formValues.editorContent || '',
        attachmentText: formValues.attachmentText || [], // <-- ilovalar

        signerInfo: formValues.imzoMain
          ? {
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

        sender: formValues.buyruqSender
          ? {
              userId: formValues.buyruqSender.userId,
              fullName: getFullName(formValues.buyruqSender),
              militaryRank: formValues.buyruqSender.job?.militaryRank || '',
              position: formValues.buyruqSender.job?.position || '',
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
          setTimeout(() => {
            router.push('/kotibiyat');
          }, 500);
        } else {
          setTimeout(() => {
            router.push('/user');
          }, 500);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Hujjat yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="w-full bg-gray-200 fixed top-0 z-50 flex flex-row items-center justify-between px-4 py-2 shadow-md">
        <div className="flex flex-row items-center gap-3">
          <Image
            src={dxxlogo}
            alt="DXX Logo"
            width={50}
            height={50}
            loading="eager"
            className="object-contain image_navbar360"
          />
          <span className="text-4xl uppercase font-semibold">
            {tashkilotData?.organ
              ? tashkilotData.organ.charAt(0).toUpperCase() +
                tashkilotData.organ.slice(1)
              : 'DXX'}
          </span>
        </div>

        <div className="flex-1 max-w-7xl mx-4">
          <Inputs formValues={formValues} setFormValues={setFormValues} />
        </div>

        <div>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isLoading}
            className="min-w-32">
            <Save className="size-6" />
            {isLoading ? 'Saqlanmoqda...' : 'SAQLASH'}
          </Button>
        </div>
      </nav>

      <div className="w-full h-full mt-20 px-4 pb-10">
        <TnyEditor
          initialContent={formValues.editorContent}
          setEditorContent={(val) =>
            setFormValues((prev) => ({ ...prev, editorContent: val }))
          }
        />
      </div>
    </>
  );
};

export default DocumentPage;
