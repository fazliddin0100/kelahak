import blank from "../public/blank-document.svg";
import {StaticImageData} from "next/image";

export type Template = {
    id: string;
    label: string;
    imageUrl: StaticImageData;
};

/**
 * Galereyada faqat bo'sh «Yangi hujjat» (+) qoladi; qolganlari — userning
 * o'zi yaratgan shaxsiy namunalari (DocumentTemplate, galereyada dinamik).
 * Eski rasmli shablonlar (ma'lumotnoma, xat, ...) olib tashlandi; mavjud hujjatlar
 * o'z nomi bo'yicha avvalgidek ko'rsatiladi.
 */
export const templates: Template[] = [
    {id: "blank", label: "yangi hujjat", imageUrl: blank},
];
