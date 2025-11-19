import {RegistrationSchemaModel}  from "@/models/registrationModal";
import connectToDatabase from "@/lib/mongodb";

export const getRegistrationIndex = async (
    ownerRegion: string,
    year: number,
    documentId: string
): Promise<number> => {
    if (!ownerRegion) throw new Error("ownerRegion mavjud emas");
    if (!year) throw new Error("Yil noto‘g‘ri");
    await connectToDatabase();
    let record = await RegistrationSchemaModel.findOne({
        ownerRegion,
        year,
        documentId,
    });

    if (!record) {
        record = new RegistrationSchemaModel({
            ownerRegion,
            year,
            registrationIndex: 1,
            documentId,
        });
    } else {
        record.registrationIndex =
            Number(record.registrationIndex || 0) + 1;
    }

    await record.save();
    return record.registrationIndex;
};
