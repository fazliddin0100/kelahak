import * as z from 'zod';

export const provinces = [
  'Andijon',
  'Buxoro',
  'Farg‘ona',
  'Jizzax',
  'Qashqadaryo',
  'Qoraqalpog‘iston',
  'Navoiy',
  'Namangan',
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
  'Toshkent',
  'Toshkent viloyati',
  'Xorazm',
] as const;

export const registrationFieldLabels: Record<string, string> = {
  fName: 'Familiya',
  name: 'Ism',
  sName: 'Otasining ismi',
  province: 'Viloyat',
  organ: 'Masul organ',
  department: "Bo'lim",
  position: 'Lavozim',
  militaryRank: 'Unvon',
  login: 'Login',
  password: 'Parol',
};

export const registrationFormSchema = z.object({
  fName: z.string().min(1, 'Familiya majburiy'),
  name: z.string().min(1, 'Ism majburiy'),
  sName: z.string().min(1, 'Otasining ismi majburiy'),
  province: z.string().min(1, 'Viloyat majburiy'),
  organ: z.string().min(1, 'Masul organ majburiy'),
  department: z.string().min(1, "Bo'lim majburiy"),
  position: z.string().min(1, 'Lavozim majburiy'),
  militaryRank: z.string().min(1, 'Unvon majburiy'),
  login: z.string().min(3, 'Login kamida 3 belgidan iborat bo‘lishi kerak'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
});

export type RegistrationFormData = z.infer<typeof registrationFormSchema>;
