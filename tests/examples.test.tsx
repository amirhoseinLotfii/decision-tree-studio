import { describe, expect, it } from 'vitest';
import { createWorkspaceStore, STORAGE_KEY, workspaceStore } from '../src/state/workspace';
import { memoryStorage, fixture } from './fixtures';
import { emptySession, recordAnswer } from '../src/domain/engine';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasHelp } from '../src/components/CanvasHelp';
import { translator } from '../src/lib/i18n';

describe('data-free startup and local seed cleanup', () => {
  it('starts without documents or sessions', () => {
    const s = createWorkspaceStore(memoryStorage()).getState();
    expect(s.documents).toEqual({});
    expect(s.sessions).toEqual({});
    expect(s.activeId).toBe('');
  });
  it('removes only legacy sample projects and preserves user answers', () => {
    const storage = memoryStorage(),
      doc = fixture();
    const userSession = recordAnswer(doc, emptySession(), 'a', 'yes');
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        formatVersion: 1,
        documents: {
          test: doc,
          'delivery-workflow': { ...doc, id: 'delivery-workflow' },
          'delivery-workflow-fa': { ...doc, id: 'delivery-workflow-fa' },
        },
        sessions: {
          test: userSession,
          'delivery-workflow': emptySession(),
          'delivery-workflow-fa': emptySession(),
        },
        activeId: 'test',
        theme: 'dark',
        language: 'fa',
        settings: { minimap: true, dependencies: false, animations: true },
      }),
    );
    const s = createWorkspaceStore(storage).getState();
    expect(Object.keys(s.documents)).toEqual(['test']);
    expect(s.sessions.test).toEqual(userSession);
    expect(s.language).toBe('fa');
    expect(s.activeId).toBe('test');
    expect(
      JSON.parse(storage.getItem(STORAGE_KEY)!).documents['delivery-workflow'],
    ).toBeUndefined();
  });
  it('selects a surviving project if the removed sample was active', () => {
    const storage = memoryStorage(),
      doc = fixture();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        formatVersion: 1,
        documents: { test: doc, 'delivery-workflow': { ...doc, id: 'delivery-workflow' } },
        sessions: { test: emptySession(), 'delivery-workflow': emptySession() },
        activeId: 'delivery-workflow',
        theme: 'dark',
        language: 'en',
        settings: { minimap: true, dependencies: false, animations: true },
      }),
    );
    expect(createWorkspaceStore(storage).getState().activeId).toBe('test');
  });
  it('does not repeat the cleanup on future imported documents', () => {
    const storage = memoryStorage(),
      s = createWorkspaceStore(storage);
    s.getState().loadDocument({ ...fixture(), id: 'delivery-workflow' });
    expect(createWorkspaceStore(storage).getState().documents['delivery-workflow']).toBeDefined();
  });
  it('closes the hint and persists the setting', async () => {
    workspaceStore.getState().setSetting('showCanvasHelp', true);
    render(<CanvasHelp t={translator('en')} />);
    expect(screen.getByText(/Drag to pan/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(/Drag to pan/)).not.toBeInTheDocument();
    expect(workspaceStore.getState().settings.showCanvasHelp).toBe(false);
    const storage = memoryStorage(),
      s = createWorkspaceStore(storage);
    s.getState().setSetting('showCanvasHelp', false);
    expect(createWorkspaceStore(storage).getState().settings.showCanvasHelp).toBe(false);
  });
});
