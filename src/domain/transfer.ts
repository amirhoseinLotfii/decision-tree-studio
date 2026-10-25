import { z } from 'zod';
import { documentSchema, validateDocument } from './schema';
import { evaluate } from './engine';
import type { DecisionDocument } from './schema';
import type { Session } from './engine';

const answerSchema = z.object({
  optionId: z.string(),
  optionLabel: z.string(),
  fingerprint: z.string(),
  token: z.string(),
  answeredAt: z.iso.datetime(),
  dependencies: z.record(z.string(), z.string()),
});
export const sessionSchema = z
  .object({
    answers: z.record(z.string(), answerSchema),
    drafts: z.record(z.string(), z.string()),
    noteDrafts: z.record(z.string(), z.string().max(20_000)).default({}),
    sequence: z.number().int().nonnegative(),
    notes: z
      .array(
        z.object({
          id: z.string(),
          text: z.string().min(1).max(20_000),
          createdAt: z.iso.datetime(),
          updatedAt: z.iso.datetime(),
          target: z.discriminatedUnion('type', [
            z.object({ type: z.literal('node'), id: z.string() }),
            z.object({ type: z.literal('edge'), source: z.string(), target: z.string() }),
          ]),
        }),
      )
      .max(10_000),
  })
  .refine(
    (value) => new Set(value.notes.map((n) => n.id)).size === value.notes.length,
    'Note IDs must be unique.',
  );
const envelope = z.object({
  format: z.literal('decision-tree-studio/session'),
  formatVersion: z.literal('1.0'),
  document: documentSchema,
  session: sessionSchema,
});
export function exportSession(document: DecisionDocument, session: Session) {
  return {
    format: 'decision-tree-studio/session',
    formatVersion: '1.0',
    exportedAt: new Date().toISOString(),
    document,
    session,
    evaluation: evaluate(document, session),
  };
}
export const MAX_SESSION_BYTES = 20 * 1024 * 1024;
export function importSession(text: string): { document: DecisionDocument; session: Session } {
  if (new TextEncoder().encode(text).length > MAX_SESSION_BYTES)
    throw new Error('File exceeds the 20 MiB session limit.');
  const parsed = envelope.safeParse(JSON.parse(text));
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('\n'),
    );
  const document = validateDocument(parsed.data.document);
  return { document, session: parsed.data.session };
}
