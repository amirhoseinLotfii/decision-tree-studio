import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal, Button } from './ui';
import { parseDocument } from '../domain/schema';
import type { DecisionDocument } from '../domain/schema';
import type { Session } from '../domain/engine';
import { importSession } from '../domain/transfer';
import { readFile } from '../lib/files';
import type { Translate } from '../lib/i18n';

export function ImportDialog({
  open,
  onClose,
  onLoad,
  current,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onLoad: (doc: DecisionDocument, session?: Session) => void;
  current?: DecisionDocument;
  t: Translate;
}) {
  const [text, setText] = useState(''),
    [error, setError] = useState('');
  const apply = () => {
    try {
      const unknown = JSON.parse(text) as { format?: unknown };
      if (
        unknown &&
        typeof unknown === 'object' &&
        unknown.format === 'decision-tree-studio/session'
      ) {
        const imported = importSession(text);
        onLoad(imported.document, imported.session);
      } else onLoad(parseDocument(text));
      setError('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('invalid'));
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('importTitle')}
      description={t('importHelp')}
      wide
    >
      <p className="intro-text">{t('importHelp')}</p>
      <div className="import-controls">
        <label className="file-picker">
          <Upload size={18} />
          {t('chooseFile')}
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file)
                void readFile(file)
                  .then((value) => {
                    setText(value);
                    setError('');
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : t('invalid')));
            }}
          />
        </label>
        <Button disabled={!current} onClick={() => setText(JSON.stringify(current, null, 2))}>
          {t('exportDocument')}
        </Button>
      </div>
      <label className="field-label" htmlFor="json-input">
        {t('json')}
      </label>
      <textarea
        id="json-input"
        className="json-editor"
        dir="ltr"
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={17}
        placeholder={'{\n  "formatVersion": "1.0",\n  "nodes": […]\n}'}
      />
      {error ? (
        <section className="error-callout" role="alert">
          <strong>{t('invalid')}</strong>
          <pre>{error}</pre>
        </section>
      ) : null}
      <div className="decision-actions">
        <Button className="primary" onClick={apply} disabled={!text.trim()}>
          {t('apply')}
        </Button>
        <Button onClick={onClose}>{t('cancel')}</Button>
      </div>
    </Modal>
  );
}
