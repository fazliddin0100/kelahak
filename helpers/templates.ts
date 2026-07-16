import blank from "../public/blank-document.svg";
import malumotnoma from "../public/malumotnoma.png";
import xat from "../public/xat.png";
import buyruq from "../public/buyruq.png";
import bildirgi from "../public/bildirgi.png";
import {StaticImageData} from "next/image";

export type Template = {
    id: string;
    label: string;
    imageUrl: StaticImageData;
};

export const templates: Template[] = [
    {id: "blank", label: "yangi hujjat", imageUrl: blank},
    {id: "malumotnoma", label: "malumotnoma", imageUrl: malumotnoma},
    {id: "xat", label: "xat", imageUrl: xat},
    {id: "dalolatnoma", label: "dalolatnoma", imageUrl: xat}, // agar boshqa rasm bo‘lsa, o‘zgartiring
    {id: "buyruq", label: "buyruq", imageUrl: buyruq},
    {id: "bildirgi", label: "bildirgi", imageUrl: bildirgi},
];
