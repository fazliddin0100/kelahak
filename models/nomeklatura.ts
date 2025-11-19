import mongoose, { Schema, Document } from 'mongoose';

export enum NomeklaturaStatus {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

export interface IAuthor {
  userId: string; // agar reference bo‘lsa ObjectId
  fullName: string;
  militaryRank: string;
  position: string;
  department: string;
  province: string;
}

export interface INomeklatura extends Document {
  registrationIndex: string;
  title: string;
  grif: string;
  saqlashMuddati: string | number;
  qonunTuri: string;
  bolinma: mongoose.Types.ObjectId[];
  bolim: mongoose.Types.ObjectId[];
  owner: mongoose.Types.ObjectId;
  author: IAuthor;
  status: NomeklaturaStatus;
}

const NomeklaturaSchema: Schema = new Schema(
  {
    registrationIndex: { type: String, required: true },
    title: { type: String, required: true },
    grif: { type: String, required: true },
    saqlashMuddati: { type: Schema.Types.Mixed, required: true }, // string yoki number
    qonunTuri: { type: String, required: true },
    bolinma: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Bolinma', required: true },
    ],
    bolim: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Bolim', required: true },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    author: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      fullName: { type: String, required: true },
      militaryRank: { type: String, required: true },
      position: { type: String, required: true },
      department: { type: String, required: true },
      province: { type: String, required: true },
    },
    status: {
      type: String,
      enum: Object.values(NomeklaturaStatus),
      default: NomeklaturaStatus.CREATED,
    },
  },
  { timestamps: true }
);

export const NomeklaturaModel =
  mongoose.models.Nomeklatura || mongoose.model<INomeklatura>('Nomeklatura', NomeklaturaSchema);
