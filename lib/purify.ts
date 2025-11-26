// lib/purify.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
const purify = DOMPurify(window);

export const purifyConfig = {
  ALLOWED_TAGS: [
    // Matn formatlash
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
    // Sarlavhalar
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // Ro‘yxatlar
    'ul',
    'ol',
    'li',
    // Jadval
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
    // Media
    'img',
    'a',
  ],
  ALLOWED_ATTR: [
    // Umumiy
    'style',
    'class',
    'title',
    // Jadval
    'colspan',
    'rowspan',
    // Media
    'src',
    'href',
    'alt',
    'width',
    'height',
    'target',
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

export const sanitizeHTML = (html: string): string => {
  return purify.sanitize(html, purifyConfig);
};
