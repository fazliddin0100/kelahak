// utils/updateForm.ts
export function updateForm<T extends object>(prev: T, updates: Partial<T>): T {
  return {
    ...prev, // eski qiymatlar
    ...updates, // yangilangan maydonlar
  };
}
