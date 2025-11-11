// utils/updateForm.ts
import { DocumentFormValues } from '@/types/user';

export const updateForm = <K extends keyof DocumentFormValues>(
    prev: DocumentFormValues,
    updates: Pick<DocumentFormValues, K>
): DocumentFormValues => ({
    ...prev,
    ...updates,
});