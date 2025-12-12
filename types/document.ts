// ===================== types/document.ts =====================
import { IUserPopulated } from './user';

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

// Approver (tasdiqlovchi) tip
export interface Approver extends BaseSigner {
  role?: string;
  hasSigned: boolean;
  signedAt?: DateLike;
  _id?: ObjectIdLike;
}

// Sender (jo‘natuvchi) tip
export interface Sender extends BaseSigner {
  hasSigned?: boolean;
  signedAt?: DateLike;
}

// Receiver (qabul qiluvchi) tip
export interface Receiver extends BaseSigner {
  _id?: ObjectIdLike;
}

// Author (muallif) tip
export interface Author extends BaseSigner {
  hasSigned: boolean;
  [key: string]: unknown; // qo‘shimcha optional fieldlar uchun
}

export interface PersonalDocument {
  _id: string;
  name: string;
  fName: string;
  sName: string;
  province: string;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

export interface NomeklaturaDocument {
  _id: string;
  registrationIndex: string;
  title: string;
  grif: string;
  qonunTuri: string;
  bolinma: string;
  bolim: string;
  owner: string;
  author: BaseSigner;
  saqlashMuddati: string | number;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

// Hujjat tipi
export interface DocumentType {
  _id: string;
  title?: string;
  content?: string | object;
  grif?: string; // Maxfiylik darajasi
  copyNumber?: string[];
  attachmentText?: string[]; // ilova matni
  status?: string;
  sharedWithAdmin?: boolean;
  registrationIndex?: string | number;
  registrationIndexCopy?: string | number;
  receivedCopy?: string | number;
  createdAt?: DateLike;
  updatedAt?: DateLike;
  owner?: IUserPopulated | ObjectIdLike;
  ownerRegion?: string;
  sourceRegion?: string[] | string;
  entryIndex: string;
  province: string;
  position: string;
  militaryRank: string;
  fullName: string;
  hasSigned?: boolean;
  onSign: () => void;
  forwardedBy?: BaseSigner;
  sender?: Sender;
  receiver?: Receiver[];
  author?: Author;
  approvers?: Approver[];
  bosSigned?: Sender;
  nomenclatureId?: NomeklaturaDocument;
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
