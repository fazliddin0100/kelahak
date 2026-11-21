/**
 * TinyMCE muharririning biz ishlatadigan qismi (to'liq tiplar @types/tinymce v4 uchun eskirgan).
 */
export type MezonEditor = {
  getBody: () => HTMLElement;
  getDoc: () => Document;
  getContent: (args?: { format?: string; no_events?: boolean }) => string;
  insertContent: (html: string) => void;
  execCommand: (cmd: string, ui?: boolean, value?: unknown) => boolean;
  focus: () => void;
  on: (name: string, cb: (e: unknown) => void) => void;
  off: (name: string, cb: (e: unknown) => void) => void;
  nodeChanged: () => void;
  selection: {
    getNode: () => HTMLElement;
    getRng: () => Range;
    setRng: (rng: Range) => void;
    isCollapsed: () => boolean;
    getSelectedBlocks: () => HTMLElement[];
  };
  dom: {
    getStyle: (el: Element, name: string, computed?: boolean) => string;
    setStyle: (el: Element, name: string, value: string | null) => void;
    encode: (text: string) => string;
  };
  formatter: {
    match: (name: string) => boolean;
    apply: (name: string, vars?: Record<string, string>) => void;
    remove: (name: string, vars?: Record<string, string>) => void;
    register: (name: string, format: unknown) => void;
  };
  undoManager: { transact: (cb: () => void) => void };
  windowManager: {
    open: (spec: unknown) => unknown;
  };
  notificationManager: {
    open: (spec: { text: string; type?: string; timeout?: number }) => unknown;
  };
  ui: {
    registry: {
      addButton: (name: string, spec: unknown) => void;
      addToggleButton: (name: string, spec: unknown) => void;
      addMenuButton: (name: string, spec: unknown) => void;
      addMenuItem: (name: string, spec: unknown) => void;
      addNestedMenuItem: (name: string, spec: unknown) => void;
      addIcon: (name: string, svg: string) => void;
    };
  };
};

/** Hujjat ma'lumotidan muharrirga joylanadigan maydonlar */
export type EditorDocumentFields = {
  fullName?: string;
  position?: string;
  militaryRank?: string;
  organization?: string;
};
