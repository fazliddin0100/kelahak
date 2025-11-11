import {Schema} from "mongoose";
import {Auth} from "@/interfaces/Auth";
import {personalFields} from "./personalFields";
import {authFields} from "./authFields";
import {jobFields} from "./jobFields";

export const authSchema = new Schema<Auth>(
    {
        ...personalFields,
        ...authFields,
        ...jobFields,
    },
    {timestamps: true}
);
