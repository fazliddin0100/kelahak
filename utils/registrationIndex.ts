import { RegistrationSchemaModel } from '@/models/registrationModal';

export const getRegistrationIndex = async (
  ownerRegion: string,
  year: number,
  documentId: string
): Promise<number> => {
  if (!ownerRegion) throw new Error('ownerRegion mavjud emas');
  if (!year) throw new Error('Yil noto‘g‘ri');
  if (!documentId) throw new Error('Hujjat ID mavjud emas');

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
    record.registrationIndex += 1;
  }

  await record.save();
  return record.registrationIndex;
};
