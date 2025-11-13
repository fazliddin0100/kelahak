import { useSearchParams } from "react-router-dom";

const documents = [
    { id: 1, title: "Mehnat shartnomasi" },
    { id: 2, title: "Buyruq #27" },
    { id: 3, title: "Hisobot 2023" },
    { id: 4, title: "Texnik topshiriq" },
];

export const DocumentsList = () => {
    const [searchParams] = useSearchParams();
    const searchTerm = searchParams.get("search")?.toLowerCase() || "";

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm)
    );

    return (
        <div className="space-y-3 mt-6">
            {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                    <div key={doc.id} className="bg-white p-4 rounded shadow">
                        {doc.title}
                    </div>
                ))
            ) : (
                <p className="text-gray-500">Hech narsa topilmadi</p>
            )}
        </div>
    );
};
