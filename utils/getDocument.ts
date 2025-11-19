import { DocumentType } from "@/types/document";

export async function getDocumentById(id: string): Promise<DocumentType | null> {
    try {
        const res = await fetch(`/api/documents/${id}`, {
            method: "GET",
            cache: "no-store",
        });

        if (!res.ok) return null;

        return await res.json();
    } catch (e) {
        console.error("Error loading document:", e);
        return null;
    }
}
