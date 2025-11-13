// ===================== types/document.ts =====================
import { IUserPopulated } from "./user";

// MongoDB extended JSON helper typelar
export type ObjectIdLike = string | { $oid: string };
export type DateLike = string | Date | { $date: string };

// Umumiy signer type
export interface BaseSigner {
    fullName: string;
    militaryRank: string;
    position: string;
    user: IUserPopulated;
}

export interface Approver extends BaseSigner {
    role?: string;
    hasSigned: boolean;
    signedAt?: DateLike;
    _id?: ObjectIdLike;
}

export interface Sender extends BaseSigner {
    hasSigned?: boolean;
    signedAt?: DateLike;
}

export interface Receiver extends BaseSigner {
    _id?: ObjectIdLike;
}

export interface Author extends BaseSigner {
    hasSigned: boolean;
    // Agar qo‘shimcha fieldlar bo‘lsa, Partial sifatida kengaytirish mumkin
    [key: string]: unknown;
}

export interface DocumentType {
    _id: ObjectIdLike;
    title?: string;
    content?: string | object;
    grif?: string;
    copyNumber?: string[];
    status?: string;
    sharedWithAdmin?: boolean;
    registrationIndex?: string | number;
    registrationIndexCopy?: string | number;
    receivedCopy?: string | number;
    createdAt?: DateLike;
    updatedAt?: DateLike;
    owner?: IUserPopulated | ObjectIdLike;
    ownerRegion?: string;
    sourceRegion: string[] | string;
    entryIndex: string;
    province: string;
    position: string;
    militaryRank: string;
    fullName: string; // <-- string[] o‘rniga string
    hasSigned?: boolean;
    onSign: (updatedDocument: DocumentType) => void;

    sender?: Sender;
    receiver?: Receiver[];
    author?: Author;
    approvers?: Approver[];
    bosSigned?: Sender;

    allowedUsers?: Array<IUserPopulated | ObjectIdLike>;
    forwardedTo?: Array<IUserPopulated | ObjectIdLike>;

    pdfBuffer?: string;
    pdfPath?: string;
    fileUrl?: string;
    description?: string;

    canSign?: boolean;
    isAuthorUnsigned?: boolean;
    isCopy?: boolean;
    sharedWithUser?: boolean;

    archiveInfo?: {
        bandNumber?: string | number;
        year?: string | number;
        [key: string]: unknown;
    };

    year?: string | number;
    parentId?: ObjectIdLike;
    __v?: number;
    data?: unknown;
}
