import {YollovXati} from "@/namunalar/yollov-xati";
import {Dalolatnoma} from "@/namunalar/dalolatnoma";
import {Malumotnoma} from "@/namunalar/malumotnoma";
import {Buyruq} from "@/namunalar/buyruq";
import {Bildirgi} from "@/namunalar/bildirgi";
import { DocumentType } from '@/types/document';



interface DocumentRendererProps {
    document: DocumentType;
}

export default function DocumentRenderer({ document }: DocumentRendererProps) {
    switch (document.title?.toLowerCase().trim()) {
        case "xat":
            return <YollovXati document={document} />;
        case "dalolatnoma":
            return <Dalolatnoma document={document}  />;
        case "malumotnoma":
        case "ma'lumotnoma":
            return <Malumotnoma document={document}  />;
        case "bildirgi":
            return <Bildirgi document={document}  />;
        case "buyruq":
            return <Buyruq document={document} />;
        default:
            return <p className="text-red-500 font-bold">Hujjat turi topilmadi</p>;
    }
}