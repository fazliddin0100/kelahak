import mongoose, { Schema, Document } from "mongoose";
import {DocumentStatus} from '@/types/document-status.enum'
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
    createdAt: Date;
    updatedAt: Date;
    sharedWithUser: boolean;
    sender?: Approver;
    receiver?: Array<{
        userId: mongoose.Types.ObjectId;
        fullName: string;
        militaryRank: string;
        position: string;
    }>;
    author?: Author;
    nomenclatureId?: mongoose.Types.ObjectId;
    registrationIndexCopy?: number;
    receivedCopy?: number;
    year?: number;
    ownerRegion?: string;
    sourceRegion?: string;
    parentId?: mongoose.Types.ObjectId; // Asosiy hujjatga bog'liqlik
    isCopy?: boolean; // Nusxa hujjatmi
    forwardedBy?: mongoose.Types.ObjectId; // Rezalutsiya qilgan user
    forwardedTo?: mongoose.Types.ObjectId[]; // Qabul qiluvchilar
    forwardedComment?: string; // Rezalutsiya izohi
    replyTo?: mongoose.Types.ObjectId; // Javob bo‘lsa, asosiy hujjatga link
    resolvedAt?: Date; // Rezalutsiya sanasi
};

const DocumentCopySchema = new Schema<IDocument>(
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
                    userId: { type: Schema.Types.ObjectId, ref: "Auth" },
                    hasSigned: { type: Boolean, default: false },
                    signedAt: Date,
                },
            ],
            default: [],
        },
        sender: {
            userId: { type: Schema.Types.ObjectId, ref: "Auth" },
            fullName: String,
            militaryRank: String,
            position: String,
            hasSigned: { type: Boolean, default: false },
            signedAt: Date,
        },
        receiver: [
            {
                userId: { type: Schema.Types.ObjectId, ref: "Auth" },
                fullName: String,
                militaryRank: String,
                position: String,
            },
        ],
        author: {
            userId: { type: Schema.Types.ObjectId, ref: "Auth" },
            fullName: String,
            militaryRank: String,
            position: String,
            hasSigned: { type: Boolean, default: false },
        },
        owner: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
        status: {
            type: String,
            enum: Object.values(DocumentStatus),
            default: DocumentStatus.YANGI,
        },
        allowedUsers: [{ type: Schema.Types.ObjectId, ref: "Auth" }],
        sharedWithUser: { type: Boolean, default: false },
        bosSigned: {
            userId: { type: Schema.Types.ObjectId, ref: "Auth" },
            fullName: String,
            militaryRank: String,
            position: String,
            hasSigned: { type: Boolean, default: false },
            signedAt: Date,
        },
        nomenclatureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Nomeklatura",
        },
        registrationIndexCopy: { type: Number, required: false },
        receivedCopy: { type: Number, required: false },
        year: { type: Number, required: false },
        ownerRegion: { type: String, required: false },
        sourceRegion: { type: String, required: false },

        // YANGI QO‘SHILGAN QISMLAR
        parentId: { type: Schema.Types.ObjectId, ref: "Document" }, // Asosiy hujjatga bog'liq bo‘lsa, shu hujjatga ID
        isCopy: { type: Boolean, default: false }, // Hujjat nusxami yoki aslmi
        forwardedBy: { type: Schema.Types.ObjectId, ref: "Auth" }, //Rezalutsiya qilgan foydalanuvchi ID
        forwardedTo: [{ type: Schema.Types.ObjectId, ref: "Auth" }], // 	Qabul qiluvchilar ro'yxati (ID)
        forwardedComment: { type: String }, // Rezalutsiya izohi
        replyTo: { type: Schema.Types.ObjectId, ref: "Document" }, // Hujjat javob bo‘lsa, asosiy hujjat ID
        resolvedAt: Date, // Rezalutsiya sanasi
    },
    { timestamps: true }
);

export const DocumentCopyModel = mongoose.model<IDocument>(
    "DocumentCopy",
    DocumentCopySchema
);
