import { LocalizedSelect } from './LocalizedSelect';
import { formatNumber } from '../lib/locale';
import { useStore } from 'zustand';
import { motion } from 'motion/react';
import { ChevronDown, FileDown, FolderOpen, PanelTop, RotateCcw, Settings2 } from 'lucide-react';
import { workspaceStore } from '../state/workspace';
import { Modal, Button } from './ui';
import { examples } from '../data/examples';
import type { DecisionDocument } from '../domain/schema';
import type { Evaluation, Note, Session } from '../domain/engine';
import type { Translate } from '../lib/i18n';

export function WorkspaceMenu({
  open,
  onClose,
  onLoad,
  onImport,
  onExport,
  onDocument,
  onCopy,
  onReset,
  onOpen,
  onNote,
  result,
  session,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onLoad: (doc: DecisionDocument) => void;
  onImport: () => void;
  onExport: () => void;
  onDocument: () => void;
  onCopy: () => void;
  onReset: () => void;
  onOpen: (id: string) => void;
  onNote: (target: Note['target'], existing?: Note) => void;
  result: Evaluation;
  session: Session;
  t: Translate;
}) {
  const language = useStore(workspaceStore, (s) => s.language);
  const documents = useStore(workspaceStore, (s) => s.documents),
    active = useStore(workspaceStore, (s) => s.activeId),
    activate = useStore(workspaceStore, (s) => s.activate),
    settings = useStore(workspaceStore, (s) => s.settings),
    setSetting = useStore(workspaceStore, (s) => s.setSetting);
  return (
    <Modal open={open} onClose={onClose} title={t('menu')} description={t('privacy')} side>
      <section className="menu-section">
        <h3>
          <FolderOpen size={18} />
          {t('projects')}
        </h3>
        <label className="sr-only" htmlFor="project-select">
          {t('projects')}
        </label>
        <LocalizedSelect
          id="project-select"
          label={t('projects')}
          value={active}
          onValueChange={(value) => {
            activate(value);
            onClose();
          }}
          options={Object.values(documents).map((doc) => ({
            value: doc.id,
            label: doc.title,
            direction: doc.direction,
          }))}
        />
        <Button onClick={onImport}>
          <FileDown size={16} />
          {t('import')}
        </Button>
      </section>
      <section className="menu-section">
        <h3>{t('progress')}</h3>
        <div className="status-grid">
          {Object.entries(result.counts).map(([status, count]) => (
            <span className={`status-pill ${status}`} key={status}>
              {t(status as keyof typeof result.counts)} <bdi>{formatNumber(language, count)}</bdi>
            </span>
          ))}
        </div>
        <p className="muted">{t(result.complete ? 'complete' : 'openWork')}</p>
      </section>
      <section className="menu-section">
        <h3>
          <Settings2 size={18} />
          {t('settings')}
        </h3>
        {(['minimap', 'dependencies', 'animations'] as const).map((key) => (
          <label className="switch-row" key={key}>
            <span>{t(key)}</span>
            <input
              type="checkbox"
              role="switch"
              checked={settings[key]}
              onChange={(event) => setSetting(key, event.target.checked)}
            />
          </label>
        ))}
      </section>
      <section className="menu-section">
        <h3>
          <PanelTop size={18} />
          {t('examples')}
        </h3>
        {examples.map((doc) => (
          <Button
            className="full-width"
            key={doc.id}
            onClick={() => {
              onLoad(doc);
              onClose();
            }}
          >
            {doc.title}
          </Button>
        ))}
      </section>
      <details className="menu-section">
        <summary>
          <span>
            {t('notes')} · {session.notes.length}
          </span>
          <motion.span initial={false}>
            <ChevronDown size={16} />
          </motion.span>
        </summary>
        <div className="notes-list">
          {session.notes.map((note) => (
            <article key={note.id}>
              <button
                onClick={() => {
                  if (note.target.type === 'node') {
                    onOpen(note.target.id);
                    onClose();
                  }
                }}
                className="note-target"
              >
                {note.target.type === 'node'
                  ? note.target.id
                  : `${note.target.source} → ${note.target.target}`}
              </button>
              <p>{note.text}</p>
              <Button onClick={() => onNote(note.target, note)}>{t('editNote')}</Button>
            </article>
          ))}
        </div>
      </details>
      <section className="menu-section export-actions">
        <h3>{t('export')}</h3>
        <Button className="primary" onClick={onExport}>
          {t('export')}
        </Button>
        <Button onClick={onDocument}>{t('exportDocument')}</Button>
        <Button onClick={onCopy}>{t('copy')}</Button>
        <Button className="danger quiet" onClick={onReset}>
          <RotateCcw size={16} />
          {t('reset')}
        </Button>
      </section>
      <p className="privacy-note">{t('privacy')}</p>
      <p className="muted">{t('controls')}</p>
    </Modal>
  );
}
