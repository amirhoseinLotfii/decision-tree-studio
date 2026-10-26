import { expect, it } from 'vitest';
import { sectionOrder, numberedSection } from '../src/domain/section-order';
import { validateDocument } from '../src/domain/schema';
it('numbers sections under a single document container without modifying titles or IDs', () => {
  const d = validateDocument({
    formatVersion: '1.0',
    id: 'doc',
    version: '1',
    title: 'Doc',
    nodes: [
      { kind: 'group', id: 'root', title: 'Root' },
      { kind: 'group', id: 'a', parentId: 'root', title: '۱. هویت' },
      { kind: 'group', id: 'b', parentId: 'root', title: 'قواعد' },
      { kind: 'group', id: 'sub', parentId: 'a', title: 'جزئیات' },
    ],
  });
  const before = JSON.stringify(d),
    order = sectionOrder(d);
  expect(order.get('a')).toBe('1');
  expect(order.get('b')).toBe('2');
  expect(order.get('sub')).toBe('1.1');
  expect(order.has('root')).toBe(false);
  expect(numberedSection(d.nodes[1]!.title, order.get('a'), 'fa')).toBe('۱ · هویت');
  expect(JSON.stringify(d)).toBe(before);
});
it('numbers independent root topics in document order', () => {
  const d = validateDocument({
    formatVersion: '1.0',
    id: 'doc',
    version: '1',
    title: 'Doc',
    nodes: [
      { kind: 'group', id: 'a', title: 'A' },
      { kind: 'group', id: 'b', title: 'B' },
    ],
  });
  expect([...sectionOrder(d).entries()]).toEqual([
    ['a', '1'],
    ['b', '2'],
  ]);
});
