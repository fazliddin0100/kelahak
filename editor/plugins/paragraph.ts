import type { MezonEditor } from './types';

/** Rasmiy hujjatlarda birinchi qator chekinishi */
export const FIRST_LINE_INDENT = '1.25cm';

const toCm = (value: string): string => {
  const v = value.trim();
  if (!v) return '';
  const n = parseFloat(v);
  if (Number.isNaN(n)) return '';
  if (v.endsWith('cm')) return String(n);
  if (v.endsWith('mm')) return String(+(n / 10).toFixed(2));
  if (v.endsWith('pt')) return String(+(n * 0.03528).toFixed(2));
  if (v.endsWith('px')) return String(+(n * 0.02646).toFixed(2));
  if (v.endsWith('in')) return String(+(n * 2.54).toFixed(2));
  return String(n);
};
const toPt = (value: string): string => {
  const v = value.trim();
  if (!v) return '';
  const n = parseFloat(v);
  if (Number.isNaN(n)) return '';
  if (v.endsWith('px')) return String(Math.round(n * 0.75));
  if (v.endsWith('cm')) return String(Math.round(n * 28.35));
  if (v.endsWith('mm')) return String(Math.round(n * 2.835));
  return String(Math.round(n));
};
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function blocks(editor: MezonEditor): HTMLElement[] {
  const list = editor.selection.getSelectedBlocks();
  return list.length ? list : [editor.selection.getNode()];
}

export function registerParagraphTools(editor: MezonEditor) {
  editor.ui.registry.addIcon(
    'mezon-first-indent',
    '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 5h16v2H4zM9 9h11v2H9zM4 13h16v2H4zM4 17h16v2H4zM4 8.5 7 10l-3 1.5z" fill-rule="evenodd"/></svg>'
  );

  editor.ui.registry.addToggleButton('firstlineindent', {
    icon: 'mezon-first-indent',
    tooltip: 'Birinchi qator chekinishi (1,25 sm)',
    onAction: () => {
      const items = blocks(editor);
      const on = items.every((b) => editor.dom.getStyle(b, 'text-indent'));
      editor.undoManager.transact(() => {
        items.forEach((b) => editor.dom.setStyle(b, 'text-indent', on ? null : FIRST_LINE_INDENT));
      });
      editor.nodeChanged();
    },
    onSetup: (api: { setActive: (v: boolean) => void }) => {
      const handler = () => {
        const node = editor.selection.getNode();
        const block = node?.closest?.('p,li,h1,h2,h3,h4,h5,h6,div,td,th') as HTMLElement | null;
        api.setActive(!!(block && editor.dom.getStyle(block, 'text-indent')));
      };
      editor.on('NodeChange', handler);
      return () => editor.off('NodeChange', handler);
    },
  });

  const openDialog = () => {
    const first = blocks(editor)[0];
    const get = (name: string) => (first ? editor.dom.getStyle(first, name) : '');
    const initial = {
      align: get('text-align') || 'left',
      indentLeft: toCm(get('margin-left') || get('padding-left')),
      indentRight: toCm(get('margin-right')),
      firstLine: toCm(get('text-indent')),
      spaceBefore: toPt(get('margin-top')),
      spaceAfter: toPt(get('margin-bottom')),
      lineHeight: get('line-height') || '',
    };

    editor.windowManager.open({
      title: 'Abzats',
      size: 'normal',
      body: {
        type: 'panel',
        items: [
          {
            type: 'selectbox',
            name: 'align',
            label: 'Hizalash',
            items: [
              { value: 'left', text: 'Chapga' },
              { value: 'center', text: 'Markazga' },
              { value: 'right', text: "O'ngga" },
              { value: 'justify', text: 'Kenglik bo‘yicha' },
            ],
          },
          {
            type: 'grid',
            columns: 3,
            items: [
              { type: 'input', name: 'indentLeft', label: 'Chapdan (sm)', inputMode: 'decimal' },
              { type: 'input', name: 'indentRight', label: "O'ngdan (sm)", inputMode: 'decimal' },
              { type: 'input', name: 'firstLine', label: 'Birinchi qator (sm)', inputMode: 'decimal' },
            ],
          },
          {
            type: 'grid',
            columns: 3,
            items: [
              { type: 'input', name: 'spaceBefore', label: 'Oldin (pt)', inputMode: 'numeric' },
              { type: 'input', name: 'spaceAfter', label: 'Keyin (pt)', inputMode: 'numeric' },
              {
                type: 'selectbox',
                name: 'lineHeight',
                label: 'Interval',
                items: [
                  { value: '', text: 'Odatiy' },
                  { value: '1', text: '1' },
                  { value: '1.15', text: '1,15' },
                  { value: '1.5', text: '1,5' },
                  { value: '2', text: '2' },
                  { value: '2.5', text: '2,5' },
                  { value: '3', text: '3' },
                ],
              },
            ],
          },
        ],
      },
      initialData: initial,
      buttons: [
        { type: 'cancel', text: 'Bekor qilish' },
        { type: 'submit', text: "Qo'llash", primary: true },
      ],
      onSubmit: (api: { getData: () => Record<string, string>; close: () => void }) => {
        const d = api.getData();
        const cm = (v: string) => {
          const n = num(v);
          return n === null || n === 0 ? null : `${n}cm`;
        };
        const pt = (v: string) => {
          const n = num(v);
          return n === null ? null : `${n}pt`;
        };
        editor.undoManager.transact(() => {
          blocks(editor).forEach((b) => {
            editor.dom.setStyle(b, 'text-align', d.align && d.align !== 'left' ? d.align : null);
            editor.dom.setStyle(b, 'margin-left', cm(d.indentLeft));
            editor.dom.setStyle(b, 'margin-right', cm(d.indentRight));
            editor.dom.setStyle(b, 'text-indent', cm(d.firstLine));
            editor.dom.setStyle(b, 'margin-top', pt(d.spaceBefore));
            editor.dom.setStyle(b, 'margin-bottom', pt(d.spaceAfter));
            editor.dom.setStyle(b, 'line-height', d.lineHeight || null);
          });
        });
        editor.nodeChanged();
        api.close();
      },
    });
  };

  editor.ui.registry.addButton('paragraphdialog', {
    icon: 'line-height',
    tooltip: 'Abzats sozlamalari',
    onAction: openDialog,
  });
  editor.ui.registry.addMenuItem('paragraphdialog', {
    icon: 'line-height',
    text: 'Abzats...',
    onAction: openDialog,
  });
}
