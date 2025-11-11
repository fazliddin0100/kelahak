import mongoose, {Document, Schema} from "mongoose";
import {DocumentStatus} from '@/types/document-status.enum';

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
    title: string; // nomi
    grif: string; // grif
    copyNumber: string[]; // RegionSelectModal
    content: Record<string, any>; // editor ichida olingan qiymatlari
    position: string; // lavozimi
    militaryRank: string; // unvoni
    fullName: string; // name+fName+sName
    approvers: Approver[]; // bu yerda kimlarga hujjatdan foydalanishga ruxsat beriladi id larei qoyiladi
    bosSigned: MainApprover | null;  // raxbarga yuborilganligi xususida
    isShared: boolean; // yuborilganligi xususida boolean
    owner: mongoose.Types.ObjectId; // yaratilgan viloyat
    status: DocumentStatus; // status
    allowedUsers: mongoose.Types.ObjectId[]; // hujjat kimlarga yuborilganligi xususida
    createdAt: Date;
    updatedAt: Date;
    sharedWithAdmin: boolean; // adminga yuborilganligi xususida
    sender?: Approver; // yuboruvchi
    receiver?: Array<{ // qabul qiluvchi
        userId: mongoose.Types.ObjectId;
        fullName: string;
        militaryRank: string;
        position: string;
    }>;
    author?: Author; // hujjat egasi
    nomenclatureId?: mongoose.Types.ObjectId; // nomeklatura id raqami
    registrationIndex?: number; // royxatga olingan raqam
    year?: number; // yil
    ownerRegion?: string; //
    parentId?: mongoose.Types.ObjectId; // Asosiy hujjatga bog'liqlik
    isCopy?: boolean; // Nusxa hujjatmi
    forwardedBy?: mongoose.Types.ObjectId; // Rezalutsiya qilgan user
    forwardedTo?: mongoose.Types.ObjectId[]; // Qabul qiluvchilar
    forwardedComment?: string; // Rezalutsiya izohi
    replyTo?: mongoose.Types.ObjectId; // Javob bo‘lsa, asosiy hujjatga link
    resolvedAt?: Date; // Rezalutsiya sanasi
};

const DocumentSchema = new Schema<IDocument>(
    {
        title: {type: String},
        content: {type: Schema.Types.Mixed},
        grif: {type: String},
        position: {type: String},
        militaryRank: {type: String},
        fullName: {type: String},
        copyNumber: {type: [String], default: []},
        approvers: {
            type: [
                {
                    fullName: String,
                    militaryRank: String,
                    position: String,
                    userId: {type: Schema.Types.ObjectId, ref: "User"},
                    hasSigned: {type: Boolean, default: false},
                    signedAt: Date,
                },
            ],
            default: [],
        },
        sender: {
            userId: {type: Schema.Types.ObjectId, ref: "User"},
            fullName: String,
            militaryRank: String,
            position: String,
            hasSigned: {type: Boolean, default: false},
            signedAt: Date,
        },
        receiver: [
            {
                userId: {type: Schema.Types.ObjectId, ref: "User"},
                fullName: String,
                militaryRank: String,
                position: String,
            },
        ],
        author: {
            userId: {type: Schema.Types.ObjectId, ref: "User"},
            fullName: String,
            militaryRank: String,
            position: String,
            hasSigned: {type: Boolean, default: false},
        },
        owner: {type: Schema.Types.ObjectId, ref: "User", required: true},
        status: {
            type: String,
            enum: Object.values(DocumentStatus),
            default: DocumentStatus.YANGI,
        },
        allowedUsers: [{type: Schema.Types.ObjectId, ref: "User"}],
        sharedWithAdmin: {type: Boolean, default: false},
        bosSigned: {
            userId: {type: Schema.Types.ObjectId, ref: "User"},
            fullName: String,
            militaryRank: String,
            position: String,
            hasSigned: {type: Boolean, default: false},
            signedAt: Date,
        },
        nomenclatureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Nomeklatura",
        },
        registrationIndex: {type: Number, required: false},
        year: {type: Number, required: false},
        ownerRegion: {type: String, required: false},

        // YANGI QO‘SHILGAN QISMLAR
        parentId: {type: Schema.Types.ObjectId, ref: "Document"}, // Asosiy hujjatga bog'liq bo‘lsa, shu hujjatga ID
        isCopy: {type: Boolean, default: false}, // Hujjat nusxami yoki aslmi
        forwardedBy: {type: Schema.Types.ObjectId, ref: "User"}, //Rezalutsiya qilgan foydalanuvchi ID
        forwardedTo: [{type: Schema.Types.ObjectId, ref: "User"}], // 	Qabul qiluvchilar ro'yxati (ID)
        forwardedComment: {type: String}, // Rezalutsiya izohi
        replyTo: {type: Schema.Types.ObjectId, ref: "Document"}, // Hujjat javob bo‘lsa, asosiy hujjat ID
        resolvedAt: Date, // Rezalutsiya sanasi
    },
    {timestamps: true}
);

export const DocumentModel =
    mongoose.models.Document ||
    mongoose.model<IDocument>("Document", DocumentSchema);
