import {YollovXati} from "@/namunalar/yollov-xati";
import {Dalolatnoma} from "@/namunalar/dalolatnoma";
import {Malumotnoma} from "@/namunalar/malumotnoma";
import {Buyruq} from "@/namunalar/buyruq";
import {Bildirgi} from "@/namunalar/bildirgi";
import { Umumiy } from "@/namunalar/umumiy";
import { DocumentType } from '@/types/document';
import { ensureSenderFromAuthor } from '@/lib/ensureDocumentParties';
import { resolveTemplateKeyFromTitle } from '@/lib/resolveDocumentTemplateKey';

interface DocumentRendererProps {
    document: DocumentType;
    /** document-open: asosiy + ilova bir qatorda, chapga surilmasin */
    embedded?: boolean;
}

export default function DocumentRenderer(props: DocumentRendererProps) {
    // Hujjat matnini belgilash/nusxalash taqiqlangan (components/DocumentProtection.tsx)
    return (
        <div data-protected className="contents mezon-document-font">
            <DocumentTemplate {...props} />
        </div>
    );
}

function DocumentTemplate({ document, embedded }: DocumentRendererProps) {
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
            // Shablonsiz ("Yangi hujjat"): nomini user matnda o'zi yozadi
            return <Umumiy document={doc} embedded={embedded} />;
    }
}