import { describe, expect, it } from 'vitest';
import { parseDocument, validateDocument } from '../src/domain/schema';
import { fixture } from './fixtures';

describe('document validation', () => {
  it('accepts defaults and preserves text as text', () => {
    const d = fixture();
    d.title = '<script>alert(1)</script>';
    expect(validateDocument(d).title).toContain('<script>');
  });
  it('rejects malformed JSON', () => expect(() => parseDocument('{')).toThrow('Invalid JSON'));
  it('rejects duplicate IDs', () => {
    const d = fixture();
    d.nodes.push(d.nodes[0]!);
    expect(() => validateDocument(d)).toThrow('unique');
  });
  it('rejects unknown parents', () => {
    const d = fixture();
    d.nodes[0]!.parentId = 'missing';
    expect(() => validateDocument(d)).toThrow('unknown parent');
  });
  it('rejects parent cycles', () => {
    const d = fixture();
    d.nodes[0]!.parentId = 'b';
    expect(() => validateDocument(d)).toThrow('cycle');
  });
  it('rejects dependency cycles', () => {
    const d = fixture();
    if (d.nodes[0]!.kind === 'question') d.nodes[0]!.dependsOn = ['c'];
    expect(() => validateDocument(d)).toThrow('cycle');
  });
  it('rejects missing condition options', () => {
    const d = fixture();
    if (d.nodes[1]!.kind === 'question') d.nodes[1]!.when!.rules[0]!.optionId = 'missing';
    expect(() => validateDocument(d)).toThrow('unknown condition');
  });
  it('rejects contradictory all rules', () => {
    const d = fixture();
    if (d.nodes[1]!.kind === 'question')
      d.nodes[1]!.when!.rules.push({ questionId: 'a', optionId: 'no' });
    expect(() => validateDocument(d)).toThrow('contradictory');
  });
  it('rejects unsafe source links', () => {
    const d = fixture();
    d.sources.push({
      id: 'bad',
      title: 'Bad',
      kind: 'external',
      claim: 'Claim',
      url: 'javascript:alert(1)',
    });
    expect(() => validateDocument(d)).toThrow('HTTP');
  });
  it('rejects missing sources', () => {
    const d = fixture();
    if (d.nodes[0]!.kind === 'question') d.nodes[0]!.options[0]!.sourceIds = ['unknown'];
    expect(() => validateDocument(d)).toThrow('unknown source');
  });
  it('rejects reserved object IDs', () => {
    const d = fixture();
    d.nodes[0]!.id = 'constructor';
    expect(() => validateDocument(d)).toThrow('Reserved');
  });
  it('rejects inherited object method IDs', () => {
    const d = fixture();
    d.nodes[0]!.id = 'toString';
    expect(() => validateDocument(d)).toThrow('Reserved');
  });
  it('allows deep topic hierarchies without recursive schema traversal', () => {
    const d = fixture();
    d.nodes = Array.from({ length: 300 }, (_, i) => ({
      id: `g${i}`,
      parentId: i ? `g${i - 1}` : null,
      kind: 'group' as const,
      title: `Group ${i}`,
      description: '',
    }));
    expect(validateDocument(d).nodes).toHaveLength(300);
  });
});
