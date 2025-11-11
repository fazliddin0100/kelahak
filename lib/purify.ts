// lib/purify.ts
import DOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';

const {window} = new JSDOM('');
const purify = DOMPurify(window);

export const purifyConfig = {
    ALLOWED_TAGS: [
        "p", "table", "tr", "th", "td", "img", "a", "h1", "h2", "h3", "span",
        "div", "ul", "ol", "li", "colgroup", "col"
    ],
    ALLOWED_ATTR: [
        "style", "class", "colspan", "rowspan", "src", "href", "alt", "title"
    ],
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
};

export const sanitizeHTML = (html: string): string => {
    return purify.sanitize(html, purifyConfig);
};