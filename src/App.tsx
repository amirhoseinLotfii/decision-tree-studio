import { DirectionProvider } from '@radix-ui/react-direction';
import { LocalizedSelect } from './components/LocalizedSelect';
import { interfaceDirection, formatNumber } from './lib/locale';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileInput,
  GitBranch,
  Languages,
  LayoutGrid,
  List,
  Menu,
  Moon,
  Redo2,
  Search,
  Sun,
  Undo2,
} from 'lucide-react';
import { workspaceStore } from './state/workspace';
import { evaluate, emptySession, nextQuestion } from './domain/engine';
import type { Note, Session } from './domain/engine';
import type { DecisionDocument } from './domain/schema';
import { translator } from './lib/i18n';
import { copyText, downloadJson } from './lib/files';
import { exportSession } from './domain/transfer';
import { Button, Modal } from './components/ui';
import { QuestionDialog } from './components/QuestionDialog';
import { WorkspaceMenu } from './components/WorkspaceMenu';
import { ImportDialog } from './components/ImportDialog';
import { NoteDialog } from './components/NoteDialog';
import type { NoteRequest } from './components/NoteDialog';
import { emptyWorkspace } from './domain/empty-workspace';
const DecisionCanvas = lazy(() => import('./graph/DecisionCanvas'));
type Confirmation = { title: string; description: string; confirm: () => void };
const fallbackSession = emptySession();

export default function App() {
  const active = useStore(workspaceStore, (s) => s.activeId),
    documents = useStore(workspaceStore, (s) => s.documents),
    sessions = useStore(workspaceStore, (s) => s.sessions);
  const theme = useStore(workspaceStore, (s) => s.theme),
    language = useStore(workspaceStore, (s) => s.language),
    settings = useStore(workspaceStore, (s) => s.settings),
    history = useStore(workspaceStore, (s) => s.history),
    storageError = useStore(workspaceStore, (s) => s.storageError);
  const hasDocument = Boolean(documents[active]);
  const doc = documents[active] ?? emptyWorkspace,
    session = sessions[active] ?? fallbackSession;
  const answers = session.answers;
  const result = useMemo(() => evaluate(doc, { answers }), [doc, answers]);
  const t = useMemo(() => translator(language), [language]);
  const reduced = useReducedMotion();
  const direction = interfaceDirection(language),
    ForwardArrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const [questionOpen, setQuestionOpen] = useState(false),
    [noteOpen, setNoteOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null),
    [menu, setMenu] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [view, setView] = useState<'graph' | 'list'>('graph');
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [note, setNote] = useState<NoteRequest | null>(null),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [manualCopy, setManualCopy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null),
    toastCounter = useRef(0);
  const notify = useCallback((text: string) => setToast({ id: ++toastCounter.current, text }), []);
  const onOpen = useCallback((id: string | null) => {
    if (id) {
      setSelected(id);
      setQuestionOpen(true);
    } else setMenu(true);
  }, []);
  const onNote = useCallback((target: Note['target'], existing?: Note) => {
    setNote({ target, existing });
    setNoteOpen(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.animations = settings.animations ? 'on' : 'off';
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [theme, language, direction, settings.animations]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches('input,textarea,select') ||
          event.target.closest('[role=combobox],[role=listbox],[role=option]') ||
          event.target.isContentEditable)
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        const state = workspaceStore.getState();
        if (event.shiftKey) state.redo();
        else state.undo();
      }
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const filtered = useMemo(
    () =>
      doc.nodes.filter(
        (n) =>
          n.kind === 'question' &&
          (filter === 'all' || result.states[n.id]?.status === filter) &&
          `${n.title} ${n.id} ${n.prompt} ${n.tags.join(' ')}`
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase()),
      ),
    [doc, result, search, filter],
  );
  const load = (next: DecisionDocument, restored?: Session) => {
    workspaceStore.getState().loadDocument(next, restored);
    setQuestionOpen(false);
    setNoteOpen(false);
    setNote(null);
    setSelected(null);
    setSearch('');
    setFilter('all');
    notify(t('importSuccess'));
  };
  const copy = async () => {
    const text = JSON.stringify(exportSession(doc, session), null, 2);
    if (await copyText(text)) notify(t('copied'));
    else setManualCopy(text);
  };
  const reset = () =>
    setConfirmation({
      title: t('resetTitle'),
      description: t('resetHelp'),
      confirm: () => workspaceStore.getState().resetSession(),
    });
  const removeAnswer = (id: string) =>
    setConfirmation({
      title: t('confirmDelete'),
      description: t('removeAnswerHelp'),
      confirm: () => workspaceStore.getState().removeAnswer(id),
    });
  const selectedNode = selected ? (doc.nodes.find((n) => n.id === selected) ?? null) : null;
  const answeredPercent = !hasDocument
    ? 0
    : result.total - result.counts.inactive > 0
      ? Math.round((result.counts.answered / (result.total - result.counts.inactive)) * 100)
      : 100;
  return (
    <DirectionProvider dir={direction}>
      <MotionConfig
        reducedMotion={settings.animations ? 'user' : 'always'}
        transition={{ duration: settings.animations && !reduced ? 0.16 : 0 }}
      >
        <div className="studio-shell">
          <header className="app-header">
            <div className="brand">
              <span className="brand-icon">
                <GitBranch size={24} />
              </span>
              <div>
                <h1>{t('studio')}</h1>
                <p>{t('tagline')}</p>
              </div>
            </div>
            <div className="header-actions">
              <Button
                className="icon-button"
                aria-label={t('undo')}
                title={`${t('undo')} · Ctrl+Z`}
                disabled={!history.past.length}
                onClick={() => workspaceStore.getState().undo()}
              >
                <Undo2 size={18} />
              </Button>
              <Button
                className="icon-button"
                aria-label={t('redo')}
                title={`${t('redo')} · Ctrl+Shift+Z`}
                disabled={!history.future.length}
                onClick={() => workspaceStore.getState().redo()}
              >
                <Redo2 size={18} />
              </Button>
              <span className="toolbar-divider" />
              <Button
                className="icon-button"
                aria-label={t('language')}
                onClick={() =>
                  workspaceStore.getState().setLanguage(language === 'en' ? 'fa' : 'en')
                }
              >
                <Languages size={19} />
              </Button>
              <Button
                className="icon-button"
                aria-label={t(theme === 'dark' ? 'light' : 'dark')}
                onClick={() =>
                  workspaceStore.getState().setTheme(theme === 'dark' ? 'light' : 'dark')
                }
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </Button>
              <Button className="icon-button" aria-label={t('menu')} onClick={() => setMenu(true)}>
                <Menu size={21} />
              </Button>
            </div>
          </header>
          <main className="workspace-main">
            <section className="project-bar">
              <div className="project-heading" dir={doc.direction}>
                <span className="eyebrow">
                  {doc.id} · {doc.version}
                </span>
                <h2>{doc.title || t('emptyWorkspace')}</h2>
              </div>
              <div className="project-progress">
                <div className="progress-caption">
                  <span>
                    {t('answered')}:{' '}
                    <bdi dir="ltr">
                      <strong>{formatNumber(language, result.counts.answered)}</strong> /{' '}
                      {formatNumber(language, result.total - result.counts.inactive)}
                    </bdi>
                  </span>
                  <bdi dir="ltr">{formatNumber(language, answeredPercent)}%</bdi>
                </div>
                <progress max={100} value={answeredPercent} aria-label={t('progress')} />
              </div>
              <Button
                className="primary next-button"
                disabled={!hasDocument}
                onClick={() => {
                  const id = nextQuestion(doc, session);
                  if (id) {
                    setSelected(id);
                    setQuestionOpen(true);
                  } else notify(t(result.complete ? 'complete' : 'noNext'));
                }}
              >
                {result.complete ? <CheckCircle2 size={18} /> : <ForwardArrow size={18} />}
                {t('next')}
              </Button>
            </section>
            {storageError ? (
              <section className="storage-warning" role="alert">
                <strong>{t('storage')}</strong>
                <p>{storageError}</p>
                {workspaceStore.getState().recoveryText ? (
                  <Button
                    onClick={() =>
                      downloadJson(
                        { rawLocalBackup: workspaceStore.getState().recoveryText },
                        'workspace-recovery.json',
                      )
                    }
                  >
                    {t('recovery')}
                  </Button>
                ) : null}
              </section>
            ) : null}
            <section className="workspace-toolbar">
              <label className="search-field">
                <Search size={18} />
                <span className="sr-only">{t('search')}</span>
                <input
                  ref={searchRef}
                  type="search"
                  autoComplete="off"
                  placeholder={t('search')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    if (event.target.value) setView('list');
                  }}
                />
                <kbd>/</kbd>
              </label>
              <label className="sr-only" htmlFor="status-filter">
                {t('result')}
              </label>
              <LocalizedSelect
                id="status-filter"
                label={t('result')}
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);
                  setView('list');
                }}
                options={[
                  { value: 'all', label: t('all') },
                  ...Object.keys(result.counts).map((status) => ({
                    value: status,
                    label: t(status as keyof typeof result.counts),
                  })),
                ]}
              />
              <div className="view-switch" role="group" aria-label={t('graph')}>
                <Button aria-pressed={view === 'graph'} onClick={() => setView('graph')}>
                  <LayoutGrid size={16} />
                  <span>{t('graph')}</span>
                </Button>
                <Button aria-pressed={view === 'list'} onClick={() => setView('list')}>
                  <List size={16} />
                  <span>{t('list')}</span>
                </Button>
              </div>
              <Button className="import-shortcut" onClick={() => setImportOpen(true)}>
                <FileInput size={17} />
                {t('import')}
              </Button>
            </section>
            <section className="workspace-canvas" aria-label={t(view)}>
              {!hasDocument ? (
                <div className="workspace-empty">
                  <h2>{t('emptyWorkspace')}</h2>
                  <p>{t('emptyWorkspaceHelp')}</p>
                  <Button className="primary" onClick={() => setImportOpen(true)}>
                    {t('import')}
                  </Button>
                </div>
              ) : view === 'graph' ? (
                <Suspense
                  fallback={
                    <div className="canvas-loading" role="status">
                      {t('graph')}…
                    </div>
                  }
                >
                  <DecisionCanvas
                    doc={doc}
                    result={result}
                    session={session}
                    dependencies={settings.dependencies}
                    minimap={settings.minimap}
                    onOpen={onOpen}
                    onNote={onNote}
                    t={t}
                  />
                </Suspense>
              ) : (
                <div className="question-list">
                  {filtered.length ? (
                    filtered.map((node) => (
                      <button
                        key={node.id}
                        className={`question-list-item ${result.states[node.id]?.status}`}
                        onClick={() => onOpen(node.id)}
                      >
                        <span className="list-item-top">
                          <bdi>{node.id}</bdi>
                          <span className={`status-pill ${result.states[node.id]?.status}`}>
                            {t(result.states[node.id]?.status ?? 'ready')}
                          </span>
                        </span>
                        <strong dir={doc.direction}>{node.title}</strong>
                        {node.kind === 'question' ? <p dir={doc.direction}>{node.prompt}</p> : null}
                        <span className="list-open">
                          {t('details')} <ForwardArrow size={14} />
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="empty-filter">{t('empty')}</p>
                  )}
                </div>
              )}
            </section>
            <footer className="workspace-footer">
              <span>
                <i className="privacy-dot" />
                {t('savedLocally')}
              </span>
              <span>
                {result.counts.inactive} {t('inactive')} · {result.counts.blocked} {t('blocked')} ·{' '}
                {result.counts.review} {t('review')}
              </span>
            </footer>
            {result.orphanedAnswers.length ? (
              <p className="warning-callout">{t('orphan')}</p>
            ) : null}
          </main>
          <QuestionDialog
            open={questionOpen}
            node={selectedNode}
            doc={doc}
            session={session}
            result={result}
            onClose={() => setQuestionOpen(false)}
            onOpen={onOpen}
            onNote={onNote}
            onDelete={removeAnswer}
            notify={notify}
            t={t}
          />
          <WorkspaceMenu
            open={menu}
            onClose={() => setMenu(false)}
            onImport={() => {
              setMenu(false);
              setImportOpen(true);
            }}
            onExport={() => downloadJson(exportSession(doc, session), `${doc.id}-session.json`)}
            onDocument={() => downloadJson(doc, `${doc.id}.json`)}
            onCopy={() => {
              void copy();
            }}
            onReset={reset}
            onOpen={onOpen}
            onNote={onNote}
            hasDocument={hasDocument}
            result={result}
            session={session}
            t={t}
          />
          <ImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            current={hasDocument ? doc : undefined}
            onLoad={load}
            t={t}
          />
          <NoteDialog
            open={noteOpen}
            request={note}
            session={session}
            onClose={() => setNoteOpen(false)}
            onDelete={(id) =>
              setConfirmation({
                title: t('deleteNote'),
                description: t('removeNoteHelp'),
                confirm: () => {
                  workspaceStore.getState().removeNote(id);
                  setNoteOpen(false);
                },
              })
            }
            notify={notify}
            t={t}
          />
          <Modal
            open={confirmation !== null}
            onClose={() => setConfirmation(null)}
            title={confirmation?.title ?? t('confirm')}
            description={confirmation?.description ?? ''}
          >
            <p>{confirmation?.description}</p>
            <div className="decision-actions">
              <Button
                className="primary"
                onClick={() => {
                  confirmation?.confirm();
                  setConfirmation(null);
                }}
              >
                {t('confirm')}
              </Button>
              <Button onClick={() => setConfirmation(null)}>{t('cancel')}</Button>
            </div>
          </Modal>
          <Modal
            open={manualCopy !== null}
            onClose={() => setManualCopy(null)}
            title={t('manualCopy')}
            description={t('copy')}
          >
            <textarea
              readOnly
              dir="ltr"
              className="json-editor"
              rows={16}
              value={manualCopy ?? ''}
              onFocus={(event) => event.target.select()}
            />
          </Modal>
          <AnimatePresence>
            {toast ? (
              <motion.div
                key={toast.id}
                className="toast"
                role="status"
                initial={{ opacity: 0, y: reduced || !settings.animations ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle2 size={18} />
                {toast.text}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </DirectionProvider>
  );
}
