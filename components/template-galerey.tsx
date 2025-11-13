"use client";

import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { templates } from "@/helpers/templates";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";

// Hujjat yaratish funksiyasi
const create = async ({
                          title,
                          content,
                      }: {
    title: string;
    content: string;
}) => {
    if (typeof window === "undefined") throw new Error("Client-side only");

    const token = localStorage.getItem("token");
    if (!token) throw new Error("Token topilmadi");

    try {
        const response = await axios.post(
            "/api/documents",
            { title, content },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data._id;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.message || "Hujjat yaratishda xatolik yuz berdi");
        }
        throw new Error("Hujjat yaratishda xatolik yuz berdi");
    }
};

export const TemplateGallery = () => {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);

    const onTemplateClick = async (templateLabel: string) => {
        setIsCreating(true);
        try {
            // title = template.label, content = ""
            const documentId = await create({ title: templateLabel, content: "" });

            // Hujjat yaratilib bo‘lgach yangi sahifaga yo‘naltirish
            router.push(`/document/${documentId}`);
        } catch (err) {
            console.error(err);
            alert("Hujjat yaratishda xatolik yuz berdi");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="bg-[#F1F3F4] mt-[15px]">
            <div className="max-w-screen-xl mx-auto px-16 py-6 flex-col gap-y-4">
                <Carousel>
                    <CarouselContent className="ml-4">
                        {templates.map((template) => (
                            <CarouselItem
                                key={template.id}
                                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-[14.285714%] pl-4"
                            >
                                <div
                                    className={cn(
                                        "aspect-[3/4] flex flex-col gap-y-2.5",
                                        isCreating && "pointer-events-none opacity-50"
                                    )}
                                >
                                    <button
                                        disabled={isCreating}
                                        onClick={() => onTemplateClick(template.label)}
                                        style={{
                                            backgroundImage: `url(${template.imageUrl.src})`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            backgroundRepeat: "no-repeat",
                                        }}
                                        className="w-full h-full hover:border-blue-500 rounded-sm border hover:bg-blue-50 flex flex-col items-center justify-center gap-y-4 bg-white"
                                        aria-label={`Create new document from ${template.label} template`}
                                    >
                                        {isCreating && <span className="animate-spin">⏳</span>}
                                    </button>

                                    <p
                                        className="text-sm font-medium truncate text-center text-[18px]"
                                        title={template.label}
                                    >
                                        {template.label}
                                    </p>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </div>
        </div>
    );
};
