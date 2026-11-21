import { cleanWordHtml, isWordHtml } from './plugins/pasteFromWord';
import { FIRST_LINE_INDENT, registerParagraphTools } from './plugins/paragraph';
import {
  registerChangeCase,
  registerDocumentFields,
  registerFormatPainter,
} from './plugins/textTools';
import type { EditorDocumentFields, MezonEditor } from './plugins/types';
import type { RawEditorOptions } from 'tinymce';

/**
 * Hujjat muharriri sozlamalari: faqat TinyMCE'ning bepul (GPL) plaginlari va
 * o'zimizning plaginlar. Hammasi /public/tinymce dan, internetsiz ishlaydi.
 * autosave ataylab yoqilmaydi — u brauzer xotirasiga yozadi.
 */

/** O'zDSt bo'yicha A4 hoshiyalari: chap 3 sm, o'ng 1,5 sm, yuqori/pastki 2 sm */
export const PAGE_MARGINS = { top: '2cm', right: '1.5cm', bottom: '2cm', left: '3cm' };

/** Sahifa uzilishi — tozalagich (lib/purify.ts) chiqaradigan ko'rinishda, aynan shu satr */
export const PAGEBREAK_HTML =
  '<div class="mezon-pagebreak" style="break-after: page; page-break-after: always"></div>';

export const EDITOR_PLUGINS = [
  'advlist',
  'anchor',
  'autolink',
  'charmap',
  'codesample',
  'directionality',
  'emoticons',
  'fullscreen',
  'help',
  'image',
  'insertdatetime',
  'link',
  'lists',
  'media',
  'nonbreaking',
  'pagebreak',
  'quickbars',
  'searchreplace',
  'table',
  'visualblocks',
  'visualchars',
  'wordcount',
  'accordion',
].join(' ');

export const EDITOR_TOOLBAR = [
  'undo redo formatpainter',
  'styles blocks fontfamily fontsize',
  'bold italic underline strikethrough superscript subscript changecase',
  'forecolor backcolor removeformat',
  'alignleft aligncenter alignright alignjustify',
  'lineheight firstlineindent paragraphdialog',
  'numlist bullist outdent indent',
  'table image link pagebreak charmap docfields',
  'searchreplace visualchars fullscreen',
].join(' | ');

export const EDITOR_MENU = {
  edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace' },
  view: { title: 'View', items: 'visualaid visualchars visualblocks | fullscreen | wordcount' },
  insert: {
    title: 'Insert',
    items: 'image link media table | charmap emoticons hr nonbreaking pagebreak | anchor accordion codesample | insertdatetime docfields',
  },
  format: {
    title: 'Format',
    items:
      'bold italic underline strikethrough superscript subscript | changecase | styles blocks fontfamily fontsize lineheight | forecolor backcolor | paragraphdialog | align | removeformat',
  },
  tools: { title: 'Tools', items: 'wordcount' },
  table: {
    title: 'Table',
    items: 'inserttable | cell row column | tableprops deletetable',
  },
  help: { title: 'Help', items: 'help' },
};

const FONT_FAMILIES = [
  'Times New Roman=times new roman,times,serif',
  'Arial=arial,helvetica,sans-serif',
  'Calibri=calibri,carlito,sans-serif',
  'Cambria=cambria,caladea,serif',
  'Georgia=georgia,serif',
  'Tahoma=tahoma,arial,sans-serif',
  'Verdana=verdana,geneva,sans-serif',
  'Courier New=courier new,courier,monospace',
].join('; ');

/** Rasmiy hujjat uslublari (O'zDSt hujjatlari kelganda qiymatlar shu yerda moslanadi) */
export const STYLE_FORMATS = [
  {
    title: 'Asosiy matn',
    block: 'p',
    styles: { 'text-indent': FIRST_LINE_INDENT, 'text-align': 'justify', 'line-height': '1.5', 'font-size': '14pt' },
  },
  {
    title: 'Sarlavha (markazda)',
    block: 'p',
    styles: { 'text-align': 'center', 'font-weight': 'bold', 'text-transform': 'uppercase', 'font-size': '14pt' },
  },
  {
    title: 'Kichik sarlavha',
    block: 'p',
    styles: { 'text-align': 'center', 'font-weight': 'bold', 'font-size': '14pt' },
  },
  {
    title: 'Imzo bloki',
    block: 'p',
    styles: { 'text-align': 'left', 'margin-top': '24pt', 'line-height': '1.15' },
  },
  {
    title: 'Ilova',
    block: 'p',
    styles: { 'text-align': 'right', 'font-size': '12pt', 'font-style': 'italic' },
  },
  {
    title: 'Izoh (kichik)',
    block: 'p',
    styles: { 'font-size': '10pt', 'line-height': '1.15' },
  },
  { title: 'Ajratilgan', inline: 'mark' },
];

const COLOR_MAP = [
  '000000', 'Qora',
  '434343', 'To‘q kulrang',
  '999999', 'Kulrang',
  'FFFFFF', 'Oq',
  'C00000', 'To‘q qizil',
  'FF0000', 'Qizil',
  'FFC000', 'To‘q sariq',
  'FFFF00', 'Sariq',
  '92D050', 'Och yashil',
  '00B050', 'Yashil',
  '00B0F0', 'Havorang',
  '0070C0', 'Ko‘k',
  '002060', 'To‘q ko‘k',
  '7030A0', 'Binafsha',
];

const PAGE_HEIGHT = '297mm';

export const EDITOR_CONTENT_STYLE = `
  html { direction: ltr !important; }
  html, body {
    background-color: #edf1f6 !important;
    margin: 0 !important;
    box-sizing: border-box !important;
  }
  body {
    width: 210mm !important;
    min-height: ${PAGE_HEIGHT} !important;
    max-width: 210mm !important;
    margin: 12px auto !important;
    padding: ${PAGE_MARGINS.top} ${PAGE_MARGINS.right} ${PAGE_MARGINS.bottom} ${PAGE_MARGINS.left} !important;
    background-color: #ffffff !important;
    /* Har bir A4 varaq chegarasi (taxminiy, chop etishda @page) */
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(${PAGE_HEIGHT} - 1px),
      #b6c2d2 calc(${PAGE_HEIGHT} - 1px),
      #b6c2d2 ${PAGE_HEIGHT}
    ) !important;
    box-shadow: 0 2px 8px rgba(16, 44, 80, 0.12) !important;
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 14pt;
    line-height: 1.5;
    direction: ltr !important;
    text-align: left;
    unicode-bidi: normal !important;
    writing-mode: horizontal-tb !important;
    box-sizing: border-box !important;
  }
  body p { margin: 0 0 0.35em; }
  body td p, body th p { margin: 0; }
  body p, body div, body span, body li,
  body td, body th, body h1, body h2, body h3, body h4, body h5, body h6 {
    direction: ltr !important;
    unicode-bidi: normal !important;
  }
  mark { background: #fef08a; }
  .mezon-pagebreak {
    height: 0;
    margin: 1em 0;
    border-top: 1px dashed #94a3b8;
  }
  table {
    border-collapse: collapse !important;
    table-layout: fixed !important;
    width: 100% !important;
    max-width: 100% !important;
    direction: ltr !important;
  }
  table td, table th {
    border: 1px solid #333;
    padding: 4px 6px;
    vertical-align: top;
    word-wrap: break-word;
    direction: ltr !important;
  }
  @page { size: A4; margin: ${PAGE_MARGINS.top} ${PAGE_MARGINS.right} ${PAGE_MARGINS.bottom} ${PAGE_MARGINS.left}; }
  /* Chop etish taqiqlangan: faqat kotibiyat orqali Word fayl */
  @media print { body { display: none !important; } }
`;

/** init ga qo'shiladigan imkoniyatlar (TinyEditor o'zining LTR sozlamalarini ustidan yozadi) */
export const EDITOR_OPTIONS: Omit<
  RawEditorOptions,
  'selector' | 'target' | 'readonly' | 'disabled' | 'license_key'
> = {
  plugins: EDITOR_PLUGINS,
  toolbar: EDITOR_TOOLBAR,
  toolbar_mode: 'wrap',
  toolbar_sticky: true,
  menubar: 'edit view insert format table tools help',
  menu: EDITOR_MENU,
  language: 'uz',
  browser_spellcheck: true,
  contextmenu: 'link image table paragraphdialog changecase',
  font_family_formats: FONT_FAMILIES,
  font_size_formats: '8pt 9pt 10pt 11pt 12pt 13pt 14pt 16pt 18pt 20pt 22pt 24pt 28pt 32pt 36pt 48pt 72pt',
  line_height_formats: '1 1.15 1.5 2 2.5 3',
  block_formats:
    'Paragraf=p; Sarlavha 1=h1; Sarlavha 2=h2; Sarlavha 3=h3; Sarlavha 4=h4; Iqtibos=blockquote; Formatlangan=pre',
  style_formats: STYLE_FORMATS,
  style_formats_merge: false,
  color_map: COLOR_MAP,
  color_cols: 7,
  custom_colors: true,
  advlist_number_styles: 'default,lower-alpha,upper-alpha,lower-roman,upper-roman',
  advlist_bullet_styles: 'default,circle,square',
  insertdatetime_formats: ['%d.%m.%Y', '%Y-yil %d-%B', '%H:%M', '%d.%m.%Y %H:%M'],
  insertdatetime_element: false,
  // Chrome'da qo'yilgan matn formatlashi saqlansin (qolgani serverda lib/purify.ts da tozalanadi)
  paste_webkit_styles:
    'color background-color font-weight font-style font-size font-family text-decoration text-align text-indent line-height vertical-align margin-left',
  pagebreak_separator: PAGEBREAK_HTML,
  pagebreak_split_block: true,
  nonbreaking_force_tab: true,
  quickbars_selection_toolbar: 'bold italic underline | forecolor backcolor | changecase formatpainter | quicklink',
  quickbars_insert_toolbar: false,
  quickbars_image_toolbar: 'alignleft aligncenter alignright',
  table_appearance_options: true,
  table_advtab: true,
  table_cell_advtab: true,
  table_row_advtab: true,
  table_toolbar:
    'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells | tablecellbackgroundcolor tablecellbordercolor',
  image_advtab: true,
  image_caption: true,
  // Rasm qo'yilganda matn ichiga (base64) joylanadi, tashqi URL yuklanmaydi
  paste_data_images: true,
  help_tabs: ['shortcuts', 'keyboardnav'],
  content_style: EDITOR_CONTENT_STYLE,
};

/** Word'dan qo'yilgan HTML'ni tozalash (TinyMCE paste_preprocess) */
export function preprocessPaste(_editor: unknown, args: { content: string }) {
  if (args.content && isWordHtml(args.content)) {
    args.content = cleanWordHtml(args.content);
  }
}

/**
 * Nusxa olishdan himoya: muharrir ichida ko'chirish/kesish/qo'yish ishlaydi (ichki bufer),
 * lekin tizim clipboard'iga matn chiqmaydi. Ctrl/Cmd+P va Ctrl/Cmd+S bloklanadi.
 */
function registerClipboardGuard(editor: MezonEditor) {
  let buffer: string | null = null;

  const onCopy = (ev: unknown) => {
    const e = ev as ClipboardEvent;
    const html = (editor as unknown as { selection: { getContent: () => string } }).selection.getContent();
    if (!html) return;
    buffer = html;
    e.preventDefault();
    e.clipboardData?.setData('text/plain', '');
    e.clipboardData?.setData('text/html', '');
    if (e.type === 'cut') {
      editor.undoManager.transact(() => editor.execCommand('Delete'));
    }
  };
  editor.on('copy', onCopy);
  editor.on('cut', onCopy);

  editor.on('paste', (ev) => {
    const e = ev as ClipboardEvent;
    const text = e.clipboardData?.getData('text/plain');
    const html = e.clipboardData?.getData('text/html');
    // Clipboard bo'sh — demak oxirgi nusxa muharrirning o'zidan
    if (buffer && !text && !html) {
      e.preventDefault();
      editor.insertContent(buffer);
    }
  });

  // TinyMCE'ning o'z chop etish buyrug'i va Ctrl+P yorlig'i o'chiriladi
  editor.on('init', () => {
    const ed = editor as unknown as {
      addCommand: (name: string, fn: () => void) => void;
      shortcuts: { remove: (pattern: string) => boolean };
    };
    ed.addCommand('mcePrint', () => {});
    ed.shortcuts.remove('meta+p');
  });

  editor.on('keydown', (ev) => {
    const e = ev as KeyboardEvent;
    const key = e.key?.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 's')) {
      e.preventDefault();
      editor.notificationManager.open({
        text: 'Chop etish faqat kotibiyat orqali (hujjat ro‘yxatga olingandan keyin «Chop etish» so‘rovi).',
        type: 'warning',
        timeout: 3500,
      });
    }
  });
}

/** O'zimizning plaginlarni ro'yxatdan o'tkazish (setup ichida chaqiriladi) */
export function registerMezonPlugins(
  editor: MezonEditor,
  getFields: () => EditorDocumentFields
) {
  // Word HTML'ni TinyMCE'ning o'z ishlovidan OLDIN ushlaymiz (u ro'yxat belgilarini
  // "1." matn sifatida qoldiradi va darajalarni yo'qotadi)
  editor.on('paste', (ev) => {
    const e = ev as ClipboardEvent & { isDefaultPrevented?: () => boolean };
    const html = e.clipboardData?.getData('text/html');
    if (!html || !isWordHtml(html) || e.isDefaultPrevented?.()) return;
    e.preventDefault();
    editor.execCommand('mceInsertClipboardContent', false, { html: cleanWordHtml(html) });
  });

  registerClipboardGuard(editor);
  registerParagraphTools(editor);
  registerChangeCase(editor);
  registerDocumentFields(editor, getFields);
  registerFormatPainter(editor);
}
