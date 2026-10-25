import { createStore } from 'zustand/vanilla';
import { z } from 'zod';
import { validateDocument, documentSchema } from '../domain/schema';
import type { DecisionDocument } from '../domain/schema';
import { emptySession, recordAnswer } from '../domain/engine';
import type { Note, Session } from '../domain/engine';
import { sessionSchema } from '../domain/transfer';
import { launchExample } from '../data/examples';

export const STORAGE_KEY = 'decision-tree-studio/workspace/v1';
export type Language = 'en' | 'fa';
type Theme = 'dark' | 'light';
type Settings = { minimap: boolean; dependencies: boolean; animations: boolean };
type Persisted = {
  formatVersion: 1;
  documents: Record<string, DecisionDocument>;
  sessions: Record<string, Session>;
  activeId: string;
  theme: Theme;
  language: Language;
  settings: Settings;
};
type History = { past: Session[]; future: Session[] };
export type Workspace = Persisted & {
  storageError: string;
  recoveryText: string;
  history: History;
  loadDocument: (doc: DecisionDocument, session?: Session) => void;
  activate: (id: string) => void;
  answer: (id: string, option: string) => void;
  draft: (id: string, option: string) => void;
  draftNote: (key: string, text: string) => void;
  removeAnswer: (id: string) => void;
  saveNote: (target: Note['target'], text: string, id?: string) => void;
  removeNote: (id: string) => void;
  undo: () => void;
  redo: () => void;
  resetSession: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setSetting: (key: keyof Settings, value: boolean) => void;
};
const persistedSchema = z.object({
  formatVersion: z.literal(1),
  documents: z.record(z.string(), documentSchema),
  sessions: z.record(z.string(), sessionSchema),
  activeId: z.string(),
  theme: z.enum(['dark', 'light']),
  language: z.enum(['en', 'fa']),
  settings: z.object({ minimap: z.boolean(), dependencies: z.boolean(), animations: z.boolean() }),
});
function initial(): Persisted {
  return {
    formatVersion: 1,
    documents: { [launchExample.id]: launchExample },
    sessions: { [launchExample.id]: emptySession() },
    activeId: launchExample.id,
    theme: 'dark',
    language: 'en',
    settings: { minimap: true, dependencies: false, animations: true },
  };
}
function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function createWorkspaceStore(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = safeStorage(),
) {
  let saved = initial(),
    storageError = '',
    recoveryText = '',
    blocked = false;
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) {
      recoveryText = raw;
      const result = persistedSchema.parse(JSON.parse(raw));
      for (const [id, doc] of Object.entries(result.documents)) {
        if (id !== doc.id) throw new Error('Document key mismatch.');
        validateDocument(doc);
        if (!result.sessions[id]) throw new Error('Missing project session.');
      }
      if (!result.documents[result.activeId] || !result.sessions[result.activeId])
        throw new Error('Missing active project.');
      saved = result;
      recoveryText = '';
    }
  } catch {
    storageError =
      'The local workspace could not be read. It has not been overwritten. Export your current work before leaving.';
    blocked = true;
  }
  if (!storage && !storageError)
    storageError = 'Browser storage is unavailable. Export a session before leaving.';
  const store = createStore<Workspace>((set, get) => {
    const updateSession = (
      transform: (session: Session, doc: DecisionDocument) => Session,
      record = true,
    ) => {
      const state = get(),
        before = state.sessions[state.activeId] ?? emptySession(),
        doc = state.documents[state.activeId];
      if (!doc) return;
      const after = transform(before, doc);
      set({
        sessions: { ...state.sessions, [state.activeId]: after },
        ...(record
          ? { history: { past: [...state.history.past.slice(-49), before], future: [] } }
          : {}),
      });
    };
    return {
      ...saved,
      storageError,
      recoveryText,
      history: { past: [], future: [] },
      loadDocument: (input, inputSession) => {
        const doc = validateDocument(input),
          session = inputSession
            ? sessionSchema.parse(inputSession)
            : (get().sessions[doc.id] ?? emptySession());
        const state = get();
        set({
          documents: { ...state.documents, [doc.id]: doc },
          sessions: { ...state.sessions, [doc.id]: session },
          activeId: doc.id,
          history: { past: [], future: [] },
        });
      },
      activate: (id) => {
        if (get().documents[id]) set({ activeId: id, history: { past: [], future: [] } });
      },
      answer: (id, option) =>
        updateSession((session, doc) => recordAnswer(doc, session, id, option)),
      draft: (id, option) =>
        updateSession(
          (session) => ({ ...session, drafts: { ...session.drafts, [id]: option } }),
          false,
        ),
      draftNote: (key, text) =>
        updateSession(
          (session) => ({
            ...session,
            noteDrafts: { ...session.noteDrafts, [key]: text.slice(0, 20_000) },
          }),
          false,
        ),
      removeAnswer: (id) =>
        updateSession((session) => {
          const answers = { ...session.answers },
            drafts = { ...session.drafts };
          delete answers[id];
          delete drafts[id];
          return { ...session, answers, drafts };
        }),
      saveNote: (target, text, id) =>
        updateSession((session) => {
          const trimmed = text.trim();
          if (!trimmed || trimmed.length > 20_000)
            throw new Error('A note must contain 1–20,000 characters.');
          const now = new Date().toISOString(),
            existing = session.notes.find((n) => n.id === id);
          const note: Note = {
            id: existing?.id ?? crypto.randomUUID(),
            target,
            text: trimmed,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          const noteDrafts = { ...session.noteDrafts };
          delete noteDrafts[id ?? JSON.stringify(target)];
          return {
            ...session,
            noteDrafts,
            notes: existing
              ? session.notes.map((n) => (n.id === id ? note : n))
              : [...session.notes, note],
          };
        }),
      removeNote: (id) =>
        updateSession((session) => ({
          ...session,
          notes: session.notes.filter((n) => n.id !== id),
        })),
      undo: () => {
        const s = get(),
          previous = s.history.past.at(-1),
          current = s.sessions[s.activeId];
        if (!previous || !current) return;
        set({
          sessions: { ...s.sessions, [s.activeId]: previous },
          history: { past: s.history.past.slice(0, -1), future: [current, ...s.history.future] },
        });
      },
      redo: () => {
        const s = get(),
          next = s.history.future[0],
          current = s.sessions[s.activeId];
        if (!next || !current) return;
        set({
          sessions: { ...s.sessions, [s.activeId]: next },
          history: { past: [...s.history.past, current], future: s.history.future.slice(1) },
        });
      },
      resetSession: () => updateSession(() => emptySession()),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSetting: (key, value) => set({ settings: { ...get().settings, [key]: value } }),
    };
  });
  store.subscribe((state) => {
    if (!storage || blocked) return;
    const { formatVersion, documents, sessions, activeId, theme, language, settings } = state;
    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ formatVersion, documents, sessions, activeId, theme, language, settings }),
      );
    } catch {
      blocked = true;
      store.setState({
        storageError:
          'Saving failed: storage may be full or disabled. Export your session before leaving.',
      });
    }
  });
  return store;
}
export const workspaceStore = createWorkspaceStore();
