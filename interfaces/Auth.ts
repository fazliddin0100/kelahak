import {Document, Schema} from "mongoose";

export interface Auth extends Document {
    name: string;
    fName: string;
    sName: string;
    province: string; // Viloyat
    login: string;
    position: string; // Lavozim
    militaryRank: string;
    password: string;
    department: string;
    organ: string;
    role: Schema.Types.ObjectId; // Role model bilan bog‘langan
    isUserTrue: boolean;
}
