import {Document} from "mongoose";

export interface RoleInterface extends Document {
    role: "admin" | "superAdmin" | "user" | "commander" | "deputyCommander";
    province: string;
    permissions: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
