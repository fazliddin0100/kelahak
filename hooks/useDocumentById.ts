    // hooks/useDocumentById.ts
    import { useState, useEffect, useCallback } from "react";
    import { DocumentType } from "@/types/document";

    interface UseDocumentByIdResult {
        document: DocumentType | null;
        loading: boolean;
        error: string | null;
        refetch: () => Promise<void>;
    }

    export function useDocumentById(documentId: string | undefined): UseDocumentByIdResult {
        const [document, setDocument] = useState<DocumentType | null>(null);
        const [loading, setLoading] = useState<boolean>(true);
        const [error, setError] = useState<string | null>(null);

        const fetchDocument = useCallback(async () => {
            if (!documentId) {
                setError("Hujjat ID mavjud emas");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem("token"); // token localStorage dan

                const res = await fetch(`/api/documents/${documentId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": token ? `Bearer ${token}` : "",
                    },
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: "Noma'lum xato" }));
                    throw new Error(errorData.message || `Server xatosi: ${res.status}`);
                }

                const data: DocumentType = await res.json();
                setDocument(data);
            } catch (err: any) {
                const message = err.message || "Hujjatni yuklashda xato yuz berdi";
                setError(message);
            } finally {
                setLoading(false);
            }
        }, [documentId]);


        // Birinchi yuklash
        useEffect(() => {
            fetchDocument();
        }, [fetchDocument]);

        // Refetch funksiyasi
        const refetch = useCallback(async () => {
            await fetchDocument();
        }, [fetchDocument]);

        return { document, loading, error, refetch };
    }