'use client';

import dynamic from 'next/dynamic';
import { normalizeDocumentContent } from '@/lib/normalizeDocumentContent';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';

export type TinyEditorHandle = {
  getHtml: () => string;
};

interface TnyEditorProps {
  setEditorContent: (html: string) => void;
  initialContent?: unknown;
  editorKey?: string;
  readOnly?: boolean;
}

const Editor = dynamic(
  () => import('@tinymce/tinymce-react').then((m) => m.Editor),
  { ssr: false }
);

const TABLE_CONTENT_CSS = `
  table {
    border-collapse: collapse !important;
    table-layout: fixed !important;
    width: 100% !important;
    max-width: 100% !important;
    direction: ltr !important;
  }
  table td, table th {
    border: 1px solid #333 !important;
    padding: 4px 6px !important;
    vertical-align: top !important;
    word-wrap: break-word !important;
    direction: ltr !important;
  }
`;

const A4_CONTENT_STYLE = `
  html {
    direction: ltr !important;
  }
  html, body {
    background: #edf1f6 !important;
    margin: 0 !important;
    box-sizing: border-box !important;
  }
  body {
    width: 210mm !important;
    min-height: 297mm !important;
    max-width: 210mm !important;
    margin: 0 auto !important;
    padding: 2cm !important;
    background: #ffffff !important;
    box-shadow: 0 2px 8px rgba(16, 44, 80, 0.12) !important;
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 14pt !important;
    line-height: 1.5 !important;
    direction: ltr !important;
    text-align: left;
    unicode-bidi: normal !important;
    writing-mode: horizontal-tb !important;
  }
  body.mce-content-body {
    direction: ltr !important;
    unicode-bidi: normal !important;
  }
  body p, body div, body span, body li,
  body td, body th, body h1, body h2, body h3, body h4, body h5, body h6 {
    direction: ltr !important;
    unicode-bidi: normal !important;
  }
  ${TABLE_CONTENT_CSS}
`;

/** Yuklanadigan HTML dan RTL ni olib tashlash */
function normalizeLtrHtml(value: unknown): string {
  const html = normalizeDocumentContent(value);
  if (!html?.trim()) {
    return '<p dir="ltr" style="text-align: left; direction: ltr;">&nbsp;</p>';
  }
  return html
    .replace(/\sdir=["']rtl["']/gi, 'dir="ltr"')
    .replace(/\sstyle=["']([^"']*)["']/gi, (_m, styles: string) => {
      const cleaned = styles.replace(/direction\s*:\s*rtl/gi, 'direction: ltr');
      return ` style="${cleaned}"`;
    });
}

type TinyEditorInstance = {
  getDoc: () => Document;
  getBody: () => HTMLElement;
  getContent: (args?: { format: string; no_events?: boolean }) => string;
  dom: {
    select: (s: string) => Element[];
    setAttrib: (el: Element, name: string, value: string) => void;
    setStyle: (el: Element | HTMLElement, name: string, value: string) => void;
  };
  formatter?: { apply: (name: string) => void };
};

function applyLtrToEditorBody(editor: TinyEditorInstance) {
  const doc = editor.getDoc();
  const body = editor.getBody();
  if (!body) return;

  if (doc?.documentElement) {
    doc.documentElement.setAttribute('dir', 'ltr');
    doc.documentElement.style.direction = 'ltr';
  }

  body.setAttribute('dir', 'ltr');
  body.style.direction = 'ltr';
  body.style.unicodeBidi = 'normal';

  editor.dom.select('[dir=rtl]').forEach((node) => {
    editor.dom.setAttrib(node, 'dir', 'ltr');
  });

  editor.dom.select('p,div,td,th,li,span').forEach((node) => {
    const el = node as HTMLElement;
    if (el.style?.direction === 'rtl') {
      editor.dom.setStyle(el, 'direction', 'ltr');
    }
  });
}

const TinyEditor = forwardRef<TinyEditorHandle, TnyEditorProps>(
  function TinyEditor(
    { setEditorContent, initialContent = '', editorKey, readOnly = false },
    ref
  ) {
    const editorRef = useRef<TinyEditorInstance | null>(null);
    const ltrInitial = normalizeLtrHtml(initialContent);

    useImperativeHandle(ref, () => ({
      getHtml: () => {
        if (!editorRef.current) return '';
        return editorRef.current.getContent({
          format: 'html',
          no_events: true,
        });
      },
    }));

    return (
      <div className="document-editor-fullscreen flex h-full min-h-0 w-full flex-col">
        {readOnly && (
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
            <p className="text-xs font-medium text-slate-600">
              Hujjat ro‘yxatga olingan — faqat ko‘rish rejimi
            </p>
          </div>
        )}
        <div className="relative h-full min-h-0 flex-1 bg-[#edf1f6] [&_.tox]:!h-full [&_.tox-tinymce]:!direction-ltr">
          <Editor
            key={editorKey ?? 'tny-editor'}
            tinymceScriptSrc="/tinymce/js/tinymce/tinymce.min.js"
            initialValue={ltrInitial}
            licenseKey="gpl"
            onInit={(_, editor) => {
              editorRef.current = editor as TinyEditorInstance;
              if (readOnly) {
                editor.mode.set('readonly');
              }
              applyLtrToEditorBody(editorRef.current);
            }}
            init={{
              height: '100%',
              resize: false,
              statusbar: true,
              toolbar_mode: 'sliding',
              branding: false,
              promotion: false,
              language: 'en',
              plugins:
                'anchor autolink charmap codesample directionality emoticons image link lists media table visualblocks',
              toolbar:
                'undo redo | ltr rtl | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | alignleft aligncenter alignright alignjustify | numlist bullist indent outdent | removeformat',
              menubar: 'edit view insert format tools table help',
              skin: 'oxide',
              content_css: 'default',
              content_style: A4_CONTENT_STYLE,
              body_attrs: {
                dir: 'ltr',
                style: 'direction: ltr; text-align: left; unicode-bidi: normal;',
              },
              forced_root_block: 'p',
              forced_root_block_attrs: {
                dir: 'ltr',
                style: 'text-align: left; direction: ltr;',
              },
              table_toolbar:
                'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
              table_resize_bars: true,
              table_column_resizing: 'resizetable',
              table_use_colgroups: true,
              table_sizing_mode: 'fixed',
              table_default_attributes: {
                border: '1',
                dir: 'ltr',
              },
              table_default_styles: {
                'border-collapse': 'collapse',
                width: '100%',
                direction: 'ltr',
              },
              valid_elements: '*[*]',
              extended_valid_elements:
                'table[colgroup|colgroup],col[style|span|width],td[style|colspan|rowspan|width|height|dir],th[style|colspan|rowspan|width|height|scope|dir]',
              verify_html: false,
              setup: (editor) => {
                const ed = editor as TinyEditorInstance;

                editor.on('init', () => {
                  applyLtrToEditorBody(ed);
                  try {
                    editor.execCommand('mceDirectionLTR');
                  } catch {
                    /* plugin yo‘q bo‘lsa */
                  }
                });

                editor.on('focus', () => applyLtrToEditorBody(ed));

                editor.on('keydown', () => {
                  const body = editor.getBody();
                  if (body?.getAttribute('dir') === 'rtl') {
                    body.setAttribute('dir', 'ltr');
                    try {
                      editor.execCommand('mceDirectionLTR');
                    } catch {
                      /* ignore */
                    }
                  }
                });

                editor.on('BeforeSetContent', (e) => {
                  const data = e as { content?: string };
                  if (typeof data.content === 'string') {
                    data.content = normalizeLtrHtml(data.content);
                  }
                });

                editor.on('blur', () => {
                  setEditorContent(
                    editor.getContent({ format: 'html', no_events: true })
                  );
                });
              },
            }}
            onEditorChange={(_content, editor) => {
              editorRef.current = editor as TinyEditorInstance;
              /* Har harfda parent state yangilanmasin — kursor o‘ngga yuradi */
            }}
          />
        </div>
      </div>
    );
  }
);

export default TinyEditor;
