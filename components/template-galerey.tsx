'use client';

import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { templates } from '@/helpers/templates';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';

// Hujjat yaratish funksiyasi
const create = async ({
  title,
  content,
  attachmentText = [],
}: {
  title: string;
  content: string;
  attachmentText?: string[];
}) => {
  if (typeof window === 'undefined') throw new Error('Client-side only');

  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token topilmadi');

  try {
    const response = await axios.post(
      '/api/documents',
      { title, content, attachmentText },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data._id;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Hujjat yaratishda xatolik yuz berdi'
      );
    }
    throw new Error('Hujjat yaratishda xatolik yuz berdi');
  }
};

interface TemplateGalleryProps {
  className?: string;
}

export const TemplateGallery = ({ className }: TemplateGalleryProps) => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const onTemplateClick = async (templateLabel: string) => {
    setIsCreating(true);
    try {
      // title = template.label, content = ""
      const documentId = await create({ title: templateLabel, content: '' });

      // Hujjat yaratilib bo‘lgach yangi sahifaga yo‘naltirish
      router.push(`/document/${documentId}`);
    } catch (err) {
      console.error(err);
      alert('Hujjat yaratishda xatolik yuz berdi');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className={cn('bg-transparent', className)}>
      <div className="mx-auto max-w-7xl px-2 py-2 sm:px-3">
        <Carousel>
          <CarouselContent className="ml-0 gap-2">
            {templates.map((template) => (
              <CarouselItem
                key={template.id}
                className="basis-[82px] pl-0 sm:basis-[88px]">
                <div
                  className={cn(
                    'flex flex-col items-center gap-1.5',
                    isCreating && 'pointer-events-none opacity-50'
                  )}>
                  <button
                    disabled={isCreating}
                    onClick={() => onTemplateClick(template.label)}
                    style={{
                      backgroundImage: `url(${template.imageUrl.src})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                    className={cn(
                      'relative flex h-[96px] w-[68px] items-center justify-center rounded-md border border-slate-200 bg-white transition-colors duration-150',
                      'hover:border-[#102c50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a75b]'
                    )}
                    aria-label={`Create new document from ${template.label} template`}>
                    {isCreating && (
                      <span className="size-4 animate-spin rounded-full border-2 border-[#102c50] border-t-transparent" />
                    )}
                  </button>

                  <p
                    className="w-full truncate text-center text-[10px] font-medium capitalize text-slate-700"
                    title={template.label}>
                    {template.label}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-1 size-7 border-slate-200 bg-white shadow-none hover:bg-slate-50" />
          <CarouselNext className="-right-1 size-7 border-slate-200 bg-white shadow-none hover:bg-slate-50" />
        </Carousel>
      </div>
    </div>
  );
};
