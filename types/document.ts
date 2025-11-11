// ===================== types/document.ts =====================
import { IUserPopulated } from "./user";

export interface Approver {
  user: IUserPopulated;   // <-- userga bog‘landi
  role?: string;
  hasSigned: boolean;
  signedAt?: string | { $date: string };
  _id?: string | { $oid: string };
}

export interface Sender {
  user: IUserPopulated;   // <-- userga bog‘landi
  hasSigned?: boolean;
  signedAt?: string | { $date: string };
}

export interface Receiver {
  user: IUserPopulated;   // <-- userga bog‘landi
  _id?: string | { $oid: string };
}

export interface Author {
  user: IUserPopulated;   // <-- userga bog‘landi
  hasSigned: boolean;
  [key: string]: unknown;
}

export interface DocumentType {
  _id: string | { $oid: string };
  title?: string;
  content?: string | Record<string, unknown>;
  grif?: string;
  copyNumber?: string[];
  status?: string;
  sharedWithAdmin?: boolean;
  registrationIndex?: string | number;
  registrationIndexCopy?: string | number;
  receivedCopy?: string | number;
  createdAt?: string | Date | { $date: string };
  updatedAt?: string | Date | { $date: string };
  owner?: IUserPopulated | string | { $oid: string }; // <-- owner ham user bo‘lishi mumkin
  ownerRegion?: string;
  sourceRegion: string[] | string;
  entryIndex: string;
  province: string;
  hasSigned?: boolean;
  onSign: (updatedDocument: DocumentType) => void;
  sender?: Sender;
  receiver?: Receiver[];
  author?: Author;
  approvers?: Approver[];
  allowedUsers?: Array<IUserPopulated | string | { $oid: string }>;
  pdfBuffer?: string;
  pdfPath?: string;
  canSign?: boolean;
  description?: string;
  fileUrl?: string;
  isAuthorUnsigned?: boolean;
  bosSigned?: Sender;
  archiveInfo?: {
    bandNumber?: string | number;
    year?: string | number;
    [key: string]: unknown;
  };
  year?: string | number;
  parentId?: string | { $oid: string };
  forwardedTo?: Array<IUserPopulated | string | { $oid: string }>;
  isCopy?: boolean;
  sharedWithUser?: boolean;
  __v?: number;
  data?: unknown;
}
