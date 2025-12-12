import mongoose, { Document, Schema } from 'mongoose';
import { DocumentStatus } from '@/types/document-status.enum';

type Approver = {
  position: string;
  fullName: string;
  militaryRank: string;
  userId: mongoose.Types.ObjectId;
  hasSigned: boolean;
  signedAt?: Date;
};

type MainApprover = Approver;

type Author = {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  militaryRank: string;
  position: string;
  hasSigned: boolean;
  signedAt?: Date;
};

export type IDocument = Document & {
  title: string;
  grif: string;
  copyNumber: string[];
  content: Record<string, any>;
  position: string;
  militaryRank: string;
  fullName: string;
  approvers: Approver[];
  bosSigned: MainApprover | null;
  isShared: boolean;
  owner: mongoose.Types.ObjectId;
  status: DocumentStatus;
  allowedUsers: mongoose.Types.ObjectId[];
  attachmentText: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  sharedWithAdmin: boolean;
  sender?: Approver;
  receiver?: Array<{
    userId: mongoose.Types.ObjectId;
    fullName: string;
    militaryRank: string;
    position: string;
  }>;
  author?: Author;
  nomenclatureId?: mongoose.Types.ObjectId;
  registrationIndex?: number;
  year?: number;
  ownerRegion?: string;
  parentId?: mongoose.Types.ObjectId;
  isCopy?: boolean;
  forwardedBy?: mongoose.Types.ObjectId;
  forwardedTo?: mongoose.Types.ObjectId[];
  forwardedComment?: string;
  replyTo?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
};

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String },
    content: { type: Schema.Types.Mixed },
    grif: { type: String },
    position: { type: String },
    militaryRank: { type: String },
    fullName: { type: String },
    copyNumber: { type: [String], default: [] },

    approvers: {
      type: [
        {
          fullName: String,
          militaryRank: String,
          position: String,
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          hasSigned: { type: Boolean, default: false },
          signedAt: Date,
        },
      ],
      default: [],
    },

    sender: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      militaryRank: String,
      position: String,
      hasSigned: { type: Boolean, default: false },
      signedAt: Date,
    },

    receiver: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        fullName: String,
        militaryRank: String,
        position: String,
      },
    ],

    author: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      militaryRank: String,
      position: String,
      hasSigned: { type: Boolean, default: false },
    },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.YANGI,
    },

    allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    sharedWithAdmin: { type: Boolean, default: false },

    bosSigned: {
      type: {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        fullName: String,
        militaryRank: String,
        position: String,
        hasSigned: { type: Boolean, default: false },
        signedAt: Date,
      },
      default: { hasSigned: false },
    },

    nomenclatureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nomeklatura',
    },

    registrationIndex: { type: Number },
    year: { type: Number },
    ownerRegion: { type: String },

    parentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    attachmentText: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    isCopy: { type: Boolean, default: false },
    forwardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    forwardedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    forwardedComment: { type: String },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Document' },
    resolvedAt: Date,
  },
  { timestamps: true }
);

export const DocumentModel =
  mongoose.models.Document ||
  mongoose.model<IDocument>('Document', DocumentSchema);
