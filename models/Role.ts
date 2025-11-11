// models/Role.ts
import mongoose, {Document} from "mongoose";

export interface IRoleDocument extends Document {
    role: string;
    province: string;
    permissions: string[];
}

const RoleSchema = new mongoose.Schema<IRoleDocument>(
    {
        role: {
            type: String,
            enum: ["admin", "superAdmin", "user", "commander", "deputyCommander"],
            default: "user",
        },
        province: {type: String, required: true},
        permissions: {type: [String], default: []},
    },
    {timestamps: true}
);

export default mongoose.models.Role ||
mongoose.model<IRoleDocument>("Role", RoleSchema);
