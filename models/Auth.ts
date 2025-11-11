// models/Auth.ts
import mongoose, {Document, Schema} from "mongoose";

export interface IAuth {
    login: string;
    password: string;
    user: Schema.Types.ObjectId;
}

export interface IAuthDocument extends IAuth, Document {
}

const AuthSchema = new Schema<IAuthDocument>(
    {
        login: {type: String, required: true, unique: true},
        password: {type: String, required: true, select: false},
        user: {type: Schema.Types.ObjectId, ref: "User"},
    },
    {timestamps: true}
);

export default mongoose.models.Auth ||
mongoose.model<IAuthDocument>("Auth", AuthSchema);
