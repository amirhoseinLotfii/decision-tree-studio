import { describe, expect, it } from 'vitest';
import { emptySession, evaluate, recordAnswer, nextQuestion } from '../src/domain/engine';
import { validateDocument } from '../src/domain/schema';
import { fixture } from './fixtures';

describe('decision engine', () => {
  it('does not count recommendations or drafts as recorded answers', () => {
    const s = emptySession();
    s.drafts.a = 'yes';
    expect(evaluate(fixture(), s).counts.answered).toBe(0);
  });
  it('blocks descendants until their parent is recorded', () =>
    expect(evaluate(fixture(), emptySession()).states.b?.status).toBe('blocked'));
  it('activates a matching conditional path', () => {
    const d = fixture(),
      s = recordAnswer(d, emptySession(), 'a', 'yes');
    expect(evaluate(d, s).states.b?.status).toBe('ready');
  });
  it('excludes a mismatching path without calling it answered', () => {
    const d = fixture(),
      r = evaluate(d, recordAnswer(d, emptySession(), 'a', 'no'));
    expect(r.states.b?.status).toBe('inactive');
    expect(r.states.c?.status).toBe('blocked');
    expect(r.complete).toBe(false);
  });
  it('rejects recording an unavailable child', () =>
    expect(() => recordAnswer(fixture(), emptySession(), 'b', 'one')).toThrow('prerequisites'));
  it('keeps deferrals open and blocks dependents', () => {
    const d = fixture(),
      s = recordAnswer(d, emptySession(), 'a', 'later'),
      r = evaluate(d, s);
    expect(r.states.a?.status).toBe('deferred');
    expect(r.states.b?.status).toBe('blocked');
    expect(r.complete).toBe(false);
    expect(nextQuestion(d, s)).toBe('a');
  });
  it('marks downstream answers for review after an upstream answer is re-recorded', () => {
    const d = fixture();
    let s = recordAnswer(d, emptySession(), 'a', 'yes');
    s = recordAnswer(d, s, 'b', 'one');
    s = recordAnswer(d, s, 'c', 'one');
    expect(evaluate(d, s).complete).toBe(true);
    s = recordAnswer(d, s, 'a', 'yes');
    expect(evaluate(d, s).states.b?.status).toBe('review');
    expect(evaluate(d, s).states.c?.status).toBe('review');
  });
  it('marks a revised question for review', () => {
    const d = fixture(),
      s = recordAnswer(d, emptySession(), 'a', 'yes');
    if (d.nodes[0]?.kind === 'question') d.nodes[0].prompt = 'Changed?';
    expect(evaluate(d, s).states.a?.status).toBe('review');
  });
  it('preserves answers on excluded paths and requests review when they return', () => {
    const d = fixture();
    let s = recordAnswer(d, emptySession(), 'a', 'yes');
    s = recordAnswer(d, s, 'b', 'one');
    s = recordAnswer(d, s, 'a', 'no');
    expect(s.answers.b).toBeDefined();
    expect(evaluate(d, s).states.b?.status).toBe('inactive');
    s = recordAnswer(d, s, 'a', 'yes');
    expect(evaluate(d, s).states.b?.status).toBe('review');
  });
  it('supports any rules without requiring unrelated unanswered owners', () => {
    const d = fixture();
    d.nodes[1]!.parentId = null;
    if (d.nodes[2]!.kind === 'question') d.nodes[2]!.dependsOn = [];
    if (d.nodes[1]!.kind === 'question')
      d.nodes[1]!.when = {
        mode: 'any',
        rules: [
          { questionId: 'a', optionId: 'yes' },
          { questionId: 'c', optionId: 'one' },
        ],
      };
    validateDocument(d);
    const s = recordAnswer(d, emptySession(), 'a', 'yes');
    expect(evaluate(d, s).states.b?.status).toBe('ready');
    expect(() => recordAnswer(d, s, 'b', 'one')).not.toThrow();
  });
  it('requires every all-rule to be true', () => {
    const d = fixture();
    d.nodes[1]!.parentId = null;
    if (d.nodes[2]!.kind === 'question') d.nodes[2]!.dependsOn = [];
    if (d.nodes[1]!.kind === 'question')
      d.nodes[1]!.when = {
        mode: 'all',
        rules: [
          { questionId: 'a', optionId: 'yes' },
          { questionId: 'c', optionId: 'one' },
        ],
      };
    const s = recordAnswer(d, emptySession(), 'a', 'yes');
    expect(evaluate(d, s).states.b?.status).toBe('blocked');
  });
  it('counts every question exactly once', () => {
    const d = fixture(),
      r = evaluate(d, recordAnswer(d, emptySession(), 'a', 'no'));
    expect(Object.values(r.counts).reduce((a, b) => a + b, 0)).toBe(r.total);
  });
  it('reports orphaned answers for audit', () => {
    const d = fixture(),
      s = recordAnswer(d, emptySession(), 'a', 'yes');
    s.answers.deleted = s.answers.a!;
    expect(evaluate(d, s).orphanedAnswers).toEqual(['deleted']);
  });
});
