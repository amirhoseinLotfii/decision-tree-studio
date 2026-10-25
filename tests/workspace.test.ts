import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceStore, STORAGE_KEY } from '../src/state/workspace';
import { evaluate } from '../src/domain/engine';
import { fixture, memoryStorage } from './fixtures';

describe('persistent workspace', () => {
  it('restores recorded answers, note drafts and preferences', () => {
    const storage = memoryStorage(),
      store = createWorkspaceStore(storage);
    store.getState().loadDocument(fixture());
    store.getState().answer('a', 'yes');
    store.getState().draftNote('node-a', 'unfinished');
    store.getState().setTheme('light');
    const next = createWorkspaceStore(storage).getState();
    expect(next.sessions.test?.answers.a?.optionId).toBe('yes');
    expect(next.sessions.test?.noteDrafts['node-a']).toBe('unfinished');
    expect(next.theme).toBe('light');
  });
  it('preserves corrupt storage instead of overwriting it', () => {
    const storage = memoryStorage();
    storage.values.set(STORAGE_KEY, 'broken');
    const s = createWorkspaceStore(storage);
    s.getState().setTheme('light');
    expect(storage.values.get(STORAGE_KEY)).toBe('broken');
    expect(s.getState().recoveryText).toBe('broken');
    expect(s.getState().storageError).toBeTruthy();
  });
  it('reports quota failures while retaining in-memory edits', () => {
    const store = createWorkspaceStore({
      getItem: () => null,
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
    });
    store.getState().loadDocument(fixture());
    store.getState().answer('a', 'yes');
    expect(store.getState().storageError).toContain('Saving failed');
    expect(store.getState().sessions.test?.answers.a).toBeDefined();
  });
  it('supports undo/redo and undoing a reset', () => {
    const s = createWorkspaceStore(memoryStorage());
    s.getState().loadDocument(fixture());
    s.getState().answer('a', 'yes');
    s.getState().undo();
    expect(s.getState().sessions.test?.answers.a).toBeUndefined();
    s.getState().redo();
    expect(s.getState().sessions.test?.answers.a).toBeDefined();
    s.getState().resetSession();
    s.getState().undo();
    expect(s.getState().sessions.test?.answers.a).toBeDefined();
  });
  it('keeps projects independent and clears undo history on switching', () => {
    const s = createWorkspaceStore(memoryStorage());
    s.getState().loadDocument(fixture());
    s.getState().answer('a', 'yes');
    s.getState().loadDocument({ ...fixture(), id: 'second' });
    expect(s.getState().sessions.second?.answers).toEqual({});
    s.getState().activate('test');
    expect(s.getState().history.past).toEqual([]);
    expect(s.getState().sessions.test?.answers.a).toBeDefined();
  });
  it('retains answers for review when the same document is updated', () => {
    const s = createWorkspaceStore(memoryStorage()),
      d = fixture();
    s.getState().loadDocument(d);
    s.getState().answer('a', 'yes');
    if (d.nodes[0]?.kind === 'question') d.nodes[0].revision++;
    s.getState().loadDocument(d);
    expect(evaluate(d, s.getState().sessions.test!).states.a?.status).toBe('review');
  });
  it('edits notes without changing their identity and can undo deletion', () => {
    const s = createWorkspaceStore(memoryStorage());
    s.getState().loadDocument(fixture());
    s.getState().saveNote({ type: 'node', id: 'a' }, ' first ');
    const id = s.getState().sessions.test!.notes[0]!.id;
    s.getState().saveNote({ type: 'node', id: 'a' }, 'second', id);
    expect(s.getState().sessions.test!.notes).toHaveLength(1);
    s.getState().removeNote(id);
    s.getState().undo();
    expect(s.getState().sessions.test!.notes[0]!.text).toBe('second');
  });
});
