// lib/purify.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { normalizeDocumentContent } from '@/lib/normalizeDocumentContent';

const { window } = new JSDOM('');
const purify = DOMPurify(window);

export const purifyConfig = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'blockquote',
    'code',
    'pre',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'caption',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
    'img',
    'a',
    'sup',
    'sub',
    'mark',
    'figure',
    'figcaption',
    'details',
    'summary',
  ],
  ALLOWED_ATTR: [
    'style',
    'class',
    'title',
    'colspan',
    'rowspan',
    'span',
    'border',
    'cellpadding',
    'cellspacing',
    'align',
    'valign',
    'scope',
    'width',
    'height',
    'src',
    'href',
    'alt',
    'target',
    'rel',
    'data-mce-style',
    'data-mce-selected',
    'data-mce-placeholder',
    'dir',
    'start',
    'type',
    'reversed',
    'id',
    'open',
    'data-mezon-page',
    'data-margin-top',
    'data-margin-right',
    'data-margin-bottom',
    'data-margin-left',
    'data-orientation',
  ],
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'textarea',
  ],
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onfocus',
    'onblur',
  ],
};

/**
 * Muharrir uslublari: faqat matn formatlash xususiyatlari qoladi.
 * Joylashuvni buzadigan (position, z-index...) va tashqi resurs yuklaydigan
 * (url(), expression, javascript:) qiymatlar olib tashlanadi.
 */
const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'text-align',
  'text-decoration',
  'text-decoration-line',
  'text-indent',
  'text-transform',
  'letter-spacing',
  'word-spacing',
  'line-height',
  'white-space',
  'vertical-align',
  'direction',
  'unicode-bidi',
  'list-style-type',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-color',
  'border-style',
  'border-width',
  'border-collapse',
  'border-spacing',
  'width',
  'height',
  'min-width',
  'max-width',
  'table-layout',
  'float',
  'display',
  'page-break-before',
  'page-break-after',
  'page-break-inside',
  'break-before',
  'break-after',
  'break-inside',
]);
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|[<>]/i;

export function sanitizeStyleAttribute(style: string): string {
  return style
    .split(';')
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx <= 0) return '';
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!ALLOWED_STYLE_PROPS.has(prop) || !value || UNSAFE_STYLE_VALUE.test(value)) {
        return '';
      }
      if (prop === 'display' && !/^(block|inline|inline-block|table|table-cell|table-row|none|list-item)$/i.test(value)) {
        return '';
      }
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

purify.addHook('uponSanitizeAttribute', (_node, data) => {
  // data-mce-style ni TinyMCE style o'rniga ishlatadi — u ham xuddi shunday tozalanadi
  if (data.attrName === 'style' || data.attrName === 'data-mce-style') {
    const cleaned = sanitizeStyleAttribute(data.attrValue);
    if (cleaned) data.attrValue = cleaned;
    else data.keepAttr = false;
  }
});

purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const sanitizeHTML = (html: string): string => {
  return purify.sanitize(html, purifyConfig);
};

/**
 * Hujjat matni faqat tozalangan HTML satri sifatida saqlanadi va qaytariladi.
 * Eski yozuvlardagi `{ html | body | content }` obyektlari ham satrga keltiriladi.
 */
export function sanitizeDocumentContent(content: unknown): string {
  const html = normalizeDocumentContent(content);
  return html.trim() ? sanitizeHTML(html) : '';
}
