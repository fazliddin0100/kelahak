// models/Personal.ts
import mongoose, {Document, Schema} from "mongoose";

export interface IPersonal {
    name: string;
    fName: string;
    sName: string;
    province: string;
    user: Schema.Types.ObjectId;
}

export interface IPersonalDocument extends IPersonal, Document {
}

const PersonalSchema = new Schema<IPersonalDocument>(
    {
        name: {type: String, required: true},
        fName: {type: String, required: true},
        sName: {type: String, required: true},
        province: {type: String, required: true},
        user: {type: Schema.Types.ObjectId, ref: "User"},
    },
    {timestamps: true}
);

export default mongoose.models.Personal ||
mongoose.model<IPersonalDocument>("Personal", PersonalSchema);
