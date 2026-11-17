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
