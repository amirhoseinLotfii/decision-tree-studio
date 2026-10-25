import { prerequisiteIds, topologicalOrder } from './schema';
import type { DecisionDocument, Question } from './schema';

export type Answer = {
  optionId: string;
  optionLabel: string;
  fingerprint: string;
  token: string;
  answeredAt: string;
  dependencies: Record<string, string>;
};
export type Note = {
  id: string;
  target: { type: 'node'; id: string } | { type: 'edge'; source: string; target: string };
  text: string;
  createdAt: string;
  updatedAt: string;
};
export type Session = {
  answers: Record<string, Answer>;
  drafts: Record<string, string>;
  noteDrafts: Record<string, string>;
  notes: Note[];
  sequence: number;
};
export type DecisionStatus = 'ready' | 'answered' | 'blocked' | 'deferred' | 'review' | 'inactive';
export type DecisionState = {
  status: DecisionStatus;
  reasons: string[];
  condition: boolean | null;
  stamp: string;
};
export type Evaluation = {
  states: Record<string, DecisionState>;
  order: string[];
  counts: Record<DecisionStatus, number>;
  total: number;
  complete: boolean;
  orphanedAnswers: string[];
};
export const emptySession = (): Session => ({
  answers: {},
  drafts: {},
  noteDrafts: {},
  notes: [],
  sequence: 0,
});

// Full canonical definitions avoid hash collisions. This is version tracking, never a security signature.
export function fingerprint(q: Question): string {
  return JSON.stringify(q);
}

export function evaluate(doc: DecisionDocument, session: Pick<Session, 'answers'>): Evaluation {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const questions = doc.nodes.filter((n): n is Question => n.kind === 'question');
  const deps = new Map(questions.map((q) => [q.id, prerequisiteIds(doc, q)]));
  const order = topologicalOrder(
    questions.map((q) => q.id),
    deps,
  );
  const states: Record<string, DecisionState> = {};
  const counts: Evaluation['counts'] = {
    ready: 0,
    answered: 0,
    blocked: 0,
    deferred: 0,
    review: 0,
    inactive: 0,
  };
  for (const key of order) {
    const q = byId.get(key);
    if (q?.kind !== 'question') continue;
    const prerequisites = deps.get(key) ?? [];
    const reasons: string[] = [];
    let parent = q.parentId,
      excludedParent: string | undefined;
    while (parent) {
      if (states[parent]?.status === 'inactive') {
        excludedParent = parent;
        break;
      }
      parent = byId.get(parent)?.parentId ?? null;
    }
    const rules =
      q.when?.rules.map((rule) => {
        const state = states[rule.questionId];
        if (state?.status === 'inactive') return false;
        if (state?.status !== 'answered') return null;
        return session.answers[rule.questionId]?.optionId === rule.optionId;
      }) ?? [];
    const condition = !q.when
      ? true
      : q.when.mode === 'all'
        ? rules.some((x) => x === false)
          ? false
          : rules.every((x) => x === true)
            ? true
            : null
        : rules.some((x) => x === true)
          ? true
          : rules.every((x) => x === false)
            ? false
            : null;
    const answer = session.answers[key],
      option = q.options.find((o) => o.id === answer?.optionId);
    let status: DecisionStatus;
    if (excludedParent || condition === false) {
      status = 'inactive';
      if (excludedParent) reasons.push(excludedParent);
      else
        reasons.push(
          ...(q.when?.rules.filter((_, i) => rules[i] !== true).map((r) => r.questionId) ?? []),
        );
    } else {
      const missing = prerequisiteIds(doc, q, false).filter(
        (id) => states[id]?.status !== 'answered',
      );
      reasons.push(...missing);
      if (answer && (answer.fingerprint !== fingerprint(q) || !option)) status = 'review';
      else if (option?.defer) status = 'deferred';
      else if (missing.length || condition === null) status = answer ? 'review' : 'blocked';
      else if (!answer) status = 'ready';
      else if (prerequisites.some((id) => answer.dependencies[id] !== states[id]?.stamp))
        status = 'review';
      else status = 'answered';
    }
    // Dependency statuses propagate invalidation topologically; do not recursively embed
    // ancestor strings (that can grow exponentially in a deeply nested graph).
    const stamp = JSON.stringify([
      status,
      answer?.optionId ?? '',
      answer?.token ?? '',
      fingerprint(q),
    ]);
    states[key] = { status, condition, reasons: [...new Set(reasons)], stamp };
    counts[status]++;
  }
  return {
    states,
    order,
    counts,
    total: questions.length,
    complete: counts.ready + counts.blocked + counts.deferred + counts.review === 0,
    orphanedAnswers: Object.keys(session.answers).filter((id) => !states[id]),
  };
}

export function recordAnswer(
  doc: DecisionDocument,
  session: Session,
  questionId: string,
  optionId: string,
  now = new Date().toISOString(),
): Session {
  const q = doc.nodes.find((n): n is Question => n.kind === 'question' && n.id === questionId);
  if (!q) throw new Error('Unknown question.');
  const option = q.options.find((o) => o.id === optionId);
  if (!option) throw new Error('Unknown option.');
  const result = evaluate(doc, session),
    state = result.states[questionId];
  if (
    state?.status === 'inactive' ||
    state?.condition !== true ||
    prerequisiteIds(doc, q, false).some((id) => result.states[id]?.status !== 'answered')
  )
    throw new Error('Resolve the prerequisites before recording an answer.');
  const sequence = session.sequence + 1;
  const drafts = { ...session.drafts };
  delete drafts[questionId];
  return {
    ...session,
    sequence,
    drafts,
    answers: {
      ...session.answers,
      [questionId]: {
        optionId,
        optionLabel: option.label,
        fingerprint: fingerprint(q),
        token: `${now}:${sequence}`,
        answeredAt: now,
        dependencies: Object.fromEntries(
          prerequisiteIds(doc, q).map((id) => [id, result.states[id]?.stamp ?? '']),
        ),
      },
    },
  };
}

export function nextQuestion(doc: DecisionDocument, session: Session): string | undefined {
  const result = evaluate(doc, session);
  return (
    result.order.find((id) => result.states[id]?.status === 'ready') ??
    result.order.find((id) => {
      const state = result.states[id];
      const q = doc.nodes.find((n): n is Question => n.kind === 'question' && n.id === id);
      return (
        q &&
        (state?.status === 'review' || state?.status === 'deferred') &&
        state.condition === true &&
        prerequisiteIds(doc, q, false).every((dep) => result.states[dep]?.status === 'answered')
      );
    })
  );
}

export function notesFor(session: Session, id: string): Note[] {
  return session.notes.filter((n) => n.target.type === 'node' && n.target.id === id);
}
