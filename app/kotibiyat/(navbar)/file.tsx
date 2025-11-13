import {TemplateGallery} from "@/components/template-galerey";
import DocumentTable from "@/app/kotibiyat/(navbar)/document-table";

const File = () => {
    return (
        <>
            <div className="mt-10">
                <TemplateGallery/>
            </div>
            <div>
                <DocumentTable />
            </div>
        </>
    )
}

export default File