import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocument } from '../src/domain/schema';
import { evaluate, emptySession } from '../src/domain/engine';
import { launchExample, persianExample } from '../src/data/examples';

describe('published onboarding examples', () => {
  it.each(['minimal-document', 'delivery-workflow', 'delivery-workflow-fa'])(
    'validates %s before users import it',
    (name) => {
      const document = parseDocument(
        readFileSync(resolve(process.cwd(), 'public', 'examples', `${name}.json`), 'utf8'),
      );
      const result = evaluate(document, emptySession());
      expect(result.total).toBeGreaterThan(0);
      expect(result.counts.answered).toBe(0);
      expect(result.counts.ready).toBeGreaterThan(0);
    },
  );
  it.each([
    ['delivery-workflow', launchExample],
    ['delivery-workflow-fa', persianExample],
  ] as const)('keeps the downloadable %s consistent with the bundled example', (name, bundled) => {
    expect(
      parseDocument(
        readFileSync(resolve(process.cwd(), 'public', 'examples', `${name}.json`), 'utf8'),
      ),
    ).toEqual(bundled);
  });
});
