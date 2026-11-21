import type { EditorDocumentFields, MezonEditor } from './types';

// ─── Harf registri ──────────────────────────────────────────────────────────

type CaseMode = 'upper' | 'lower' | 'title' | 'sentence';

function transform(text: string, mode: CaseMode, atStart: boolean): string {
  switch (mode) {
    case 'upper':
      return text.toLocaleUpperCase('uz');
    case 'lower':
      return text.toLocaleLowerCase('uz');
    case 'title':
      return text
        .toLocaleLowerCase('uz')
        .replace(/(^|[\s«"(„-])(\p{L})/gu, (_m, p: string, c: string) => p + c.toLocaleUpperCase('uz'));
    case 'sentence': {
      const lower = text.toLocaleLowerCase('uz');
      const fixed = lower.replace(/([.!?]\s+)(\p{L})/gu, (_m, p: string, c: string) => p + c.toLocaleUpperCase('uz'));
      return atStart ? fixed.replace(/^(\s*)(\p{L})/u, (_m, s: string, c: string) => s + c.toLocaleUpperCase('uz')) : fixed;
    }
  }
}

/** Belgilangan matn qismidagi matn tugunlarini almashtiradi (formatlash saqlanadi) */
function changeCase(editor: MezonEditor, mode: CaseMode) {
  if (editor.selection.isCollapsed()) return;
  const rng = editor.selection.getRng();
  const root = rng.commonAncestorContainer;
  const doc = editor.getDoc();
  const nodes: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) nodes.push(root as Text);
  else {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      if (rng.intersectsNode(n)) nodes.push(n);
    }
  }
  const { startContainer, startOffset, endContainer, endOffset } = rng;
  editor.undoManager.transact(() => {
    nodes.forEach((node, i) => {
      const value = node.nodeValue ?? '';
      const from = node === startContainer ? startOffset : 0;
      const to = node === endContainer ? endOffset : value.length;
      node.nodeValue =
        value.slice(0, from) + transform(value.slice(from, to), mode, i === 0) + value.slice(to);
    });
  });
  // Belgilashni tiklash (uzunlik o'zgarmaydi)
  const restored = doc.createRange();
  restored.setStart(startContainer, startOffset);
  restored.setEnd(endContainer, endOffset);
  editor.selection.setRng(restored);
  editor.nodeChanged();
}

export function registerChangeCase(editor: MezonEditor) {
  const items: { mode: CaseMode; text: string }[] = [
    { mode: 'sentence', text: 'Gap boshida bosh harf' },
    { mode: 'lower', text: 'kichik harflar' },
    { mode: 'upper', text: 'KATTA HARFLAR' },
    { mode: 'title', text: 'Har So‘z Bosh Harf Bilan' },
  ];
  editor.ui.registry.addIcon(
    'mezon-case',
    '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 18 7.5 6h1.8L14 18h-2.1l-1.1-3.1H6l-1.1 3.1H3zm3.6-5h3.6L8.4 8 6.6 13zm9.4 5.2c-1.7 0-2.8-1-2.8-2.5 0-1.7 1.4-2.6 3.9-2.6h1.2v-.4c0-.9-.6-1.4-1.6-1.4-.9 0-1.6.4-1.9 1l-1.4-.8c.6-1.1 1.8-1.8 3.4-1.8 2.1 0 3.4 1.1 3.4 3V18h-1.8v-1c-.5.8-1.4 1.2-2.4 1.2zm.5-1.6c1.1 0 1.8-.7 1.8-1.6v-.5h-1.1c-1.4 0-2.1.4-2.1 1.1 0 .6.5 1 1.4 1z"/></svg>'
  );
  editor.ui.registry.addMenuButton('changecase', {
    icon: 'mezon-case',
    tooltip: 'Harf registri',
    fetch: (cb: (items: unknown[]) => void) =>
      cb(items.map((it) => ({ type: 'menuitem', text: it.text, onAction: () => changeCase(editor, it.mode) }))),
  });
  editor.ui.registry.addNestedMenuItem('changecase', {
    icon: 'mezon-case',
    text: 'Harf registri',
    getSubmenuItems: () =>
      items.map((it) => ({ type: 'menuitem', text: it.text, onAction: () => changeCase(editor, it.mode) })),
  });
}

// ─── Hujjat maydonlari ──────────────────────────────────────────────────────

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

export function formatDateShort(d = new Date()) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
export function formatDateLong(d = new Date()) {
  return `${d.getFullYear()}-yil ${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

export function registerDocumentFields(
  editor: MezonEditor,
  getFields: () => EditorDocumentFields
) {
  const insert = (value?: string) => {
    if (!value?.trim()) {
      editor.notificationManager.open({ text: 'Bu ma’lumot hujjatda yo‘q', type: 'warning', timeout: 2500 });
      return;
    }
    editor.insertContent(editor.dom.encode(value.trim()));
  };
  const build = () => {
    const f = getFields();
    return [
      { type: 'menuitem', text: `F.I.Sh${f.fullName ? ` — ${f.fullName}` : ''}`, onAction: () => insert(f.fullName) },
      { type: 'menuitem', text: `Lavozim${f.position ? ` — ${f.position}` : ''}`, onAction: () => insert(f.position) },
      { type: 'menuitem', text: `Unvon${f.militaryRank ? ` — ${f.militaryRank}` : ''}`, onAction: () => insert(f.militaryRank) },
      { type: 'menuitem', text: `Tashkilot${f.organization ? ` — ${f.organization}` : ''}`, onAction: () => insert(f.organization) },
      { type: 'separator' },
      { type: 'menuitem', text: `Sana — ${formatDateShort()}`, onAction: () => insert(formatDateShort()) },
      { type: 'menuitem', text: `Sana — ${formatDateLong()}`, onAction: () => insert(formatDateLong()) },
    ];
  };
  editor.ui.registry.addMenuButton('docfields', {
    icon: 'user',
    text: 'Maydonlar',
    tooltip: 'Hujjat ma’lumotini joylash',
    fetch: (cb: (items: unknown[]) => void) => cb(build()),
  });
  editor.ui.registry.addNestedMenuItem('docfields', {
    icon: 'user',
    text: 'Hujjat maydonlari',
    getSubmenuItems: build,
  });
}

// ─── Formatni nusxalash (Word'dagi "cho'tka") ───────────────────────────────

const INLINE_FORMATS = ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript'];

type Captured = {
  inline: Record<string, boolean>;
  color: string;
  background: string;
  fontFamily: string;
  fontSize: string;
  block: Record<string, string>;
};

export function registerFormatPainter(editor: MezonEditor) {
  let captured: Captured | null = null;
  let setActive: ((v: boolean) => void) | null = null;

  const capture = (): Captured => {
    const node = editor.selection.getNode();
    const block = (node.closest('p,li,h1,h2,h3,h4,h5,h6,td,th,div') as HTMLElement | null) ?? node;
    return {
      inline: Object.fromEntries(INLINE_FORMATS.map((f) => [f, editor.formatter.match(f)])),
      color: editor.dom.getStyle(node, 'color'),
      background: editor.dom.getStyle(node, 'background-color'),
      fontFamily: editor.dom.getStyle(node, 'font-family'),
      fontSize: editor.dom.getStyle(node, 'font-size'),
      block: {
        'text-align': editor.dom.getStyle(block, 'text-align'),
        'line-height': editor.dom.getStyle(block, 'line-height'),
        'text-indent': editor.dom.getStyle(block, 'text-indent'),
        'margin-left': editor.dom.getStyle(block, 'margin-left'),
      },
    };
  };

  const apply = (c: Captured) => {
    editor.undoManager.transact(() => {
      INLINE_FORMATS.forEach((f) => {
        const has = editor.formatter.match(f);
        if (c.inline[f] && !has) editor.formatter.apply(f);
        if (!c.inline[f] && has) editor.formatter.remove(f);
      });
      if (c.color) editor.execCommand('ForeColor', false, c.color);
      if (c.background) editor.execCommand('HiliteColor', false, c.background);
      if (c.fontFamily) editor.execCommand('FontName', false, c.fontFamily);
      if (c.fontSize) editor.execCommand('FontSize', false, c.fontSize);
      editor.selection.getSelectedBlocks().forEach((b) => {
        Object.entries(c.block).forEach(([k, v]) => editor.dom.setStyle(b, k, v || null));
      });
    });
  };

  const stop = () => {
    captured = null;
    setActive?.(false);
    editor.getBody().style.cursor = '';
  };

  editor.on('mouseup', () => {
    if (!captured) return;
    // Bitta bosish — bitta qo'llash (Word'dagi kabi)
    setTimeout(() => {
      if (!captured) return;
      if (!editor.selection.isCollapsed()) apply(captured);
      stop();
    }, 0);
  });
  editor.on('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape' && captured) stop();
  });

  editor.ui.registry.addIcon(
    'mezon-painter',
    '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 3h12a1 1 0 0 1 1 1v1h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h1v-3a1 1 0 0 1 1-1h7V7h-1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v2h10V5H6z"/></svg>'
  );
  editor.ui.registry.addToggleButton('formatpainter', {
    icon: 'mezon-painter',
    tooltip: 'Formatni nusxalash (keyin kerakli matnni belgilang, Esc — bekor)',
    onAction: () => {
      if (captured) return stop();
      captured = capture();
      setActive?.(true);
      editor.getBody().style.cursor = 'copy';
    },
    onSetup: (api: { setActive: (v: boolean) => void }) => {
      setActive = api.setActive;
      return () => {
        setActive = null;
      };
    },
  });
}
