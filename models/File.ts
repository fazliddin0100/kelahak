import mongoose, { Schema, Document, models } from 'mongoose';

export interface IFile extends Document {
  nomi: string;
  raqami: string;
  maxfiylik: string;
  sanasi: string;
  filePath: string;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    nomi: { type: String, required: true },
    raqami: { type: String, required: true },
    maxfiylik: { type: String, required: true },
    sanasi: { type: String, required: true },
    filePath: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.File || mongoose.model<IFile>('File', FileSchema);
