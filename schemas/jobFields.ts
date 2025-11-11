import {Schema} from "mongoose";

export const jobFields = {
    position: {type: String, required: true},
    organ: {type: String, required: true},
    department: {type: String, required: true},
    militaryRank: {type: String, required: true},
    role: {type: Schema.Types.ObjectId, ref: "Role", required: true},
    isUserTrue: {type: Boolean, default: false},
};
