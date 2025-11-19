import mongoose, { Schema, Document } from "mongoose";

export type IRegistration = Document & {
    registrationIndex: number;
    year: number;
    ownerRegion: string;
    documentId: string;
};

const RegistrationSchema = new Schema<IRegistration>(
    {
        registrationIndex: { type: Number, required: true },
        year: { type: Number, required: true },
        ownerRegion: { type: String, required: true },
        documentId: { type: String, required: true },
    },
    { timestamps: true }
);

export const RegistrationSchemaModel =
    mongoose.models.Registration ||
    mongoose.model<IRegistration>("Registration", RegistrationSchema, "registration");
