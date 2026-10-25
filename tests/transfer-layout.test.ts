import { describe, expect, it } from 'vitest';
import { emptySession, evaluate, recordAnswer } from '../src/domain/engine';
import { exportSession, importSession } from '../src/domain/transfer';
import { buildGraph } from '../src/graph/layout';
import { fixture } from './fixtures';
describe('portable sessions and graph', () => {
  it('round trips a complete session with embedded document', () => {
    const d = fixture(),
      s = recordAnswer(d, emptySession(), 'a', 'yes');
    expect(importSession(JSON.stringify(exportSession(d, s)))).toEqual({ document: d, session: s });
  });
  it('recomputes evaluation rather than trusting imported summaries', () => {
    const d = fixture(),
      value = exportSession(d, emptySession());
    value.evaluation.complete = true;
    const imported = importSession(JSON.stringify(value));
    expect(evaluate(imported.document, imported.session).complete).toBe(false);
  });
  it('preserves orphaned annotations when an updated document removes a node', () => {
    const d = fixture(),
      s = emptySession(),
      now = new Date().toISOString();
    s.notes.push({
      id: 'note',
      text: 'Text',
      createdAt: now,
      updatedAt: now,
      target: { type: 'node', id: 'missing' },
    });
    expect(importSession(JSON.stringify(exportSession(d, s))).session.notes[0]?.target).toEqual({
      type: 'node',
      id: 'missing',
    });
  });
  it('produces positioned nodes and distinct conditional branches', () => {
    const d = fixture(),
      g = buildGraph(d, evaluate(d, emptySession()), {}, true);
    expect(g.nodes.length).toBe(5);
    expect(
      g.nodes.every((n) => Number.isFinite(n.position.x) && Number.isFinite(n.position.y)),
    ).toBe(true);
    expect(new Set(g.edges.map((e) => e.id)).size).toBe(g.edges.length);
  });
});
