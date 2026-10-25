import { validateDocument } from '../src/domain/schema';
import type { DecisionDocument } from '../src/domain/schema';
export function fixture(): DecisionDocument {
  return validateDocument({
    formatVersion: '1.0',
    id: 'test',
    version: '1',
    title: 'Test',
    nodes: [
      {
        kind: 'question',
        id: 'a',
        title: 'A',
        prompt: 'Choose A?',
        options: [
          { id: 'yes', label: 'Yes', recommended: true },
          { id: 'no', label: 'No' },
          { id: 'later', label: 'Later', defer: true },
        ],
      },
      {
        kind: 'question',
        id: 'b',
        title: 'B',
        prompt: 'Choose B?',
        parentId: 'a',
        when: { mode: 'all', rules: [{ questionId: 'a', optionId: 'yes' }] },
        options: [
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
        ],
      },
      {
        kind: 'question',
        id: 'c',
        title: 'C',
        prompt: 'Choose C?',
        dependsOn: ['b'],
        options: [
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
        ],
      },
    ],
  });
}
export function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
