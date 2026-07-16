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
      className={cn(
        'mt-[15px] bg-[#F1F3F4]',
        className
      )}>
      <div className="mx-auto flex max-w-7xl flex-col gap-y-4 px-8 py-6 sm:px-12 lg:px-16">
        <Carousel>
          <CarouselContent className="ml-4">
            {templates.map((template) => (
              <CarouselItem
                key={template.id}
                className="basis-1/2 pl-4 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-[14.285714%]">
                <div
                  className={cn(
                    'flex aspect-3/4 flex-col gap-y-2.5',
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
                      'group flex h-full w-full flex-col items-center justify-center gap-y-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200',
                      'hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md hover:shadow-sky-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40'
                    )}
                    aria-label={`Create new document from ${template.label} template`}>
                    {isCreating && (
                      <span className="size-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                    )}
                  </button>

                  <p
                    className="truncate text-center text-sm font-medium capitalize text-slate-700 sm:text-base"
                    title={template.label}>
                    {template.label}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-2 border-slate-200 bg-white shadow-md hover:bg-slate-50" />
          <CarouselNext className="-right-2 border-slate-200 bg-white shadow-md hover:bg-slate-50" />
        </Carousel>
      </div>
    </div>
  );
};
