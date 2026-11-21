declare module 'html-to-docx' {
  type Margins = {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    header?: number;
    footer?: number;
    gutter?: number;
  };
  type DocumentOptions = {
    orientation?: 'portrait' | 'landscape';
    margins?: Margins;
    title?: string;
    subject?: string;
    creator?: string;
    keywords?: string[];
    description?: string;
    lastModifiedBy?: string;
    font?: string;
    fontSize?: number;
    complexScriptFontSize?: number;
    table?: { row?: { cantSplit?: boolean } };
    header?: boolean;
    footer?: boolean;
    pageNumber?: boolean;
    skipFirstHeaderFooter?: boolean;
    lineNumber?: boolean;
    lang?: string;
    decodeUnicode?: boolean;
  };
  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: DocumentOptions,
    footerHTMLString?: string | null
  ): Promise<Buffer | ArrayBuffer | Blob>;
}
