import {YollovXati} from "@/namunalar/yollov-xati";
import {Dalolatnoma} from "@/namunalar/dalolatnoma";
import {Malumotnoma} from "@/namunalar/malumotnoma";
import {Buyruq} from "@/namunalar/buyruq";
import {Bildirgi} from "@/namunalar/bildirgi";
import { DocumentType } from '@/types/document';
import { ensureSenderFromAuthor } from '@/lib/ensureDocumentParties';
import { resolveTemplateKeyFromTitle } from '@/lib/resolveDocumentTemplateKey';

interface DocumentRendererProps {
    document: DocumentType;
    /** document-open: asosiy + ilova bir qatorda, chapga surilmasin */
    embedded?: boolean;
}

export default function DocumentRenderer({ document, embedded }: DocumentRendererProps) {
    const doc = ensureSenderFromAuthor(document as unknown as Record<string, unknown>) as unknown as DocumentType;
    const templateKey = resolveTemplateKeyFromTitle(doc.title);

    switch (templateKey) {
        case "xat":
            return <YollovXati document={doc} embedded={embedded} />;
        case "dalolatnoma":
            return <Dalolatnoma document={doc} embedded={embedded} />;
        case "malumotnoma":
            return <Malumotnoma document={doc} data={doc} embedded={embedded} />;
        case "bildirgi":
            return <Bildirgi document={doc} embedded={embedded} />;
        case "buyruq":
            return <Buyruq document={doc} embedded={embedded} />;
        default:
            return (
              <p className="p-8 text-center text-red-600 font-bold">
                Hujjat turi topilmadi: &quot;{doc.title || '—'}&quot;
              </p>
            );
    }
}