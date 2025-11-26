'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

interface TnyEditorProps {
  setEditorContent: (arg0: string) => void;
  initialContent?: string;
}

const Editor = dynamic(
  () => import('@tinymce/tinymce-react').then((m) => m.Editor),
  { ssr: false }
);

export default function TinyEditor({
  setEditorContent,
  initialContent,
}: TnyEditorProps) {
  const editorRef = useRef<any>(null);
  const cursorBookmark = useRef<any>(null);
  const [isInitDone] = useState(false);

  // Kursorni saqlash
  const saveCursor = () => {
    if (editorRef.current) {
      cursorBookmark.current = editorRef.current.selection.getBookmark();
    }
  };

  // Kursorni tiklash
  const restoreCursor = () => {
    if (editorRef.current && cursorBookmark.current) {
      editorRef.current.selection.moveToBookmark(cursorBookmark.current);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col gap-4">
      <div className="bg-white shadow-md rounded-md p-4">
        <Editor
          tinymceScriptSrc="/tinymce_8.2.1/tinymce/js/tinymce/tinymce.min.js"
          value={initialContent}
          onInit={(_, editor) => {
            editorRef.current = editor;
            if (!isInitDone && initialContent) {
              editor.setContent(initialContent);
            }
          }}
          licenseKey="gpl"
          init={{
            statusbar: true,
            branding: false,
            promotion: false,
            plugins:
              'anchor autolink charmap codesample emoticons image link lists media table visualblocks',
            toolbar:
              'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
            menubar: 'edit view insert format tools table help',
            skin: 'oxide',
            content_css: 'default',
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
          onEditorChange={(newValue) => {
            saveCursor();
            setEditorContent(newValue);
            restoreCursor();
          }}
        />
      </div>
    </div>
  );
}
