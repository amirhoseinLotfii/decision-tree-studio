import { useStore } from 'zustand';
import { workspaceStore } from '../state/workspace';
import type { Note, Session } from '../domain/engine';
import { Modal, Button } from './ui';
import type { Translate } from '../lib/i18n';

export type NoteRequest = { target: Note['target']; existing?: Note };
export function NoteDialog({
  open,
  request,
  session,
  onClose,
  onDelete,
  notify,
  t,
}: {
  open: boolean;
  request: NoteRequest | null;
  session: Session;
  onClose: () => void;
  onDelete: (id: string) => void;
  notify: (text: string) => void;
  t: Translate;
}) {
  const save = useStore(workspaceStore, (s) => s.saveNote),
    draft = useStore(workspaceStore, (s) => s.draftNote);
  if (!request) return null;
  const key = request.existing?.id ?? JSON.stringify(request.target),
    value = session.noteDrafts[key] ?? request.existing?.text ?? '';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(request.existing ? 'editNote' : 'addNote')}
      description={t('noteHint')}
    >
      <p className="code-target" dir="ltr">
        {request.target.type === 'node'
          ? request.target.id
          : `${request.target.source} → ${request.target.target}`}
      </p>
      <label className="field-label" htmlFor="note-text">
        {t('noteText')}
      </label>
      <textarea
        id="note-text"
        dir="auto"
        rows={7}
        maxLength={20_000}
        value={value}
        onChange={(event) => draft(key, event.target.value)}
      />
      <p className="muted">{t('savedLocally')}</p>
      <div className="decision-actions">
        <Button
          className="primary"
          disabled={!value.trim()}
          onClick={() => {
            save(request.target, value, request.existing?.id);
            notify(t('noteSaved'));
            onClose();
          }}
        >
          {t('save')}
        </Button>
        {request.existing ? (
          <Button className="danger" onClick={() => onDelete(request.existing!.id)}>
            {t('deleteNote')}
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}
