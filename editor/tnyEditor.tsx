"use client";

import {useRef} from "react";
import dynamic from "next/dynamic";

interface TnyEditorProps {
    setEditorContent: (arg0: string) => void;
}

const Editor = dynamic(() => import("@tinymce/tinymce-react").then(m => m.Editor), {
    ssr: false,
});

export default function TinyEditor({setEditorContent}: TnyEditorProps) {
    const editorRef = useRef<any>(null);

    const log = () => {
        if (editorRef.current) {
            console.log(editorRef.current.getContent());
        }
    };

    return (
        <div className=" bg-gray-100 min-h-screen flex flex-col gap-4">
            <div className="bg-white shadow-md rounded-md p-4">
                <Editor
                    tinymceScriptSrc="/tinymce_8.2.1/tinymce/js/tinymce/tinymce.min.js"
                    onInit={(_, editor) => (editorRef.current = editor)}
                    licenseKey="gpl"
                    init={{
                        statusbar: true,
                        branding: false,
                        promotion: false,

                        // Faqat open-source pluginlar
                        plugins:
                            "anchor autolink charmap codesample emoticons image link lists media table visualblocks",
                        toolbar:
                            "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat",
                        menubar: "edit view insert format tools table help",
                        // Skin va kontent CSS — self-hosted pathlar bilan
                        skin: "oxide",
                        content_css: "default",

                        // Layout/print styling
                        content_style: `
                          @page { size: A4; margin: 20mm; }
                          body {
                            width: 210mm !important;
                            min-height: 297mm !important;
                            margin: auto !important;
                            padding: 1cm 1cm 1cm 2cm !important;
                            background: white !important;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1) !important;
                            font-family: inherit;
                          }
                        `,
                    }}
                    initialValue=""
                    onEditorChange={(newValue) => {
                        setEditorContent(newValue);
                    }}
                />
            </div>
        </div>
    );
}
