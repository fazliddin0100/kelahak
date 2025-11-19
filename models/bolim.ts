import mongoose, { Schema, Document } from 'mongoose';

export interface IBolim extends Document {
  province: string;
  bolim: string;
}

const BolimSchema = new Schema<IBolim>(
  {
    province: { type: String, required: true },
    bolim: { type: String, required: true },
  },
  { timestamps: true }
);

// OverwriteModelError’ni oldini olish uchun:
export const BolimModel =
  mongoose.models.Bolim || mongoose.model<IBolim>('Bolim', BolimSchema);
