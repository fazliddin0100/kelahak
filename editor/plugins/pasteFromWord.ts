/**
 * Word'dan nusxa olingan HTML ni tozalash (pullik PowerPaste'ning sodda o'rnini bosuvchi).
 * - mso-* uslublari, Mso* klasslari, <o:p>, izohlar, <style>/<meta> olib tashlanadi;
 * - Word ro'yxatlari (mso-list) haqiqiy <ol>/<ul> ga aylantiriladi (darajalari bilan);
 * - qalin/kursiv, hizalash, jadval va kengliklar saqlanadi.
 * Natija baribir serverda lib/purify.ts orqali yana tozalanadi.
 */

const WORD_MARKERS = /class=["']?Mso|urn:schemas-microsoft-com|mso-|<o:p>|<w:WordDocument/i;

export function isWordHtml(html: string): boolean {
  return WORD_MARKERS.test(html);
}

function cleanStyle(style: string): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter((d) => {
      if (!d) return false;
      const prop = d.split(':')[0].trim().toLowerCase();
      if (prop.startsWith('mso-') || prop.startsWith('tab-stops')) return false;
      // Word har bir paragrafga qo'yadigan keraksiz qiymatlar
      if (/^(margin|margin-(top|bottom|left|right))$/.test(prop) && /:\s*0(cm|in|pt|px)?\s*$/.test(d)) {
        return false;
      }
      return true;
    })
    .join('; ');
}

type ListInfo = { level: number; ordered: boolean; type?: string };

function listInfo(p: HTMLElement): ListInfo | null {
  const style = p.getAttribute('style') || '';
  const m = /mso-list:\s*l\d+\s+level(\d+)/i.exec(style);
  if (!m && !/MsoListParagraph/i.test(p.className)) return null;
  const level = m ? Math.max(1, Number(m[1])) : 1;

  // Marker matni: <span style="mso-list:Ignore">1.<span>&nbsp;</span></span>
  const marker = Array.from(p.querySelectorAll('span')).find((s) =>
    /mso-list:\s*Ignore/i.test(s.getAttribute('style') || '')
  );
  const text = (marker?.textContent || p.textContent || '').trim();
  let ordered = false;
  let type: string | undefined;
  if (/^\d+[.)]/.test(text)) ordered = true;
  else if (/^[ivxlcdm]+[.)]/.test(text)) {
    ordered = true;
    type = 'i';
  } else if (/^[IVXLCDM]+[.)]/.test(text)) {
    ordered = true;
    type = 'I';
  } else if (/^[a-z][.)]/.test(text)) {
    ordered = true;
    type = 'a';
  } else if (/^[A-Z][.)]/.test(text)) {
    ordered = true;
    type = 'A';
  }
  marker?.remove();
  return { level, ordered, type };
}

function convertLists(doc: Document) {
  const paragraphs = Array.from(doc.body.querySelectorAll('p'));
  let stack: HTMLElement[] = [];
  let lastP: Element | null = null;

  for (const p of paragraphs) {
    const info = listInfo(p);
    const contiguous = lastP && p.previousElementSibling === lastP;
    if (!info) {
      stack = [];
      lastP = null;
      continue;
    }
    if (!contiguous) stack = [];

    while (stack.length > info.level) stack.pop();
    while (stack.length < info.level) {
      const list = doc.createElement(info.ordered ? 'ol' : 'ul');
      if (info.type) list.setAttribute('type', info.type);
      if (stack.length === 0) {
        p.parentNode?.insertBefore(list, p);
      } else {
        const parentList = stack[stack.length - 1];
        const lastLi = parentList.lastElementChild ?? parentList.appendChild(doc.createElement('li'));
        lastLi.appendChild(list);
      }
      stack.push(list);
    }

    const li = doc.createElement('li');
    while (p.firstChild) li.appendChild(p.firstChild);
    const align = p.style.textAlign;
    if (align) li.style.textAlign = align;
    stack[stack.length - 1].appendChild(li);
    lastP = p;
    // p ni joyida qoldiramiz (keyingi qo'shni tekshiruvi uchun), oxirida o'chiriladi
    p.setAttribute('data-mezon-list-done', '1');
  }
  doc.body.querySelectorAll('p[data-mezon-list-done]').forEach((p) => p.remove());
}

export function cleanWordHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Izohlar (shartli izohlar <!--[if ...]> ham)
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.parentNode?.removeChild(c));

  doc.body.querySelectorAll('style, meta, link, xml, title, script').forEach((n) => n.remove());

  // o:p, w:*, v:*, m:* kabi Office teglarini ochib tashlash
  Array.from(doc.body.getElementsByTagName('*')).forEach((el) => {
    if (el.tagName.includes(':')) {
      if (/^o:p$/i.test(el.tagName) && !el.textContent?.trim()) {
        el.remove();
      } else {
        el.replaceWith(...Array.from(el.childNodes));
      }
    }
  });

  convertLists(doc);

  doc.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.className && /(^|\s)Mso/i.test(el.className)) el.removeAttribute('class');
    const style = el.getAttribute('style');
    if (style !== null) {
      const cleaned = cleanStyle(style);
      if (cleaned) el.setAttribute('style', cleaned);
      else el.removeAttribute('style');
    }
    el.removeAttribute('lang');
    // Word markazlashni align="center" bilan beradi — uslubga o'tkaziladi
    const align = el.getAttribute('align');
    if (align && el.tagName !== 'TABLE' && !el.style.textAlign) {
      el.style.textAlign = align.toLowerCase();
      el.removeAttribute('align');
    }
  });

  // Atributsiz bo'sh span'larni ochish
  doc.body.querySelectorAll('span').forEach((span) => {
    if (!span.attributes.length) span.replaceWith(...Array.from(span.childNodes));
  });

  return doc.body.innerHTML;
}
