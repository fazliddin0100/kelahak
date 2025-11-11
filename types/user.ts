// ===================== types/user.ts =====================
export interface IPersonal {
    _id: string;
    name: string;
    fName: string;
    sName: string;
    province: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}


export interface IJob {
    _id: string;
    position: string;
    organ: string;
    department: string;
    militaryRank: string;
    role: string;
    isUserTrue: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
}


export interface IUserPopulated {
    userId: string;
    personal: IPersonal;
    job: IJob;
    auth?: any;
    devices?: any[];
}


export interface Approver {
    userId: string;
    fullName: string;
    militaryRank: string;
    position: string;
}

export interface DocumentFormValues {
    editorContent: string;
    grifi: string;
    nomi: string;
    selectedRegions: string[];
    imzoMain: Approver | null;       // asosiy tasdiqlovchi
    imzoAll: Approver[];             // qo‘shimcha tasdiqlovchilar
    buyruqSender: IUserPopulated | null;
    buyruqReceivers: IUserPopulated[];
    xatSender: IUserPopulated | null;   // '' o‘rniga null
    xatReceivers: IUserPopulated[];
}

