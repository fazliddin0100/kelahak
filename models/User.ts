// models/User.ts
import mongoose, {Document, Model, Schema, Types} from "mongoose";

export interface IUser {
    personal: Types.ObjectId;
    auth: Types.ObjectId;
    job: Types.ObjectId;
    devices: Types.ObjectId[];
}

export interface IUserDocument extends IUser, Document {
    _id: Types.ObjectId;
}

const UserSchema = new Schema<IUserDocument>(
    {
        personal: {type: Schema.Types.ObjectId, ref: "Personal", unique: true},
        auth: {type: Schema.Types.ObjectId, ref: "Auth", unique: true},
        job: {type: Schema.Types.ObjectId, ref: "Job", unique: true},
        devices: [{type: Schema.Types.ObjectId, ref: "Device"}],
    },
    {
        timestamps: true,
        toJSON: {virtuals: true},
        toObject: {virtuals: true},
    }
);

const UserModel: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

export default UserModel;
