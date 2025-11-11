import {Schema} from "mongoose";
import {RoleInterface} from "@/interfaces/Role";

export const RoleSchema = new Schema<RoleInterface>(
    {
        role: {
            type: String,
            enum: ["admin", "superAdmin", "user", "commander", "deputyCommander"],
            default: "user",
            required: true,
        },
        province: {
            type: String,
            required: true,
        },
        permissions: {
            type: [String],
            required: true,
            default: [],
        },
    },
    {timestamps: true}
);
