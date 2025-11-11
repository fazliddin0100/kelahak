// models/Job.ts
import mongoose, {Document, Schema} from "mongoose";

export interface IJob {
    position: string;
    organ: string;
    department: string;
    militaryRank: string;
    role: Schema.Types.ObjectId;
    user: Schema.Types.ObjectId;
    isUserTrue: boolean;
}

export interface IJobDocument extends IJob, Document {
}

const JobSchema = new Schema<IJobDocument>(
    {
        position: {type: String, required: true},
        organ: {type: String, required: true},
        department: {type: String, required: true},
        militaryRank: {type: String, required: true},
        role: {type: Schema.Types.ObjectId, ref: "Role", required: true},
        user: {type: Schema.Types.ObjectId, ref: "User"},
        isUserTrue: {type: Boolean, default: false},
    },
    {timestamps: true}
);

export default mongoose.models.Job ||
mongoose.model<IJobDocument>("Job", JobSchema);
