import mongoose, { Schema, Document } from 'mongoose';

export type IDocument = Document & {
  province: string;
  bolinma: string;
};

const BolinmaSchema = new Schema<IDocument>(
  {
    province: { type: String, required: true },
    bolinma: { type: String, required: true },
  },
  { timestamps: true }
);

export const BolinmaModel =
  mongoose.models.Bolinma ||
  mongoose.model<IDocument>('Bolinma', BolinmaSchema);
