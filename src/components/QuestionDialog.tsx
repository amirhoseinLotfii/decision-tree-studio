import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useStore } from 'zustand';
import { Check, ExternalLink, FileText, Lightbulb, MessageSquare, ShieldAlert } from 'lucide-react';
import type { DecisionDocument, DecisionNode, Question, Option } from '../domain/schema';
import { prerequisiteIds } from '../domain/schema';
import type { Evaluation, Note, Session } from '../domain/engine';
import { notesFor } from '../domain/engine';
import { workspaceStore } from '../state/workspace';
import type { Translate } from '../lib/i18n';
import { Modal, Button, FieldCard } from './ui';

function Evidence({ doc, option, t }: { doc: DecisionDocument; option: Option; t: Translate }) {
  const sources = option.sourceIds
    .map((id) => doc.sources.find((s) => s.id === id))
    .filter((s) => s !== undefined);
  return (
    <section className="evidence">
      <h3>
        <FileText size={18} />
        {t('sources')}
      </h3>
      {!sources.length ? (
        <p className="muted">{t('noSources')}</p>
      ) : (
        sources.map((source) => (
          <article className={`source-card ${source.kind}`} key={source.id}>
            <span className="eyebrow">{t(source.kind)}</span>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer" translate="no">
                {source.title}
                <ExternalLink size={14} />
              </a>
            ) : (
              <h4>{source.title}</h4>
            )}
            <p>{source.claim}</p>
          </article>
        ))
      )}
    </section>
  );
}
function OptionExplanation({
  doc,
  option,
  t,
}: {
  doc: DecisionDocument;
  option: Option;
  t: Translate;
}) {
  return (
    <>
      <section className="selected-summary">
        <span className="eyebrow">{t('selected')}</span>
        <h3>{option.label}</h3>
        {option.description ? <p>{option.description}</p> : null}
      </section>
      <div className="tradeoffs">
        <FieldCard title={t('benefit')} tone="benefit">
          <ul>
            {option.benefits.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </FieldCard>
        <FieldCard title={t('risk')} tone="risk">
          <ul>
            {option.risks.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </FieldCard>
      </div>
      {option.example ? (
        <FieldCard title={t('example')} tone="info">
          <p>{option.example}</p>
        </FieldCard>
      ) : null}
      {option.outcome ? (
        <FieldCard title={t('outcome')}>
          <p>{option.outcome}</p>
        </FieldCard>
      ) : null}
      {option.rationale ? (
        <section className="rationale">
          <h3>{t('rationale')}</h3>
          <p>{option.rationale}</p>
        </section>
      ) : null}
      <Evidence doc={doc} option={option} t={t} />
    </>
  );
}
function exclusionQuestions(
  doc: DecisionDocument,
  result: Evaluation,
  question: Question,
): Question[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const queue = [
      ...(result.states[question.id]?.reasons ?? []),
      ...(question.when?.rules.map((r) => r.questionId) ?? []),
    ],
    found: Question[] = [],
    seen = new Set<string>();
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const q = byId.get(id);
    if (q?.kind !== 'question') continue;
    if (result.states[id]?.status === 'answered') found.push(q);
    else
      queue.push(
        ...(result.states[id]?.reasons ?? []),
        ...(q.when?.rules.map((r) => r.questionId) ?? []),
      );
  }
  return found;
}
export function QuestionDialog({
  open,
  node,
  doc,
  session,
  result,
  onClose,
  onOpen,
  onNote,
  onDelete,
  notify,
  t,
}: {
  open: boolean;
  node: DecisionNode | null;
  doc: DecisionDocument;
  session: Session;
  result: Evaluation;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNote: (target: Note['target'], existing?: Note) => void;
  onDelete: (id: string) => void;
  notify: (message: string) => void;
  t: Translate;
}) {
  const draft = useStore(workspaceStore, (s) => s.draft),
    answer = useStore(workspaceStore, (s) => s.answer),
    animations = useStore(workspaceStore, (s) => s.settings.animations),
    reduced = useReducedMotion();
  if (!node) return null;
  const state = result.states[node.id];
  const question = node.kind === 'question' ? node : null;
  const chosenId = question
    ? (session.drafts[node.id] ??
      session.answers[node.id]?.optionId ??
      question.options.find((o) => o.recommended)?.id ??
      question.options[0]?.id)
    : undefined;
  const chosen =
    question?.options.find((o) => o.id === chosenId) ??
    question?.options.find((o) => o.recommended) ??
    question?.options[0];
  const prerequisites = question ? prerequisiteIds(doc, question) : [];
  const ready =
    state?.condition === true &&
    question &&
    prerequisiteIds(doc, question, false).every((id) => result.states[id]?.status === 'answered');
  const notes = notesFor(session, node.id);
  const deciding =
    question && state?.status === 'inactive' ? exclusionQuestions(doc, result, question) : [];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={node.title}
      description={question?.prompt ?? t('groupHelp')}
      wide
    >
      <div dir={doc.direction} key={node.id}>
        <div className="question-meta">
          <bdi className="code-badge">{node.id}</bdi>
          {state ? (
            <span className={`status-pill ${state.status}`}>{t(state.status)}</span>
          ) : (
            <span className="status-pill">{t('topic')}</span>
          )}
        </div>
        {!question ? (
          <>
            <p className="intro-text">
              {node.kind === 'group' ? node.description || t('groupHelp') : ''}
            </p>
            <div className="topic-links">
              {doc.nodes
                .filter((n) => n.parentId === node.id)
                .map((n) => (
                  <Button key={n.id} onClick={() => onOpen(n.id)}>
                    {n.title}
                  </Button>
                ))}
            </div>
          </>
        ) : state?.status === 'inactive' ? (
          <>
            <section className="inactive-banner">
              <ShieldAlert size={24} />
              <div>
                <h2>{t('inactiveTitle')}</h2>
                <p>{t('inactiveHelp')}</p>
              </div>
            </section>
            <h3 className="section-heading">{question.prompt}</h3>
            {question.when ? (
              <FieldCard title={t('expectedChoice')}>
                <p>{t(question.when.mode === 'all' ? 'allRules' : 'anyRules')}</p>
                <ul>
                  {question.when.rules.map((rule) => {
                    const q = doc.nodes.find((n) => n.id === rule.questionId);
                    return (
                      <li key={`${rule.questionId}:${rule.optionId}`}>
                        {q?.title}:{' '}
                        {q?.kind === 'question'
                          ? q.options.find((o) => o.id === rule.optionId)?.label
                          : rule.optionId}
                      </li>
                    );
                  })}
                </ul>
              </FieldCard>
            ) : null}
            {deciding.map((q) => {
              const option = q.options.find((o) => o.id === session.answers[q.id]?.optionId);
              return option ? (
                <section className="deciding-question" key={q.id}>
                  <span className="eyebrow">
                    {t('currentChoice')} · <bdi>{q.id}</bdi>
                  </span>
                  <h3>{q.prompt}</h3>
                  <OptionExplanation doc={doc} option={option} t={t} />
                  <Button onClick={() => onOpen(q.id)}>{t('revisit')}</Button>
                </section>
              ) : null;
            })}
            <Button onClick={() => onNote({ type: 'node', id: node.id })}>
              <MessageSquare size={16} />
              {t('addNote')}
            </Button>
          </>
        ) : (
          <>
            <section className="question-card">
              <span className="eyebrow">{t('question')}</span>
              <h2>{question.prompt}</h2>
            </section>
            {question.example ? (
              <FieldCard title={t('example')} tone="info">
                <p>{question.example}</p>
              </FieldCard>
            ) : null}
            {question.when ? (
              <section className="condition-summary">
                <strong>{t('condition')}</strong>
                <p>{t(question.when.mode === 'all' ? 'allRules' : 'anyRules')}</p>
                {question.when.rules.map((rule) => {
                  const q = doc.nodes.find((n) => n.id === rule.questionId);
                  return (
                    <Button
                      key={`${rule.questionId}:${rule.optionId}`}
                      onClick={() => onOpen(rule.questionId)}
                    >
                      <bdi>{rule.questionId}</bdi> ·{' '}
                      {q?.kind === 'question'
                        ? q.options.find((o) => o.id === rule.optionId)?.label
                        : rule.optionId}
                    </Button>
                  );
                })}
              </section>
            ) : null}
            {prerequisites.length ? (
              <details className="prerequisite-details" open={!ready}>
                <summary>
                  {t('prerequisites')} · {prerequisites.length}
                </summary>
                <div className="topic-links">
                  {prerequisites.map((id) => (
                    <Button key={id} onClick={() => onOpen(id)}>
                      <bdi>{id}</bdi>
                      <span className={`status-dot ${result.states[id]?.status}`} />
                      {doc.nodes.find((n) => n.id === id)?.title}
                    </Button>
                  ))}
                </div>
              </details>
            ) : null}
            <fieldset className="option-set">
              <legend>{t('options')}</legend>
              {question.options.map((option, index) => (
                <label
                  key={option.id}
                  className={`option ${chosen?.id === option.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`answer-${question.id}`}
                    value={option.id}
                    checked={chosen?.id === option.id}
                    onChange={() => draft(question.id, option.id)}
                  />
                  <span className="option-content">
                    <span className="option-index">
                      {new Intl.NumberFormat(doc.locale).format(index + 1)}
                    </span>
                    <span>
                      {option.label}
                      {option.recommended ? (
                        <span className="recommendation">
                          <Lightbulb size={12} />
                          {t('recommended')}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <AnimatePresence initial={false} mode="wait">
              {chosen ? (
                <motion.section
                  key={`${question.id}:${chosen.id}`}
                  className="option-explanation"
                  initial={{ opacity: 0, y: reduced || !animations ? 0 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced || !animations ? 0 : 0.12 }}
                >
                  <OptionExplanation doc={doc} option={chosen} t={t} />
                </motion.section>
              ) : null}
            </AnimatePresence>
            {!ready ? <p className="warning-callout">{t('blockedHelp')}</p> : null}
            <div className="decision-actions">
              <Button
                className="primary"
                disabled={!ready || !chosen}
                onClick={() => {
                  if (!chosen) return;
                  try {
                    answer(question.id, chosen.id);
                    notify(t('saved'));
                    onClose();
                  } catch (error) {
                    notify(error instanceof Error ? error.message : t('invalid'));
                  }
                }}
              >
                <Check size={18} />
                {t('save')}
              </Button>
              <Button onClick={() => onNote({ type: 'node', id: node.id })}>
                <MessageSquare size={16} />
                {t('addNote')}
              </Button>
              {session.answers[node.id] ? (
                <Button className="danger quiet" onClick={() => onDelete(node.id)}>
                  {t('deleteAnswer')}
                </Button>
              ) : null}
            </div>
            <p className="muted">{t('draft')}</p>
          </>
        )}
        {question ? (
          <section className="question-notes">
            <h3>
              {t('notes')} · {notes.length}
            </h3>
            {notes.length ? (
              notes.map((note) => (
                <button
                  className="note-card"
                  key={note.id}
                  onClick={() => onNote(note.target, note)}
                >
                  <p>{note.text}</p>
                  <span>{t('editNote')}</span>
                </button>
              ))
            ) : (
              <p className="muted">{t('noNotes')}</p>
            )}
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
